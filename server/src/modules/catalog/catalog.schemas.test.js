const test = require('node:test');
const assert = require('node:assert/strict');

const { createProductSchema } = require('./catalog.schemas');

const validProduct = {
  slug: 'desk-lamp',
  title: 'Desk Lamp',
  variants: [
    { sku: 'LAMP-1', title: 'Black', pricing: { list: { amount: 5000, currency: 'usd' } } },
  ],
};

test('product parsing normalizes fields and supplies defaults', () => {
  const result = createProductSchema.parse({
    ...validProduct,
    slug: '  DESK-LAMP ',
    title: ' Lamp ',
  });

  assert.equal(result.slug, 'desk-lamp');
  assert.equal(result.title, 'Lamp');
  assert.equal(result.shortDescription, '');
  assert.equal(result.variants[0].pricing.list.currency, 'USD');
  assert.equal(result.variants[0].barcode, '');
});

test('product parsing rejects a sale price above list price', () => {
  const product = structuredClone(validProduct);
  product.variants[0].pricing.sale = { amount: 6000, currency: 'USD' };

  const result = createProductSchema.safeParse(product);
  assert.equal(result.success, false);
  assert.ok(
    result.error.issues.some((issue) => issue.message === 'Sale price cannot exceed list price'),
  );
});
