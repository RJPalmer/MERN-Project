const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  legalName: { type: String, required: true, trim: true, maxlength: 160 },
  displayName: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  status: {
    type: String,
    enum: ['draft', 'pending_review', 'active', 'suspended', 'rejected'],
    default: 'draft',
    required: true,
  },
  contact: {
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
  },
  review: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  settings: {
    fulfillmentLeadDays: { type: Number, min: 0, default: 2 },
    allowBackorders: { type: Boolean, default: false },
    visible: { type: Boolean, default: false },
  },
}, { timestamps: true });

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
