const mongoose = require('mongoose');

const moneySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, validate: Number.isSafeInteger },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
  },
  { _id: false },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    addressLine1: { type: String, required: true, trim: true, maxlength: 160 },
    addressLine2: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    countryCode: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null },
    currency: { type: String, required: true, uppercase: true, minlength: 3, maxlength: 3 },
    status: {
      type: String,
      enum: [
        'pending_payment',
        'paid',
        'partially_fulfilled',
        'fulfilled',
        'cancelled',
        'refunded',
      ],
      default: 'pending_payment',
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'partially_refunded', 'refunded', 'failed'],
      default: 'pending',
      required: true,
    },
    shippingAddress: { type: addressSnapshotSchema, required: true },
    billingAddress: { type: addressSnapshotSchema, required: true },
    vendorOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VendorOrder' }],
    totals: {
      subtotal: { type: moneySchema, required: true },
      discount: { type: moneySchema, required: true },
      shipping: { type: moneySchema, required: true },
      tax: { type: moneySchema, required: true },
      grandTotal: { type: moneySchema, required: true },
    },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    idempotencyKey: { type: String, required: true, trim: true, maxlength: 200 },
    metadata: {
      source: { type: String, trim: true, maxlength: 60, default: 'storefront' },
      purchaseOrderNumber: { type: String, trim: true, maxlength: 100, default: '' },
    },
    placedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ companyId: 1, createdAt: -1 });
orderSchema.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
