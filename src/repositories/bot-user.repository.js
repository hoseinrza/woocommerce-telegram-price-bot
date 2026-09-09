import { pool } from '../config/database.js';

function mapRow(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    telegramChatId: Number(row.telegram_chat_id),
    telegramUserId: row.telegram_user_id === null ? null : Number(row.telegram_user_id),
    firstName: row.first_name,
    username: row.username,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertActive({ telegramChatId, telegramUserId, firstName, username }) {
  const { rows } = await pool.query(
    `INSERT INTO bot_users (telegram_chat_id, telegram_user_id, first_name, username, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (telegram_chat_id) DO UPDATE SET
       telegram_user_id = EXCLUDED.telegram_user_id,
       first_name = EXCLUDED.first_name,
       username = EXCLUDED.username,
       is_active = TRUE
     RETURNING *`,
    [telegramChatId, telegramUserId ?? null, firstName ?? null, username ?? null]
  );
  return mapRow(rows[0]);
}

export async function deactivate(telegramChatId) {
  await pool.query('UPDATE bot_users SET is_active = FALSE WHERE telegram_chat_id = $1', [telegramChatId]);
}

export async function listActive() {
  const { rows } = await pool.query('SELECT * FROM bot_users WHERE is_active = TRUE ORDER BY id ASC');
  return rows.map(mapRow);
}
