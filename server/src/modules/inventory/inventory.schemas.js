const { z } = require('zod');

const stockAdjustmentSchema = z.object({
  type: z.enum(['receipt', 'adjustment']),
  quantityDelta: z.number().int().min(-1_000_000).max(1_000_000),
  note: z.string().trim().min(3).max(500),
}).superRefine((input, ctx) => {
  if (input.type === 'receipt' && input.quantityDelta <= 0) {
    ctx.addIssue({ code: 'custom', path: ['quantityDelta'], message: 'A receipt must add stock' });
  }
  if (input.type === 'adjustment' && input.quantityDelta === 0) {
    ctx.addIssue({ code: 'custom', path: ['quantityDelta'], message: 'An adjustment cannot be zero' });
  }
});

function parseStockAdjustment(body) {
  const result = stockAdjustmentSchema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

module.exports = { parseStockAdjustment };
