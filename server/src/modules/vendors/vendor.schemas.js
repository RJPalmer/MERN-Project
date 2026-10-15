const { z } = require('zod');

const createVendorSchema = z.object({
  slug: z.string().trim().toLowerCase().min(3).max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and single hyphens'),
  legalName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).default(''),
  contactEmail: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  contactPhone: z.string().trim().max(40).default(''),
});

const shippingSettingsSchema = z.object({
  flatRate: z.object({
    amount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    currency: z.string().trim().regex(/^[a-zA-Z]{3}$/).transform((value) => value.toUpperCase()),
  }),
  eligibleCountryCodes: z.array(
    z.string().trim().regex(/^[a-zA-Z]{2}$/).transform((value) => value.toUpperCase()),
  ).min(1).max(100).transform((codes) => [...new Set(codes)]),
});

function parseShippingSettings(body) {
  const result = shippingSettingsSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

module.exports = { createVendorSchema, parseShippingSettings };
