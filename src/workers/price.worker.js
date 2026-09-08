import * as subscriptionRepository from '../repositories/subscription.repository.js';
import * as productRepository from '../repositories/product.repository.js';
import { wooCommerceService } from '../services/woocommerce.service.js';
import { applyWooCommerceSnapshot } from '../services/product.service.js';
import { notifyPriceChange } from './telegram.worker.js';
import { acquirePriceSyncLock, releasePriceSyncLock } from '../services/lock.service.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS, WORKER_STATUS } from '../constants/index.js';
import { env } from '../config/env.js';

export const workerState = {
  status: WORKER_STATUS.IDLE,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
};

/**
 * Runs a single price-sync cycle: only products with at least one active
 * subscription are checked, and each is fetched from WooCommerce exactly
 * once regardless of how many users track it. Skips entirely if another
 * worker instance already holds the distributed lock.
 */
export async function runPriceSyncCycle() {
  const lockToken = await acquirePriceSyncLock(env.PRICE_SYNC_LOCK_TTL_SECONDS);

  if (!lockToken) {
    logger.debug({ event: LOG_EVENTS.PRICE_SYNC_STARTED, skipped: true, reason: 'lock_held' });
    return { skipped: true };
  }

  workerState.status = WORKER_STATUS.RUNNING;
  workerState.lastRunAt = new Date().toISOString();
  logger.info({ event: LOG_EVENTS.PRICE_SYNC_STARTED });

  try {
    const trackedProductIds = await subscriptionRepository.listDistinctTrackedProductIds();

    if (trackedProductIds.length === 0) {
      workerState.status = WORKER_STATUS.IDLE;
      workerState.lastSuccessAt = new Date().toISOString();
      logger.info({ event: LOG_EVENTS.PRICE_SYNC_COMPLETED, trackedCount: 0 });
      return { skipped: false, trackedCount: 0, changedCount: 0 };
    }

    const localProducts = await productRepository.findByIds(trackedProductIds);
    const localById = new Map(localProducts.map((p) => [p.id, p]));

    const woocommerceIds = localProducts.map((p) => p.woocommerceId);
    const wooProducts = await wooCommerceService.getProductsByIds(woocommerceIds);
    const wooByWoocommerceId = new Map(wooProducts.map((p) => [p.woocommerceId, p]));

    let changedCount = 0;

    for (const trackedId of trackedProductIds) {
      const localProduct = localById.get(trackedId);
      if (!localProduct) continue;

      const wooProduct = wooByWoocommerceId.get(localProduct.woocommerceId);
      if (!wooProduct) {
        logger.warn({
          event: LOG_EVENTS.WOOCOMMERCE_REQUEST_FAILED,
          productId: localProduct.id,
          reason: 'missing_from_response',
        });
        continue;
      }

      const { product, changed, previousPrice } = await applyWooCommerceSnapshot(
        localProduct,
        wooProduct
      );

      if (changed) {
        changedCount += 1;
        logger.info({
          event: LOG_EVENTS.PRICE_CHANGED,
          productId: product.id,
          oldPrice: previousPrice,
          newPrice: product.price,
        });
        await notifyPriceChange(product);
      }
    }

    workerState.status = WORKER_STATUS.IDLE;
    workerState.lastSuccessAt = new Date().toISOString();
    workerState.lastError = null;
    logger.info({
      event: LOG_EVENTS.PRICE_SYNC_COMPLETED,
      trackedCount: trackedProductIds.length,
      changedCount,
    });

    return { skipped: false, trackedCount: trackedProductIds.length, changedCount };
  } catch (error) {
    workerState.status = WORKER_STATUS.FAILED;
    workerState.lastError = error.message;
    logger.error({ event: LOG_EVENTS.PRICE_SYNC_FAILED, err: error.message });
    // Last known prices are never cleared on failure — they remain as-is.
    throw error;
  } finally {
    await releasePriceSyncLock(lockToken);
  }
}

