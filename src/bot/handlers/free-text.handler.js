import * as productService from '../../services/product.service.js';
import { answerQuestion, isGeminiConfigured } from '../../services/assistant.service.js';
import { formatProductLine } from '../../utils/price.js';
import { productListKeyboard } from '../keyboards/view.keyboard.js';
import { logger } from '../../utils/logger.js';

/**
 * Runs for any plain-text message that wasn't already a command or the
 * "📋 مشاهده قیمت‌ها" keyboard button — so users never have to know /search
 * or /ask exist. Tries a product match first; if nothing matches and Gemini
 * is configured, falls through to a grounded general answer.
 */
export async function freeTextHandler(ctx) {
  const text = ctx.message.text?.trim();
  if (!text) return;

  try {
    const products = await productService.findProductsForQuery(text, 10);

    if (products.length > 0) {
      const lines = products.map(formatProductLine);
      await ctx.reply(lines.join('\n\n'), {
        reply_markup: productListKeyboard(products).reply_markup,
      });
      return;
    }

    if (isGeminiConfigured()) {
      const catalog = await productService.listAllFromWooCommerce();
      const answer = await answerQuestion(text, catalog);
      await ctx.reply(answer);
      return;
    }

    await ctx.reply('محصولی با این نام پیدا نشد. از دکمه «📋 مشاهده قیمت‌ها» استفاده کنید.');
  } catch (error) {
    logger.error({ event: 'telegram_free_text_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان پاسخ‌گویی وجود ندارد.');
  }
}
