import { mainKeyboard } from '../keyboards/main.keyboard.js';

export async function startCommand(ctx) {
  await ctx.reply(
    [
      '👋 به ربات قیمت خوش آمدید!',
      '',
      'از دکمه‌ی «📋 مشاهده قیمت‌ها» استفاده کنید، یا هر سؤالی دارید (مثلاً «قیمت طلا چنده؟») رو مستقیم همینجا تایپ کنید — نیازی به دستور خاصی نیست.',
    ].join('\n'),
    mainKeyboard
  );
}
