import { randomUUID } from 'node:crypto';
import { redisClient } from '../config/redis.js';
import { REDIS_KEYS } from '../constants/index.js';

const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

/**
 * Attempts to acquire a distributed lock using SET NX EX. Returns a token
 * that must be used to release the lock (safe release — only the holder can
 * delete it), or null if another worker currently holds the lock.
 */
export async function acquirePriceSyncLock(ttlSeconds) {
  const token = randomUUID();
  const result = await redisClient.set(REDIS_KEYS.priceSyncLock, token, {
    NX: true,
    EX: ttlSeconds,
  });

  return result === 'OK' ? token : null;
}

export async function releasePriceSyncLock(token) {
  if (!token) return;
  await redisClient.eval(RELEASE_SCRIPT, {
    keys: [REDIS_KEYS.priceSyncLock],
    arguments: [token],
  });
}
