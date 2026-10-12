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

module.exports = { createVendorSchema };
