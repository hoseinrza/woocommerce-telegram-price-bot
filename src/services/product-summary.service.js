import { redisClient } from '../config/redis.js';
import { generateText, isGeminiConfigured } from './gemini.service.js';
import { logger } from '../utils/logger.js';

const SUMMARY_TTL_SECONDS = 6 * 60 * 60; // long enough that repeat views of the same product don't re-call Gemini
const summaryKey = (woocommerceId) => `product:${woocommerceId}:ai-summary`;

/**
 * One-line AI blurb for a product, cached in Redis so it's generated at
 * most once per product per TTL window. Returns null (never throws) when
 * Gemini isn't configured or the call fails — callers just omit the line.
 */
export async function getProductSummary(product) {
  if (!isGeminiConfigured()) return null;

  try {
    const cached = await redisClient.get(summaryKey(product.woocommerceId));
    if (cached) return cached;
  } catch (error) {
    logger.warn({ event: 'gemini_summary_cache_read_failed', err: error.message });
  }

  try {
    const prompt = `یک توضیح تبلیغاتی بسیار کوتاه (حداکثر یک جمله، به فارسی، بدون ذکر قیمت) برای این محصول فروشگاه طلا و جواهر بنویس: "${product.name}"`;
    const summary = await generateText(prompt);

    redisClient
      .set(summaryKey(product.woocommerceId), summary, { EX: SUMMARY_TTL_SECONDS })
      .catch((error) => {
        logger.warn({ event: 'gemini_summary_cache_write_failed', err: error.message });
      });

    return summary;
  } catch (error) {
    logger.warn({ event: 'gemini_summary_generate_failed', err: error.message });
    return null;
  }
}
