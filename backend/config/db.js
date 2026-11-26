import 'dotenv/config';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const invalidDatabaseUrlMessage = 'DATABASE_URL est invalide. Format attendu : postgresql://USER:PASSWORD@HOST:PORT/DATABASE';

function validateDatabaseUrl(value) {
  let url;
  try {
    if (typeof value !== 'string' || !value || /\s/.test(value)) throw new Error();
    url = new URL(value);
    if (url.protocol !== 'postgresql:') throw new Error();
    if (!url.username || !url.password || !url.hostname || !url.port) throw new Error();
    if (url.pathname.length <= 1 || url.pathname.slice(1).includes('/') || url.hash) throw new Error();
    decodeURIComponent(url.username);
    decodeURIComponent(url.password);
  } catch {
    throw new Error(invalidDatabaseUrlMessage);
  }
  return value;
}

const connectionString = validateDatabaseUrl(databaseUrl);

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (error) => {
  console.error('[db] PostgreSQL pool error:', error.code || 'UNKNOWN');
});

export async function query(text, params) {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error('[db] PostgreSQL query failed:', error.code || 'UNKNOWN');
    throw error;
  }
}

export async function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'user',
      avatar TEXT,
      language VARCHAR(80),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS artists (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      biography TEXT,
      photo TEXT,
      country VARCHAR(100),
      language VARCHAR(80),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS songs (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
      album VARCHAR(255),
      genre VARCHAR(100),
      language VARCHAR(80),
      audio_url TEXT,
      cover_url TEXT,
      duration VARCHAR(20),
      release_date DATE,
      description TEXT,
      play_count INTEGER NOT NULL DEFAULT 0,
      is_featured BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      author VARCHAR(150),
      published BOOLEAN NOT NULL DEFAULT false,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS new_releases (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      song_id INTEGER REFERENCES songs(id) ON DELETE SET NULL,
      published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS languages (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS listening_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      song_id INTEGER REFERENCES songs(id) ON DELETE CASCADE,
      listened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      progress INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs (artist_id);
    CREATE INDEX IF NOT EXISTS idx_songs_title ON songs (title);
    CREATE INDEX IF NOT EXISTS idx_artists_name ON artists (name);
    CREATE INDEX IF NOT EXISTS idx_news_title ON news (title);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites (user_id);
    CREATE INDEX IF NOT EXISTS idx_history_user ON listening_history (user_id);
  `;

  await query(schema);

  await query(`INSERT INTO languages (name, code, is_active)
    SELECT * FROM (VALUES
      ('Français', 'fr', true),
      ('Bambara', 'bm', true),
      ('Soninké', 'sn', true),
      ('Peul', 'ff', true),
      ('Dogon', 'dg', true),
      ('Anglais', 'en', true),
      ('Arabe', 'ar', true)
    ) AS v(name, code, is_active)
    WHERE NOT EXISTS (SELECT 1 FROM languages);`);

  const defaultEmail = (process.env.ADMIN_EMAIL || 'admin@maliaudio.local').trim();
  const defaultName = (process.env.ADMIN_NAME || 'Administrateur').trim();
  const defaultPassword = process.env.ADMIN_PASSWORD || 'root';
  const adminCheck = await query('SELECT id FROM users WHERE email = $1', [defaultEmail]);

  if (adminCheck.rows.length === 0) {
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    await query(
      'INSERT INTO users (name, email, password_hash, role, is_active, language) VALUES ($1, $2, $3, $4, true, $5)',
      [defaultName, defaultEmail, passwordHash, 'admin', 'fr']
    );
    console.log(`Compte administrateur initial créé : ${defaultEmail}`);
  }
}

export default pool;
