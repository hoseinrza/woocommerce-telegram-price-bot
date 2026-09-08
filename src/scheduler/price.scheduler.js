import { runPriceSyncCycle } from '../workers/price.worker.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';
import { env } from '../config/env.js';

let intervalHandle = null;
let cycleInFlight = false;

async function tick() {
  // Guards against overlapping cycles within this same process even before
  // the Redis lock is considered (the lock protects across processes/hosts).
  if (cycleInFlight) return;

  cycleInFlight = true;
  try {
    await runPriceSyncCycle();
  } catch (error) {
    logger.error({ event: LOG_EVENTS.PRICE_SYNC_FAILED, err: error.message });
  } finally {
    cycleInFlight = false;
  }
}

export function startPriceScheduler(intervalMs = env.PRICE_SYNC_INTERVAL_MS) {
  if (intervalHandle) return;
  intervalHandle = setInterval(tick, intervalMs);
  // Kick off an initial cycle immediately rather than waiting a full interval.
  tick();
}

export function stopPriceScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
