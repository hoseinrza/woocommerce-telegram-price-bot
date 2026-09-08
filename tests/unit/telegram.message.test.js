import '../helpers/test-env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProductMessage } from '../../src/services/telegram.service.js';

test('buildProductMessage: shows price, stock status, and last sync time', () => {
  const text = buildProductMessage({
    name: 'Widget',
    price: 59900000,
    stockStatus: 'instock',
    lastSyncedAt: new Date('2026-09-08T09:44:00Z'),
  });

  assert.match(text, /Widget/);
  assert.match(text, /59,900,000/);
  assert.match(text, /موجود/);
  assert.match(text, /آخرین بروزرسانی/);
});

test('buildProductMessage: surfaces a sync-failure warning instead of a stale timestamp', () => {
  const text = buildProductMessage(
    { name: 'Widget', price: 59900000, stockStatus: 'instock', lastSyncedAt: new Date() },
    { syncFailed: true }
  );

  assert.match(text, /بروزرسانی قیمت موقتاً ناموفق بود/);
  assert.doesNotMatch(text, /آخرین بروزرسانی/);
});

test('buildProductMessage: out-of-stock renders the red indicator', () => {
  const text = buildProductMessage({
    name: 'Widget',
    price: 100,
    stockStatus: 'outofstock',
    lastSyncedAt: new Date(),
  });
  assert.match(text, /ناموجود/);
});
