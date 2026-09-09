import { Telegraf } from 'telegraf';
import { env } from '../config/env.js';
import { formatPrice, formatStockStatus } from '../utils/price.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

function formatTime(date) {
  return new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

export function buildProductMessage(product, { syncFailed = false } = {}) {
  const lines = [
    `🛒 ${product.name}`,
    '',
    `💰 قیمت: ${formatPrice(product.price)}`,
    '',
    formatStockStatus(product.stockStatus),
    '',
  ];

  if (syncFailed) {
    lines.push('⚠️ بروزرسانی قیمت موقتاً ناموفق بود');
  } else {
    lines.push(`🔄 آخرین بروزرسانی: ${formatTime(product.lastSyncedAt ?? new Date())}`);
  }

  return lines.join('\n');
}

export async function sendProductMessage(chatId, product) {
  const message = await bot.telegram.sendMessage(chatId, buildProductMessage(product), {
    parse_mode: 'HTML',
  });
  return message;
}

/**
 * Updates an existing Telegram message in place via editMessageText. Never
 * sends a new message for an already-tracked product — this keeps chats
 * from filling up with duplicate price notifications.
 */
export async function updateProductMessage(messageRecord, product) {
  try {
    await bot.telegram.editMessageText(
      messageRecord.telegramChatId,
      messageRecord.telegramMessageId,
      undefined,
      buildProductMessage(product)
    );
  } catch (error) {
    // Telegram throws when the new text is identical to the old one; that
    // is not a real failure, so swallow just that specific case.
    if (typeof error.message === 'string' && error.message.includes('message is not modified')) {
      return;
    }
    throw error;
  }
}

export async function checkTelegramHealth() {
  try {
    await bot.telegram.getMe();
    return true;
  } catch (error) {
    logger.error({ event: LOG_EVENTS.TELEGRAM_MESSAGE_FAILED, err: error.message, health: true });
    return false;
  }
}
