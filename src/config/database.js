import pg from 'pg';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { LOG_EVENTS } from '../constants/index.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (error) => {
  logger.error({ event: LOG_EVENTS.DATABASE_CONNECTION_FAILED, err: error.message });
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseHealth() {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    logger.error({ event: LOG_EVENTS.DATABASE_CONNECTION_FAILED, err: error.message });
    return false;
  }
}

export async function closeDatabase() {
  await pool.end();
}
