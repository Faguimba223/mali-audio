import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import env from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');

export async function runMigrations(dbClient) {
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const files = fs.readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const { rows: appliedRows } = await dbClient.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.map((row) => row.version));
  const executed = [];

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await dbClient.query('BEGIN');
    try {
      await dbClient.query(sql);
      await dbClient.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
      await dbClient.query('COMMIT');
      executed.push(file);
    } catch (error) {
      await dbClient.query('ROLLBACK');
      throw error;
    }
  }

  return executed;
}

export async function seedDefaults(dbClient) {
  await dbClient.query(`
    INSERT INTO languages (name, code, is_active)
    SELECT * FROM (VALUES
      ('Français', 'fr', true),
      ('Bambara', 'bm', true),
      ('Soninké', 'sn', true),
      ('Peul', 'ff', true),
      ('Dogon', 'dg', true),
      ('Songhaï', 'so', true),
      ('Tamasheq', 'tm', true),
      ('Anglais', 'en', true),
      ('Arabe', 'ar', true)
    ) AS v(name, code, is_active)
    ON CONFLICT (code) DO NOTHING;
  `);

  if (!env.defaultAdminEnabled) return;
  if (!env.defaultAdminEmail || !env.defaultAdminPassword) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis lorsque DEFAULT_ADMIN_ENABLED est actif.');
  }

  const existing = await dbClient.query('SELECT id, role FROM users WHERE email = $1', [env.defaultAdminEmail]);
  if (existing.rows.length === 0) {
    const passwordHash = await bcrypt.hash(env.defaultAdminPassword, 10);
    await dbClient.query(
      `INSERT INTO users (name, username, email, password_hash, role, is_active, language)
       VALUES ($1, $2, $3, $4, 'admin', true, 'fr')`,
      [env.defaultAdminName, 'admin', env.defaultAdminEmail, passwordHash]
    );
    console.log(`[db] Compte administrateur initial prêt : ${env.defaultAdminEmail}`);
  } else if (existing.rows[0].role !== 'admin') {
    await dbClient.query(`UPDATE users SET role = 'admin', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [existing.rows[0].id]);
  }
}

export async function getMigrationStatus(dbClient) {
  await dbClient.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(160) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  const { rows } = await dbClient.query('SELECT version, applied_at FROM schema_migrations ORDER BY version ASC');
  const appliedMap = new Map(rows.map((r) => [r.version, r.applied_at]));
  return files.map((file) => ({
    version: file,
    status: appliedMap.has(file) ? 'applied' : 'pending',
    applied_at: appliedMap.get(file) || null,
  }));
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCli) {
  const { default: pool } = await import('../config/db.js');
  const command = process.argv[2] || 'up';
  try {
    if (command === 'status') {
      const status = await getMigrationStatus(pool);
      console.table(status);
    } else {
      const applied = await runMigrations(pool);
      await seedDefaults(pool);
      console.log(applied.length ? `Migrations appliquées : ${applied.join(', ')}` : 'Base déjà à jour.');
    }
  } finally {
    await pool.end();
  }
}
