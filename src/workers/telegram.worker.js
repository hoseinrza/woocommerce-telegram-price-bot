import * as telegramMessageRepository from '../repositories/telegram-message.repository.js';
import { updateProductMessage } from '../services/telegram.service.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';

/**
 * Pushes a price change out to every Telegram message currently displaying
 * this product, using editMessageText — never a new sendMessage — so one
 * WooCommerce change fans out without spamming chats with duplicates.
 */
export async function notifyPriceChange(product) {
  const messages = await telegramMessageRepository.listByProductId(product.id);

  for (const message of messages) {
    try {
      await updateProductMessage(message, product);
      await telegramMessageRepository.updateLastPrice(message.id, product.price);
      logger.info({
        event: LOG_EVENTS.TELEGRAM_MESSAGE_UPDATED,
        productId: product.id,
        chatId: message.telegramChatId,
        messageId: message.telegramMessageId,
      });
    } catch (error) {
      logger.error({
        event: LOG_EVENTS.TELEGRAM_MESSAGE_FAILED,
        productId: product.id,
        chatId: message.telegramChatId,
        messageId: message.telegramMessageId,
        err: error.message,
      });
    }
  }
}
