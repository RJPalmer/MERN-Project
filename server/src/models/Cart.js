const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  quantity: { type: Number, required: true, min: 1, max: 9999 },
  addedAt: { type: Date, required: true, default: Date.now },
});

const cartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  currency: { type: String, uppercase: true, minlength: 3, maxlength: 3, default: 'USD', required: true },
  items: { type: [cartItemSchema], default: [] },
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartSchema);
