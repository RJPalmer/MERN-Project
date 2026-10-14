const mongoose = require('mongoose');

const inventoryHoldSchema = new mongoose.Schema({
  checkoutToken: { type: String, required: true, trim: true, maxlength: 200 },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  quantity: { type: Number, required: true, min: 1, max: 9999, validate: Number.isSafeInteger },
  status: { type: String, enum: ['active', 'consumed', 'released', 'expired'], default: 'active', required: true },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });

inventoryHoldSchema.index({ checkoutToken: 1, variantId: 1 }, { unique: true });
inventoryHoldSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.models.InventoryHold || mongoose.model('InventoryHold', inventoryHoldSchema);
