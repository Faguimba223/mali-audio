import pg from 'pg';
import env from './env.js';
import { runMigrations, seedDefaults } from '../db/migrate.js';

const { Pool } = pg;
const invalidDatabaseUrlMessage = 'DATABASE_URL est invalide. Format attendu : postgresql://USER:PASSWORD@HOST:PORT/DATABASE';

export function validateDatabaseUrl(value) {
  let url;
  try {
    if (typeof value !== 'string' || !value || /\s/.test(value)) throw new Error();
    url = new URL(value);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') throw new Error();
    if (!url.username || !url.hostname) throw new Error();
    if (url.pathname.length <= 1 || url.pathname.slice(1).includes('/') || url.hash) throw new Error();
    decodeURIComponent(url.username);
    if (url.password) decodeURIComponent(url.password);
  } catch {
    throw new Error(invalidDatabaseUrlMessage);
  }
  return value;
}

let poolInstance = null;

export function getPool() {
  if (!poolInstance) {
    const connectionString = validateDatabaseUrl(env.databaseUrl);
    poolInstance = new Pool({
      connectionString,
      ssl: env.isProduction && process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    });
    poolInstance.on('error', (error) => {
      console.error('[db] PostgreSQL pool error:', error.code || 'UNKNOWN');
    });
  }
  return poolInstance;
}

export async function query(text, params) {
  try {
    return await getPool().query(text, params);
  } catch (error) {
    console.error('[db] PostgreSQL query failed:', error.code || error.message);
    throw error;
  }
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase() {
  const pool = getPool();
  await runMigrations(pool);
  await seedDefaults(pool);
}

export default { query, withTransaction, getPool, initializeDatabase };
