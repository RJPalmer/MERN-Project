const express = require('express');
const mongoose = require('mongoose');
const { requireAuth } = require('../auth/auth.middleware');
const { parseAddress } = require('./address.schemas');
const addressService = require('./address.service');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const addresses = await addressService.listAddresses(req.authUser.id);
  return res.json({ addresses });
});

router.post('/', async (req, res) => {
  const input = parseAddress(req.body);
  const address = await addressService.createAddress(req.authUser.id, input);
  return res.status(201).json({ address });
});

router.put('/:addressId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    return res.status(404).json({ error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' } });
  }
  const input = parseAddress(req.body);
  const address = await addressService.updateAddress(req.authUser.id, req.params.addressId, input);
  return res.json({ address });
});

router.delete('/:addressId', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    return res.status(404).json({ error: { code: 'ADDRESS_NOT_FOUND', message: 'Address not found' } });
  }
  const result = await addressService.deleteAddress(req.authUser.id, req.params.addressId);
  return res.json(result);
});

module.exports = router;
