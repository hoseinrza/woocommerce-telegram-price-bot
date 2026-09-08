import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { connectRedis, closeRedis } from './config/redis.js';
import { closeDatabase, checkDatabaseHealth } from './config/database.js';
import { startBot, stopBot } from './bot/bot.js';
import { startPriceScheduler, stopPriceScheduler } from './scheduler/price.scheduler.js';

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

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ event: 'shutdown_initiated', signal });

    stopPriceScheduler();
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
