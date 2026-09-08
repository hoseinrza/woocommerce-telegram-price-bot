import '../helpers/test-env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redisClient } from '../../src/config/redis.js';
import { acquirePriceSyncLock, releasePriceSyncLock } from '../../src/services/lock.service.js';

// In-memory fake standing in for Redis SET NX EX + a Lua-script-based
// compare-and-delete release, so lock semantics can be verified without a
// real Redis instance.
function installFakeRedis() {
  const store = new Map();

  redisClient.set = async (key, value, options = {}) => {
    if (options.NX && store.has(key)) return null;
    store.set(key, value);
    return 'OK';
  };

  redisClient.eval = async (_script, { keys, arguments: args }) => {
    const [key] = keys;
    const [expected] = args;
    if (store.get(key) === expected) {
      store.delete(key);
      return 1;
    }
    return 0;
  };

  return store;
}

test('lock: a second concurrent worker cannot acquire the lock while the first holds it', async () => {
  installFakeRedis();

  const tokenA = await acquirePriceSyncLock(55);
  assert.ok(tokenA);

  const tokenB = await acquirePriceSyncLock(55);
  assert.equal(tokenB, null, 'a concurrent worker must not acquire the same lock');
});

test('lock: releasing frees the lock for the next cycle', async () => {
  installFakeRedis();

  const tokenA = await acquirePriceSyncLock(55);
  await releasePriceSyncLock(tokenA);

  const tokenB = await acquirePriceSyncLock(55);
  assert.ok(tokenB, 'lock should be acquirable again after release');
});

test('lock: release is a no-op for a token that is not the current holder', async () => {
  const store = installFakeRedis();

  const tokenA = await acquirePriceSyncLock(55);
  await releasePriceSyncLock('some-stale-token-from-a-slow-worker');

  assert.equal(store.get('price-sync:lock'), tokenA, 'the real holder\'s lock must survive a stale release');
});
