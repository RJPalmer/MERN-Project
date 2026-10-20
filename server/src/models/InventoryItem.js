const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      unique: true,
    },
    onHand: { type: Number, required: true, min: 0, default: 0 },
    reserved: { type: Number, required: true, min: 0, default: 0 },
    available: { type: Number, required: true, min: 0, default: 0 },
    version: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
);

inventoryItemSchema.index({ vendorId: 1, updatedAt: -1 });

module.exports =
  mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
