const mongoose = require('mongoose');
const InventoryItem = require('../../models/InventoryItem');
const InventoryMovement = require('../../models/InventoryMovement');
const ProductVariant = require('../../models/ProductVariant');

class InventoryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function listInventory(vendorId) {
  const items = await InventoryItem.find({ vendorId })
    .populate({ path: 'variantId', select: 'sku title productId active' })
    .sort({ updatedAt: -1 });

  return items
    .filter((item) => item.variantId)
    .map((item) => ({
      id: item.id,
      vendorId: item.vendorId,
      variant: item.variantId,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.available,
      version: item.version,
      updatedAt: item.updatedAt,
    }));
}

async function listMovements(vendorId, variantId, limit) {
  return InventoryMovement.find({ vendorId, variantId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function adjustStock({ vendorId, variantId, actorId, type, quantityDelta, note }) {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      const variant = await ProductVariant.findOne({
        _id: variantId,
        vendorId,
        active: true,
      }).session(session);
      if (!variant)
        throw new InventoryError(
          404,
          'VARIANT_NOT_FOUND',
          'Active variant not found for this vendor',
        );

      await InventoryItem.updateOne(
        { variantId, vendorId },
        { $setOnInsert: { onHand: 0, reserved: 0, available: 0, version: 0 } },
        { upsert: true, session },
      );

      const inventoryFilter = { vendorId, variantId };
      if (quantityDelta < 0) inventoryFilter.available = { $gte: -quantityDelta };

      const item = await InventoryItem.findOneAndUpdate(
        inventoryFilter,
        { $inc: { onHand: quantityDelta, available: quantityDelta, version: 1 } },
        { new: true, runValidators: true, session },
      );
      if (!item) {
        throw new InventoryError(
          409,
          'INSUFFICIENT_STOCK',
          'Adjustment would reduce available stock below zero',
        );
      }

      const [movement] = await InventoryMovement.create(
        [
          {
            vendorId,
            variantId,
            type,
            quantityDelta,
            reference: { type: 'manual', id: null },
            note,
            actorId,
          },
        ],
        { session },
      );

      await ProductVariant.updateOne(
        { _id: variantId, vendorId },
        { $set: { 'inventory.available': item.available, 'inventory.reserved': item.reserved } },
        { session },
      );

      result = {
        inventory: {
          id: item.id,
          vendorId: item.vendorId,
          variant: {
            id: variant.id,
            sku: variant.sku,
            title: variant.title,
            productId: variant.productId,
          },
          onHand: item.onHand,
          reserved: item.reserved,
          available: item.available,
          version: item.version,
        },
        movement: {
          id: movement.id,
          type: movement.type,
          quantityDelta: movement.quantityDelta,
          note: movement.note,
          actorId: movement.actorId,
          createdAt: movement.createdAt,
        },
      };
    });
  } finally {
    await session.endSession();
  }

  return result;
}

module.exports = { InventoryError, adjustStock, listInventory, listMovements };
