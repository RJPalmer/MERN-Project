const express = require('express');
const mongoose = require('mongoose');
const catalogService = require('./catalog.service');

const router = express.Router();

router.get('/', async (req, res) => {
  const query = req.query.q;
  const vendorSlug = req.query.vendor;
  if (
    (query !== undefined && typeof query !== 'string') ||
    (vendorSlug !== undefined && typeof vendorSlug !== 'string')
  ) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'q and vendor must be single strings' },
    });
  }
  if (
    (query && query.length > 100) ||
    (vendorSlug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vendorSlug))
  ) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid search query or vendor slug' },
    });
  }

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
  const cursor = req.query.cursor;
  if (cursor !== undefined && (typeof cursor !== 'string' || !mongoose.isValidObjectId(cursor))) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid cursor' } });
  }

  const result = await catalogService.listStorefrontProducts({ query, vendorSlug, limit, cursor });
  return res.json(result);
});

router.get('/:vendorSlug/:productSlug', async (req, res) => {
  const { vendorSlug, productSlug } = req.params;
  if (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(vendorSlug) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)
  ) {
    return res
      .status(404)
      .json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
  }

  const product = await catalogService.getStorefrontProduct(vendorSlug, productSlug);
  if (!product)
    return res
      .status(404)
      .json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
  return res.json({ product });
});

module.exports = router;
