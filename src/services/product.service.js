import * as productRepository from '../repositories/product.repository.js';
import * as priceHistoryRepository from '../repositories/price-history.repository.js';
import { wooCommerceService } from './woocommerce.service.js';
import { setCachedProduct, setCachedPrice } from './cache.service.js';
import { withTransaction } from '../config/database.js';
import { pricesAreEqual } from '../utils/price.js';
import { NotFoundError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

export async function getProductById(id) {
  const product = await productRepository.findById(id);
  if (!product) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, `Product ${id} not found`);
  }
  return product;
}

/**
 * Searches WooCommerce directly (one request per user search action — not
 * part of the per-minute price poll) and caches results locally so they can
 * be tracked without a second round trip.
 */
export async function searchProducts(term, limit = 10) {
  const wooProducts = await wooCommerceService.searchProducts(term, limit);
  return Promise.all(wooProducts.map((wooProduct) => productRepository.upsertFromWoocommerce(wooProduct)));
}

export async function listProducts(pagination) {
  return productRepository.list(pagination);
}

export async function getPriceHistory(productId, limit) {
  await getProductById(productId);
  return priceHistoryRepository.listByProductId(productId, limit);
}

/**
 * Ensures a product tracked by a subscription request exists locally,
 * fetching and persisting it from WooCommerce on first sight.
 */
export async function ensureProductTracked(woocommerceId) {
  const existing = await productRepository.findByWoocommerceId(woocommerceId);
  if (existing) return existing;

  const wooProduct = await wooCommerceService.getProduct(woocommerceId);
  const product = await productRepository.upsertFromWoocommerce(wooProduct);
  await setCachedProduct(product.id, product);
  if (product.price !== null) {
    await setCachedPrice(product.id, product.price);
  }
  return product;
}

/**
 * Applies a freshly fetched WooCommerce snapshot to a locally tracked
 * product. Returns { product, changed, previousPrice } — DB writes and
 * history inserts only happen when the price actually changed.
 */
export async function applyWooCommerceSnapshot(localProduct, wooProduct) {
  const previousPrice = localProduct.price;
  const priceChanged = !pricesAreEqual(previousPrice, wooProduct.price);
  const stockChanged = localProduct.stockStatus !== wooProduct.stockStatus;

  if (!priceChanged && !stockChanged) {
    await productRepository.touchLastSynced(localProduct.id);
    return { product: localProduct, changed: false, previousPrice };
  }

  const updated = await withTransaction(async (client) => {
    const product = await productRepository.updatePrice(client, {
      id: localProduct.id,
      price: wooProduct.price,
      regularPrice: wooProduct.regularPrice,
      salePrice: wooProduct.salePrice,
      stockStatus: wooProduct.stockStatus,
    });

    if (priceChanged) {
      await priceHistoryRepository.insert(client, {
        productId: localProduct.id,
        oldPrice: previousPrice,
        newPrice: wooProduct.price,
      });
    }

    return product;
  });

  await setCachedProduct(updated.id, updated);
  if (updated.price !== null) {
    await setCachedPrice(updated.id, updated.price);
  }

  return { product: updated, changed: priceChanged, previousPrice };
}
