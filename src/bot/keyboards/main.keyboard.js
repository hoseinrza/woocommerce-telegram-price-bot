import { Markup } from 'telegraf';

export const PRICES_BUTTON_TEXT = '📋 مشاهده قیمت‌ها';

/**
 * A persistent reply keyboard (replaces the device's own keyboard) so users
 * can reach the price list with one tap, with no "/" command to remember.
 */
export const mainKeyboard = Markup.keyboard([[PRICES_BUTTON_TEXT]])
  .resize()
  .persistent();
