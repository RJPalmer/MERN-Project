const Vendor = require('../../models/Vendor');
const Product = require('../../models/Product');
const ProductVariant = require('../../models/ProductVariant');

class AdminError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function listPendingVendors(limit) {
  return Vendor.find({ status: 'pending_review' })
    .sort({ updatedAt: 1 })
    .limit(limit)
    .select('slug legalName displayName description contact status reviewHistory createdAt updatedAt')
    .lean();
}

async function reviewVendor(vendorId, reviewerId, decision) {
  const action = decision.status === 'active' ? 'approved' : 'rejected';
  const reason = decision.status === 'rejected' ? decision.reason : '';
  const reviewedAt = new Date();
  const vendor = await Vendor.findOneAndUpdate(
    { _id: vendorId, status: 'pending_review' },
    {
      $set: {
        status: decision.status,
        'review.reviewedBy': reviewerId,
        'review.reviewedAt': reviewedAt,
        'review.rejectionReason': reason,
        'settings.visible': decision.status === 'active',
      },
      $push: {
        reviewHistory: {
          action,
          actorId: reviewerId,
          reason,
          occurredAt: reviewedAt,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!vendor) {
    throw new AdminError(409, 'VENDOR_NOT_PENDING', 'Vendor does not exist or is not awaiting review');
  }

  return {
    id: vendor.id,
    slug: vendor.slug,
    displayName: vendor.displayName,
    status: vendor.status,
    visible: vendor.settings.visible,
    review: vendor.review,
    reviewHistory: vendor.reviewHistory,
  };
}

async function listPendingProducts(limit) {
  return Product.find({ status: 'pending_review' })
    .sort({ updatedAt: 1 })
    .limit(limit)
    .populate({ path: 'vendorId', select: 'slug displayName status settings.visible' })
    .select('vendorId slug title shortDescription brand status createdAt updatedAt')
    .lean();
}

async function reviewProduct(productId, reviewerId, decision) {
  const product = await Product.findOne({ _id: productId, status: 'pending_review' }).select('vendorId');
  if (!product) throw new AdminError(409, 'PRODUCT_NOT_PENDING', 'Product does not exist or is not awaiting review');

  if (decision.status === 'active') {
    const [vendor, activeVariant] = await Promise.all([
      Vendor.findOne({ _id: product.vendorId, status: 'active', 'settings.visible': true }).select('_id'),
      ProductVariant.findOne({ productId, active: true }).select('_id'),
    ]);
    if (!vendor) throw new AdminError(409, 'VENDOR_NOT_ACTIVE', 'Product vendor must be approved and visible');
    if (!activeVariant) throw new AdminError(409, 'PRODUCT_HAS_NO_ACTIVE_VARIANTS', 'Product needs at least one active variant');
  }

  const action = decision.status === 'active' ? 'approved' : 'rejected';
  const reason = decision.status === 'rejected' ? decision.reason : '';
  const reviewedAt = new Date();
  const reviewed = await Product.findOneAndUpdate(
    { _id: productId, status: 'pending_review' },
    {
      $set: {
        status: decision.status,
        publishedAt: decision.status === 'active' ? reviewedAt : null,
        'review.reviewedBy': reviewerId,
        'review.reviewedAt': reviewedAt,
        'review.rejectionReason': reason,
      },
      $push: {
        reviewHistory: { action, actorId: reviewerId, reason, occurredAt: reviewedAt },
      },
    },
    { new: true, runValidators: true },
  );
  if (!reviewed) throw new AdminError(409, 'PRODUCT_NOT_PENDING', 'Product has already been reviewed');

  return {
    id: reviewed.id,
    vendorId: reviewed.vendorId,
    slug: reviewed.slug,
    title: reviewed.title,
    status: reviewed.status,
    review: reviewed.review,
    reviewHistory: reviewed.reviewHistory,
  };
}

module.exports = { AdminError, listPendingProducts, listPendingVendors, reviewProduct, reviewVendor };
