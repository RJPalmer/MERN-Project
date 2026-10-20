const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductVariant', required: true },
    type: {
      type: String,
      enum: ['receipt', 'adjustment', 'reservation', 'release', 'sale', 'return'],
      required: true,
    },
    quantityDelta: { type: Number, required: true, validate: Number.isSafeInteger },
    reference: {
      type: { type: String, enum: ['manual', 'order', 'hold'], required: true },
      id: { type: mongoose.Schema.Types.ObjectId, default: null },
    },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, versionKey: false },
);

inventoryMovementSchema.index({ vendorId: 1, variantId: 1, createdAt: -1 });

module.exports =
  mongoose.models.InventoryMovement || mongoose.model('InventoryMovement', inventoryMovementSchema);
