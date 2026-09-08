import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default('info'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  WOOCOMMERCE_URL: z.string().url('WOOCOMMERCE_URL must be a valid URL'),
  WOOCOMMERCE_CONSUMER_KEY: z.string().min(1, 'WOOCOMMERCE_CONSUMER_KEY is required'),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().min(1, 'WOOCOMMERCE_CONSUMER_SECRET is required'),
  WOOCOMMERCE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  WOOCOMMERCE_RETRIES: z.coerce.number().int().min(0).default(3),
  WOOCOMMERCE_PAGE_SIZE: z.coerce.number().int().positive().max(100).default(50),

  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),

  PRICE_SYNC_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  PRICE_SYNC_LOCK_TTL_SECONDS: z.coerce.number().int().positive().default(55),

  PRICE_CURRENCY: z.string().default('IRR'),
  PRICE_CURRENCY_LABEL: z.string().default('تومان'),

  API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),

  WORKER_STALE_THRESHOLD_MS: z.coerce.number().int().positive().default(180_000),
});

function loadEnv(source = process.env) {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export const env = loadEnv();
export { loadEnv };
