import { generateText } from './gemini.service.js';
import { formatPrice, formatStockStatus } from '../utils/price.js';

export { isGeminiConfigured } from './gemini.service.js';

/**
 * General Q&A grounded in the live catalog — Gemini is instructed to only
 * use the prices handed to it and to say "I don't know" rather than guess,
 * so nothing it says can drift from what's actually in WooCommerce.
 */
export async function answerQuestion(question, products) {
  const catalog = products
    .map((p) => `- ${p.name}: ${formatPrice(p.price)} (${formatStockStatus(p.stockStatus)})`)
    .join('\n');

  const prompt = [
    'تو دستیار فروشگاه طلا و جواهر «زرگر» هستی.',
    'فقط بر اساس اطلاعات زیر، کوتاه، دقیق و به فارسی جواب بده.',
    'اگر سوال ربطی به این اطلاعات نداشت یا اطلاعات کافی نبود، صادقانه بگو نمی‌دونی.',
    'هرگز قیمتی غیر از قیمت‌های دقیق زیر رو حدس نزن یا اعلام نکن.',
    '',
    'قیمت لحظه‌ای محصولات:',
    catalog,
    '',
    `سوال مشتری: ${question}`,
  ].join('\n');

  return generateText(prompt);
}
