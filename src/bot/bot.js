import { bot } from '../services/telegram.service.js';
import { startCommand } from './commands/start.command.js';
import { helpCommand } from './commands/help.command.js';
import { searchCommand } from './commands/search.command.js';
import { trackCommand } from './commands/track.command.js';
import { untrackCommand } from './commands/untrack.command.js';
import { productsCommand } from './commands/products.command.js';
import { callbackQueryHandler } from './handlers/callback.handler.js';
import { logger } from '../utils/logger.js';

bot.start(startCommand);
bot.help(helpCommand);
bot.command('search', searchCommand);
bot.command('track', trackCommand);
bot.command('untrack', untrackCommand);
bot.command('products', productsCommand);
bot.on('callback_query', callbackQueryHandler);

bot.catch((error, ctx) => {
  logger.error({ event: 'telegram_unhandled_error', err: error.message, updateType: ctx.updateType });
});

export function startBot() {
  return bot.launch();
}

export function stopBot(reason) {
  bot.stop(reason);
}

export { bot };
