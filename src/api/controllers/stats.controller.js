import * as productRepository from '../../repositories/product.repository.js';
import * as subscriptionRepository from '../../repositories/subscription.repository.js';
import { workerState } from '../../workers/price.worker.js';

export async function getStats(req, res) {
  const [trackedProducts, activeProducts, activeSubscriptions] = await Promise.all([
    subscriptionRepository.listDistinctTrackedProductIds(),
    productRepository.countActive(),
    subscriptionRepository.countActiveSubscriptions(),
  ]);

  res.json({
    success: true,
    data: {
      activeProducts,
      trackedProducts: trackedProducts.length,
      activeSubscriptions,
      worker: {
        status: workerState.status,
        lastRunAt: workerState.lastRunAt,
        lastSuccessAt: workerState.lastSuccessAt,
      },
    },
  });
}
