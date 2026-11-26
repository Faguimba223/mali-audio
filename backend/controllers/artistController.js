import { resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapAlbum, mapArtist, mapSong, mapVideo } from '../utils/mappers.js';
import { normalizeStatus, parseId, parseJsonField, parsePagination, slugify, VALID_STATUSES } from '../utils/validation.js';

export function createArtistController(db) {
  return {
    async list(req, res) {
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const q = String(req.query.q || '').trim();
      const statusFilter = req.query.status ? String(req.query.status).trim() : null;
      const { hasPagination, page, limit, offset } = parsePagination(req.query, 50, 100);

      const conditions = [];
      const params = [];

      if (!isAdminRequest) {
        conditions.push(`status = 'published'`);
      } else if (statusFilter && VALID_STATUSES.includes(statusFilter)) {
        params.push(statusFilter);
        conditions.push(`status = $${params.length}`);
      }

      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(name ILIKE $${params.length} OR COALESCE(genres, '') ILIKE $${params.length} OR COALESCE(country, '') ILIKE $${params.length})`);
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const baseSql = `SELECT * FROM artists ${whereSql} ORDER BY created_at DESC`;

      if (hasPagination) {
        const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM artists ${whereSql}`, params);
        const { rows } = await db.query(`${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return res.json({ items: rows.map(mapArtist), page, limit, total: countRes.rows[0]?.total || 0 });
      }

      const { rows } = await db.query(baseSql, params);
      return res.json(rows.map(mapArtist));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const whereField = id ? 'id = $1' : 'slug = $1';
      const param = id || req.params.id;
      const statusClause = isAdminRequest ? '' : ` AND status = 'published'`;

      const { rows } = await db.query(`SELECT * FROM artists WHERE ${whereField}${statusClause}`, [param]);
      const artist = rows[0];
      if (!artist) return res.status(404).json({ message: 'Artiste introuvable.' });

      const pubFilter = isAdminRequest ? '' : ` AND status = 'published'`;
      const [songsRes, albumsRes, videosRes] = await Promise.all([
        db.query(
          `SELECT s.*, a.name AS artist_name, al.title AS album_title
           FROM songs s
           LEFT JOIN artists a ON a.id = s.artist_id
           LEFT JOIN albums al ON al.id = s.album_id
           WHERE s.artist_id = $1${pubFilter.replace('status', 's.status')}
           ORDER BY s.created_at DESC`,
          [artist.id]
        ),
        db.query(
          `SELECT al.*, a.name AS artist_name
           FROM albums al LEFT JOIN artists a ON a.id = al.artist_id
           WHERE al.artist_id = $1${pubFilter.replace('status', 'al.status')}
           ORDER BY al.release_date DESC NULLS LAST, al.created_at DESC`,
          [artist.id]
        ),
        db.query(
          `SELECT v.*, a.name AS artist_name
           FROM videos v LEFT JOIN artists a ON a.id = v.artist_id
           WHERE v.artist_id = $1${pubFilter.replace('status', 'v.status')}
           ORDER BY v.published_at DESC NULLS LAST, v.created_at DESC`,
          [artist.id]
        ),
      ]);

      return res.json({
        ...mapArtist(artist),
        songs: songsRes.rows.map((s) => mapSong(s)),
        albums: albumsRes.rows.map(mapAlbum),
        videos: videosRes.rows.map(mapVideo),
      });
    },

    async create(req, res) {
      const { name, biography, bio, photo, image, country, genres, genre, language, official_links, status } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ message: 'Le nom de l’artiste est obligatoire.' });
      }

      const cleanName = String(name).trim();
      const uploadedPhoto = resolvePublicImageUrl(req.file);
      const photoUrl = uploadedPhoto || photo || image || '';
      const cleanStatus = normalizeStatus(status, 'published');
      const linksObj = parseJsonField(official_links, {}) || {};
      const slug = slugify(cleanName, Date.now().toString(36).slice(-4));

      const { rows } = await db.query(
        `INSERT INTO artists (name, slug, biography, photo, country, genres, language, official_links, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9) RETURNING *`,
        [
          cleanName,
          slug,
          String(biography || bio || ''),
          photoUrl,
          String(country || ''),
          String(genres || genre || ''),
          String(language || 'fr'),
          JSON.stringify(linksObj),
          cleanStatus,
        ]
      );

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ARTIST_CREATED',
        entityType: 'artist',
        entityId: rows[0].id,
        details: { name: cleanName, status: cleanStatus },
        ipAddress: req.ip,
      });

      return res.status(201).json(mapArtist(rows[0]));
    },

    async update(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant artiste invalide.' });

      const { name, biography, bio, photo, image, country, genres, genre, language, official_links, status } = req.body || {};
      const updates = [];
      const values = [];

      if (name !== undefined) {
        const cleanName = String(name).trim();
        if (!cleanName) return res.status(400).json({ message: 'Le nom de l’artiste ne peut pas être vide.' });
        updates.push(`name = $${values.length + 1}`);
        values.push(cleanName);
      }
      const nextBio = biography !== undefined ? biography : bio;
      if (nextBio !== undefined) {
        updates.push(`biography = $${values.length + 1}`);
        values.push(String(nextBio));
      }
      const uploadedPhoto = resolvePublicImageUrl(req.file);
      const nextPhoto = uploadedPhoto || (photo !== undefined ? photo : image);
      if (nextPhoto !== undefined) {
        updates.push(`photo = $${values.length + 1}`);
        values.push(nextPhoto || '');
      }
      if (country !== undefined) {
        updates.push(`country = $${values.length + 1}`);
        values.push(String(country));
      }
      const nextGenres = genres !== undefined ? genres : genre;
      if (nextGenres !== undefined) {
        updates.push(`genres = $${values.length + 1}`);
        values.push(String(nextGenres));
      }
      if (language !== undefined) {
        updates.push(`language = $${values.length + 1}`);
        values.push(String(language));
      }
      if (official_links !== undefined) {
        const parsed = parseJsonField(official_links, {});
        updates.push(`official_links = $${values.length + 1}::jsonb`);
        values.push(JSON.stringify(parsed || {}));
      }
      if (status !== undefined) {
        if (!VALID_STATUSES.includes(String(status))) {
          return res.status(400).json({ message: 'Statut de publication invalide.' });
        }
        updates.push(`status = $${values.length + 1}`);
        values.push(String(status));
      }

      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(id);

      const { rows } = await db.query(
        `UPDATE artists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!rows[0]) return res.status(404).json({ message: 'Artiste introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ARTIST_UPDATED',
        entityType: 'artist',
        entityId: id,
        details: { status },
        ipAddress: req.ip,
      });

      return res.json(mapArtist(rows[0]));
    },

    async remove(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant artiste invalide.' });

      const linkedCheck = await db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM songs WHERE artist_id = $1) AS song_count,
           (SELECT COUNT(*)::int FROM albums WHERE artist_id = $1) AS album_count`,
        [id]
      );
      const { song_count, album_count } = linkedCheck.rows[0] || { song_count: 0, album_count: 0 };

      if ((song_count > 0 || album_count > 0) && req.query.force !== 'true') {
        const archived = await db.query(
          `UPDATE artists SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
          [id]
        );
        if (!archived.rows[0]) return res.status(404).json({ message: 'Artiste introuvable.' });
        await logAuditEvent(db, {
          actorId: req.user.id,
          actorEmail: req.user.email,
          action: 'ARTIST_ARCHIVED',
          entityType: 'artist',
          entityId: id,
          details: { song_count, album_count },
          ipAddress: req.ip,
        });
        return res.json({
          success: true,
          archived: true,
          message: 'Cet artiste possède des œuvres associées : il a été archivé pour préserver l’intégrité du catalogue.',
          artist: mapArtist(archived.rows[0]),
        });
      }

      const deleted = await db.query('DELETE FROM artists WHERE id = $1 RETURNING id, name', [id]);
      if (!deleted.rows[0]) return res.status(404).json({ message: 'Artiste introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'ARTIST_DELETED',
        entityType: 'artist',
        entityId: id,
        details: { name: deleted.rows[0].name },
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Artiste supprimé.' });
    },
  };
}
