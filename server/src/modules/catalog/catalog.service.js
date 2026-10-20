const Product = require('../../models/Product');
const ProductVariant = require('../../models/ProductVariant');
const Vendor = require('../../models/Vendor');

class CatalogError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function presentProduct(product, variants) {
  return {
    id: product.id,
    vendorId: product.vendorId,
    slug: product.slug,
    title: product.title,
    shortDescription: product.shortDescription,
    description: product.description,
    brand: product.brand,
    status: product.status,
    review: product.review,
    reviewHistory: product.reviewHistory,
    media: product.media,
    attributes: product.attributes,
    options: product.options,
    variants: variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      title: variant.title,
      optionValues: variant.optionValues,
      pricing: variant.pricing,
      active: variant.active,
    })),
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function createProduct(vendorId, input) {
  const skus = input.variants.map(({ sku }) => sku.toUpperCase());
  if (new Set(skus).size !== skus.length) {
    throw new CatalogError(400, 'DUPLICATE_SKU', 'Each variant must have a unique SKU');
  }

  let product;
  try {
    product = await Product.create({
      vendorId,
      slug: input.slug,
      title: input.title,
      shortDescription: input.shortDescription,
      description: input.description,
      brand: input.brand,
      status: 'draft',
      media: input.media,
      attributes: input.attributes,
      options: input.options,
    });
  } catch (error) {
    if (error.code === 11000)
      throw new CatalogError(
        409,
        'PRODUCT_SLUG_IN_USE',
        'This product slug is already in use for the vendor',
      );
    throw error;
  }

  try {
    const variants = await ProductVariant.insertMany(
      input.variants.map((variant) => ({
        ...variant,
        productId: product.id,
        vendorId,
      })),
      { ordered: true },
    );
    product.variantIds = variants.map((variant) => variant.id);
    await product.save();
    return presentProduct(product, variants);
  } catch (error) {
    await Promise.all([
      ProductVariant.deleteMany({ productId: product.id }),
      Product.deleteOne({ _id: product.id }),
    ]);
    if (error.code === 11000)
      throw new CatalogError(409, 'SKU_IN_USE', 'A variant SKU is already in use for this vendor');
    throw error;
  }
}

async function listVendorProducts(vendorId) {
  const products = await Product.find({ vendorId }).sort({ createdAt: -1 });
  if (!products.length) return [];

  const variants = await ProductVariant.find({
    productId: { $in: products.map((product) => product.id) },
  });
  const variantsByProductId = new Map();
  for (const variant of variants) {
    const productKey = variant.productId.toString();
    const group = variantsByProductId.get(productKey) || [];
    group.push(variant);
    variantsByProductId.set(productKey, group);
  }

  return products.map((product) =>
    presentProduct(product, variantsByProductId.get(product.id) || []),
  );
}

async function submitProductForReview(vendorId, productId, actorId) {
  const vendor = await Vendor.findOne({
    _id: vendorId,
    status: 'active',
    'settings.visible': true,
  });
  if (!vendor)
    throw new CatalogError(
      409,
      'VENDOR_NOT_ACTIVE',
      'Vendor must be approved before products can be submitted',
    );

  const product = await Product.findOneAndUpdate(
    { _id: productId, vendorId, status: { $in: ['draft', 'rejected'] } },
    {
      $set: {
        status: 'pending_review',
        'review.reviewedBy': null,
        'review.reviewedAt': null,
        'review.rejectionReason': '',
      },
      $push: {
        reviewHistory: { action: 'submitted', actorId, reason: '', occurredAt: new Date() },
      },
    },
    { new: true, runValidators: true },
  );
  if (!product)
    throw new CatalogError(
      409,
      'PRODUCT_NOT_SUBMITTABLE',
      'Product must be a draft or rejected product owned by this vendor',
    );
  return product;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function presentStorefrontProduct(product, variants, vendor) {
  return {
    id: product.id,
    slug: product.slug,
    title: product.title,
    shortDescription: product.shortDescription,
    description: product.description,
    brand: product.brand,
    media: product.media,
    attributes: product.attributes,
    options: product.options,
    vendor: { slug: vendor.slug, displayName: vendor.displayName },
    variants: variants.map((variant) => ({
      id: variant.id,
      title: variant.title,
      optionValues: variant.optionValues,
      pricing: variant.pricing,
      available: variant.inventory?.available ?? 0,
    })),
  };
}

async function listStorefrontProducts({ query, vendorSlug, limit, cursor }) {
  const vendorFilter = { status: 'active', 'settings.visible': true };
  if (vendorSlug) vendorFilter.slug = vendorSlug;
  const vendors = await Vendor.find(vendorFilter).select('_id slug displayName');
  if (!vendors.length) return { products: [], nextCursor: null };

  const productFilter = { vendorId: { $in: vendors.map((vendor) => vendor.id) }, status: 'active' };
  if (query) {
    const escaped = escapeRegex(query);
    const pattern = new RegExp(escaped, 'i');
    productFilter.$or = [{ title: pattern }, { brand: pattern }, { shortDescription: pattern }];
  }
  if (cursor) productFilter._id = { $lt: cursor };

  const products = await Product.find(productFilter)
    .sort({ _id: -1 })
    .limit(limit + 1);
  const page = products.slice(0, limit);
  const variants = await ProductVariant.find({
    productId: { $in: page.map((product) => product.id) },
    active: true,
  });
  const variantsByProductId = new Map();
  for (const variant of variants) {
    const productKey = variant.productId.toString();
    const group = variantsByProductId.get(productKey) || [];
    group.push(variant);
    variantsByProductId.set(productKey, group);
  }
  const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const visibleProducts = page
    .filter((product) => (variantsByProductId.get(product.id) || []).length > 0)
    .map((product) =>
      presentStorefrontProduct(
        product,
        variantsByProductId.get(product.id) || [],
        vendorsById.get(product.vendorId.toString()),
      ),
    );

  return {
    products: visibleProducts,
    nextCursor: products.length > limit && page.length ? page[page.length - 1].id : null,
  };
}

async function getStorefrontProduct(vendorSlug, productSlug) {
  const vendor = await Vendor.findOne({
    slug: vendorSlug,
    status: 'active',
    'settings.visible': true,
  }).select('_id slug displayName');
  if (!vendor) return null;

  const product = await Product.findOne({
    vendorId: vendor.id,
    slug: productSlug,
    status: 'active',
  });
  if (!product) return null;

  const variants = await ProductVariant.find({ productId: product.id, active: true });
  if (!variants.length) return null;
  return presentStorefrontProduct(product, variants, vendor);
}

module.exports = {
  CatalogError,
  createProduct,
  getStorefrontProduct,
  listStorefrontProducts,
  listVendorProducts,
  submitProductForReview,
};
