import { createClient } from 'redis';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';

export const redisClient = createClient({ url: env.REDIS_URL });

redisClient.on('error', (error) => {
  logger.error({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message });
});

let connectPromise = null;

export async function connectRedis() {
  if (redisClient.isOpen) return redisClient;
  if (!connectPromise) {
    connectPromise = redisClient.connect();
  }
  await connectPromise;
  return redisClient;
}

export async function checkRedisHealth() {
  try {
    if (!redisClient.isOpen) return false;
    const pong = await redisClient.ping();
    return pong === 'PONG';
  } catch (error) {
    logger.error({ event: LOG_EVENTS.REDIS_CONNECTION_FAILED, err: error.message });
    return false;
  }
}

export async function closeRedis() {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
}
