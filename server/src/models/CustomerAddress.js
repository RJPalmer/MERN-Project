const mongoose = require('mongoose');

const customerAddressSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, required: true, trim: true, maxlength: 60, default: 'Home' },
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    addressLine1: { type: String, required: true, trim: true, maxlength: 160 },
    addressLine2: { type: String, trim: true, maxlength: 160, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    region: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, required: true, trim: true, maxlength: 20 },
    countryCode: { type: String, required: true, uppercase: true, minlength: 2, maxlength: 2 },
    isDefaultShipping: { type: Boolean, default: false },
    isDefaultBilling: { type: Boolean, default: false },
  },
  { timestamps: true },
);

customerAddressSchema.index(
  { customerId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefaultShipping: true },
    name: 'one_default_shipping_per_customer',
  },
);
customerAddressSchema.index(
  { customerId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefaultBilling: true },
    name: 'one_default_billing_per_customer',
  },
);
customerAddressSchema.index({ customerId: 1, createdAt: 1 });

module.exports =
  mongoose.models.CustomerAddress || mongoose.model('CustomerAddress', customerAddressSchema);
