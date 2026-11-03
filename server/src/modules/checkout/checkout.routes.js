const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const checkoutService = require('./checkout.service');

function createCheckoutRouter({
  service = checkoutService,
  requireAuthMiddleware = requireAuth,
  objectId = mongoose,
} = {}) {
  const router = express.Router();
  router.use(requireAuthMiddleware);

  router.post('/quote', async (req, res) => {
    const { addressId } = req.body || {};
    if (addressId !== undefined && !objectId.isValidObjectId(addressId)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'addressId must be a valid address ID' },
      });
    }
    const result = await service.createCheckoutQuote(req.authUser.id, addressId);
    return res.json(result);
  });

  return router;
}

module.exports = createCheckoutRouter();
module.exports.createCheckoutRouter = createCheckoutRouter;
