import * as subscriptionService from '../../services/subscription.service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export async function trackCommand(ctx) {
  const arg = ctx.message.text.split(' ')[1];
  const woocommerceProductId = Number(arg);

  if (!arg || !Number.isInteger(woocommerceProductId) || woocommerceProductId <= 0) {
    await ctx.reply(
      'برای دنبال‌کردن مستقیم، شناسه محصول را وارد کنید: /track <شناسه محصول>\nیا از /search استفاده کنید.'
    );
    return;
  }

  await handleTrack(ctx, woocommerceProductId);
}

export async function handleTrack(ctx, woocommerceProductId) {
  try {
    const product = await subscriptionService.trackProduct({
      telegramUserId: ctx.from.id,
      telegramChatId: ctx.chat.id,
      woocommerceProductId,
    });
    await ctx.reply(`✅ محصول «${product.name}» با موفقیت دنبال شد.`);
  } catch (error) {
    if (error instanceof AppError) {
      await ctx.reply(`⚠️ ${error.message}`);
      return;
    }
    logger.error({ event: 'telegram_track_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان دنبال‌کردن این محصول وجود ندارد.');
  }
}
