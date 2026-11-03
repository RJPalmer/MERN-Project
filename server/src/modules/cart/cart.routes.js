const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const { parseSetCartItem } = require('./cart.schemas');
const cartService = require('./cart.service');

function createCartRouter({
  service = cartService,
  requireAuthMiddleware = requireAuth,
  objectId = mongoose,
} = {}) {
  const router = express.Router();
  router.use(requireAuthMiddleware);

  router.get('/', async (req, res) => {
    const cart = await service.getCart(req.authUser.id);
    return res.json({ cart });
  });

  router.put('/items/:variantId', async (req, res) => {
    if (!objectId.isValidObjectId(req.params.variantId)) {
      return res
        .status(404)
        .json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
    }
    const { quantity } = parseSetCartItem(req.body);
    const cart = await service.setItemQuantity(req.authUser.id, req.params.variantId, quantity);
    return res.json({ cart });
  });

  router.delete('/items/:variantId', async (req, res) => {
    const cart = await service.removeItem(req.authUser.id, req.params.variantId);
    return res.json({ cart });
  });

  router.delete('/', async (req, res) => {
    const cart = await service.clearCart(req.authUser.id);
    return res.json({ cart });
  });

  return router;
}

module.exports = createCartRouter();
module.exports.createCartRouter = createCartRouter;
