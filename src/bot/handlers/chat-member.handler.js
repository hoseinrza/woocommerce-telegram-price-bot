import * as channelRepository from '../../repositories/channel.repository.js';
import { logger } from '../../utils/logger.js';

const ACTIVE_STATUSES = new Set(['administrator', 'member']);
const INACTIVE_STATUSES = new Set(['left', 'kicked']);

/**
 * Fires whenever the bot's own membership status changes in a chat. For
 * channels this is how we learn the bot was added (so it can be granted
 * "Post Messages" admin rights) or removed — there is no polling for this.
 * Registration here only flags the channel as active; the channel broadcast
 * scheduler picks it up on its next tick and posts the current price list.
 */
export async function chatMemberHandler(ctx) {
  const update = ctx.myChatMember;
  if (!update || update.chat.type !== 'channel') return;

  const status = update.new_chat_member.status;
  const chatId = update.chat.id;
  const title = update.chat.title ?? null;

  if (ACTIVE_STATUSES.has(status)) {
    await channelRepository.upsertActive({ telegramChatId: chatId, title });
    logger.info({ event: 'channel_registered', chatId, title, status });
    return;
  }

  if (INACTIVE_STATUSES.has(status)) {
    await channelRepository.deactivate(chatId);
    logger.info({ event: 'channel_deactivated', chatId, title, status });
  }
}
