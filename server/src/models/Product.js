const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  alt: { type: String, trim: true, default: '' },
  type: { type: String, enum: ['image', 'video'], default: 'image' },
  sortOrder: { type: Number, min: 0, default: 0 },
}, { _id: false });

const attributeSchema = new mongoose.Schema({
  key: { type: String, required: true, trim: true },
  label: { type: String, required: true, trim: true },
  value: { type: String, required: true, trim: true },
}, { _id: false });

const optionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  values: { type: [String], required: true },
}, { _id: false });

const reviewHistoryEntrySchema = new mongoose.Schema({
  action: { type: String, enum: ['submitted', 'approved', 'rejected'], required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, trim: true, maxlength: 1000, default: '' },
  occurredAt: { type: Date, required: true, default: Date.now },
});

const productSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  slug: { type: String, required: true, lowercase: true, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  shortDescription: { type: String, trim: true, maxlength: 300, default: '' },
  description: { type: String, trim: true, maxlength: 10000, default: '' },
  brand: { type: String, trim: true, maxlength: 100, default: '' },
  status: { type: String, enum: ['draft', 'pending_review', 'active', 'rejected', 'archived'], default: 'draft', required: true },
  review: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  reviewHistory: { type: [reviewHistoryEntrySchema], default: [] },
  publishedAt: { type: Date, default: null },
  media: { type: [mediaSchema], default: [] },
  attributes: { type: [attributeSchema], default: [] },
  options: { type: [optionSchema], default: [] },
  variantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant' }],
}, { timestamps: true });

productSchema.index({ vendorId: 1, slug: 1 }, { unique: true });
productSchema.index({ vendorId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
