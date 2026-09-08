import * as subscriptionService from '../../services/subscription.service.js';
import { handleTrack } from '../commands/track.command.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export async function callbackQueryHandler(ctx) {
  const data = ctx.callbackQuery.data ?? '';
  const [action, rawId] = data.split(':');
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    await ctx.answerCbQuery('درخواست نامعتبر است.');
    return;
  }

  if (action === 'track') {
    await ctx.answerCbQuery();
    await handleTrack(ctx, id);
    return;
  }

  if (action === 'untrack') {
    try {
      const product = await subscriptionService.untrackProduct({
        telegramUserId: ctx.from.id,
        productId: id,
      });
      await ctx.answerCbQuery();
      await ctx.reply(`🛑 دنبال‌کردن «${product.name}» متوقف شد.`);
    } catch (error) {
      await ctx.answerCbQuery();
      if (error instanceof AppError) {
        await ctx.reply(`⚠️ ${error.message}`);
        return;
      }
      logger.error({ event: 'telegram_callback_failed', err: error.message });
      await ctx.reply('در حال حاضر امکان انجام این کار وجود ندارد.');
    }
    return;
  }

  await ctx.answerCbQuery('عملیات ناشناخته.');
}
