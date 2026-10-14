const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { requireVendorFulfillment } = require('../vendors/vendor.middleware');
const { parsePage } = require('./order.pagination');
const { parseShipment } = require('./order.schemas');
const orderService = require('./order.service');

const router = express.Router({ mergeParams: true });
const vendorOrderStatuses = ['awaiting_payment', 'processing', 'partially_shipped', 'shipped', 'delivered', 'cancelled', 'returned'];

router.use(requireAuth, requireVendorFulfillment);

router.get('/', async (req, res) => {
  const page = parsePage(req.query, vendorOrderStatuses);
  const result = await orderService.listVendorOrders(req.params.vendorId, page);
  return res.json(result);
});

router.get('/:vendorOrderNumber', async (req, res) => {
  const order = await orderService.getVendorOrder(req.params.vendorId, req.params.vendorOrderNumber);
  return res.json({ order });
});

router.post('/:vendorOrderNumber/shipments', async (req, res) => {
  const tracking = parseShipment(req.body);
  const order = await orderService.recordShipment(
    req.params.vendorId,
    req.params.vendorOrderNumber,
    tracking,
  );
  return res.json({ order });
});

module.exports = router;
