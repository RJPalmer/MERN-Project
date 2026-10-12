const path = require('node:path');
const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  MONGODB_URI: z.string().url().default('mongodb://localhost:27017/marketplace'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const details = result.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${details}`);
}

if (result.data.JWT_ACCESS_SECRET === result.data.JWT_REFRESH_SECRET) {
  throw new Error('Invalid environment configuration: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
}

module.exports = Object.freeze(result.data);
