import * as productService from '../../services/product.service.js';
import { searchResultsKeyboard } from '../keyboards/product.keyboard.js';
import { logger } from '../../utils/logger.js';

export async function searchCommand(ctx) {
  const term = ctx.message.text.split(' ').slice(1).join(' ').trim();

  if (!term) {
    await ctx.reply('لطفاً نام محصول را بعد از دستور /search وارد کنید. مثال: /search گوشی');
    return;
  }

  try {
    const products = await productService.searchProducts(term, 10);

    if (products.length === 0) {
      await ctx.reply('محصولی با این نام پیدا نشد.');
      return;
    }

    await ctx.reply('یکی از محصولات زیر را برای دنبال‌کردن انتخاب کنید:', {
      reply_markup: searchResultsKeyboard(products).reply_markup,
    });
  } catch (error) {
    logger.error({ event: 'telegram_search_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان جستجو وجود ندارد. لطفاً دوباره تلاش کنید.');
  }
}
