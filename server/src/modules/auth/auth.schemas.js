const { z } = require('zod');

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const password = z.string().min(12).max(128);

const registerSchema = z.object({
  email,
  password,
  displayName: z.string().trim().min(1).max(80),
});

const loginSchema = z.object({ email, password });

module.exports = { registerSchema, loginSchema };
