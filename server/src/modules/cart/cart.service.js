const mongoose = require('mongoose');
const Cart = require('../../models/Cart');
const ProductVariant = require('../../models/ProductVariant');

class CartError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function getOrCreateCart(customerId) {
  try {
    return await Cart.findOneAndUpdate(
      { customerId },
      { $setOnInsert: { customerId, currency: 'USD', items: [] } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code === 11000) return Cart.findOne({ customerId });
    throw error;
  }
}

async function populateCart(cart) {
  await cart.populate({
    path: 'items.variantId',
    select: 'title sku pricing inventory active productId vendorId',
    populate: {
      path: 'productId',
      select: 'title slug status vendorId media',
      populate: { path: 'vendorId', select: 'slug displayName status settings.visible' },
    },
  });
  return cart;
}

function currentPrice(variant) {
  return variant.pricing.sale || variant.pricing.list;
}

function presentCart(cart) {
  const items = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const variant = item.variantId;
    if (!variant) {
      items.push({
        id: item.id,
        variantId: null,
        vendorId: item.vendorId,
        quantity: item.quantity,
        available: false,
        issue: 'Variant no longer exists',
      });
      continue;
    }

    const product = variant.productId;
    const vendor = product?.vendorId;
    const purchasable =
      variant.active &&
      product?.status === 'active' &&
      vendor?.status === 'active' &&
      vendor?.settings?.visible === true;
    const stockAvailable = (variant.inventory?.available ?? 0) >= item.quantity;
    const price = currentPrice(variant);
    const lineSubtotal = price.amount * item.quantity;
    if (
      !Number.isSafeInteger(lineSubtotal) ||
      !Number.isSafeInteger(subtotal + (purchasable ? lineSubtotal : 0))
    ) {
      throw new CartError(
        500,
        'INVALID_CART_TOTAL',
        'Cart total is outside the supported money range',
      );
    }
    if (purchasable) subtotal += lineSubtotal;

    items.push({
      id: item.id,
      variantId: variant.id,
      vendorId: item.vendorId,
      quantity: item.quantity,
      addedAt: item.addedAt,
      available: purchasable && stockAvailable,
      issue: !purchasable
        ? 'Product or vendor is no longer available'
        : stockAvailable
          ? null
          : 'Insufficient current stock',
      product: product ? { title: product.title, slug: product.slug, media: product.media } : null,
      vendor: vendor ? { slug: vendor.slug, displayName: vendor.displayName } : null,
      variant: { title: variant.title, sku: variant.sku, optionValues: variant.optionValues },
      unitPrice: price,
      lineSubtotal: purchasable ? lineSubtotal : null,
    });
  }

  return {
    id: cart.id,
    currency: cart.currency,
    items,
    subtotal: { amount: subtotal, currency: cart.currency },
    updatedAt: cart.updatedAt,
  };
}

async function getCart(customerId) {
  const cart = await getOrCreateCart(customerId);
  await populateCart(cart);
  return presentCart(cart);
}

async function setItemQuantity(customerId, variantId, quantity) {
  if (!mongoose.isValidObjectId(variantId))
    throw new CartError(404, 'VARIANT_NOT_FOUND', 'Variant not found');

  const variant = await ProductVariant.findById(variantId).populate({
    path: 'productId',
    populate: { path: 'vendorId', select: 'status settings.visible' },
  });
  const product = variant?.productId;
  const vendor = product?.vendorId;
  if (
    !variant?.active ||
    product?.status !== 'active' ||
    vendor?.status !== 'active' ||
    vendor?.settings?.visible !== true
  ) {
    throw new CartError(404, 'VARIANT_NOT_PURCHASABLE', 'Active catalog variant not found');
  }

  const cart = await getOrCreateCart(customerId);
  const price = currentPrice(variant);
  if (!Number.isSafeInteger(price.amount * quantity)) {
    throw new CartError(400, 'INVALID_QUANTITY', 'Quantity creates an unsupported line total');
  }
  const otherItems = cart.items.filter((item) => item.variantId.toString() !== variantId);
  if (otherItems.length && cart.currency !== price.currency) {
    throw new CartError(409, 'CURRENCY_MISMATCH', 'A cart can contain items in only one currency');
  }

  const existingItem = cart.items.find((item) => item.variantId.toString() === variantId);
  if (existingItem) existingItem.quantity = quantity;
  else cart.items.push({ variantId, vendorId: variant.vendorId, quantity });
  if (!otherItems.length) cart.currency = price.currency;

  try {
    await cart.save();
  } catch (error) {
    if (error.name === 'VersionError')
      throw new CartError(409, 'CART_CHANGED', 'Cart changed concurrently; reload and retry');
    throw error;
  }

  await populateCart(cart);
  return presentCart(cart);
}

async function removeItem(customerId, variantId) {
  if (!mongoose.isValidObjectId(variantId))
    throw new CartError(404, 'VARIANT_NOT_FOUND', 'Variant not found');
  const cart = await getOrCreateCart(customerId);
  cart.items = cart.items.filter((item) => item.variantId.toString() !== variantId);
  if (!cart.items.length) cart.currency = 'USD';
  try {
    await cart.save();
  } catch (error) {
    if (error.name === 'VersionError')
      throw new CartError(409, 'CART_CHANGED', 'Cart changed concurrently; reload and retry');
    throw error;
  }
  await populateCart(cart);
  return presentCart(cart);
}

async function clearCart(customerId) {
  const cart = await getOrCreateCart(customerId);
  cart.items = [];
  cart.currency = 'USD';
  try {
    await cart.save();
  } catch (error) {
    if (error.name === 'VersionError')
      throw new CartError(409, 'CART_CHANGED', 'Cart changed concurrently; reload and retry');
    throw error;
  }
  return presentCart(cart);
}

module.exports = { CartError, clearCart, getCart, removeItem, setItemQuantity };
