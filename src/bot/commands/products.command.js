import * as subscriptionService from '../../services/subscription.service.js';
import { formatPrice, formatStockStatus } from '../../utils/price.js';
import { logger } from '../../utils/logger.js';

export async function productsCommand(ctx) {
  try {
    const products = await subscriptionService.listUserSubscriptions(ctx.from.id);

    if (products.length === 0) {
      await ctx.reply('شما هنوز هیچ محصولی را دنبال نمی‌کنید. از /search استفاده کنید.');
      return;
    }

    const lines = products.map(
      (p) => `🛒 ${p.name}\n💰 ${formatPrice(p.price)} — ${formatStockStatus(p.stockStatus)}`
    );

    await ctx.reply(lines.join('\n\n'));
  } catch (error) {
    logger.error({ event: 'telegram_products_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان نمایش لیست وجود ندارد.');
  }
}
