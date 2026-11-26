import { mapAlbum, mapArtist, mapLanguage, mapNews, mapPlaylist, mapSong, mapVideo } from '../utils/mappers.js';
import { parseId, slugify } from '../utils/validation.js';

export function createCatalogMetaController(db) {
  return {
    async listCategories(_req, res) {
      const { rows } = await db.query('SELECT * FROM categories ORDER BY name ASC');
      return res.json(rows);
    },

    async createCategory(req, res) {
      const { name, description, type } = req.body || {};
      if (!name || !String(name).trim()) return res.status(400).json({ message: 'Le nom de la catégorie est requis.' });
      const cleanName = String(name).trim();
      const { rows } = await db.query(
        'INSERT INTO categories (name, slug, type, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [cleanName, slugify(cleanName), String(type || 'genre'), String(description || '')]
      );
      return res.status(201).json(rows[0]);
    },

    async updateCategory(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant catégorie invalide.' });
      const { name, description, type } = req.body || {};
      const updates = [];
      const values = [];
      if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(String(name).trim()); }
      if (description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(String(description)); }
      if (type !== undefined) { updates.push(`type = $${values.length + 1}`); values.push(String(type)); }
      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(id);
      const { rows } = await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      if (!rows[0]) return res.status(404).json({ message: 'Catégorie introuvable.' });
      return res.json(rows[0]);
    },

    async deleteCategory(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant catégorie invalide.' });
      await db.query('DELETE FROM categories WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Catégorie supprimée.' });
    },

    async listLanguages(_req, res) {
      const { rows } = await db.query('SELECT * FROM languages ORDER BY name ASC');
      return res.json(rows.map(mapLanguage));
    },

    async createLanguage(req, res) {
      const { name, code, is_active } = req.body || {};
      if (!name || !String(name).trim() || !code || !String(code).trim()) {
        return res.status(400).json({ message: 'Nom et code de langue requis.' });
      }
      const { rows } = await db.query(
        'INSERT INTO languages (name, code, is_active) VALUES ($1, $2, $3) RETURNING *',
        [String(name).trim(), String(code).trim().toLowerCase(), is_active !== false]
      );
      return res.status(201).json(mapLanguage(rows[0]));
    },

    async updateLanguage(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant langue invalide.' });
      const { name, code, is_active } = req.body || {};
      const updates = [];
      const values = [];
      if (name !== undefined) { updates.push(`name = $${values.length + 1}`); values.push(String(name).trim()); }
      if (code !== undefined) { updates.push(`code = $${values.length + 1}`); values.push(String(code).trim().toLowerCase()); }
      if (is_active !== undefined) { updates.push(`is_active = $${values.length + 1}`); values.push(Boolean(is_active)); }
      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(id);
      const { rows } = await db.query(`UPDATE languages SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      if (!rows[0]) return res.status(404).json({ message: 'Langue introuvable.' });
      return res.json(mapLanguage(rows[0]));
    },

    async deleteLanguage(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant langue invalide.' });
      await db.query('DELETE FROM languages WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Langue supprimée.' });
    },

    async listNewReleases(_req, res) {
      const { rows } = await db.query('SELECT * FROM new_releases ORDER BY published_at DESC');
      return res.json(rows);
    },

    async createNewRelease(req, res) {
      const { title, description, image_url, song_id } = req.body || {};
      if (!title || !String(title).trim()) return res.status(400).json({ message: 'Le titre de la nouveauté est requis.' });
      const { rows } = await db.query(
        'INSERT INTO new_releases (title, description, image_url, song_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [String(title).trim(), description || '', image_url || '', parseId(song_id)]
      );
      return res.status(201).json(rows[0]);
    },

    async updateNewRelease(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant invalide.' });
      const { title, description, image_url, song_id } = req.body || {};
      const updates = [];
      const values = [];
      if (title !== undefined) { updates.push(`title = $${values.length + 1}`); values.push(String(title).trim()); }
      if (description !== undefined) { updates.push(`description = $${values.length + 1}`); values.push(String(description)); }
      if (image_url !== undefined) { updates.push(`image_url = $${values.length + 1}`); values.push(String(image_url)); }
      if (song_id !== undefined) { updates.push(`song_id = $${values.length + 1}`); values.push(parseId(song_id)); }
      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(id);
      const { rows } = await db.query(`UPDATE new_releases SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
      if (!rows[0]) return res.status(404).json({ message: 'Nouveauté introuvable.' });
      return res.json(rows[0]);
    },

    async deleteNewRelease(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant invalide.' });
      await db.query('DELETE FROM new_releases WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Nouveauté supprimée.' });
    },

    async globalSearch(req, res) {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return res.json({ q: '', songs: [], artists: [], albums: [], playlists: [], videos: [], news: [], categories: [], results: [] });
      }
      const pattern = `%${q}%`;

      const [songs, artists, albums, playlists, videos, news, categories] = await Promise.all([
        db.query(
          `SELECT s.*, a.name AS artist_name, al.title AS album_title
           FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN albums al ON al.id = s.album_id
           WHERE s.status = 'published' AND (s.title ILIKE $1 OR COALESCE(a.name, '') ILIKE $1 OR COALESCE(al.title, s.album, '') ILIKE $1)
           ORDER BY s.play_count DESC, s.created_at DESC LIMIT 12`,
          [pattern]
        ),
        db.query(
          `SELECT * FROM artists WHERE status = 'published' AND (name ILIKE $1 OR COALESCE(genres, '') ILIKE $1) ORDER BY name ASC LIMIT 12`,
          [pattern]
        ),
        db.query(
          `SELECT al.*, a.name AS artist_name FROM albums al LEFT JOIN artists a ON a.id = al.artist_id
           WHERE al.status = 'published' AND (al.title ILIKE $1 OR COALESCE(a.name, '') ILIKE $1) ORDER BY al.release_date DESC NULLS LAST LIMIT 12`,
          [pattern]
        ),
        db.query(
          `SELECT p.*, u.name AS owner_name FROM playlists p LEFT JOIN users u ON u.id = p.user_id
           WHERE p.is_public = true AND p.status = 'published' AND p.title ILIKE $1 ORDER BY p.updated_at DESC LIMIT 12`,
          [pattern]
        ),
        db.query(
          `SELECT v.*, a.name AS artist_name FROM videos v LEFT JOIN artists a ON a.id = v.artist_id
           WHERE v.status = 'published' AND (v.title ILIKE $1 OR COALESCE(a.name, '') ILIKE $1) ORDER BY v.published_at DESC NULLS LAST LIMIT 12`,
          [pattern]
        ),
        db.query(
          `SELECT * FROM news WHERE (status = 'published' OR published = true) AND (title ILIKE $1 OR content ILIKE $1)
           ORDER BY published_at DESC NULLS LAST LIMIT 12`,
          [pattern]
        ),
        db.query(`SELECT * FROM categories WHERE name ILIKE $1 ORDER BY name ASC LIMIT 12`, [pattern]),
      ]);

      const mappedSongs = songs.rows.map((s) => mapSong(s));
      const mappedArtists = artists.rows.map(mapArtist);
      const mappedAlbums = albums.rows.map(mapAlbum);
      const mappedPlaylists = playlists.rows.map(mapPlaylist);
      const mappedVideos = videos.rows.map(mapVideo);
      const mappedNews = news.rows.map(mapNews);

      return res.json({
        q,
        songs: mappedSongs,
        artists: mappedArtists,
        albums: mappedAlbums,
        playlists: mappedPlaylists,
        videos: mappedVideos,
        news: mappedNews,
        categories: categories.rows,
        results: [
          ...mappedSongs.map((item) => ({ type: 'song', ...item })),
          ...mappedArtists.map((item) => ({ type: 'artist', ...item })),
          ...mappedAlbums.map((item) => ({ type: 'album', ...item })),
          ...mappedPlaylists.map((item) => ({ type: 'playlist', ...item })),
          ...mappedVideos.map((item) => ({ type: 'video', ...item })),
          ...mappedNews.map((item) => ({ type: 'news', ...item })),
          ...categories.rows.map((item) => ({ type: 'category', ...item })),
        ],
      });
    },
  };
}
