import { resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapPlaylist, mapSong } from '../utils/mappers.js';
import { normalizeStatus, parseBoolean, parseId, parseJsonField, slugify, VALID_STATUSES } from '../utils/validation.js';

export function createPlaylistController(db) {
  const fetchPlaylistTracks = async (playlistId, includeUnpublished = false) => {
    const statusFilter = includeUnpublished ? '' : ` AND s.status = 'published'`;
    const { rows } = await db.query(
      `SELECT ps.position, ps.added_at, s.*, a.name AS artist_name, al.title AS album_title
       FROM playlist_songs ps
       JOIN songs s ON s.id = ps.song_id
       LEFT JOIN artists a ON a.id = s.artist_id
       LEFT JOIN albums al ON al.id = s.album_id
       WHERE ps.playlist_id = $1${statusFilter}
       ORDER BY ps.position ASC, ps.added_at ASC`,
      [playlistId]
    );
    return rows.map((row) => ({ ...mapSong(row), position: row.position }));
  };

  return {
    async listPublic(req, res) {
      const editorialOnly = req.query.editorial === 'true';
      const conditions = [`p.is_public = true`, `p.status = 'published'`];
      if (editorialOnly) conditions.push(`p.is_editorial = true`);

      const { rows } = await db.query(
        `SELECT p.*, u.name AS owner_name,
                (SELECT COUNT(*)::int FROM playlist_songs ps JOIN songs s ON s.id = ps.song_id WHERE ps.playlist_id = p.id AND s.status = 'published') AS track_count
         FROM playlists p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE ${conditions.join(' AND ')}
         ORDER BY p.is_editorial DESC, p.updated_at DESC`
      );
      return res.json(rows.map(mapPlaylist));
    },

    async getPublicOne(req, res) {
      const id = parseId(req.params.id);
      const whereField = id ? 'p.id = $1' : 'p.slug = $1';
      const param = id || req.params.id;

      const { rows } = await db.query(
        `SELECT p.*, u.name AS owner_name
         FROM playlists p LEFT JOIN users u ON u.id = p.user_id
         WHERE ${whereField} AND p.is_public = true AND p.status = 'published'`,
        [param]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Playlist publique introuvable.' });

      const tracks = await fetchPlaylistTracks(rows[0].id, false);
      return res.json({
        ...mapPlaylist({ ...rows[0], track_count: tracks.length }),
        tracks,
        trackIds: tracks.map((t) => String(t.id)),
      });
    },

    async listMine(req, res) {
      const { rows } = await db.query(
        `SELECT p.*, u.name AS owner_name,
                (SELECT COUNT(*)::int FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS track_count
         FROM playlists p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.user_id = $1 AND p.is_editorial = false
         ORDER BY p.updated_at DESC`,
        [req.user.id]
      );
      return res.json(rows.map(mapPlaylist));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant de playlist invalide.' });

      const { rows } = await db.query(
        `SELECT p.*, u.name AS owner_name
         FROM playlists p LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1`,
        [id]
      );
      const playlist = rows[0];
      if (!playlist) return res.status(404).json({ message: 'Playlist introuvable.' });

      const isOwner = playlist.user_id === req.user.id;
      const isAdmin = req.user.role === 'admin';
      const isVisiblePublic = playlist.is_public && playlist.status === 'published';

      if (!isOwner && !isAdmin && !isVisiblePublic) {
        return res.status(403).json({ message: 'Vous n’avez pas accès à cette playlist.' });
      }

      const tracks = await fetchPlaylistTracks(playlist.id, isAdmin);
      return res.json({
        ...mapPlaylist({ ...playlist, track_count: tracks.length }),
        tracks,
        trackIds: tracks.map((t) => String(t.id)),
      });
    },

    async createMine(req, res) {
      const title = String(req.body?.title || req.body?.name || '').trim();
      if (!title) return res.status(400).json({ message: 'Le titre de la playlist est obligatoire.' });

      const isPublic = parseBoolean(req.body?.is_public !== undefined ? req.body.is_public : req.body?.isPublic, false);
      const slug = slugify(title, Date.now().toString(36).slice(-4));

      const { rows } = await db.query(
        `INSERT INTO playlists (user_id, title, slug, description, is_editorial, is_public, status)
         VALUES ($1, $2, $3, $4, false, $5, 'published') RETURNING *`,
        [req.user.id, title, slug, String(req.body?.description || ''), isPublic]
      );
      return res.status(201).json(mapPlaylist({ ...rows[0], track_count: 0 }));
    },

    async updateMine(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant de playlist invalide.' });

      const existing = await db.query('SELECT * FROM playlists WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ message: 'Playlist introuvable.' });
      if (existing.rows[0].user_id !== req.user.id || existing.rows[0].is_editorial) {
        return res.status(403).json({ message: 'Seul le propriétaire peut modifier cette playlist.' });
      }

      const title = req.body?.title !== undefined ? req.body.title : req.body?.name;
      const updates = [];
      const values = [];

      if (title !== undefined) {
        const cleanTitle = String(title).trim();
        if (!cleanTitle) return res.status(400).json({ message: 'Le titre ne peut pas être vide.' });
        updates.push(`title = $${values.length + 1}`);
        values.push(cleanTitle);
      }
      if (req.body?.description !== undefined) {
        updates.push(`description = $${values.length + 1}`);
        values.push(String(req.body.description));
      }
      const nextPublic = req.body?.is_public !== undefined ? req.body.is_public : req.body?.isPublic;
      if (nextPublic !== undefined) {
        updates.push(`is_public = $${values.length + 1}`);
        values.push(parseBoolean(nextPublic, false));
      }

      if (!updates.length && !Array.isArray(req.body?.trackIds)) {
        return res.status(400).json({ message: 'Aucune modification fournie.' });
      }

      await db.withTransaction(async (client) => {
        if (updates.length) {
          values.push(id);
          await client.query(`UPDATE playlists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
        }
        if (Array.isArray(req.body?.trackIds)) {
          const orderedIds = req.body.trackIds.map(parseId).filter(Boolean);
          await client.query('DELETE FROM playlist_songs WHERE playlist_id = $1', [id]);
          for (let i = 0; i < orderedIds.length; i += 1) {
            await client.query(
              'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [id, orderedIds[i], i + 1]
            );
          }
        }
      });

      const refreshed = await db.query('SELECT * FROM playlists WHERE id = $1', [id]);
      const tracks = await fetchPlaylistTracks(id, false);
      return res.json({ ...mapPlaylist({ ...refreshed.rows[0], track_count: tracks.length }), tracks });
    },

    async deleteMine(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant de playlist invalide.' });

      const existing = await db.query('SELECT user_id, is_editorial FROM playlists WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ message: 'Playlist introuvable.' });
      if (existing.rows[0].user_id !== req.user.id || existing.rows[0].is_editorial) {
        return res.status(403).json({ message: 'Seul le propriétaire peut supprimer cette playlist.' });
      }

      await db.query('DELETE FROM playlists WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Playlist supprimée.' });
    },

    async addTrack(req, res) {
      const id = parseId(req.params.id);
      const songId = parseId(req.body?.song_id || req.body?.songId || req.body?.musicId);
      if (!id || !songId) return res.status(400).json({ message: 'Identifiant de playlist ou de musique invalide.' });

      const existing = await db.query('SELECT user_id, is_editorial FROM playlists WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ message: 'Playlist introuvable.' });
      if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé à cette playlist.' });
      }

      const songCheck = await db.query(`SELECT id, status FROM songs WHERE id = $1`, [songId]);
      if (!songCheck.rows[0] || (songCheck.rows[0].status !== 'published' && req.user.role !== 'admin')) {
        return res.status(404).json({ message: 'Morceau introuvable ou non publié.' });
      }

      const posRes = await db.query('SELECT COALESCE(MAX(position), 0)::int + 1 AS next_pos FROM playlist_songs WHERE playlist_id = $1', [id]);
      const inserted = await db.query(
        `INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3)
         ON CONFLICT (playlist_id, song_id) DO NOTHING RETURNING *`,
        [id, songId, posRes.rows[0].next_pos]
      );
      if (!inserted.rows[0]) {
        return res.status(409).json({ message: 'Ce morceau figure déjà dans la playlist.' });
      }

      await db.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      const tracks = await fetchPlaylistTracks(id, req.user.role === 'admin');
      return res.status(201).json({ success: true, tracks });
    },

    async removeTrack(req, res) {
      const id = parseId(req.params.id);
      const songId = parseId(req.params.songId || req.params.musicId);
      if (!id || !songId) return res.status(400).json({ message: 'Identifiant invalide.' });

      const existing = await db.query('SELECT user_id FROM playlists WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ message: 'Playlist introuvable.' });
      if (existing.rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé à cette playlist.' });
      }

      await db.query('DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2', [id, songId]);
      await db.query('UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
      const tracks = await fetchPlaylistTracks(id, req.user.role === 'admin');
      return res.json({ success: true, tracks });
    },

    async adminList(req, res) {
      const { rows } = await db.query(
        `SELECT p.*, u.name AS owner_name,
                (SELECT COUNT(*)::int FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS track_count
         FROM playlists p LEFT JOIN users u ON u.id = p.user_id
         ORDER BY p.is_editorial DESC, p.updated_at DESC`
      );
      const withTrackIds = await Promise.all(rows.map(async (pl) => {
        const tRes = await db.query('SELECT song_id FROM playlist_songs WHERE playlist_id = $1 ORDER BY position ASC', [pl.id]);
        return {
          ...mapPlaylist(pl),
          trackIds: tRes.rows.map((r) => String(r.song_id)),
        };
      }));
      return res.json(withTrackIds);
    },

    async adminCreate(req, res) {
      const title = String(req.body?.title || req.body?.name || '').trim();
      if (!title) return res.status(400).json({ message: 'Le titre de la playlist est obligatoire.' });

      const cleanStatus = normalizeStatus(req.body?.status, 'published');
      const isPublic = parseBoolean(req.body?.is_public !== undefined ? req.body.is_public : req.body?.isPublic, true);
      const coverUrl = resolvePublicImageUrl(req.file) || req.body?.cover_url || req.body?.image || '';
      const trackIds = (parseJsonField(req.body?.trackIds, []) || []).map(parseId).filter(Boolean);

      if (cleanStatus === 'published' && trackIds.length > 0) {
        const check = await db.query(`SELECT id, status FROM songs WHERE id = ANY($1::int[])`, [trackIds]);
        if (check.rows.some((s) => s.status !== 'published')) {
          return res.status(400).json({ message: 'Une playlist publiée ne peut contenir que des morceaux publiés.' });
        }
      }

      const created = await db.withTransaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO playlists (user_id, title, slug, description, cover_url, is_editorial, is_public, status)
           VALUES ($1, $2, $3, $4, $5, true, $6, $7) RETURNING *`,
          [req.user.id, title, slugify(title, Date.now().toString(36).slice(-4)), String(req.body?.description || ''), coverUrl, isPublic, cleanStatus]
        );
        const playlist = rows[0];
        for (let i = 0; i < trackIds.length; i += 1) {
          await client.query(
            'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
            [playlist.id, trackIds[i], i + 1]
          );
        }
        return playlist;
      });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'PLAYLIST_CREATED',
        entityType: 'playlist',
        entityId: created.id,
        details: { title, status: cleanStatus },
        ipAddress: req.ip,
      });

      const tracks = await fetchPlaylistTracks(created.id, true);
      return res.status(201).json({ ...mapPlaylist({ ...created, track_count: tracks.length }), tracks, trackIds: trackIds.map(String) });
    },

    async adminUpdate(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant playlist invalide.' });

      const updates = [];
      const values = [];
      const title = req.body?.title !== undefined ? req.body.title : req.body?.name;
      if (title !== undefined) {
        const cleanTitle = String(title).trim();
        if (!cleanTitle) return res.status(400).json({ message: 'Le titre ne peut pas être vide.' });
        updates.push(`title = $${values.length + 1}`);
        values.push(cleanTitle);
      }
      if (req.body?.description !== undefined) {
        updates.push(`description = $${values.length + 1}`);
        values.push(String(req.body.description));
      }
      const nextCover = resolvePublicImageUrl(req.file) || (req.body?.cover_url !== undefined ? req.body.cover_url : req.body?.image);
      if (nextCover !== undefined) {
        updates.push(`cover_url = $${values.length + 1}`);
        values.push(nextCover || '');
      }
      const nextPublic = req.body?.is_public !== undefined ? req.body.is_public : req.body?.isPublic;
      if (nextPublic !== undefined) {
        updates.push(`is_public = $${values.length + 1}`);
        values.push(parseBoolean(nextPublic, true));
      }
      if (req.body?.status !== undefined) {
        if (!VALID_STATUSES.includes(String(req.body.status))) {
          return res.status(400).json({ message: 'Statut invalide.' });
        }
        updates.push(`status = $${values.length + 1}`);
        values.push(String(req.body.status));
      }

      const trackIds = req.body?.trackIds !== undefined ? (parseJsonField(req.body.trackIds, []) || []).map(parseId).filter(Boolean) : null;

      const updated = await db.withTransaction(async (client) => {
        let row;
        if (updates.length) {
          values.push(id);
          const { rows } = await client.query(`UPDATE playlists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
          row = rows[0];
        } else {
          const { rows } = await client.query('SELECT * FROM playlists WHERE id = $1', [id]);
          row = rows[0];
        }
        if (!row) return null;

        if (trackIds !== null) {
          await client.query('DELETE FROM playlist_songs WHERE playlist_id = $1', [id]);
          for (let i = 0; i < trackIds.length; i += 1) {
            await client.query(
              'INSERT INTO playlist_songs (playlist_id, song_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
              [id, trackIds[i], i + 1]
            );
          }
        }
        return row;
      });

      if (!updated) return res.status(404).json({ message: 'Playlist introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'PLAYLIST_UPDATED',
        entityType: 'playlist',
        entityId: id,
        ipAddress: req.ip,
      });

      const tracks = await fetchPlaylistTracks(id, true);
      return res.json({ ...mapPlaylist({ ...updated, track_count: tracks.length }), tracks, trackIds: tracks.map((t) => String(t.id)) });
    },

    async adminDelete(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant playlist invalide.' });
      const { rows } = await db.query('DELETE FROM playlists WHERE id = $1 RETURNING id, title', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Playlist introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'PLAYLIST_DELETED',
        entityType: 'playlist',
        entityId: id,
        details: { title: rows[0].title },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'Playlist supprimée.' });
    },
  };
}
