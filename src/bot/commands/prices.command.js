import * as productService from '../../services/product.service.js';
import { formatProductLine } from '../../utils/price.js';
import { productListKeyboard } from '../keyboards/view.keyboard.js';
import { logger } from '../../utils/logger.js';

export async function pricesCommand(ctx) {
  try {
    const products = await productService.listAllFromWooCommerce();

    if (products.length === 0) {
      await ctx.reply('در حال حاضر محصولی برای نمایش وجود ندارد.');
      return;
    }

    const lines = products.map(formatProductLine);

    await ctx.reply(lines.join('\n\n'), {
      reply_markup: productListKeyboard(products).reply_markup,
    });
  } catch (error) {
    logger.error({ event: 'telegram_prices_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان نمایش قیمت‌ها وجود ندارد.');
  }
}
