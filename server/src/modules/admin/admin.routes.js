const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const { requireAdmin } = require('./admin.middleware');
const { parseReviewVendor } = require('./admin.schemas');
const adminService = require('./admin.service');

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/vendors/pending', async (req, res) => {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const vendors = await adminService.listPendingVendors(limit);
  return res.json({ vendors });
});

router.patch('/vendors/:vendorId/review', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.vendorId)) {
    return res.status(404).json({ error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } });
  }
  const decision = parseReviewVendor(req.body);
  const vendor = await adminService.reviewVendor(req.params.vendorId, req.authUser.id, decision);
  return res.json({ vendor });
});

module.exports = router;
