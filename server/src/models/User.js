const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, required: true, trim: true, maxlength: 80 },
    status: {
      type: String,
      enum: ['active', 'suspended', 'invited'],
      default: 'active',
      required: true,
    },
    platformRole: {
      type: String,
      enum: ['customer', 'support', 'admin'],
      default: 'customer',
      required: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    auth: {
      refreshTokenHash: { type: String, default: null, select: false },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
