import { bot } from '../services/telegram.service.js';
import { startCommand } from './commands/start.command.js';
import { helpCommand } from './commands/help.command.js';
import { searchCommand } from './commands/search.command.js';
import { askCommand } from './commands/ask.command.js';
import { pricesCommand } from './commands/prices.command.js';
import { chatMemberHandler } from './handlers/chat-member.handler.js';
import { callbackQueryHandler } from './handlers/callback.handler.js';
import { freeTextHandler } from './handlers/free-text.handler.js';
import { PRICES_BUTTON_TEXT } from './keyboards/main.keyboard.js';
import * as botUserRepository from '../repositories/bot-user.repository.js';
import { logger } from '../utils/logger.js';

// Registers every private-chat user who ever messages the bot, so the daily
// digest scheduler has someone to send to — there is no separate "subscribe"
// step, interacting with the bot at all is enough.
bot.use(async (ctx, next) => {
  if (ctx.chat?.type === 'private' && ctx.from) {
    botUserRepository
      .upsertActive({
        telegramChatId: ctx.chat.id,
        telegramUserId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      })
      .catch((error) => {
        logger.error({ event: 'bot_user_upsert_failed', err: error.message });
      });
  }
  return next();
});

bot.start(startCommand);
bot.help(helpCommand);
bot.command('search', searchCommand);
bot.command('ask', askCommand);
bot.hears(PRICES_BUTTON_TEXT, pricesCommand);
bot.on('my_chat_member', chatMemberHandler);
bot.on('callback_query', callbackQueryHandler);
// Registered last: only reached for plain text that no command or hears()
// above already matched, so users never need to know /search or /ask exist.
bot.on('text', freeTextHandler);

bot.catch((error, ctx) => {
  logger.error({ event: 'telegram_unhandled_error', err: error.message, updateType: ctx.updateType });
});

const BOT_COMMANDS = [
  { command: 'start', description: 'شروع کار با ربات' },
  { command: 'search', description: 'جستجوی محصول' },
  { command: 'ask', description: 'پرسش آزاد از دستیار هوشمند' },
  { command: 'help', description: 'راهنمای دستورات' },
];

export async function startBot() {
  await bot.telegram.setMyCommands(BOT_COMMANDS);
  // bot.launch() resolves only after bot.stop() is called (its promise wraps
  // the long-poll loop itself) — it must not be awaited here, or every
  // caller downstream (schedulers, startup logging) would never run.
  // allowedUpdates is explicit (not the Telegram-default set) so channel
  // membership changes are never silently dropped.
  bot
    .launch({ allowedUpdates: ['message', 'callback_query', 'my_chat_member'] })
    .catch((error) => {
      logger.error({ event: 'telegram_bot_launch_failed', err: error.message });
    });
}

export function stopBot(reason) {
  bot.stop(reason);
}

export { bot };
