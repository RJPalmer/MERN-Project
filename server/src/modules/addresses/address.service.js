const mongoose = require('mongoose');
const CustomerAddress = require('../../models/CustomerAddress');

class AddressError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function changeDefaults(customerId, address, session) {
  if (address.isDefaultShipping) {
    await CustomerAddress.updateMany(
      { customerId, isDefaultShipping: true },
      { $set: { isDefaultShipping: false } },
      { session },
    );
  }
  if (address.isDefaultBilling) {
    await CustomerAddress.updateMany(
      { customerId, isDefaultBilling: true },
      { $set: { isDefaultBilling: false } },
      { session },
    );
  }
}

async function listAddresses(customerId) {
  return CustomerAddress.find({ customerId }).sort({ isDefaultShipping: -1, isDefaultBilling: -1, createdAt: 1 }).lean();
}

async function createAddress(customerId, input) {
  const session = await mongoose.startSession();
  let address;
  try {
    await session.withTransaction(async () => {
      const hasAddresses = await CustomerAddress.exists({ customerId }).session(session);
      const value = {
        ...input,
        customerId,
        isDefaultShipping: input.isDefaultShipping || !hasAddresses,
        isDefaultBilling: input.isDefaultBilling || !hasAddresses,
      };
      await changeDefaults(customerId, value, session);
      [address] = await CustomerAddress.create([value], { session });
    });
  } finally {
    await session.endSession();
  }
  return address;
}

async function updateAddress(customerId, addressId, input) {
  const session = await mongoose.startSession();
  let address;
  try {
    await session.withTransaction(async () => {
      const exists = await CustomerAddress.exists({ _id: addressId, customerId }).session(session);
      if (!exists) throw new AddressError(404, 'ADDRESS_NOT_FOUND', 'Address not found');
      await changeDefaults(customerId, input, session);
      address = await CustomerAddress.findOneAndUpdate(
        { _id: addressId, customerId },
        { $set: input },
        { new: true, runValidators: true, session },
      );
    });
  } finally {
    await session.endSession();
  }
  return address;
}

async function deleteAddress(customerId, addressId) {
  const session = await mongoose.startSession();
  let deleted;
  try {
    await session.withTransaction(async () => {
      deleted = await CustomerAddress.findOneAndDelete({ _id: addressId, customerId }, { session });
      if (!deleted) throw new AddressError(404, 'ADDRESS_NOT_FOUND', 'Address not found');

      if (deleted.isDefaultShipping || deleted.isDefaultBilling) {
        const nextAddress = await CustomerAddress.findOne({ customerId }).sort({ createdAt: 1 }).session(session);
        if (nextAddress) {
          const defaults = {};
          if (deleted.isDefaultShipping) defaults.isDefaultShipping = true;
          if (deleted.isDefaultBilling) defaults.isDefaultBilling = true;
          await CustomerAddress.updateOne({ _id: nextAddress.id, customerId }, { $set: defaults }, { session });
        }
      }
    });
  } finally {
    await session.endSession();
  }
  return { id: deleted.id, deleted: true };
}

module.exports = { AddressError, createAddress, deleteAddress, listAddresses, updateAddress };
