const mongoose = require('mongoose');

const moneySchema = new mongoose.Schema({
  amount: { type: Number, required: true, validate: Number.isSafeInteger },
  currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
}, { _id: false });

const optionValueSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  value: { type: String, required: true, trim: true, maxlength: 120 },
}, { _id: false });

const addressSnapshotSchema = new mongoose.Schema({
  recipientName: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  addressLine1: { type: String, required: true, trim: true, maxlength: 160 },
  addressLine2: { type: String, trim: true, maxlength: 160, default: '' },
  city: { type: String, required: true, trim: true, maxlength: 100 },
  region: { type: String, required: true, trim: true, maxlength: 100 },
  postalCode: { type: String, required: true, trim: true, maxlength: 20 },
  countryCode: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
}, { _id: false });

const orderItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  sku: { type: String, required: true, trim: true, maxlength: 100 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  optionValues: { type: [optionValueSchema], default: [] },
  image: { type: String, trim: true, maxlength: 2048, default: '' },
  quantity: { type: Number, required: true, min: 1, max: 9999, validate: Number.isSafeInteger },
  unitPrice: { type: moneySchema, required: true },
  discount: { type: moneySchema, required: true },
  tax: { type: moneySchema, required: true },
  lineTotal: { type: moneySchema, required: true },
  commissionRateBps: { type: Number, required: true, min: 0, max: 10000, validate: Number.isSafeInteger },
  commissionAmount: { type: moneySchema, required: true },
});

const trackingSchema = new mongoose.Schema({
  carrier: { type: String, trim: true, maxlength: 100, default: '' },
  number: { type: String, trim: true, maxlength: 160, default: '' },
  url: { type: String, trim: true, maxlength: 2048, default: '' },
  shippedAt: { type: Date, default: null },
}, { _id: false });

const vendorOrderSchema = new mongoose.Schema({
  parentOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  vendorOrderNumber: { type: String, required: true, trim: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
  status: {
    type: String,
    enum: ['awaiting_payment', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'awaiting_payment',
    required: true,
  },
  items: { type: [orderItemSchema], required: true, validate: (items) => items.length > 0 },
  shipping: {
    method: { type: String, trim: true, maxlength: 100, default: '' },
    cost: { type: moneySchema, required: true },
    address: { type: addressSnapshotSchema, required: true },
    tracking: { type: [trackingSchema], default: [] },
  },
  totals: {
    subtotal: { type: moneySchema, required: true },
    discount: { type: moneySchema, required: true },
    shipping: { type: moneySchema, required: true },
    tax: { type: moneySchema, required: true },
    grandTotal: { type: moneySchema, required: true },
    commission: { type: moneySchema, required: true },
    vendorNet: { type: moneySchema, required: true },
  },
  fulfillment: {
    warehouseLocationId: { type: mongoose.Schema.Types.ObjectId, default: null },
    shippedAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  settlement: {
    providerTransferId: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'eligible', 'transferred', 'reversed'], default: 'pending' },
  },
}, { timestamps: true });

vendorOrderSchema.index({ vendorId: 1, createdAt: -1 });
vendorOrderSchema.index({ parentOrderId: 1 });
vendorOrderSchema.index({ vendorId: 1, status: 1, createdAt: -1 });
vendorOrderSchema.index({ vendorId: 1, vendorOrderNumber: 1 }, { unique: true });

module.exports = mongoose.models.VendorOrder || mongoose.model('VendorOrder', vendorOrderSchema);
