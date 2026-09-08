import { checkDatabaseHealth } from '../../config/database.js';
import { checkRedisHealth } from '../../config/redis.js';
import { wooCommerceService } from '../../services/woocommerce.service.js';
import { checkTelegramHealth } from '../../services/telegram.service.js';
import { workerState } from '../../workers/price.worker.js';
import { WORKER_STATUS } from '../../constants/index.js';
import { env } from '../../config/env.js';

function workerHealth() {
  if (!workerState.lastSuccessAt) {
    return { ...workerState, healthy: workerState.status !== WORKER_STATUS.FAILED };
  }

  const ageMs = Date.now() - new Date(workerState.lastSuccessAt).getTime();
  const stale = ageMs > env.WORKER_STALE_THRESHOLD_MS;

  return { ...workerState, healthy: !stale && workerState.status !== WORKER_STATUS.FAILED, stale };
}

export async function getHealth(req, res) {
  const [database, redis, woocommerce, telegram] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
    wooCommerceService.checkHealth(),
    checkTelegramHealth(),
  ]);

  const worker = workerHealth();
  const services = { database, redis, woocommerce, telegram };
  const allHealthy = Object.values(services).every(Boolean) && worker.healthy;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    services: {
      database: database ? 'ok' : 'fail',
      redis: redis ? 'ok' : 'fail',
      woocommerce: woocommerce ? 'ok' : 'fail',
      telegram: telegram ? 'ok' : 'fail',
    },
    worker: {
      status: worker.status,
      last_run: worker.lastRunAt,
      last_success: worker.lastSuccessAt,
      last_error: worker.lastError,
      stale: Boolean(worker.stale),
    },
  });
}
