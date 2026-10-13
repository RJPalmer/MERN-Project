const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const { requireVendorManager } = require('../vendors/vendor.middleware');
const { parseStockAdjustment } = require('./inventory.schemas');
const inventoryService = require('./inventory.service');

const router = express.Router({ mergeParams: true });
router.use(requireAuth, requireVendorManager);

router.get('/', async (req, res) => {
  const items = await inventoryService.listInventory(req.params.vendorId);
  return res.json({ inventory: items });
});

router.get('/:variantId/movements', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.variantId)) {
    return res.status(404).json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
  }
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;
  const movements = await inventoryService.listMovements(req.params.vendorId, req.params.variantId, limit);
  return res.json({ movements });
});

router.post('/:variantId/adjustments', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.variantId)) {
    return res.status(404).json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
  }
  const input = parseStockAdjustment(req.body);
  const result = await inventoryService.adjustStock({
    ...input,
    vendorId: req.params.vendorId,
    variantId: req.params.variantId,
    actorId: req.authUser.id,
  });
  return res.status(201).json(result);
});

module.exports = router;
