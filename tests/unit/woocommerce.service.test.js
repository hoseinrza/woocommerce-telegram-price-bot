import '../helpers/test-env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WooCommerceService } from '../../src/services/woocommerce.service.js';

function jsonResponse(body, { status = 200, totalPages = 1 } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name === 'x-wp-totalpages' ? String(totalPages) : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function makeService(fetchImpl, overrides = {}) {
  return new WooCommerceService({
    baseUrl: 'https://store.test',
    consumerKey: 'ck_test',
    consumerSecret: 'cs_test',
    timeoutMs: 1000,
    retries: 2,
    pageSize: 50,
    fetchImpl,
    ...overrides,
  });
}

test('WooCommerceService: sends Basic auth header derived from consumer key/secret', async () => {
  let seenAuth;
  const service = makeService(async (url, options) => {
    seenAuth = options.headers.Authorization;
    return jsonResponse({ id: 1, name: 'P', price: '10' });
  });

  await service.getProduct(1);
  assert.equal(seenAuth, `Basic ${Buffer.from('ck_test:cs_test').toString('base64')}`);
});

test('WooCommerceService: normalizes a product response', async () => {
  const service = makeService(async () =>
    jsonResponse({
      id: 42,
      name: 'Widget',
      sku: 'W-1',
      price: '59900000',
      regular_price: '60000000',
      sale_price: '59900000',
      stock_status: 'instock',
      permalink: 'https://store.test/widget',
    })
  );

  const product = await service.getProduct(42);
  assert.deepEqual(product, {
    woocommerceId: 42,
    name: 'Widget',
    sku: 'W-1',
    price: 59900000,
    regularPrice: 60000000,
    salePrice: 59900000,
    stockStatus: 'instock',
    permalink: 'https://store.test/widget',
  });
});

test('WooCommerceService: retries on 5xx and eventually succeeds', async () => {
  let calls = 0;
  const service = makeService(async () => {
    calls += 1;
    if (calls < 2) return jsonResponse({ message: 'boom' }, { status: 503 });
    return jsonResponse({ id: 1, name: 'P', price: '10' });
  });

  const product = await service.getProduct(1);
  assert.equal(product.woocommerceId, 1);
  assert.equal(calls, 2);
});

test('WooCommerceService: never retries 401/403 (auth errors)', async () => {
  let calls = 0;
  const service = makeService(async () => {
    calls += 1;
    return jsonResponse({ message: 'forbidden' }, { status: 403 });
  });

  await assert.rejects(service.getProduct(1));
  assert.equal(calls, 1);
});

test('WooCommerceService: gives up and throws UpstreamError after exhausting retries', async () => {
  const service = makeService(async () => jsonResponse({ message: 'down' }, { status: 500 }));
  await assert.rejects(service.getProduct(1), /WooCommerce is unavailable/);
});

test('WooCommerceService: paginates getProductsByIds by the configured page size', async () => {
  const requestedIncludes = [];
  const service = makeService(
    async (url) => {
      const include = new URL(url).searchParams.get('include');
      requestedIncludes.push(include);
      const ids = include.split(',').map(Number);
      return jsonResponse(ids.map((id) => ({ id, name: `P${id}`, price: '1' })));
    },
    { pageSize: 2 }
  );

  const products = await service.getProductsByIds([1, 2, 3, 4, 5]);
  assert.equal(products.length, 5);
  assert.equal(requestedIncludes.length, 3); // ceil(5/2)
});

test('WooCommerceService: rejects an invalid price in the response', async () => {
  const service = makeService(async () => jsonResponse({ id: 1, name: 'P', price: 'not-a-number' }));
  await assert.rejects(service.getProduct(1));
});
