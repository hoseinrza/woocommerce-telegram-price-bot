import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    telegramChatId: Number(row.telegram_chat_id),
    title: row.title,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertActive({ telegramChatId, title }) {
  const { rows } = await pool.query(
    `INSERT INTO channels (telegram_chat_id, title, is_active)
     VALUES ($1, $2, TRUE)
     ON CONFLICT (telegram_chat_id) DO UPDATE SET
       title = EXCLUDED.title,
       is_active = TRUE
     RETURNING *`,
    [telegramChatId, title ?? null]
  );
  return mapRow(rows[0]);
}

export async function deactivate(telegramChatId) {
  const { rows } = await pool.query(
    `UPDATE channels SET is_active = FALSE WHERE telegram_chat_id = $1 RETURNING *`,
    [telegramChatId]
  );
  return mapRow(rows[0]);
}

export async function listActive() {
  const { rows } = await pool.query('SELECT * FROM channels WHERE is_active = TRUE ORDER BY id ASC');
  return rows.map(mapRow);
}
