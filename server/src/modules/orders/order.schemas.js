const { z } = require('zod');

const shipmentSchema = z.object({
  carrier: z.string().trim().min(1).max(100),
  number: z.string().trim().min(1).max(160),
  url: z.union([z.string().url().max(2048), z.literal('')]).optional().default(''),
});

function parseShipment(body) {
  const result = shipmentSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

module.exports = { parseShipment };
