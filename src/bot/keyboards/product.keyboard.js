import { Markup } from 'telegraf';

export function searchResultsKeyboard(products) {
  return Markup.inlineKeyboard(
    products.map((product) => [
      Markup.button.callback(product.name.slice(0, 60), `track:${product.woocommerceId}`),
    ])
  );
}

export function subscriptionListKeyboard(products) {
  return Markup.inlineKeyboard(
    products.map((product) => [
      Markup.button.callback(`❌ ${product.name.slice(0, 50)}`, `untrack:${product.id}`),
    ])
  );
}
