const Vendor = require('../../models/Vendor');
const VendorMember = require('../../models/VendorMember');

class VendorError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function presentVendor(vendor, role) {
  return {
    id: vendor.id,
    slug: vendor.slug,
    legalName: vendor.legalName,
    displayName: vendor.displayName,
    description: vendor.description,
    status: vendor.status,
    contact: vendor.contact,
    createdAt: vendor.createdAt,
    role,
  };
}

async function createVendor(userId, input) {
  let vendor;
  try {
    vendor = await Vendor.create({
      slug: input.slug,
      legalName: input.legalName,
      displayName: input.displayName,
      description: input.description,
      status: 'draft',
      contact: { email: input.contactEmail, phone: input.contactPhone },
    });
  } catch (error) {
    if (error.code === 11000) throw new VendorError(409, 'VENDOR_SLUG_IN_USE', 'This vendor slug is already in use');
    throw error;
  }

  try {
    await VendorMember.create({ vendorId: vendor.id, userId, role: 'owner', status: 'active' });
  } catch (error) {
    await Vendor.deleteOne({ _id: vendor.id });
    throw error;
  }

  return presentVendor(vendor, 'owner');
}

async function listMyVendors(userId) {
  const memberships = await VendorMember.find({ userId, status: 'active' })
    .populate({ path: 'vendorId', match: { status: { $ne: 'suspended' } } })
    .sort({ createdAt: 1 });

  return memberships
    .filter((membership) => membership.vendorId)
    .map((membership) => presentVendor(membership.vendorId, membership.role));
}

module.exports = { VendorError, createVendor, listMyVendors };
