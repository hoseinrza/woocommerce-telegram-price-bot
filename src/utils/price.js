import { env } from '../config/env.js';

/**
 * Parses and validates a raw price value coming from WooCommerce (string) or
 * storage (string/number). Returns a finite non-negative number, or null when
 * the price is genuinely absent (never assume absent/empty means free).
 */
export function parsePrice(raw) {
  if (raw === null || raw === undefined) return null;

  const str = typeof raw === 'string' ? raw.trim() : String(raw);
  if (str === '') return null;

  const value = Number(str);

  if (!Number.isFinite(value)) {
    throw new Error(`Invalid price value: ${JSON.stringify(raw)}`);
  }

  if (value < 0) {
    throw new Error(`Price cannot be negative: ${JSON.stringify(raw)}`);
  }

  return value;
}

export function isValidPrice(raw) {
  try {
    return parsePrice(raw) !== null;
  } catch {
    return false;
  }
}

/**
 * Two prices are considered equal when they round to the same value at the
 * currency's smallest displayed unit (avoids float noise from upstream APIs).
 */
export function pricesAreEqual(a, b) {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return Math.round(Number(a) * 10000) === Math.round(Number(b) * 10000);
}

export function formatPrice(value, { currencyLabel = env.PRICE_CURRENCY_LABEL } = {}) {
  if (value === null || value === undefined) return 'نامشخص';

  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(Number(value));

  return currencyLabel ? `${formatted} ${currencyLabel}` : formatted;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(input) {
  return String(input).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

/** Same grouping as formatPrice but with Persian digits, for the rate-card broadcast. */
export function formatPriceFa(value, { currencyLabel = env.PRICE_CURRENCY_LABEL } = {}) {
  if (value === null || value === undefined) return 'نامشخص';

  const formatted = toPersianDigits(
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value))
  );

  return currencyLabel ? `${formatted} ${currencyLabel}` : formatted;
}

/**
 * WooCommerce's `date_modified` field is already in the store's own
 * timezone (Iran) — no conversion needed, just pull HH:MM out of the
 * ISO-shaped string ("2026-09-08T18:03:28" -> "18:03").
 */
export function formatUpdateTime(dateModified) {
  if (!dateModified) return null;
  const match = /T(\d{2}):(\d{2})/.exec(dateModified);
  return match ? `${match[1]}:${match[2]}` : null;
}

export function formatStockStatus(stockStatus) {
  switch (stockStatus) {
    case 'instock':
      return '🟢 موجود';
    case 'onbackorder':
      return '🟡 پیش‌سفارش';
    case 'outofstock':
      return '🔴 ناموجود';
    default:
      return '⚪️ نامشخص';
  }
}

export function formatProductLine(product) {
  const time = formatUpdateTime(product.dateModified);
  const lines = [`🛒 ${product.name}`, `💰 ${formatPrice(product.price)} — ${formatStockStatus(product.stockStatus)}`];
  if (time) {
    lines.push(`🔄 آخرین بروزرسانی: ${time}`);
  }
  return lines.join('\n');
}
