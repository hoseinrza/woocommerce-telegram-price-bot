import { generateText } from './gemini.service.js';
import { logger } from '../utils/logger.js';

/**
 * Uses Gemini purely to pick which catalog entries a free-form Persian
 * question refers to (by index) — it never generates a product name or
 * price itself, so there is no hallucination risk on what gets shown.
 * Falls back to an empty match on any failure; callers should still fall
 * back to a plain keyword search in that case.
 */
export async function matchProductsByIntent(query, products) {
  if (products.length === 0) return [];

  const catalogList = products.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
  const prompt = [
    'لیست محصولات یک فروشگاه طلا و جواهر:',
    catalogList,
    '',
    `سوال مشتری: "${query}"`,
    '',
    'کدام شماره(های) از لیست بالا به این سوال مرتبط هستند؟',
    'فقط شماره‌ها را با کاما از هم جدا کن (مثال: 1,3). اگر هیچ‌کدام مرتبط نبودند فقط بنویس: NONE',
  ].join('\n');

  try {
    const text = await generateText(prompt);
    if (/NONE/i.test(text)) return [];

    const indices = [...text.matchAll(/\d+/g)].map((m) => Number(m[0]) - 1);
    const uniqueIndices = [...new Set(indices)].filter((i) => i >= 0 && i < products.length);

    return uniqueIndices.map((i) => products[i]);
  } catch (error) {
    logger.warn({ event: 'gemini_match_failed', err: error.message });
    return [];
  }
}
