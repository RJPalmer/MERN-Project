const mongoose = require('mongoose');

const vendorMemberSchema = new mongoose.Schema({
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'manager', 'fulfillment'], required: true },
  status: { type: String, enum: ['active', 'invited', 'suspended'], default: 'active', required: true },
}, { timestamps: true });

vendorMemberSchema.index({ vendorId: 1, userId: 1 }, { unique: true });
vendorMemberSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.models.VendorMember || mongoose.model('VendorMember', vendorMemberSchema);
