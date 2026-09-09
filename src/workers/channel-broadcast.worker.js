import * as channelRepository from '../repositories/channel.repository.js';
import * as productService from '../services/product.service.js';
import { bot } from '../services/telegram.service.js';
import { formatProductLine } from '../utils/price.js';
import { logger } from '../utils/logger.js';

function buildBroadcastMessage(products) {
  const lines = ['📋 لیست قیمت محصولات', '', ...products.map(formatProductLine)];
  return lines.join('\n\n');
}

/**
 * Posts a brand-new message with the full current price list to every
 * active channel on every tick — no per-message editing, no subscriptions,
 * no per-channel state beyond "is this channel active".
 */
export async function runChannelBroadcastCycle() {
  const channels = await channelRepository.listActive();
  if (channels.length === 0) {
    return { skipped: true, channelCount: 0 };
  }

  const products = await productService.listAllFromWooCommerce();
  if (products.length === 0) {
    return { skipped: true, channelCount: channels.length, reason: 'no_products' };
  }

  const message = buildBroadcastMessage(products);

  for (const channel of channels) {
    try {
      await bot.telegram.sendMessage(channel.telegramChatId, message);
      logger.info({ event: 'channel_broadcast_sent', chatId: channel.telegramChatId });
    } catch (error) {
      logger.error({
        event: 'channel_broadcast_failed',
        chatId: channel.telegramChatId,
        err: error.message,
      });
    }
  }

  return { skipped: false, channelCount: channels.length, productCount: products.length };
}
