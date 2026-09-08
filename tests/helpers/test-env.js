// Populates required environment variables with harmless test defaults so
// modules that validate env at import time (src/config/env.js) don't throw
// when loaded from tests. Import this file FIRST, before anything else.
process.env.NODE_ENV ??= 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/test_db';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.WOOCOMMERCE_URL ??= 'https://example.test';
process.env.WOOCOMMERCE_CONSUMER_KEY ??= 'ck_test';
process.env.WOOCOMMERCE_CONSUMER_SECRET ??= 'cs_test';
process.env.TELEGRAM_BOT_TOKEN ??= '123456:test-token';
process.env.LOG_LEVEL ??= 'silent';
