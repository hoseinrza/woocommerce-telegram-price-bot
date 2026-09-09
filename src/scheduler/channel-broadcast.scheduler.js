import { runChannelBroadcastCycle } from '../workers/channel-broadcast.worker.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

let intervalHandle = null;
let cycleInFlight = false;

async function tick() {
  if (cycleInFlight) return;

  cycleInFlight = true;
  try {
    await runChannelBroadcastCycle();
  } catch (error) {
    logger.error({ event: 'channel_broadcast_cycle_failed', err: error.message });
  } finally {
    cycleInFlight = false;
  }
}

export function startChannelBroadcastScheduler(intervalMs = env.CHANNEL_BROADCAST_INTERVAL_MS) {
  if (intervalHandle) return;
  intervalHandle = setInterval(tick, intervalMs);
  tick();
}

export function stopChannelBroadcastScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
