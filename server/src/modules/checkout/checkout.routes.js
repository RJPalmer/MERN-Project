const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const checkoutService = require('./checkout.service');

const router = express.Router();
router.use(requireAuth);

router.post('/quote', async (req, res) => {
  const { addressId } = req.body || {};
  if (addressId !== undefined && !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'addressId must be a valid address ID' },
    });
  }
  const result = await checkoutService.createCheckoutQuote(req.authUser.id, addressId);
  return res.json(result);
});

module.exports = router;
