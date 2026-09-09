import { runDailyDigestCycle } from '../workers/daily-digest.worker.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const IRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000; // Asia/Tehran, fixed (no DST since 2022)
const DAY_MS = 24 * 60 * 60 * 1000;

let timeoutHandle = null;
let intervalHandle = null;

/**
 * Milliseconds until the next HH:MM Iran wall-clock time, computed with
 * fixed-offset arithmetic so it doesn't depend on the process/OS timezone.
 */
function msUntilNextIranTime(hour, minute) {
  const now = Date.now();
  const nowIran = new Date(now + IRAN_OFFSET_MS);
  const targetIranMs = Date.UTC(
    nowIran.getUTCFullYear(),
    nowIran.getUTCMonth(),
    nowIran.getUTCDate(),
    hour,
    minute,
    0,
    0
  );
  let targetUtcMs = targetIranMs - IRAN_OFFSET_MS;
  if (targetUtcMs <= now) targetUtcMs += DAY_MS;
  return targetUtcMs - now;
}

async function runSafely() {
  try {
    await runDailyDigestCycle();
  } catch (error) {
    logger.error({ event: 'daily_digest_cycle_failed', err: error.message });
  }
}

export function startDailyDigestScheduler(hour = env.DAILY_DIGEST_HOUR, minute = env.DAILY_DIGEST_MINUTE) {
  if (timeoutHandle || intervalHandle) return;

  const delay = msUntilNextIranTime(hour, minute);
  timeoutHandle = setTimeout(() => {
    timeoutHandle = null;
    runSafely();
    intervalHandle = setInterval(runSafely, DAY_MS);
  }, delay);
}

export function stopDailyDigestScheduler() {
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
