import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // M-Pesa Daraja
  MPESA_CONSUMER_KEY: z.string(),
  MPESA_CONSUMER_SECRET: z.string(),
  MPESA_SHORTCODE: z.string().default('174379'),
  MPESA_PASSKEY: z.string(),
  MPESA_CALLBACK_URL: z.string().url(),
  MPESA_ENVIRONMENT: z.enum(['sandbox', 'production']).default('sandbox'),

  // Email SMTP
  SMTP_HOST: z.string().default('smtp.sendgrid.net'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  EMAIL_FROM: z.string().email().default('no-reply@educonnect.com')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables configuration:', JSON.stringify(_env.error.format(), null, 2));
  process.exit(1);
}

export const env = _env.data;
