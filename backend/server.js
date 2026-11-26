import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, query } from './config/db.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 5000);
const jwtSecret = process.env.JWT_SECRET || 'mali-audio-dev-secret';
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

const mapUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  avatar: user.avatar,
  language: user.language,
  is_active: user.is_active,
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const mapArtist = (artist) => ({
  id: artist.id,
  name: artist.name,
  biography: artist.biography || '',
  photo: artist.photo || '',
  country: artist.country || '',
  language: artist.language || '',
  created_at: artist.created_at,
  updated_at: artist.updated_at,
});

const mapSong = (song) => ({
  id: song.id,
  title: song.title,
  artist_id: song.artist_id,
  artist: song.artist_name || song.artist || '',
  album: song.album || '',
  genre: song.genre || '',
  language: song.language || '',
  audio_url: song.audio_url || '',
  cover_url: song.cover_url || '',
  duration: song.duration || '',
  release_date: song.release_date || null,
  description: song.description || '',
  play_count: Number(song.play_count || 0),
  is_featured: Boolean(song.is_featured),
  created_at: song.created_at,
  updated_at: song.updated_at,
});

const mapNews = (story) => ({
  id: story.id,
  title: story.title,
  content: story.content,
  image_url: story.image_url || '',
  author: story.author || '',
  published: Boolean(story.published),
  published_at: story.published_at,
  created_at: story.created_at,
  updated_at: story.updated_at,
});

const mapLanguage = (language) => ({
  id: language.id,
  name: language.name,
  code: language.code,
  is_active: Boolean(language.is_active),
  created_at: language.created_at,
});

const mapFavorite = (favorite) => ({
  id: favorite.id,
  user_id: favorite.user_id,
  song_id: favorite.song_id,
  song: favorite.song ? mapSong(favorite.song) : null,
  created_at: favorite.created_at,
});

const parseId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const normalizeCorsOrigins = () => {
  const configured = process.env.CORS_ORIGIN || '';
  if (!configured) return true;
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean);
};

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: normalizeCorsOrigins(),
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(uploadDir));

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'Mali Audio API fonctionne' });
});

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Mali Audio API fonctionne' });
});

const registerHandler = async (req, res) => {
  const { name, email, password, phone, language } = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim();

  if (!normalizedName || !isValidEmail(normalizedEmail) || !password || String(password).length < 6) {
    return res.status(400).json({ message: 'Nom, email valide et mot de passe (6 caractères minimum) sont requis.' });
  }

  const existing = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
  }

  const passwordHash = await bcrypt.hash(String(password), 10);
  const created = await query(
    `INSERT INTO users (name, email, phone, password_hash, role, language, is_active)
     VALUES ($1, $2, $3, $4, 'user', $5, true) RETURNING *`,
    [normalizedName, normalizedEmail, phone || null, passwordHash, language || 'fr']
  );

  const user = mapUser(created.rows[0]);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });

  return res.status(201).json({ token, user });
};

const loginHandler = async (req, res) => {
  const { email, identifier, password } = req.body || {};
  const loginValue = String(identifier || email || '').trim().toLowerCase();

  if (!loginValue || !password) {
    return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
  }

  const { rows } = await query('SELECT * FROM users WHERE email = $1 OR name = $1', [loginValue]);
  const user = rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }

  if (!user.is_active) {
    return res.status(403).json({ message: 'Ce compte est désactivé.' });
  }

  const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Identifiants invalides.' });
  }

  const clientUser = mapUser(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, jwtSecret, { expiresIn: '7d' });

  return res.json({ token, user: clientUser });
};

app.post('/api/auth/register', authLimiter, registerHandler);
app.post('/api/users/register', authLimiter, registerHandler);
app.post('/api/auth/login', authLimiter, loginHandler);
app.post('/api/users/login', authLimiter, loginHandler);

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [userId]);
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(mapUser(rows[0]));
});

app.get('/api/users/profile', requireAuth, async (_req, res) => {
  return res.redirect(307, '/api/auth/me');
});

app.post('/api/auth/logout', requireAuth, (_req, res) => {
  return res.json({ success: true, message: 'Déconnexion réussie.' });
});

app.post('/api/users/logout', requireAuth, (_req, res) => {
  return res.redirect(307, '/api/auth/logout');
});

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = 'SELECT * FROM users ORDER BY created_at DESC';
  const params = [];

  if (q) {
    sql = 'SELECT * FROM users WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC';
    params.push(`%${q}%`);
  }

  const { rows } = await query(sql, params);
  return res.json(rows.map(mapUser));
});

app.get('/api/users/admin', requireAuth, requireAdmin, async (_req, res) => {
  return res.redirect(307, '/api/users');
});

app.get('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(mapUser(rows[0]));
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });

  const { name, email, role, is_active } = req.body || {};
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push(`name = $${values.length + 1}`);
    values.push(String(name).trim());
  }
  if (email !== undefined) {
    updates.push(`email = $${values.length + 1}`);
    values.push(String(email).trim().toLowerCase());
  }
  if (role !== undefined) {
    updates.push(`role = $${values.length + 1}`);
    values.push(String(role).trim());
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${values.length + 1}`);
    values.push(Boolean(is_active));
  }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification disponible.' });
  values.push(id);

  const { rows } = await query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(mapUser(rows[0]));
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
  if (req.user.id === id) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });

  await query('DELETE FROM users WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Utilisateur supprimé.' });
});

app.patch('/api/users/admin/:id/active', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  const { is_active } = req.body || {};
  if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });

  const { rows } = await query('UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [Boolean(is_active), id]);
  if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
  return res.json(mapUser(rows[0]));
});

app.patch('/api/users/profile', requireAuth, async (req, res) => {
  const { name, email, phone, language } = req.body || {};
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push(`name = $${values.length + 1}`);
    values.push(String(name).trim());
  }
  if (email !== undefined) {
    updates.push(`email = $${values.length + 1}`);
    values.push(String(email).trim().toLowerCase());
  }
  if (phone !== undefined) {
    updates.push(`phone = $${values.length + 1}`);
    values.push(phone || null);
  }
  if (language !== undefined) {
    updates.push(`language = $${values.length + 1}`);
    values.push(String(language).trim());
  }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });

  values.push(req.user.id);
  const { rows } = await query(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  return res.json(mapUser(rows[0]));
});

app.patch('/api/users/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe valide requis.' });
  }

  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  const isValid = await bcrypt.compare(String(currentPassword), user.password_hash);
  if (!isValid) return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });

  const hash = await bcrypt.hash(String(newPassword), 10);
  const updated = await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [hash, req.user.id]);
  const token = jwt.sign({ id: req.user.id, email: req.user.email, role: req.user.role }, jwtSecret, { expiresIn: '7d' });

  return res.json({ token, user: mapUser(updated.rows[0]) });
});

app.get('/api/artists', async (_req, res) => {
  const { rows } = await query('SELECT * FROM artists ORDER BY created_at DESC');
  return res.json(rows.map(mapArtist));
});

app.get('/api/musics', async (_req, res) => {
  return res.redirect(307, '/api/songs');
});

app.get('/api/songs', async (req, res) => {
  const q = String(req.query.q || '').trim();
  let sql = `SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id ORDER BY s.created_at DESC`;
  const params = [];

  if (q) {
    sql = `SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.title ILIKE $1 OR a.name ILIKE $1 OR s.album ILIKE $1 ORDER BY s.created_at DESC`;
    params.push(`%${q}%`);
  }

  const { rows } = await query(sql, params);
  return res.json(rows.map(mapSong));
});

app.get('/api/songs/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

  const { rows } = await query(`SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.id = $1`, [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable.' });
  return res.json(mapSong(rows[0]));
});

app.post('/api/artists', requireAuth, requireAdmin, async (req, res) => {
  const { name, biography, photo, country, language } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Le nom de l’artiste est obligatoire.' });

  const inserted = await query(
    `INSERT INTO artists (name, biography, photo, country, language) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [String(name).trim(), biography || '', photo || '', country || '', language || 'fr']
  );

  return res.status(201).json(mapArtist(inserted.rows[0]));
});

app.put('/api/artists/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant artiste invalide.' });

  const { name, biography, photo, country, language } = req.body || {};
  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push(`name = $${values.length + 1}`);
    values.push(String(name).trim());
  }
  if (biography !== undefined) {
    updates.push(`biography = $${values.length + 1}`);
    values.push(String(biography));
  }
  if (photo !== undefined) {
    updates.push(`photo = $${values.length + 1}`);
    values.push(photo || null);
  }
  if (country !== undefined) {
    updates.push(`country = $${values.length + 1}`);
    values.push(String(country));
  }
  if (language !== undefined) {
    updates.push(`language = $${values.length + 1}`);
    values.push(String(language));
  }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE artists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Artiste introuvable.' });
  return res.json(mapArtist(rows[0]));
});

app.delete('/api/artists/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant artiste invalide.' });

  await query('DELETE FROM artists WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Artiste supprimé.' });
});

app.post('/api/songs', requireAuth, requireAdmin, async (req, res) => {
  const { title, artist_id, artist, album, genre, language, audio_url, cover_url, duration, release_date, description, is_featured } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ message: 'Le titre de la musique est obligatoire.' });

  let artistId = parseId(artist_id);
  if (!artistId && artist) {
    const insertedArtist = await query('INSERT INTO artists (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *', [String(artist).trim()]);
    if (insertedArtist.rows[0]) artistId = insertedArtist.rows[0].id;
    else {
      const existingArtist = await query('SELECT id FROM artists WHERE name = $1', [String(artist).trim()]);
      artistId = existingArtist.rows[0]?.id || null;
    }
  }

  if (!artistId) return res.status(400).json({ message: 'Un artiste est requis pour créer une musique.' });

  const inserted = await query(
    `INSERT INTO songs (title, artist_id, album, genre, language, audio_url, cover_url, duration, release_date, description, is_featured)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [String(title).trim(), artistId, album || '', genre || '', language || 'fr', audio_url || '', cover_url || '', duration || '', release_date || null, description || '', Boolean(is_featured)]
  );

  const { rows } = await query('SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.id = $1', [inserted.rows[0].id]);
  return res.status(201).json(mapSong(rows[0]));
});

app.put('/api/songs/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

  const { title, artist_id, artist, album, genre, language, audio_url, cover_url, duration, release_date, description, is_featured } = req.body || {};
  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(String(title).trim()); }
  if (artist_id !== undefined) {
    const artistId = parseId(artist_id);
    if (artistId) { updates.push(`artist_id = $${values.length + 1}`); values.push(artistId); }
  }
  if (artist !== undefined && !artist_id) {
    const insertedArtist = await query('INSERT INTO artists (name) VALUES ($1) ON CONFLICT DO NOTHING RETURNING *', [String(artist).trim()]);
    if (insertedArtist.rows[0]) { updates.push(`artist_id = $${values.length + 1}`); values.push(insertedArtist.rows[0].id); }
  }
  if (album !== undefined) { updates.push(`album = $${values.length + 1}`); values.push(String(album)); }
  if (genre !== undefined) { updates.push(`genre = $${values.length + 1}`); values.push(String(genre)); }
  if (language !== undefined) { updates.push(`language = $${values.length + 1}`); values.push(String(language)); }
  if (audio_url !== undefined) { updates.push(`audio_url = $${values.length + 1}`); values.push(String(audio_url)); }
  if (cover_url !== undefined) { updates.push(`cover_url = $${values.length + 1}`); values.push(String(cover_url)); }
  if (duration !== undefined) { updates.push(`duration = $${values.length + 1}`); values.push(String(duration)); }
  if (release_date !== undefined) { updates.push(`release_date = $${values.length + 1}`); values.push(release_date || null); }
  if (description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(String(description)); }
  if (is_featured !== undefined) { updates.push(`is_featured = $${values.length + 1}`); values.push(Boolean(is_featured)); }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE songs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable.' });

  const songRows = await query('SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.id = $1', [id]);
  return res.json(mapSong(songRows.rows[0]));
});

app.delete('/api/songs/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

  await query('DELETE FROM songs WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Musique supprimée.' });
});

app.post('/api/songs/:id/play', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

  const { rows } = await query('UPDATE songs SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable.' });
  return res.json({ success: true, play_count: Number(rows[0].play_count), song: mapSong(rows[0]) });
});

app.post('/api/musics/:id/play', async (req, res) => {
  return res.redirect(307, `/api/songs/${req.params.id}/play`);
});

app.get('/api/news', async (_req, res) => {
  const { rows } = await query('SELECT * FROM news ORDER BY published_at DESC NULLS LAST, created_at DESC');
  return res.json(rows.map(mapNews));
});

app.get('/api/news/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant actualité invalide.' });

  const { rows } = await query('SELECT * FROM news WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ message: 'Actualité introuvable.' });
  return res.json(mapNews(rows[0]));
});

app.post('/api/news', requireAuth, requireAdmin, async (req, res) => {
  const { title, content, image_url, author, published } = req.body || {};
  if (!title || !String(title).trim() || !content || !String(content).trim()) return res.status(400).json({ message: 'Titre et contenu requis.' });

  const inserted = await query(
    `INSERT INTO news (title, content, image_url, author, published, published_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP) RETURNING *`,
    [String(title).trim(), String(content).trim(), image_url || '', author || '', Boolean(published)]
  );
  return res.status(201).json(mapNews(inserted.rows[0]));
});

app.put('/api/news/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant actualité invalide.' });

  const { title, content, image_url, author, published } = req.body || {};
  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(String(title).trim()); }
  if (content !== undefined) { updates.push(`content = $${values.length + 1}`); values.push(String(content).trim()); }
  if (image_url !== undefined) { updates.push(`image_url = $${values.length + 1}`); values.push(image_url || ''); }
  if (author !== undefined) { updates.push(`author = $${values.length + 1}`); values.push(String(author)); }
  if (published !== undefined) { updates.push(`published = $${values.length + 1}`); values.push(Boolean(published)); }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE news SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Actualité introuvable.' });
  return res.json(mapNews(rows[0]));
});

app.delete('/api/news/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant actualité invalide.' });

  await query('DELETE FROM news WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Actualité supprimée.' });
});

app.get('/api/new-releases', async (_req, res) => {
  const { rows } = await query('SELECT * FROM new_releases ORDER BY published_at DESC');
  return res.json(rows);
});

app.post('/api/new-releases', requireAuth, requireAdmin, async (req, res) => {
  const { title, description, image_url, song_id } = req.body || {};
  if (!title || !String(title).trim()) return res.status(400).json({ message: 'Le titre de la nouveauté est requis.' });

  const inserted = await query(
    'INSERT INTO new_releases (title, description, image_url, song_id) VALUES ($1, $2, $3, $4) RETURNING *',
    [String(title).trim(), description || '', image_url || '', parseId(song_id) || null]
  );
  return res.status(201).json(inserted.rows[0]);
});

app.put('/api/new-releases/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant invalide.' });

  const { title, description, image_url, song_id } = req.body || {};
  const updates = [];
  const values = [];

  if (title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(String(title).trim()); }
  if (description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(String(description)); }
  if (image_url !== undefined) { updates.push(`image_url = $${values.length + 1}`); values.push(String(image_url)); }
  if (song_id !== undefined) { updates.push(`song_id = $${values.length + 1}`); values.push(parseId(song_id) || null); }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE new_releases SET ${updates.join(', ')}, created_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Nouveauté introuvable.' });
  return res.json(rows[0]);
});

app.delete('/api/new-releases/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant invalide.' });

  await query('DELETE FROM new_releases WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Nouveauté supprimée.' });
});

app.get('/api/languages', async (_req, res) => {
  const { rows } = await query('SELECT * FROM languages ORDER BY name ASC');
  return res.json(rows.map(mapLanguage));
});

app.post('/api/languages', requireAuth, requireAdmin, async (req, res) => {
  const { name, code, is_active } = req.body || {};
  if (!name || !String(name).trim() || !code || !String(code).trim()) {
    return res.status(400).json({ message: 'Nom et code de langue requis.' });
  }

  const inserted = await query(
    'INSERT INTO languages (name, code, is_active) VALUES ($1, $2, $3) RETURNING *',
    [String(name).trim(), String(code).trim(), Boolean(is_active)]
  );
  return res.status(201).json(mapLanguage(inserted.rows[0]));
});

app.put('/api/languages/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant langue invalide.' });

  const { name, code, is_active } = req.body || {};
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(String(name).trim()); }
  if (code !== undefined) { updates.push(`code = $${values.length + 1}`); values.push(String(code).trim()); }
  if (is_active !== undefined) { updates.push(`is_active = $${values.length + 1}`); values.push(Boolean(is_active)); }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE languages SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Langue introuvable.' });
  return res.json(mapLanguage(rows[0]));
});

app.delete('/api/languages/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant langue invalide.' });

  await query('DELETE FROM languages WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Langue supprimée.' });
});

app.get('/api/categories', async (_req, res) => {
  const { rows } = await query('SELECT * FROM categories ORDER BY created_at DESC');
  return res.json(rows);
});

app.post('/api/categories', requireAuth, requireAdmin, async (req, res) => {
  const { name, description } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });

  const inserted = await query('INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *', [String(name).trim(), description || '']);
  return res.status(201).json(inserted.rows[0]);
});

app.put('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant catégorie invalide.' });

  const { name, description } = req.body || {};
  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(String(name).trim()); }
  if (description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(String(description)); }

  if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  values.push(id);

  const { rows } = await query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
  if (!rows[0]) return res.status(404).json({ message: 'Catégorie introuvable.' });
  return res.json(rows[0]);
});

app.delete('/api/categories/:id', requireAuth, requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ message: 'Identifiant catégorie invalide.' });

  await query('DELETE FROM categories WHERE id = $1', [id]);
  return res.json({ success: true, message: 'Catégorie supprimée.' });
});

app.get('/api/favorites', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT f.*, s.*, a.name AS artist_name
     FROM favorites f
     LEFT JOIN songs s ON s.id = f.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
    [req.user.id]
  );

  return res.json(rows.map((favorite) => mapFavorite({ ...favorite, song: mapSong(favorite) })));
});

app.post('/api/favorites', requireAuth, async (req, res) => {
  const songId = parseId(req.body?.song_id || req.body?.songId);
  if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

  const { rows } = await query('SELECT id FROM favorites WHERE user_id = $1 AND song_id = $2', [req.user.id, songId]);
  if (rows[0]) return res.status(200).json({ success: true, message: 'Déjà en favori.', favorite: rows[0] });

  const inserted = await query('INSERT INTO favorites (user_id, song_id) VALUES ($1, $2) RETURNING *', [req.user.id, songId]);
  return res.status(201).json({ success: true, favorite: inserted.rows[0] });
});

app.delete('/api/favorites/:songId', requireAuth, async (req, res) => {
  const songId = parseId(req.params.songId);
  if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

  await query('DELETE FROM favorites WHERE user_id = $1 AND song_id = $2', [req.user.id, songId]);
  return res.json({ success: true, message: 'Musique retirée des favoris.' });
});

app.get('/api/history', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT h.*, s.title, s.cover_url, s.audio_url, a.name AS artist_name
     FROM listening_history h
     LEFT JOIN songs s ON s.id = h.song_id
     LEFT JOIN artists a ON a.id = s.artist_id
     WHERE h.user_id = $1 ORDER BY h.listened_at DESC LIMIT 30`,
    [req.user.id]
  );

  return res.json(rows.map((entry) => ({
    id: entry.id,
    user_id: entry.user_id,
    song_id: entry.song_id,
    listened_at: entry.listened_at,
    progress: Number(entry.progress || 0),
    song: {
      id: entry.song_id,
      title: entry.title,
      cover_url: entry.cover_url,
      audio_url: entry.audio_url,
      artist: entry.artist_name || '',
    },
  })));
});

app.post('/api/history', requireAuth, async (req, res) => {
  const { song_id, progress } = req.body || {};
  const songId = parseId(song_id);
  if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

  const inserted = await query(
    'INSERT INTO listening_history (user_id, song_id, progress) VALUES ($1, $2, $3) RETURNING *',
    [req.user.id, songId, Number(progress || 0)]
  );

  await query('UPDATE songs SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [songId]);
  return res.status(201).json({ success: true, entry: inserted.rows[0] });
});

app.get('/api/search', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ results: [], songs: [], artists: [], news: [], categories: [] });

  const [songs, artists, news, categories] = await Promise.all([
    query(`SELECT s.*, a.name AS artist_name FROM songs s LEFT JOIN artists a ON a.id = s.artist_id WHERE s.title ILIKE $1 OR s.album ILIKE $1 OR a.name ILIKE $1 ORDER BY s.created_at DESC LIMIT 10`, [`%${q}%`]),
    query('SELECT * FROM artists WHERE name ILIKE $1 ORDER BY created_at DESC LIMIT 10', [`%${q}%`]),
    query('SELECT * FROM news WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY published_at DESC NULLS LAST LIMIT 10', [`%${q}%`]),
    query('SELECT * FROM categories WHERE name ILIKE $1 ORDER BY name ASC LIMIT 10', [`%${q}%`]),
  ]);

  return res.json({
    q,
    songs: songs.rows.map(mapSong),
    artists: artists.rows.map(mapArtist),
    news: news.rows.map(mapNews),
    categories: categories.rows,
    results: [
      ...songs.rows.map((item) => ({ type: 'song', ...mapSong(item) })),
      ...artists.rows.map((item) => ({ type: 'artist', ...mapArtist(item) })),
      ...news.rows.map((item) => ({ type: 'news', ...mapNews(item) })),
      ...categories.rows.map((item) => ({ type: 'category', ...item })),
    ],
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  return res.status(500).json({ message: 'Erreur interne du serveur.', details: process.env.NODE_ENV === 'production' ? undefined : err.message });
});

async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Mali Audio API running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

startServer();
