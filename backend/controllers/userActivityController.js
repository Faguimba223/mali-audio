import { mapFavorite, mapSong } from '../utils/mappers.js';
import { parseId } from '../utils/validation.js';

export function createUserActivityController(db) {
  return {
    async listFavorites(req, res) {
      const { rows } = await db.query(
        `SELECT f.id AS fav_id, f.user_id, f.song_id, f.created_at AS fav_created_at,
                s.*, a.name AS artist_name, al.title AS album_title
         FROM favorites f
         JOIN songs s ON s.id = f.song_id
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN albums al ON al.id = s.album_id
         WHERE f.user_id = $1 AND s.status = 'published'
         ORDER BY f.created_at DESC`,
        [req.user.id]
      );

      return res.json(rows.map((row) => mapFavorite({
        id: row.fav_id,
        user_id: row.user_id,
        song_id: row.song_id,
        created_at: row.fav_created_at,
        song: row,
      })));
    },

    async addFavorite(req, res) {
      const songId = parseId(req.body?.song_id || req.body?.songId);
      if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

      const songCheck = await db.query(`SELECT id FROM songs WHERE id = $1 AND status = 'published'`, [songId]);
      if (!songCheck.rows[0]) return res.status(404).json({ message: 'Musique introuvable ou non publiée.' });

      const existing = await db.query('SELECT * FROM favorites WHERE user_id = $1 AND song_id = $2', [req.user.id, songId]);
      if (existing.rows[0]) return res.status(200).json({ success: true, message: 'Déjà en favori.', favorite: existing.rows[0] });

      const inserted = await db.query('INSERT INTO favorites (user_id, song_id) VALUES ($1, $2) RETURNING *', [req.user.id, songId]);
      return res.status(201).json({ success: true, favorite: inserted.rows[0] });
    },

    async removeFavorite(req, res) {
      const songId = parseId(req.params.songId);
      if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });
      await db.query('DELETE FROM favorites WHERE user_id = $1 AND song_id = $2', [req.user.id, songId]);
      return res.json({ success: true, message: 'Musique retirée des favoris.' });
    },

    async listHistory(req, res) {
      const { rows } = await db.query(
        `SELECT h.id, h.user_id, h.song_id, h.listened_at, h.progress,
                s.*, a.name AS artist_name, al.title AS album_title
         FROM listening_history h
         JOIN songs s ON s.id = h.song_id
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN albums al ON al.id = s.album_id
         WHERE h.user_id = $1 AND s.status = 'published'
         ORDER BY h.listened_at DESC LIMIT 30`,
        [req.user.id]
      );

      return res.json(rows.map((entry) => ({
        id: entry.id,
        user_id: entry.user_id,
        song_id: entry.song_id,
        listened_at: entry.listened_at,
        progress: Number(entry.progress || 0),
        song: mapSong(entry),
      })));
    },

    async recordHistory(req, res) {
      const songId = parseId(req.body?.song_id || req.body?.songId);
      if (!songId) return res.status(400).json({ message: 'Identifiant de musique invalide.' });

      const inserted = await db.query(
        'INSERT INTO listening_history (user_id, song_id, progress) VALUES ($1, $2, $3) RETURNING *',
        [req.user.id, songId, Math.max(0, Number(req.body?.progress || 0))]
      );
      await db.query(`UPDATE songs SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1 AND status = 'published'`, [songId]);
      return res.status(201).json({ success: true, entry: inserted.rows[0] });
    },

    async clearHistory(req, res) {
      await db.query('DELETE FROM listening_history WHERE user_id = $1', [req.user.id]);
      return res.json({ success: true, message: 'Historique d’écoute effacé.' });
    },
  };
}
