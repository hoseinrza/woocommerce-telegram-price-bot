import { redisClient } from '../config/redis.js';
import { REDIS_KEYS, REDIS_TTL } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';

export async function getCachedProduct(productId) {
  try {
    const raw = await redisClient.get(REDIS_KEYS.product(productId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logger.warn({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message, productId });
    return null;
  }
}

export async function setCachedProduct(productId, product) {
  try {
    await redisClient.set(REDIS_KEYS.product(productId), JSON.stringify(product), {
      EX: REDIS_TTL.PRODUCT_CACHE_SECONDS,
    });
  } catch (error) {
    logger.warn({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message, productId });
  }
}

export async function getCachedPrice(productId) {
  try {
    const raw = await redisClient.get(REDIS_KEYS.productPrice(productId));
    return raw === null ? null : Number(raw);
  } catch (error) {
    logger.warn({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message, productId });
    return null;
  }
}

export async function setCachedPrice(productId, price) {
  try {
    await redisClient.set(REDIS_KEYS.productPrice(productId), String(price), {
      EX: REDIS_TTL.PRODUCT_CACHE_SECONDS,
    });
  } catch (error) {
    logger.warn({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message, productId });
  }
}
