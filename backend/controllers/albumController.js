import { resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapAlbum, mapSong } from '../utils/mappers.js';
import { normalizeStatus, parseId, parseJsonField, parsePagination, slugify, VALID_RELEASE_TYPES, VALID_STATUSES } from '../utils/validation.js';

export function createAlbumController(db) {
  return {
    async list(req, res) {
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const q = String(req.query.q || '').trim();
      const releaseType = req.query.type ? String(req.query.type).trim() : null;
      const artistId = parseId(req.query.artistId);
      const { hasPagination, page, limit, offset } = parsePagination(req.query, 50, 100);

      const conditions = [];
      const params = [];

      if (!isAdminRequest) {
        conditions.push(`al.status = 'published'`);
      } else if (req.query.status && VALID_STATUSES.includes(String(req.query.status))) {
        params.push(String(req.query.status));
        conditions.push(`al.status = $${params.length}`);
      }

      if (releaseType && VALID_RELEASE_TYPES.includes(releaseType)) {
        params.push(releaseType);
        conditions.push(`al.release_type = $${params.length}`);
      }
      if (artistId) {
        params.push(artistId);
        conditions.push(`al.artist_id = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(al.title ILIKE $${params.length} OR COALESCE(a.name, '') ILIKE $${params.length} OR COALESCE(al.genre, '') ILIKE $${params.length})`);
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const baseSql = `
        SELECT al.*, a.name AS artist_name,
               (SELECT COUNT(*)::int FROM songs s WHERE s.album_id = al.id${isAdminRequest ? '' : " AND s.status = 'published'"}) AS track_count
        FROM albums al
        LEFT JOIN artists a ON a.id = al.artist_id
        ${whereSql}
        ORDER BY al.release_date DESC NULLS LAST, al.created_at DESC
      `;

      if (hasPagination) {
        const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM albums al LEFT JOIN artists a ON a.id = al.artist_id ${whereSql}`, params);
        const { rows } = await db.query(`${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return res.json({ items: rows.map(mapAlbum), page, limit, total: countRes.rows[0]?.total || 0 });
      }

      const { rows } = await db.query(baseSql, params);
      return res.json(rows.map(mapAlbum));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const whereField = id ? 'al.id = $1' : 'al.slug = $1';
      const param = id || req.params.id;
      const statusClause = isAdminRequest ? '' : ` AND al.status = 'published'`;

      const { rows } = await db.query(
        `SELECT al.*, a.name AS artist_name
         FROM albums al LEFT JOIN artists a ON a.id = al.artist_id
         WHERE ${whereField}${statusClause}`,
        [param]
      );
      const album = rows[0];
      if (!album) return res.status(404).json({ message: 'Album ou single introuvable.' });

      const tracksRes = await db.query(
        `SELECT s.*, a.name AS artist_name, al.title AS album_title
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN albums al ON al.id = s.album_id
         WHERE s.album_id = $1${isAdminRequest ? '' : " AND s.status = 'published'"}
         ORDER BY s.track_number ASC, s.id ASC`,
        [album.id]
      );

      const otherAlbumsRes = album.artist_id
        ? await db.query(
            `SELECT al.*, a.name AS artist_name FROM albums al LEFT JOIN artists a ON a.id = al.artist_id
             WHERE al.artist_id = $1 AND al.id <> $2 AND al.status = 'published'
             ORDER BY al.release_date DESC NULLS LAST LIMIT 6`,
            [album.artist_id, album.id]
          )
        : { rows: [] };

      return res.json({
        ...mapAlbum({ ...album, track_count: tracksRes.rows.length }),
        tracks: tracksRes.rows.map((s) => mapSong(s)),
        trackIds: tracksRes.rows.map((s) => String(s.id)),
        other_releases: otherAlbumsRes.rows.map(mapAlbum),
      });
    },

    async create(req, res) {
      const { title, artist_id, artistId, artist, release_type, cover_url, image, release_date, description, genre, status, trackIds } = req.body || {};
      if (!title || !String(title).trim()) {
        return res.status(400).json({ message: 'Le titre de l’album est obligatoire.' });
      }

      let resolvedArtistId = parseId(artist_id || artistId);
      if (!resolvedArtistId && artist) {
        const existingArtist = await db.query('SELECT id FROM artists WHERE LOWER(name) = LOWER($1) LIMIT 1', [String(artist).trim()]);
        if (existingArtist.rows[0]) resolvedArtistId = existingArtist.rows[0].id;
      }
      if (!resolvedArtistId) {
        return res.status(400).json({ message: 'Un artiste valide est obligatoire.' });
      }

      const cleanTitle = String(title).trim();
      const cleanType = VALID_RELEASE_TYPES.includes(String(release_type || 'album')) ? String(release_type || 'album') : 'album';
      const cleanStatus = normalizeStatus(status, 'draft');
      const coverUrl = resolvePublicImageUrl(req.file) || cover_url || image || '';
      const slug = slugify(cleanTitle, Date.now().toString(36).slice(-4));
      const parsedTrackIds = (parseJsonField(trackIds, []) || []).map(parseId).filter(Boolean);

      const created = await db.withTransaction(async (client) => {
        const { rows } = await client.query(
          `INSERT INTO albums (title, slug, artist_id, release_type, cover_url, release_date, description, genre, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
          [cleanTitle, slug, resolvedArtistId, cleanType, coverUrl, release_date || null, String(description || ''), String(genre || ''), cleanStatus]
        );
        const album = rows[0];

        for (let idx = 0; idx < parsedTrackIds.length; idx += 1) {
          await client.query(
            `UPDATE songs SET album_id = $1, album = $2, track_number = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [album.id, cleanTitle, idx + 1, parsedTrackIds[idx]]
          );
        }
        return album;
      });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALBUM_CREATED',
        entityType: 'album',
        entityId: created.id,
        details: { title: cleanTitle, status: cleanStatus },
        ipAddress: req.ip,
      });

      const artistRow = await db.query('SELECT name FROM artists WHERE id = $1', [resolvedArtistId]);
      return res.status(201).json(mapAlbum({ ...created, artist_name: artistRow.rows[0]?.name || '', track_count: parsedTrackIds.length }));
    },

    async update(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant album invalide.' });

      const { title, artist_id, artistId, release_type, cover_url, image, release_date, description, genre, status, trackIds } = req.body || {};
      const updates = [];
      const values = [];

      if (title !== undefined) {
        const cleanTitle = String(title).trim();
        if (!cleanTitle) return res.status(400).json({ message: 'Le titre de l’album ne peut pas être vide.' });
        updates.push(`title = $${values.length + 1}`);
        values.push(cleanTitle);
      }
      const nextArtistId = parseId(artist_id || artistId);
      if (nextArtistId) {
        updates.push(`artist_id = $${values.length + 1}`);
        values.push(nextArtistId);
      }
      if (release_type !== undefined && VALID_RELEASE_TYPES.includes(String(release_type))) {
        updates.push(`release_type = $${values.length + 1}`);
        values.push(String(release_type));
      }
      const nextCover = resolvePublicImageUrl(req.file) || (cover_url !== undefined ? cover_url : image);
      if (nextCover !== undefined) {
        updates.push(`cover_url = $${values.length + 1}`);
        values.push(nextCover || '');
      }
      if (release_date !== undefined) {
        updates.push(`release_date = $${values.length + 1}`);
        values.push(release_date || null);
      }
      if (description !== undefined) {
        updates.push(`description = $${values.length + 1}`);
        values.push(String(description));
      }
      if (genre !== undefined) {
        updates.push(`genre = $${values.length + 1}`);
        values.push(String(genre));
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(String(status))) {
          return res.status(400).json({ message: 'Statut de publication invalide.' });
        }
        updates.push(`status = $${values.length + 1}`);
        values.push(String(status));
      }

      const parsedTrackIds = trackIds !== undefined ? (parseJsonField(trackIds, []) || []).map(parseId).filter(Boolean) : null;

      const updatedAlbum = await db.withTransaction(async (client) => {
        let albumRow;
        if (updates.length) {
          values.push(id);
          const { rows } = await client.query(
            `UPDATE albums SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
            values
          );
          albumRow = rows[0];
        } else {
          const { rows } = await client.query('SELECT * FROM albums WHERE id = $1', [id]);
          albumRow = rows[0];
        }
        if (!albumRow) return null;

        if (parsedTrackIds !== null) {
          await client.query(`UPDATE songs SET album_id = NULL WHERE album_id = $1`, [id]);
          for (let idx = 0; idx < parsedTrackIds.length; idx += 1) {
            await client.query(
              `UPDATE songs SET album_id = $1, album = $2, track_number = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
              [id, albumRow.title, idx + 1, parsedTrackIds[idx]]
            );
          }
        }
        return albumRow;
      });

      if (!updatedAlbum) return res.status(404).json({ message: 'Album introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALBUM_UPDATED',
        entityType: 'album',
        entityId: id,
        details: { status },
        ipAddress: req.ip,
      });

      const full = await db.query(
        `SELECT al.*, a.name AS artist_name, (SELECT COUNT(*)::int FROM songs s WHERE s.album_id = al.id) AS track_count
         FROM albums al LEFT JOIN artists a ON a.id = al.artist_id WHERE al.id = $1`,
        [id]
      );
      return res.json(mapAlbum(full.rows[0]));
    },

    async remove(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant album invalide.' });

      const { rows } = await db.query('DELETE FROM albums WHERE id = $1 RETURNING id, title', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Album introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ALBUM_DELETED',
        entityType: 'album',
        entityId: id,
        details: { title: rows[0].title },
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Album supprimé.' });
    },
  };
}
