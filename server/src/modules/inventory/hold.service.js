const mongoose = require('mongoose');
const InventoryHold = require('../../models/InventoryHold');
const InventoryItem = require('../../models/InventoryItem');
const InventoryMovement = require('../../models/InventoryMovement');
const ProductVariant = require('../../models/ProductVariant');

class InventoryHoldError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new InventoryHoldError(
      400,
      'HOLD_LINES_REQUIRED',
      'At least one inventory line is required',
    );
  }

  const quantities = new Map();
  for (const line of lines) {
    if (
      !mongoose.isValidObjectId(line.variantId) ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 9999
    ) {
      throw new InventoryHoldError(
        400,
        'INVALID_HOLD_LINE',
        'Each hold line needs a valid variant ID and quantity',
      );
    }
    const key = line.variantId.toString();
    const quantity = (quantities.get(key) || 0) + line.quantity;
    if (quantity > 9999) {
      throw new InventoryHoldError(
        400,
        'INVALID_HOLD_LINE',
        'Combined variant quantity exceeds the supported limit',
      );
    }
    quantities.set(key, quantity);
  }
  return Array.from(quantities, ([variantId, quantity]) => ({ variantId, quantity }));
}

function sameRequest(existing, lines) {
  if (
    existing.length !== lines.length ||
    existing.some((hold) => hold.status !== 'active' || hold.expiresAt <= new Date())
  ) {
    return false;
  }
  const held = new Map(existing.map((hold) => [hold.variantId.toString(), hold.quantity]));
  return lines.every((line) => held.get(line.variantId) === line.quantity);
}

async function reserveInventory({ checkoutToken, lines, actorId = null, expiresAt }) {
  if (
    typeof checkoutToken !== 'string' ||
    checkoutToken.trim().length === 0 ||
    checkoutToken.length > 200
  ) {
    throw new InventoryHoldError(400, 'INVALID_CHECKOUT_TOKEN', 'A checkout token is required');
  }
  const normalizedToken = checkoutToken.trim();
  const normalizedLines = normalizeLines(lines);
  const holdExpiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 15 * 60 * 1000);
  if (Number.isNaN(holdExpiry.getTime()) || holdExpiry <= new Date()) {
    throw new InventoryHoldError(400, 'INVALID_HOLD_EXPIRY', 'Hold expiry must be a future date');
  }

  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const existing = await InventoryHold.find({ checkoutToken: normalizedToken }).session(
        session,
      );
      if (existing.length) {
        if (!sameRequest(existing, normalizedLines)) {
          throw new InventoryHoldError(
            409,
            'CHECKOUT_HOLD_CONFLICT',
            'Checkout token already has a different or inactive reservation',
          );
        }
        result = existing;
        return;
      }

      const holds = [];
      for (const line of normalizedLines) {
        const variant = await ProductVariant.findOne({ _id: line.variantId, active: true }).session(
          session,
        );
        if (!variant) {
          throw new InventoryHoldError(
            409,
            'ITEM_UNAVAILABLE',
            'An item is no longer available for reservation',
          );
        }

        const item = await InventoryItem.findOneAndUpdate(
          {
            variantId: variant._id,
            vendorId: variant.vendorId,
            available: { $gte: line.quantity },
          },
          { $inc: { available: -line.quantity, reserved: line.quantity, version: 1 } },
          { new: true, runValidators: true, session },
        );
        if (!item) {
          throw new InventoryHoldError(
            409,
            'INSUFFICIENT_STOCK',
            'An item has insufficient available stock',
          );
        }

        const [hold] = await InventoryHold.create(
          [
            {
              checkoutToken: normalizedToken,
              vendorId: variant.vendorId,
              variantId: variant._id,
              quantity: line.quantity,
              expiresAt: holdExpiry,
            },
          ],
          { session },
        );
        await InventoryMovement.create(
          [
            {
              vendorId: variant.vendorId,
              variantId: variant._id,
              type: 'reservation',
              quantityDelta: -line.quantity,
              reference: { type: 'hold', id: hold._id },
              note: 'Checkout inventory reserved',
              actorId,
            },
          ],
          { session },
        );
        await ProductVariant.updateOne(
          { _id: variant._id },
          { $set: { 'inventory.available': item.available, 'inventory.reserved': item.reserved } },
          { session },
        );
        holds.push(hold);
      }
      result = holds;
    });
  } finally {
    await session.endSession();
  }
  return result;
}

async function transitionHold(
  holdId,
  { targetStatus, movementType, now = new Date(), actorId = null },
) {
  if (!mongoose.isValidObjectId(holdId)) {
    throw new InventoryHoldError(404, 'HOLD_NOT_FOUND', 'Inventory hold not found');
  }

  const session = await mongoose.startSession();
  let hold;
  try {
    await session.withTransaction(async () => {
      hold = await InventoryHold.findOne({ _id: holdId, status: 'active' }).session(session);
      if (!hold)
        throw new InventoryHoldError(409, 'HOLD_NOT_ACTIVE', 'Inventory hold is not active');
      if (targetStatus === 'consumed' && hold.expiresAt <= now) {
        throw new InventoryHoldError(409, 'HOLD_EXPIRED', 'Expired inventory cannot be consumed');
      }

      const inventoryUpdate =
        targetStatus === 'consumed'
          ? { $inc: { onHand: -hold.quantity, reserved: -hold.quantity, version: 1 } }
          : { $inc: { available: hold.quantity, reserved: -hold.quantity, version: 1 } };
      const item = await InventoryItem.findOneAndUpdate(
        { vendorId: hold.vendorId, variantId: hold.variantId, reserved: { $gte: hold.quantity } },
        inventoryUpdate,
        { new: true, runValidators: true, session },
      );
      if (!item) {
        throw new InventoryHoldError(
          409,
          'INVENTORY_INVARIANT_VIOLATION',
          'Reserved inventory no longer matches the active hold',
        );
      }

      hold.status = targetStatus;
      await hold.save({ session });
      await InventoryMovement.create(
        [
          {
            vendorId: hold.vendorId,
            variantId: hold.variantId,
            type: movementType,
            quantityDelta: targetStatus === 'consumed' ? -hold.quantity : hold.quantity,
            reference: { type: 'hold', id: hold._id },
            note:
              targetStatus === 'consumed'
                ? 'Checkout inventory sold'
                : 'Checkout inventory released',
            actorId,
          },
        ],
        { session },
      );
      await ProductVariant.updateOne(
        { _id: hold.variantId },
        { $set: { 'inventory.available': item.available, 'inventory.reserved': item.reserved } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return hold;
}

async function releaseHold(holdId, options = {}) {
  return transitionHold(holdId, { ...options, targetStatus: 'released', movementType: 'release' });
}

async function consumeHold(holdId, options = {}) {
  return transitionHold(holdId, { ...options, targetStatus: 'consumed', movementType: 'sale' });
}

async function releaseExpiredHolds({ limit = 100, now = new Date() } = {}) {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) {
    throw new InventoryHoldError(
      400,
      'INVALID_BATCH_LIMIT',
      'Batch limit must be between 1 and 1000',
    );
  }
  const expired = await InventoryHold.find({ status: 'active', expiresAt: { $lte: now } })
    .sort({ expiresAt: 1 })
    .limit(limit)
    .select('_id')
    .lean();
  const results = await Promise.allSettled(
    expired.map(({ _id }) =>
      transitionHold(_id, {
        targetStatus: 'expired',
        movementType: 'release',
        now,
      }),
    ),
  );
  return {
    released: results.filter((result) => result.status === 'fulfilled').length,
    skipped: results.filter((result) => result.status === 'rejected').length,
  };
}

module.exports = {
  InventoryHoldError,
  consumeHold,
  releaseExpiredHolds,
  releaseHold,
  reserveInventory,
};
