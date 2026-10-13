const Vendor = require('../../models/Vendor');

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

module.exports = { AdminError, listPendingVendors, reviewVendor };
