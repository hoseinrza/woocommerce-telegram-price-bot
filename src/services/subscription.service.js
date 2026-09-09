import * as subscriptionRepository from '../repositories/subscription.repository.js';
import * as telegramMessageRepository from '../repositories/telegram-message.repository.js';
import { ensureProductTracked } from './product.service.js';
import { sendProductMessage } from './telegram.service.js';
import { ConflictError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

/**
 * Creates a subscription and posts the live-updating price card. The price
 * worker (already running for /api/health + /api/stats reasons) edits this
 * exact message via editMessageText whenever the product's price changes —
 * that's the entire "notify on update" mechanism, no separate polling path.
 */
export async function trackProduct({ telegramUserId, telegramChatId, woocommerceProductId }) {
  const product = await ensureProductTracked(woocommerceProductId);

  const existing = await subscriptionRepository.findActive({
    telegramUserId,
    productId: product.id,
  });

  if (existing) {
    throw new ConflictError(
      ERROR_CODES.SUBSCRIPTION_EXISTS,
      'You are already tracking this product'
    );
  }

  await subscriptionRepository.create({ telegramUserId, telegramChatId, productId: product.id });

  const message = await sendProductMessage(telegramChatId, product);
  await telegramMessageRepository.create({
    telegramChatId,
    telegramMessageId: message.message_id,
    productId: product.id,
    lastPrice: product.price,
  });

  return product;
}
