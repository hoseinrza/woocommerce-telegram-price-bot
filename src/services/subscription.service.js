import * as subscriptionRepository from '../repositories/subscription.repository.js';
import * as telegramMessageRepository from '../repositories/telegram-message.repository.js';
import * as productRepository from '../repositories/product.repository.js';
import { ensureProductTracked } from './product.service.js';
import { sendProductMessage } from './telegram.service.js';
import { ConflictError, NotFoundError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

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

export async function untrackProduct({ telegramUserId, productId }) {
  const product = await productRepository.findById(productId);
  if (!product) {
    throw new NotFoundError(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found');
  }

  const subscription = await subscriptionRepository.findActive({ telegramUserId, productId });
  if (!subscription) {
    throw new NotFoundError(ERROR_CODES.SUBSCRIPTION_NOT_FOUND, 'You are not tracking this product');
  }

  await subscriptionRepository.deactivate({ telegramUserId, productId });
  return product;
}

export async function listUserSubscriptions(telegramUserId) {
  const subscriptions = await subscriptionRepository.listActiveByUser(telegramUserId);
  const productIds = subscriptions.map((s) => s.productId);
  const products = await productRepository.findByIds(productIds);
  return products;
}
