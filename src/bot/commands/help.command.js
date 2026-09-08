export async function helpCommand(ctx) {
  await ctx.reply(
    [
      'دستورات قابل استفاده:',
      '',
      '/search <نام محصول> — جستجوی محصول',
      '/products — لیست محصولاتی که دنبال می‌کنید',
      '/untrack — لغو دنبال‌کردن یک محصول',
      '/help — نمایش این راهنما',
    ].join('\n')
  );
}
