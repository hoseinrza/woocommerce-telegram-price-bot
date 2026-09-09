import { Markup } from 'telegraf';

/**
 * Stateless "view separately" buttons — no tracking/subscription involved,
 * just opens a dedicated message for that one product on tap.
 */
export function productListKeyboard(products) {
  return Markup.inlineKeyboard(
    products.map((product) => [
      Markup.button.callback(product.name.slice(0, 64), `view:${product.woocommerceId}`),
    ])
  );
}

/**
 * Shown under a single product's view — opts that one product into live
 * price-change notifications.
 */
export function followKeyboard(woocommerceId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🔔 دنبال‌کردن قیمت این محصول', `follow:${woocommerceId}`)],
  ]);
}
