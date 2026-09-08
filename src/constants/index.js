export const REDIS_KEYS = {
  product: (id) => `product:${id}`,
  productPrice: (id) => `product:${id}:price`,
  priceSyncLock: 'price-sync:lock',
};

export const REDIS_TTL = {
  PRODUCT_CACHE_SECONDS: 120,
};

export const WORKER_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  FAILED: 'failed',
};

export const LOG_EVENTS = {
  PRICE_SYNC_STARTED: 'price_sync_started',
  PRICE_SYNC_COMPLETED: 'price_sync_completed',
  PRICE_SYNC_FAILED: 'price_sync_failed',
  PRICE_CHANGED: 'price_changed',
  TELEGRAM_MESSAGE_UPDATED: 'telegram_message_updated',
  TELEGRAM_MESSAGE_FAILED: 'telegram_message_failed',
  WOOCOMMERCE_REQUEST_FAILED: 'woocommerce_request_failed',
  REDIS_CONNECTION_FAILED: 'redis_connection_failed',
  DATABASE_CONNECTION_FAILED: 'database_connection_failed',
};

export const ERROR_CODES = {
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  SUBSCRIPTION_NOT_FOUND: 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_EXISTS: 'SUBSCRIPTION_EXISTS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UPSTREAM_UNAVAILABLE: 'UPSTREAM_UNAVAILABLE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  RATE_LIMITED: 'RATE_LIMITED',
};
