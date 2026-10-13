const express = require('express');
const { requireAuth } = require('../auth/auth.middleware');
const checkoutService = require('./checkout.service');

const router = express.Router();
router.use(requireAuth);

router.post('/quote', async (req, res) => {
  const result = await checkoutService.createCheckoutQuote(req.authUser.id);
  return res.json(result);
});

module.exports = router;
