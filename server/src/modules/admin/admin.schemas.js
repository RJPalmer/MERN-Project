const { z } = require('zod');

const reviewVendorSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('active') }),
  z.object({ status: z.literal('rejected'), reason: z.string().trim().min(3).max(1000) }),
]);

const reviewProductSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('active') }),
  z.object({ status: z.literal('rejected'), reason: z.string().trim().min(3).max(1000) }),
]);

function parseReviewVendor(body) {
  const result = reviewVendorSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({
      path: path.join('.'),
      message,
    }));
    throw error;
  }
  return result.data;
}

function parseReviewProduct(body) {
  const result = reviewProductSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({
      path: path.join('.'),
      message,
    }));
    throw error;
  }
  return result.data;
}

module.exports = { parseReviewProduct, parseReviewVendor };
