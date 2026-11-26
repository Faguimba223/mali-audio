-- 002_v1_2_platform_schema.sql
-- Évolution complète Mali Audio v1.2 (PWA, streaming privé, albums, playlists, vidéos, droits, audit)

-- 1. Extension non destructive de users + récupération mot de passe
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users (LOWER(username)) WHERE username IS NOT NULL;

CREATE TABLE IF NOT EXISTS password_resets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);

-- 2. Médias centralisés (audio privé, pochettes, vidéos, preuves de droits)
CREATE TABLE IF NOT EXISTS media_assets (
  id SERIAL PRIMARY KEY,
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255),
  mime_type VARCHAR(120) NOT NULL,
  media_type VARCHAR(30) NOT NULL CHECK (media_type IN ('audio', 'image', 'video', 'document')),
  size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER,
  is_private BOOLEAN NOT NULL DEFAULT true,
  provenance TEXT DEFAULT '',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_media_assets_type ON media_assets (media_type, status);

-- 3. Extension artistes & catégories
ALTER TABLE artists ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
ALTER TABLE artists ADD COLUMN IF NOT EXISTS genres TEXT DEFAULT '';
ALTER TABLE artists ADD COLUMN IF NOT EXISTS official_links JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE artists ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'published';
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_slug_unique ON artists (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_artists_status ON artists (status);

ALTER TABLE categories ADD COLUMN IF NOT EXISTS slug VARCHAR(180);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type VARCHAR(40) NOT NULL DEFAULT 'genre';
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug_unique ON categories (slug) WHERE slug IS NOT NULL;

-- 4. Albums & Singles
CREATE TABLE IF NOT EXISTS albums (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  artist_id INTEGER REFERENCES artists(id) ON DELETE RESTRICT,
  release_type VARCHAR(20) NOT NULL DEFAULT 'album' CHECK (release_type IN ('album', 'single', 'ep')),
  cover_url TEXT DEFAULT '',
  cover_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  release_date DATE,
  description TEXT DEFAULT '',
  genre VARCHAR(120) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'unpublished', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums (artist_id);
CREATE INDEX IF NOT EXISTS idx_albums_status ON albums (status);

-- 5. Extension chansons (statuts, droits, album, catégorie, fichier privé)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE songs ADD COLUMN IF NOT EXISTS album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS track_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS release_type VARCHAR(20) NOT NULL DEFAULT 'single';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'published';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS rights_holder VARCHAR(255) DEFAULT '';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS license_info TEXT DEFAULT '';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS provenance TEXT DEFAULT '';
ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS cover_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS idx_songs_slug_unique ON songs (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_songs_status ON songs (status);
CREATE INDEX IF NOT EXISTS idx_songs_album ON songs (album_id);
CREATE INDEX IF NOT EXISTS idx_songs_genre ON songs (genre);
CREATE INDEX IF NOT EXISTS idx_songs_language ON songs (language);

-- 6. Artistes principaux & invités sur les chansons
CREATE TABLE IF NOT EXISTS song_artists (
  id SERIAL PRIMARY KEY,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL DEFAULT 'featured' CHECK (role IN ('main', 'featured')),
  UNIQUE(song_id, artist_id, role)
);
CREATE INDEX IF NOT EXISTS idx_song_artists_song ON song_artists (song_id);
CREATE INDEX IF NOT EXISTS idx_song_artists_artist ON song_artists (artist_id);

-- 7. Playlists (éditoriales et personnelles)
CREATE TABLE IF NOT EXISTS playlists (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  description TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  is_editorial BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'pending_review', 'published', 'unpublished', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists (user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_editorial ON playlists (is_editorial, status);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id SERIAL PRIMARY KEY,
  playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id INTEGER NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 1,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(playlist_id, song_id)
);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs (playlist_id, position);

-- 8. Vidéos & clips
CREATE TABLE IF NOT EXISTS videos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE,
  artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT DEFAULT '',
  source_type VARCHAR(20) NOT NULL DEFAULT 'external' CHECK (source_type IN ('upload', 'external')),
  source_url TEXT DEFAULT '',
  media_asset_id INTEGER REFERENCES media_assets(id) ON DELETE SET NULL,
  duration VARCHAR(20) DEFAULT '',
  release_date DATE,
  rights_holder VARCHAR(255) DEFAULT '',
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'unpublished', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_videos_artist ON videos (artist_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos (status);

-- 9. Extension actualités
ALTER TABLE news ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE news ADD COLUMN IF NOT EXISTS summary TEXT DEFAULT '';
ALTER TABLE news ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE news ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'draft';
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_slug_unique ON news (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_news_status ON news (status);

-- Synchroniser le statut des news existantes si published = true
UPDATE news SET status = 'published' WHERE published = true AND status = 'draft';

-- 10. Paramètres plateforme & journal d'activité admin
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(120) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_email VARCHAR(255),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80),
  entity_id VARCHAR(80),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address VARCHAR(80),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);

-- Valeurs initiales des paramètres (idempotent)
INSERT INTO settings (key, value) VALUES
  ('branding', '{"platformName":"Mali Audio","tagline":"Les sons de chez nous","contactEmail":"contact@maliaudio.com","contactPhone":"73611046","defaultLanguage":"fr","socialLinks":{}}'::jsonb),
  ('player', '{"defaultVolume":0.85,"historyEnabled":true,"allowGuestPreview":true}'::jsonb),
  ('uploads', '{"maxAudioMb":100,"maxImageMb":10,"maxVideoMb":250}'::jsonb),
  ('system', '{"maintenanceMode":false,"version":"1.2.0","rightsNotice":"Diffusion sous autorisation Mali Audio uniquement."}'::jsonb)
ON CONFLICT (key) DO NOTHING;
