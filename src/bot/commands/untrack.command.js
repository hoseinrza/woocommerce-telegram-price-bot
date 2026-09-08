import * as subscriptionService from '../../services/subscription.service.js';
import { subscriptionListKeyboard } from '../keyboards/product.keyboard.js';
import { logger } from '../../utils/logger.js';

export async function untrackCommand(ctx) {
  try {
    const products = await subscriptionService.listUserSubscriptions(ctx.from.id);

    if (products.length === 0) {
      await ctx.reply('شما هیچ محصولی را دنبال نمی‌کنید.');
      return;
    }

    await ctx.reply('محصولی که می‌خواهید لغو کنید را انتخاب کنید:', {
      reply_markup: subscriptionListKeyboard(products).reply_markup,
    });
  } catch (error) {
    logger.error({ event: 'telegram_untrack_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان انجام این کار وجود ندارد.');
  }
}
