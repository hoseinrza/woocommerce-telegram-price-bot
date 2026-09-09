import { answerQuestion, isGeminiConfigured } from '../../services/assistant.service.js';
import * as productService from '../../services/product.service.js';
import { logger } from '../../utils/logger.js';

export async function askCommand(ctx) {
  const question = ctx.message.text.split(' ').slice(1).join(' ').trim();

  if (!question) {
    await ctx.reply('سوالتون رو بعد از دستور /ask بنویسید. مثال: /ask قیمت سکه امروز چقدره؟');
    return;
  }

  if (!isGeminiConfigured()) {
    await ctx.reply('این قابلیت در حال حاضر فعال نیست.');
    return;
  }

  try {
    const products = await productService.listAllFromWooCommerce();
    const answer = await answerQuestion(question, products);
    await ctx.reply(answer);
  } catch (error) {
    logger.error({ event: 'telegram_ask_failed', err: error.message });
    await ctx.reply('در حال حاضر امکان پاسخ‌گویی وجود ندارد. لطفاً بعداً دوباره تلاش کنید.');
  }
}
