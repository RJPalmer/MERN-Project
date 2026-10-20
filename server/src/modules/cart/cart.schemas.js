const { z } = require('zod');

const setCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(9999),
});

function parseSetCartItem(body) {
  const result = setCartItemSchema.safeParse(body);
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

module.exports = { parseSetCartItem };
