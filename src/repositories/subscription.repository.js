import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    telegramUserId: Number(row.telegram_user_id),
    telegramChatId: Number(row.telegram_chat_id),
    productId: Number(row.product_id),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create({ telegramUserId, telegramChatId, productId }) {
  const { rows } = await pool.query(
    `INSERT INTO subscriptions (telegram_user_id, telegram_chat_id, product_id, is_active)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (telegram_user_id, product_id)
     DO UPDATE SET is_active = TRUE, telegram_chat_id = EXCLUDED.telegram_chat_id, updated_at = NOW()
     RETURNING *`,
    [telegramUserId, telegramChatId, productId]
  );
  return mapRow(rows[0]);
}

export async function deactivate({ telegramUserId, productId }) {
  const { rows } = await pool.query(
    `UPDATE subscriptions SET is_active = FALSE
     WHERE telegram_user_id = $1 AND product_id = $2
     RETURNING *`,
    [telegramUserId, productId]
  );
  return mapRow(rows[0]);
}

export async function findActive({ telegramUserId, productId }) {
  const { rows } = await pool.query(
    `SELECT * FROM subscriptions WHERE telegram_user_id = $1 AND product_id = $2 AND is_active = TRUE`,
    [telegramUserId, productId]
  );
  return mapRow(rows[0]);
}

export async function listActiveByUser(telegramUserId) {
  const { rows } = await pool.query(
    `SELECT * FROM subscriptions WHERE telegram_user_id = $1 AND is_active = TRUE ORDER BY created_at DESC`,
    [telegramUserId]
  );
  return rows.map(mapRow);
}

export async function listDistinctTrackedProductIds() {
  const { rows } = await pool.query(
    `SELECT DISTINCT product_id FROM subscriptions WHERE is_active = TRUE`
  );
  return rows.map((row) => Number(row.product_id));
}

export async function countActiveSubscriptions() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM subscriptions WHERE is_active = TRUE');
  return rows[0].count;
}
