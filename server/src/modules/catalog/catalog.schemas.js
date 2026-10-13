const { z } = require('zod');

const moneySchema = z.object({
  amount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
});

const variantSchema = z.object({
  sku: z.string().trim().min(1).max(80),
  barcode: z.string().trim().max(80).default(''),
  title: z.string().trim().min(1).max(160),
  optionValues: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    value: z.string().trim().min(1).max(100),
  })).max(20).default([]),
  pricing: z.object({
    list: moneySchema,
    sale: moneySchema.optional(),
  }).superRefine((pricing, ctx) => {
    if (pricing.sale && pricing.sale.currency !== pricing.list.currency) {
      ctx.addIssue({ code: 'custom', path: ['sale', 'currency'], message: 'Sale and list currencies must match' });
    }
    if (pricing.sale && pricing.sale.amount > pricing.list.amount) {
      ctx.addIssue({ code: 'custom', path: ['sale', 'amount'], message: 'Sale price cannot exceed list price' });
    }
  }),
});

const createProductSchema = z.object({
  slug: z.string().trim().toLowerCase().min(2).max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens'),
  title: z.string().trim().min(2).max(180),
  shortDescription: z.string().trim().max(300).default(''),
  description: z.string().trim().max(10000).default(''),
  brand: z.string().trim().max(100).default(''),
  media: z.array(z.object({
    url: z.string().url().max(2048),
    alt: z.string().trim().max(300).default(''),
    type: z.enum(['image', 'video']).default('image'),
    sortOrder: z.number().int().nonnegative().default(0),
  })).max(20).default([]),
  attributes: z.array(z.object({
    key: z.string().trim().min(1).max(60),
    label: z.string().trim().min(1).max(80),
    value: z.string().trim().min(1).max(200),
  })).max(50).default([]),
  options: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    values: z.array(z.string().trim().min(1).max(100)).min(1).max(100),
  })).max(20).default([]),
  variants: z.array(variantSchema).min(1).max(100),
});

module.exports = { createProductSchema };
