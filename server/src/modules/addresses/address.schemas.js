const { z } = require('zod');

const addressSchema = z.object({
  label: z.string().trim().min(1).max(60).default('Home'),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).default(''),
  addressLine1: z.string().trim().min(2).max(160),
  addressLine2: z.string().trim().max(160).default(''),
  city: z.string().trim().min(2).max(100),
  region: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(2).max(20),
  countryCode: z.string().trim().regex(/^[a-zA-Z]{2}$/).transform((value) => value.toUpperCase()),
  isDefaultShipping: z.boolean().default(false),
  isDefaultBilling: z.boolean().default(false),
});

function parseAddress(body) {
  const result = addressSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

module.exports = { parseAddress };
