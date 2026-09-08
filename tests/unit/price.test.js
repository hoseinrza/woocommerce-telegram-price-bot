import '../helpers/test-env.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, isValidPrice, pricesAreEqual, formatPrice } from '../../src/utils/price.js';

test('parsePrice: valid numeric string', () => {
  assert.equal(parsePrice('59900000'), 59900000);
});

test('parsePrice: valid number', () => {
  assert.equal(parsePrice(1250000), 1250000);
});

test('parsePrice: null returns null (absent, not free)', () => {
  assert.equal(parsePrice(null), null);
});

test('parsePrice: empty string returns null', () => {
  assert.equal(parsePrice(''), null);
  assert.equal(parsePrice('   '), null);
});

test('parsePrice: zero is a valid price, not treated as absent', () => {
  assert.equal(parsePrice('0'), 0);
  assert.equal(parsePrice(0), 0);
});

test('parsePrice: negative price throws', () => {
  assert.throws(() => parsePrice('-100'));
});

test('parsePrice: non-numeric string throws', () => {
  assert.throws(() => parsePrice('abc'));
  assert.throws(() => parsePrice('12,000 IRR'));
});

test('isValidPrice: convenience wrapper', () => {
  assert.equal(isValidPrice('100'), true);
  assert.equal(isValidPrice('abc'), false);
  assert.equal(isValidPrice(null), false); // null means "absent", not "a valid price"
});

test('pricesAreEqual: same numeric value in different representations', () => {
  assert.equal(pricesAreEqual(100, 100), true);
  assert.equal(pricesAreEqual(100, 100.00001), true); // below rounding threshold
  assert.equal(pricesAreEqual(100, 101), false);
});

test('pricesAreEqual: null handling', () => {
  assert.equal(pricesAreEqual(null, null), true);
  assert.equal(pricesAreEqual(null, 100), false);
  assert.equal(pricesAreEqual(100, null), false);
});

test('formatPrice: adds thousands separators and currency label', () => {
  assert.equal(formatPrice(59900000, { currencyLabel: 'تومان' }), '59,900,000 تومان');
});

test('formatPrice: null value renders as unknown, not 0', () => {
  assert.equal(formatPrice(null), 'نامشخص');
});
