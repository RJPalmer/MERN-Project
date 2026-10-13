const mongoose = require('mongoose');

const moneySchema = new mongoose.Schema({
  amount: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
}, { _id: false });

const optionValueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const productVariantSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  sku: { type: String, required: true, uppercase: true, trim: true },
  barcode: { type: String, trim: true, default: '' },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  optionValues: { type: [optionValueSchema], default: [] },
  pricing: {
    list: { type: moneySchema, required: true },
    sale: { type: moneySchema, default: undefined },
  },
  inventory: {
    available: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
  },
  active: { type: Boolean, default: true, required: true },
}, { timestamps: true });

productVariantSchema.index({ vendorId: 1, sku: 1 }, { unique: true });
productVariantSchema.index({ productId: 1, active: 1 });

module.exports = mongoose.models.ProductVariant || mongoose.model('ProductVariant', productVariantSchema);
