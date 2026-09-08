export async function startCommand(ctx) {
  await ctx.reply(
    [
      '👋 به ربات قیمت خوش آمدید!',
      '',
      'برای جستجوی محصول از دستور /search استفاده کنید.',
      'برای دیدن راهنما دستور /help را بفرستید.',
    ].join('\n')
  );
}
