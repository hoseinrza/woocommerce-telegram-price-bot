import * as botUserRepository from '../repositories/bot-user.repository.js';
import * as productService from '../services/product.service.js';
import { bot } from '../services/telegram.service.js';
import { formatProductLine } from '../utils/price.js';
import { logger } from '../utils/logger.js';

function buildDigestMessage(products) {
  const lines = ['🌅 گزارش روزانه قیمت‌ها', '', ...products.map(formatProductLine)];
  return lines.join('\n\n');
}

/**
 * Sends the current price list once a day to every private-chat user who
 * has ever interacted with the bot (see the bot.use middleware in bot.js
 * that upserts bot_users). A 403 from Telegram means the user blocked the
 * bot — deactivate them so we stop trying forever.
 */
export async function runDailyDigestCycle() {
  const users = await botUserRepository.listActive();
  if (users.length === 0) {
    return { skipped: true, userCount: 0 };
  }

  const products = await productService.listAllFromWooCommerce();
  if (products.length === 0) {
    return { skipped: true, userCount: users.length, reason: 'no_products' };
  }

  const message = buildDigestMessage(products);

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.telegramChatId, message);
      logger.info({ event: 'daily_digest_sent', chatId: user.telegramChatId });
    } catch (error) {
      logger.error({
        event: 'daily_digest_failed',
        chatId: user.telegramChatId,
        err: error.message,
      });
      if (error.response?.error_code === 403) {
        await botUserRepository.deactivate(user.telegramChatId);
      }
    }
  }

  return { skipped: false, userCount: users.length, productCount: products.length };
}
