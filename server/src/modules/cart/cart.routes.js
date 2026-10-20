const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const { parseSetCartItem } = require('./cart.schemas');
const cartService = require('./cart.service');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const cart = await cartService.getCart(req.authUser.id);
  return res.json({ cart });
});

router.put('/items/:variantId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.variantId)) {
    return res
      .status(404)
      .json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
  }
  const { quantity } = parseSetCartItem(req.body);
  const cart = await cartService.setItemQuantity(req.authUser.id, req.params.variantId, quantity);
  return res.json({ cart });
});

router.delete('/items/:variantId', async (req, res) => {
  const cart = await cartService.removeItem(req.authUser.id, req.params.variantId);
  return res.json({ cart });
});

router.delete('/', async (req, res) => {
  const cart = await cartService.clearCart(req.authUser.id);
  return res.json({ cart });
});

module.exports = router;
