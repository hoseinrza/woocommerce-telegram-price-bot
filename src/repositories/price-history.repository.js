import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    oldPrice: row.old_price === null ? null : Number(row.old_price),
    newPrice: Number(row.new_price),
    changedAt: row.changed_at,
  };
}

export async function insert(client, { productId, oldPrice, newPrice }) {
  const executor = client ?? pool;
  const { rows } = await executor.query(
    `INSERT INTO price_history (product_id, old_price, new_price)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [productId, oldPrice, newPrice]
  );
  return mapRow(rows[0]);
}

export async function listByProductId(productId, limit = 20) {
  const { rows } = await pool.query(
    `SELECT * FROM price_history WHERE product_id = $1 ORDER BY changed_at DESC LIMIT $2`,
    [productId, limit]
  );
  return rows.map(mapRow);
}
