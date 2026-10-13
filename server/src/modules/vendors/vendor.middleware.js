const mongoose = require('mongoose');
const VendorMember = require('../../models/VendorMember');

async function requireVendorManager(req, res, next) {
  const { vendorId } = req.params;
  if (!mongoose.isValidObjectId(vendorId)) {
    return res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } });
  }

  try {
    const membership = await VendorMember.findOne({
      vendorId,
      userId: req.authUser.id,
      status: 'active',
      role: { $in: ['owner', 'manager'] },
    }).populate({ path: 'vendorId', select: 'status' });

    if (!membership?.vendorId || membership.vendorId.status === 'suspended') {
      return res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } });
    }

    req.vendorMembership = membership;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireVendorManager };
