import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { parsePrice } from '../utils/price.js';
import { LOG_EVENTS } from '../constants/index.js';
import { UpstreamError } from '../utils/errors.js';

const wooProductSchema = z.object({
  id: z.number(),
  name: z.string(),
  sku: z.string().optional().nullable(),
  price: z.union([z.string(), z.number()]).optional().nullable(),
  regular_price: z.union([z.string(), z.number()]).optional().nullable(),
  sale_price: z.union([z.string(), z.number()]).optional().nullable(),
  stock_status: z.string().optional().nullable(),
  permalink: z.string().optional().nullable(),
  date_modified: z.string().optional().nullable(),
});

function normalizeProduct(raw) {
  const parsed = wooProductSchema.parse(raw);
  return {
    woocommerceId: parsed.id,
    name: parsed.name,
    sku: parsed.sku ?? null,
    price: parsePrice(parsed.price),
    regularPrice: parsePrice(parsed.regular_price),
    salePrice: parsePrice(parsed.sale_price),
    stockStatus: parsed.stock_status ?? 'instock',
    permalink: parsed.permalink ?? null,
    // WooCommerce returns this in the store's own timezone (Iran), not UTC —
    // safe to display as-is with no timezone conversion.
    dateModified: parsed.date_modified ?? null,
  };
}

class HttpStatusError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function isAuthError(error) {
  return error instanceof HttpStatusError && (error.status === 401 || error.status === 403);
}

function isRetryableError(error) {
  if (isAuthError(error)) return false;
  if (error instanceof HttpStatusError) {
    return error.status >= 500;
  }
  return true; // network errors, timeouts
}

export class WooCommerceService {
  constructor({
    baseUrl = env.WOOCOMMERCE_URL,
    consumerKey = env.WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret = env.WOOCOMMERCE_CONSUMER_SECRET,
    timeoutMs = env.WOOCOMMERCE_TIMEOUT_MS,
    retries = env.WOOCOMMERCE_RETRIES,
    pageSize = env.WOOCOMMERCE_PAGE_SIZE,
    fetchImpl = fetch,
  } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.pageSize = pageSize;
    this.fetchImpl = fetchImpl;
  }

  async #request(pathname, searchParams = {}) {
    const url = new URL(`${this.baseUrl}/wp-json/wc/v3${pathname}`);
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, String(value));
    }

    return withRetry(
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await this.fetchImpl(url, {
            headers: { Authorization: this.authHeader, Accept: 'application/json' },
            signal: controller.signal,
          });

          if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new HttpStatusError(
              response.status,
              `WooCommerce request failed (${response.status}): ${body.slice(0, 200)}`
            );
          }

          const totalPages = Number(response.headers.get('x-wp-totalpages') ?? '1');
          const data = await response.json();
          return { data, totalPages };
        } finally {
          clearTimeout(timeout);
        }
      },
      {
        retries: this.retries,
        isRetryable: isRetryableError,
        onRetry: (error, attempt, delay) => {
          logger.warn({
            event: LOG_EVENTS.WOOCOMMERCE_REQUEST_FAILED,
            attempt,
            delayMs: delay,
            err: error.message,
            path: pathname,
          });
        },
      }
    ).catch((error) => {
      logger.error({
        event: LOG_EVENTS.WOOCOMMERCE_REQUEST_FAILED,
        err: error.message,
        path: pathname,
        fatal: true,
      });
      throw new UpstreamError(`WooCommerce is unavailable: ${error.message}`);
    });
  }

  async getProduct(woocommerceId) {
    const { data } = await this.#request(`/products/${woocommerceId}`);
    return normalizeProduct(data);
  }

  /**
   * Fetches multiple products by WooCommerce ID in as few requests as
   * possible using the `include` filter, honoring the configured page size
   * to stay within WooCommerce's request limits.
   */
  async getProductsByIds(woocommerceIds) {
    if (woocommerceIds.length === 0) return [];

    const chunks = [];
    for (let i = 0; i < woocommerceIds.length; i += this.pageSize) {
      chunks.push(woocommerceIds.slice(i, i + this.pageSize));
    }

    const results = [];
    for (const chunk of chunks) {
      const { data } = await this.#request('/products', {
        include: chunk.join(','),
        per_page: chunk.length,
      });
      results.push(...data.map(normalizeProduct));
    }

    return results;
  }

  async searchProducts(term, limit = 10) {
    const { data } = await this.#request('/products', {
      search: term,
      per_page: limit,
      status: 'publish',
    });
    return data.map(normalizeProduct);
  }

  async getAllProducts({ page = 1 } = {}) {
    const { data, totalPages } = await this.#request('/products', {
      page,
      per_page: this.pageSize,
      status: 'publish',
    });
    return { products: data.map(normalizeProduct), totalPages };
  }

  async checkHealth() {
    try {
      await this.#request('/products', { per_page: 1 });
      return true;
    } catch {
      return false;
    }
  }
}

export const wooCommerceService = new WooCommerceService();
