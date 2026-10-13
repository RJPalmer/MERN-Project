const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { requireVendorManager } = require('../vendors/vendor.middleware');
const { createProductSchema } = require('./catalog.schemas');
const catalogService = require('./catalog.service');

const router = express.Router({ mergeParams: true });

function validateCreateProduct(body) {
  const result = createProductSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

router.use(requireAuth, requireVendorManager);

router.post('/', async (req, res) => {
  const input = validateCreateProduct(req.body);
  const product = await catalogService.createProduct(req.params.vendorId, input);
  return res.status(201).json({ product });
});

router.get('/', async (req, res) => {
  const products = await catalogService.listVendorProducts(req.params.vendorId);
  return res.json({ products });
});

module.exports = router;
