const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { createVendorSchema, parseShippingSettings } = require('./vendor.schemas');
const catalogRoutes = require('../catalog/catalog.routes');
const inventoryRoutes = require('../inventory/inventory.routes');
const { requireVendorManager, requireVendorOwner } = require('./vendor.middleware');
const vendorService = require('./vendor.service');

const router = express.Router();

function validateCreateVendor(body) {
  const result = createVendorSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({
      path: path.join('.'),
      message,
    }));
    throw error;
  }
  return result.data;
}

router.use(requireAuth);

router.use('/:vendorId/products', catalogRoutes);
router.use('/:vendorId/inventory', inventoryRoutes);

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
  const vendor = await vendorService.submitVendorForReview(req.params.vendorId, req.authUser.id);
  return res.json({ vendor });
});

router.get('/:vendorId/shipping', requireVendorManager, async (req, res) => {
  const shipping = await vendorService.getShippingSettings(req.params.vendorId);
  return res.json({ shipping });
});

router.put('/:vendorId/shipping', requireVendorManager, async (req, res) => {
  const shipping = parseShippingSettings(req.body);
  const updated = await vendorService.updateShippingSettings(req.params.vendorId, shipping);
  return res.json({ shipping: updated });
});

module.exports = router;
