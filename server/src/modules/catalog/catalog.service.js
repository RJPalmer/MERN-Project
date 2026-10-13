const Product = require('../../models/Product');
const ProductVariant = require('../../models/ProductVariant');

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
    if (error.code === 11000) throw new CatalogError(409, 'PRODUCT_SLUG_IN_USE', 'This product slug is already in use for the vendor');
    throw error;
  }

  try {
    const variants = await ProductVariant.insertMany(input.variants.map((variant) => ({
      ...variant,
      productId: product.id,
      vendorId,
    })), { ordered: true });
    product.variantIds = variants.map((variant) => variant.id);
    await product.save();
    return presentProduct(product, variants);
  } catch (error) {
    await Promise.all([
      ProductVariant.deleteMany({ productId: product.id }),
      Product.deleteOne({ _id: product.id }),
    ]);
    if (error.code === 11000) throw new CatalogError(409, 'SKU_IN_USE', 'A variant SKU is already in use for this vendor');
    throw error;
  }
}

async function listVendorProducts(vendorId) {
  const products = await Product.find({ vendorId }).sort({ createdAt: -1 });
  if (!products.length) return [];

  const variants = await ProductVariant.find({ productId: { $in: products.map((product) => product.id) } });
  const variantsByProductId = new Map();
  for (const variant of variants) {
    const productKey = variant.productId.toString();
    const group = variantsByProductId.get(productKey) || [];
    group.push(variant);
    variantsByProductId.set(productKey, group);
  }

  return products.map((product) => presentProduct(product, variantsByProductId.get(product.id) || []));
}

module.exports = { CatalogError, createProduct, listVendorProducts };
