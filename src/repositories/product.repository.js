import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    woocommerceId: Number(row.woocommerce_id),
    name: row.name,
    sku: row.sku,
    price: row.price === null ? null : Number(row.price),
    regularPrice: row.regular_price === null ? null : Number(row.regular_price),
    salePrice: row.sale_price === null ? null : Number(row.sale_price),
    stockStatus: row.stock_status,
    permalink: row.permalink,
    isActive: row.is_active,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  return mapRow(rows[0]);
}

export async function findByWoocommerceId(woocommerceId) {
  const { rows } = await pool.query('SELECT * FROM products WHERE woocommerce_id = $1', [
    woocommerceId,
  ]);
  return mapRow(rows[0]);
}

export async function findByIds(ids) {
  if (ids.length === 0) return [];
  const { rows } = await pool.query('SELECT * FROM products WHERE id = ANY($1)', [ids]);
  return rows.map(mapRow);
}

export async function findByWoocommerceIds(woocommerceIds) {
  if (woocommerceIds.length === 0) return [];
  const { rows } = await pool.query('SELECT * FROM products WHERE woocommerce_id = ANY($1)', [
    woocommerceIds,
  ]);
  return rows.map(mapRow);
}

export async function searchByName(term, limit = 10) {
  const { rows } = await pool.query(
    `SELECT * FROM products
     WHERE is_active = TRUE AND (name ILIKE $1 OR sku ILIKE $1)
     ORDER BY name ASC
     LIMIT $2`,
    [`%${term}%`, limit]
  );
  return rows.map(mapRow);
}

export async function list({ page = 1, pageSize = 20 } = {}) {
  const offset = (page - 1) * pageSize;
  const { rows } = await pool.query(
    `SELECT * FROM products WHERE is_active = TRUE ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [pageSize, offset]
  );
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS count FROM products WHERE is_active = TRUE'
  );
  return { items: rows.map(mapRow), total: countRows[0].count };
}

export async function upsertFromWoocommerce(product) {
  const { rows } = await pool.query(
    `INSERT INTO products (
       woocommerce_id, name, sku, price, regular_price, sale_price,
       stock_status, permalink, is_active, last_synced_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, NOW())
     ON CONFLICT (woocommerce_id) DO UPDATE SET
       name = EXCLUDED.name,
       sku = EXCLUDED.sku,
       price = EXCLUDED.price,
       regular_price = EXCLUDED.regular_price,
       sale_price = EXCLUDED.sale_price,
       stock_status = EXCLUDED.stock_status,
       permalink = EXCLUDED.permalink,
       is_active = TRUE,
       last_synced_at = NOW()
     RETURNING *`,
    [
      product.woocommerceId,
      product.name,
      product.sku ?? null,
      product.price,
      product.regularPrice,
      product.salePrice,
      product.stockStatus,
      product.permalink ?? null,
    ]
  );
  return mapRow(rows[0]);
}

export async function updatePrice(client, { id, price, regularPrice, salePrice, stockStatus }) {
  const executor = client ?? pool;
  const { rows } = await executor.query(
    `UPDATE products
     SET price = $2, regular_price = $3, sale_price = $4, stock_status = $5, last_synced_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, price, regularPrice, salePrice, stockStatus]
  );
  return mapRow(rows[0]);
}

export async function touchLastSynced(id) {
  await pool.query('UPDATE products SET last_synced_at = NOW() WHERE id = $1', [id]);
}

export async function countActive() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM products WHERE is_active = TRUE');
  return rows[0].count;
}
