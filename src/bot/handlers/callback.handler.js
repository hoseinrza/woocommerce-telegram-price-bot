import { wooCommerceService } from '../../services/woocommerce.service.js';
import * as subscriptionService from '../../services/subscription.service.js';
import { getProductSummary } from '../../services/product-summary.service.js';
import { formatProductLine } from '../../utils/price.js';
import { followKeyboard } from '../keyboards/view.keyboard.js';
import { ConflictError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';

async function handleView(ctx, woocommerceId) {
  try {
    const product = await wooCommerceService.getProduct(woocommerceId);
    await ctx.answerCbQuery();

    const summary = await getProductSummary(product);
    const text = summary ? `${formatProductLine(product)}\n\n✨ ${summary}` : formatProductLine(product);

    await ctx.reply(text, {
      reply_markup: followKeyboard(woocommerceId).reply_markup,
    });
  } catch (error) {
    await ctx.answerCbQuery();
    logger.error({ event: 'telegram_view_product_failed', woocommerceId, err: error.message });
    await ctx.reply('در حال حاضر امکان نمایش این محصول وجود ندارد.');
  }
}

async function handleFollow(ctx, woocommerceId) {
  try {
    await subscriptionService.trackProduct({
      telegramUserId: ctx.from.id,
      telegramChatId: ctx.chat.id,
      woocommerceProductId: woocommerceId,
    });
    await ctx.answerCbQuery('✅ دنبال شد — با هر تغییر قیمت بهت خبر می‌دم.');
  } catch (error) {
    if (error instanceof ConflictError) {
      await ctx.answerCbQuery('✅ قبلاً این محصول رو دنبال می‌کنید.');
      return;
    }
    await ctx.answerCbQuery('در حال حاضر امکان دنبال‌کردن این محصول وجود ندارد.');
    logger.error({ event: 'telegram_follow_failed', woocommerceId, err: error.message });
  }
}

export async function callbackQueryHandler(ctx) {
  const data = ctx.callbackQuery.data ?? '';
  const [action, rawId] = data.split(':');
  const woocommerceId = Number(rawId);

  if (!Number.isInteger(woocommerceId) || woocommerceId <= 0) {
    await ctx.answerCbQuery();
    return;
  }

  if (action === 'view') return handleView(ctx, woocommerceId);
  if (action === 'follow') return handleFollow(ctx, woocommerceId);

  await ctx.answerCbQuery();
}
