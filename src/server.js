import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { closeDatabase, checkDatabaseHealth } from './config/database.js';
import { startBot, stopBot } from './bot/bot.js';
import { startPriceScheduler, stopPriceScheduler } from './scheduler/price.scheduler.js';
import {
  startChannelBroadcastScheduler,
  stopChannelBroadcastScheduler,
} from './scheduler/channel-broadcast.scheduler.js';
import {
  startDailyDigestScheduler,
  stopDailyDigestScheduler,
} from './scheduler/daily-digest.scheduler.js';

async function main() {
  await connectRedis();
  logger.info({ event: 'redis_connected' });

  const dbHealthy = await checkDatabaseHealth();
  if (!dbHealthy) {
    throw new Error('Unable to reach PostgreSQL on startup');
  }
  logger.info({ event: 'database_connected' });

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ event: 'http_server_started', port: env.PORT });
  });

  await startBot();
  logger.info({ event: 'telegram_bot_started' });

  startPriceScheduler();
  logger.info({ event: 'price_scheduler_started', intervalMs: env.PRICE_SYNC_INTERVAL_MS });

  startChannelBroadcastScheduler();
  logger.info({
    event: 'channel_broadcast_scheduler_started',
    intervalMs: env.CHANNEL_BROADCAST_INTERVAL_MS,
  });

  startDailyDigestScheduler();
  logger.info({
    event: 'daily_digest_scheduler_started',
    hour: env.DAILY_DIGEST_HOUR,
    minute: env.DAILY_DIGEST_MINUTE,
  });

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ event: 'shutdown_initiated', signal });

    stopPriceScheduler();
    stopChannelBroadcastScheduler();
    stopDailyDigestScheduler();
    stopBot(signal);

    await new Promise((resolve) => server.close(resolve));

    await Promise.allSettled([closeRedis(), closeDatabase()]);

    logger.info({ event: 'shutdown_complete' });
    process.exit(0);
  }

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ event: 'startup_failed', err: error.message, stack: error.stack });
  process.exit(1);
});
