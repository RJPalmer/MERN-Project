const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const { parsePage } = require('./order.pagination');
const orderService = require('./order.service');

const router = express.Router();
const orderStatuses = ['pending_payment', 'paid', 'partially_fulfilled', 'fulfilled', 'cancelled', 'refunded'];

router.use(requireAuth);

router.get('/', async (req, res) => {
  const page = parsePage(req.query, orderStatuses);
  const result = await orderService.listCustomerOrders(req.authUser.id, page);
  return res.json(result);
});

router.get('/:orderNumber', async (req, res) => {
  const order = await orderService.getCustomerOrder(req.authUser.id, req.params.orderNumber);
  return res.json({ order });
});

module.exports = router;
