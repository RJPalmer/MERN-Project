const Cart = require('../../models/Cart');
const CustomerAddress = require('../../models/CustomerAddress');
const InventoryItem = require('../../models/InventoryItem');
const ProductVariant = require('../../models/ProductVariant');

class CheckoutError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function money(amount, currency) {
  return { amount, currency };
}

async function createCheckoutQuote(customerId, addressId) {
  const cart = await Cart.findOne({ customerId }).lean();
  if (!cart || cart.items.length === 0) {
    throw new CheckoutError(400, 'CART_EMPTY', 'Add items to the cart before requesting a checkout quote');
  }

  const shippingAddress = addressId
    ? await CustomerAddress.findOne({ _id: addressId, customerId }).lean()
    : await CustomerAddress.findOne({ customerId, isDefaultShipping: true }).lean();
  if (addressId && !shippingAddress) {
    throw new CheckoutError(404, 'ADDRESS_NOT_FOUND', 'Shipping address not found');
  }

  const variantIds = cart.items.map((item) => item.variantId);
  const [variants, inventoryItems] = await Promise.all([
    ProductVariant.find({ _id: { $in: variantIds } })
      .populate({
        path: 'productId',
        select: 'title slug status vendorId media',
        populate: { path: 'vendorId', select: 'slug displayName status settings.visible' },
      })
      .lean(),
    InventoryItem.find({ variantId: { $in: variantIds } }).lean(),
  ]);

  const variantsById = new Map(variants.map((variant) => [variant._id.toString(), variant]));
  const inventoryByVariantId = new Map(inventoryItems.map((item) => [item.variantId.toString(), item]));
  const vendorGroups = new Map();
  const blockers = [
    ...(!shippingAddress
      ? [{ code: 'SHIPPING_ADDRESS_REQUIRED', message: 'Add or select a shipping address to continue' }]
      : []),
    { code: 'SHIPPING_NOT_CONFIGURED', message: 'Shipping rates are not configured yet' },
    { code: 'TAX_NOT_CONFIGURED', message: 'Tax calculation is not configured yet' },
    { code: 'PAYMENTS_NOT_CONFIGURED', message: 'Payment processing is not configured yet' },
  ];
  const invalidLines = [];
  let subtotalAmount = 0;
  let quoteCurrency = null;

  for (const cartLine of cart.items) {
    const variant = variantsById.get(cartLine.variantId.toString());
    const product = variant?.productId;
    const vendor = product?.vendorId;
    const lineId = cartLine.variantId.toString();

    if (!variant || !variant.active || product?.status !== 'active'
      || vendor?.status !== 'active' || vendor?.settings?.visible !== true) {
      invalidLines.push({ variantId: lineId, code: 'ITEM_UNAVAILABLE', message: 'This item is no longer available' });
      continue;
    }

    const unitPrice = variant.pricing.sale || variant.pricing.list;
    if (quoteCurrency && unitPrice.currency !== quoteCurrency) {
      throw new CheckoutError(409, 'CURRENCY_MISMATCH', 'Cart items must use a single currency');
    }
    quoteCurrency = unitPrice.currency;

    const lineAmount = unitPrice.amount * cartLine.quantity;
    if (!Number.isSafeInteger(lineAmount) || !Number.isSafeInteger(subtotalAmount + lineAmount)) {
      throw new CheckoutError(409, 'QUOTE_TOTAL_UNSUPPORTED', 'Cart total exceeds the supported money range');
    }
    subtotalAmount += lineAmount;

    const stock = inventoryByVariantId.get(lineId);
    const available = stock?.available ?? 0;
    const inStock = available >= cartLine.quantity;
    if (!inStock) {
      invalidLines.push({
        variantId: lineId,
        code: 'INSUFFICIENT_STOCK',
        message: `Only ${available} unit(s) are currently available`,
      });
    }

    let group = vendorGroups.get(vendor._id.toString());
    if (!group) {
      group = {
        vendor: { id: vendor._id, slug: vendor.slug, displayName: vendor.displayName },
        items: [],
        subtotalAmount: 0,
      };
      vendorGroups.set(vendor._id.toString(), group);
    }
    group.items.push({
      variantId: variant._id,
      productId: product._id,
      productSlug: product.slug,
      productTitle: product.title,
      variantTitle: variant.title,
      sku: variant.sku,
      quantity: cartLine.quantity,
      unitPrice,
      lineSubtotal: money(lineAmount, unitPrice.currency),
      available,
      inStock,
    });
    group.subtotalAmount += lineAmount;
  }

  if (invalidLines.length) {
    blockers.push(...invalidLines.map((line) => ({ code: line.code, message: line.message, variantId: line.variantId })));
  }

  quoteCurrency = quoteCurrency || cart.currency;
  const vendors = Array.from(vendorGroups.values()).map((group) => ({
    vendor: group.vendor,
    items: group.items,
    subtotal: money(group.subtotalAmount, quoteCurrency),
    shipping: null,
    tax: null,
  }));

  return {
    quote: {
      type: 'merchandise_preview',
      createdAt: new Date().toISOString(),
      currency: quoteCurrency,
      shippingAddress: shippingAddress ? {
        id: shippingAddress._id,
        recipientName: shippingAddress.recipientName,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        region: shippingAddress.region,
        postalCode: shippingAddress.postalCode,
        countryCode: shippingAddress.countryCode,
      } : null,
      vendors,
      subtotal: money(subtotalAmount, quoteCurrency),
      discount: money(0, quoteCurrency),
      shipping: null,
      tax: null,
      total: null,
      readyForPayment: blockers.length === 0,
      blockers,
    },
  };
}

module.exports = { CheckoutError, createCheckoutQuote };
