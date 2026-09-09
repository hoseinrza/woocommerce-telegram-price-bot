import * as channelRepository from '../repositories/channel.repository.js';
import * as productService from '../services/product.service.js';
import { bot } from '../services/telegram.service.js';
import { formatPriceFa } from '../utils/price.js';
import { RATE_CARD_WOOCOMMERCE_IDS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

function buildBroadcastMessage(products) {
  const priceByWoocommerceId = (woocommerceId) => {
    const product = products.find((p) => p.woocommerceId === woocommerceId);
    return product ? formatPriceFa(product.price) : 'نامشخص';
  };

  return [
    '⚜️ نرخ لحظه‌ای طلا، سکه و ارز | طلا و سکه زرگر',
    `💵 دلار: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.USD)}`,
    `✨ طلا ۱۸ عیار: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.GOLD_18K)}`,
    '───────────────',
    '🪙 نرخ خرید از شما:',
    `▫️ سکه تمام: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_FULL_BUY)}`,
    `▫️ نیم سکه: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_HALF_BUY)}`,
    `▫️ ربع سکه: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_QUARTER_BUY)}`,
    '───────────────',
    '🪙 نرخ فروش به شما:',
    `▫️ سکه تمام: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_FULL_SELL)}`,
    `▫️ نیم سکه: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_HALF_SELL)}`,
    `▫️ ربع سکه: ${priceByWoocommerceId(RATE_CARD_WOOCOMMERCE_IDS.COIN_QUARTER_SELL)}`,
    '───────────────',
    '⚡️ با توجه به نوسانات لحظه‌ای، قیمت نهایی در زمان معامله قطعی می‌گردد.',
    '🛍 ثبت سفارش و معامله آنی:',
    '🆔 @rezazz78',
    '📞 09163410961',
    '🌐 zargarjewelry.com',
  ].join('\n');
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
