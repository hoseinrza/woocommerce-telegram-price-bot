import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    telegramChatId: Number(row.telegram_chat_id),
    telegramMessageId: Number(row.telegram_message_id),
    productId: Number(row.product_id),
    lastPrice: row.last_price === null ? null : Number(row.last_price),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function create({ telegramChatId, telegramMessageId, productId, lastPrice }) {
  const { rows } = await pool.query(
    `INSERT INTO telegram_messages (telegram_chat_id, telegram_message_id, product_id, last_price)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_chat_id, telegram_message_id)
     DO UPDATE SET last_price = EXCLUDED.last_price, updated_at = NOW()
     RETURNING *`,
    [telegramChatId, telegramMessageId, productId, lastPrice]
  );
  return mapRow(rows[0]);
}

export async function listByProductId(productId) {
  const { rows } = await pool.query(
    `SELECT * FROM telegram_messages WHERE product_id = $1`,
    [productId]
  );
  return rows.map(mapRow);
}

export async function updateLastPrice(id, lastPrice) {
  const { rows } = await pool.query(
    `UPDATE telegram_messages SET last_price = $2 WHERE id = $1 RETURNING *`,
    [id, lastPrice]
  );
  return mapRow(rows[0]);
}

export async function remove({ telegramChatId, telegramMessageId }) {
  await pool.query(
    `DELETE FROM telegram_messages WHERE telegram_chat_id = $1 AND telegram_message_id = $2`,
    [telegramChatId, telegramMessageId]
  );
}
