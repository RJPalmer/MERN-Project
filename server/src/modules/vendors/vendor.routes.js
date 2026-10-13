const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { createVendorSchema } = require('./vendor.schemas');
const catalogRoutes = require('../catalog/catalog.routes');
const { requireVendorOwner } = require('./vendor.middleware');
const vendorService = require('./vendor.service');

const router = express.Router();

function validateCreateVendor(body) {
  const result = createVendorSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

router.use(requireAuth);

router.use('/:vendorId/products', catalogRoutes);

router.post('/', async (req, res) => {
  const input = validateCreateVendor(req.body);
  const vendor = await vendorService.createVendor(req.authUser.id, input);
  return res.status(201).json({ vendor });
});

router.get('/mine', async (req, res) => {
  const vendors = await vendorService.listMyVendors(req.authUser.id);
  return res.json({ vendors });
});

router.post('/:vendorId/submit', requireVendorOwner, async (req, res) => {
  const vendor = await vendorService.submitVendorForReview(req.params.vendorId);
  return res.json({ vendor });
});

module.exports = router;
