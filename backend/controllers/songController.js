import { resolvePrivateStorageKey, resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapSong } from '../utils/mappers.js';
import { createStreamToken } from '../utils/streamToken.js';
import { normalizeStatus, parseBoolean, parseId, parseJsonField, parsePagination, slugify, VALID_RELEASE_TYPES, VALID_STATUSES } from '../utils/validation.js';

export function createSongController(db) {
  return {
    async list(req, res) {
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const q = String(req.query.q || '').trim();
      const genre = String(req.query.genre || '').trim();
      const language = String(req.query.language || '').trim();
      const artistId = parseId(req.query.artistId);
      const albumId = parseId(req.query.albumId);
      const releaseType = req.query.type ? String(req.query.type).trim() : null;
      const featuredOnly = req.query.featured === 'true';
      const sortParam = String(req.query.sort || 'newest').toLowerCase();
      const { hasPagination, page, limit, offset } = parsePagination(req.query, 50, 100);

      const conditions = [];
      const params = [];

      if (!isAdminRequest) {
        conditions.push(`s.status = 'published'`);
      } else if (req.query.status && VALID_STATUSES.includes(String(req.query.status))) {
        params.push(String(req.query.status));
        conditions.push(`s.status = $${params.length}`);
      }

      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(s.title ILIKE $${params.length} OR COALESCE(a.name, '') ILIKE $${params.length} OR COALESCE(al.title, s.album, '') ILIKE $${params.length} OR COALESCE(s.genre, '') ILIKE $${params.length})`);
      }
      if (genre) {
        params.push(genre);
        conditions.push(`LOWER(COALESCE(s.genre, '')) = LOWER($${params.length})`);
      }
      if (language) {
        params.push(language);
        conditions.push(`LOWER(COALESCE(s.language, '')) = LOWER($${params.length})`);
      }
      if (artistId) {
        params.push(artistId);
        conditions.push(`(s.artist_id = $${params.length} OR EXISTS (SELECT 1 FROM song_artists sa WHERE sa.song_id = s.id AND sa.artist_id = $${params.length}))`);
      }
      if (albumId) {
        params.push(albumId);
        conditions.push(`s.album_id = $${params.length}`);
      }
      if (releaseType && VALID_RELEASE_TYPES.includes(releaseType)) {
        params.push(releaseType);
        conditions.push(`s.release_type = $${params.length}`);
      }
      if (featuredOnly) {
        conditions.push('s.is_featured = true');
      }

      const orderMap = {
        newest: 's.published_at DESC NULLS LAST, s.created_at DESC',
        title: 's.title ASC',
        popular: 's.play_count DESC, s.created_at DESC',
        track: 's.track_number ASC, s.id ASC',
      };
      const orderSql = orderMap[sortParam] || orderMap.newest;
      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const baseSelect = `
        SELECT s.*, a.name AS artist_name, al.title AS album_title,
               ma.original_name AS audio_original_name, ma.status AS audio_status
        FROM songs s
        LEFT JOIN artists a ON a.id = s.artist_id
        LEFT JOIN albums al ON al.id = s.album_id
        LEFT JOIN media_assets ma ON ma.id = s.audio_asset_id
        ${whereSql}
        ORDER BY ${orderSql}
      `;

      if (hasPagination) {
        const countRes = await db.query(
          `SELECT COUNT(*)::int AS total FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN albums al ON al.id = s.album_id ${whereSql}`,
          params
        );
        const { rows } = await db.query(`${baseSelect} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return res.json({
          items: rows.map((row) => mapSong(row, { includePrivateMeta: isAdminRequest })),
          page,
          limit,
          total: countRes.rows[0]?.total || 0,
        });
      }

      const { rows } = await db.query(baseSelect, params);
      return res.json(rows.map((row) => mapSong(row, { includePrivateMeta: isAdminRequest })));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const whereField = id ? 's.id = $1' : 's.slug = $1';
      const param = id || req.params.id;
      const statusClause = isAdminRequest ? '' : ` AND s.status = 'published'`;

      const { rows } = await db.query(
        `SELECT s.*, a.name AS artist_name, al.title AS album_title,
                ma.original_name AS audio_original_name, ma.status AS audio_status
         FROM songs s
         LEFT JOIN artists a ON a.id = s.artist_id
         LEFT JOIN albums al ON al.id = s.album_id
         LEFT JOIN media_assets ma ON ma.id = s.audio_asset_id
         WHERE ${whereField}${statusClause}`,
        [param]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable.' });

      const featuredRes = await db.query(
        `SELECT a.id, a.name, a.slug, a.photo, sa.role
         FROM song_artists sa
         JOIN artists a ON a.id = sa.artist_id
         WHERE sa.song_id = $1`,
        [rows[0].id]
      );

      return res.json(mapSong({ ...rows[0], featured_artists: featuredRes.rows }, { includePrivateMeta: isAdminRequest }));
    },

    async create(req, res) {
      const {
        title, artist_id, artistId, artist, album_id, albumId, album, genre, category_id,
        language, cover_url, image, duration, release_date, release_type, track_number,
        description, is_featured, featured, status, rights_holder, license_info, provenance,
        featured_artist_ids, audio_url, audioUrl,
      } = req.body || {};

      if (!title || !String(title).trim()) {
        return res.status(400).json({ message: 'Le titre de la musique est obligatoire.' });
      }
      const cleanTitle = String(title).trim();

      const uploadedAudio = req.files?.audio?.[0];
      const uploadedImage = req.files?.image?.[0];
      const cleanStatus = normalizeStatus(status, 'draft');

      const createdSong = await db.withTransaction(async (client) => {
        let resolvedArtistId = parseId(artist_id || artistId);
        if (!resolvedArtistId && artist) {
          const existing = await client.query('SELECT id FROM artists WHERE LOWER(name) = LOWER($1) LIMIT 1', [String(artist).trim()]);
          if (existing.rows[0]) resolvedArtistId = existing.rows[0].id;
          else {
            const insertedArtist = await client.query(
              `INSERT INTO artists (name, slug, status) VALUES ($1, $2, 'published') RETURNING id`,
              [String(artist).trim(), slugify(String(artist).trim(), Date.now().toString(36).slice(-4))]
            );
            resolvedArtistId = insertedArtist.rows[0].id;
          }
        }
        if (!resolvedArtistId) {
          const err = new Error('Un artiste est requis pour créer une musique.');
          err.status = 400;
          throw err;
        }

        let audioAssetId = null;
        if (uploadedAudio) {
          const storageKey = resolvePrivateStorageKey(uploadedAudio, 'audio');
          const assetRes = await client.query(
            `INSERT INTO media_assets (storage_key, original_name, mime_type, media_type, size_bytes, is_private, provenance, uploaded_by, status)
             VALUES ($1, $2, $3, 'audio', $4, true, $5, $6, 'ready') RETURNING id`,
            [storageKey, uploadedAudio.originalname, uploadedAudio.mimetype, uploadedAudio.size, String(provenance || ''), req.user.id]
          );
          audioAssetId = assetRes.rows[0].id;
        }

        const coverUrl = resolvePublicImageUrl(uploadedImage) || cover_url || image || '';
        let resolvedAlbumId = parseId(album_id || albumId);
        let resolvedAlbumTitle = String(album || '');
        if (resolvedAlbumId && !resolvedAlbumTitle) {
          const alRes = await client.query('SELECT title FROM albums WHERE id = $1', [resolvedAlbumId]);
          resolvedAlbumTitle = alRes.rows[0]?.title || '';
        }

        const cleanReleaseType = VALID_RELEASE_TYPES.includes(String(release_type || 'single')) ? String(release_type || 'single') : 'single';
        const slug = slugify(cleanTitle, Date.now().toString(36).slice(-4));
        const publishedAt = cleanStatus === 'published' ? new Date() : null;

        const { rows } = await client.query(
          `INSERT INTO songs (
             title, slug, artist_id, album_id, album, track_number, release_type,
             genre, category_id, language, audio_url, cover_url, duration, release_date,
             description, is_featured, status, rights_holder, license_info, provenance,
             audio_asset_id, published_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
           RETURNING *`,
          [
            cleanTitle, slug, resolvedArtistId, resolvedAlbumId, resolvedAlbumTitle, Number(track_number || 1),
            cleanReleaseType, String(genre || ''), parseId(category_id), String(language || 'fr'),
            uploadedAudio ? '' : String(audio_url || audioUrl || ''),
            coverUrl, String(duration || ''), release_date || null, String(description || ''),
            parseBoolean(is_featured !== undefined ? is_featured : featured, false),
            cleanStatus, String(rights_holder || ''), String(license_info || ''), String(provenance || ''),
            audioAssetId, publishedAt,
          ]
        );
        const song = rows[0];

        const guests = (parseJsonField(featured_artist_ids, []) || []).map(parseId).filter(Boolean);
        for (const guestId of guests) {
          if (guestId === resolvedArtistId) continue;
          await client.query(
            `INSERT INTO song_artists (song_id, artist_id, role) VALUES ($1, $2, 'featured') ON CONFLICT DO NOTHING`,
            [song.id, guestId]
          );
        }

        return song;
      });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'SONG_CREATED',
        entityType: 'song',
        entityId: createdSong.id,
        details: { title: cleanTitle, status: cleanStatus, hasPrivateAudio: Boolean(createdSong.audio_asset_id) },
        ipAddress: req.ip,
      });

      const full = await db.query(
        `SELECT s.*, a.name AS artist_name, al.title AS album_title, ma.original_name AS audio_original_name, ma.status AS audio_status
         FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN albums al ON al.id = s.album_id LEFT JOIN media_assets ma ON ma.id = s.audio_asset_id
         WHERE s.id = $1`,
        [createdSong.id]
      );
      return res.status(201).json(mapSong(full.rows[0], { includePrivateMeta: true }));
    },

    async update(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

      const body = req.body || {};
      const uploadedAudio = req.files?.audio?.[0];
      const uploadedImage = req.files?.image?.[0];

      const updated = await db.withTransaction(async (client) => {
        const existingRes = await client.query('SELECT * FROM songs WHERE id = $1', [id]);
        const existing = existingRes.rows[0];
        if (!existing) return null;

        const updates = [];
        const values = [];
        const pushUpdate = (col, val) => {
          updates.push(`${col} = $${values.length + 1}`);
          values.push(val);
        };

        if (body.title !== undefined) {
          const cleanTitle = String(body.title).trim();
          if (!cleanTitle) {
            const err = new Error('Le titre ne peut pas être vide.');
            err.status = 400;
            throw err;
          }
          pushUpdate('title', cleanTitle);
        }
        const nextArtistId = parseId(body.artist_id || body.artistId);
        if (nextArtistId) pushUpdate('artist_id', nextArtistId);
        if (body.album_id !== undefined || body.albumId !== undefined) {
          pushUpdate('album_id', parseId(body.album_id || body.albumId));
        }
        if (body.album !== undefined) pushUpdate('album', String(body.album));
        if (body.track_number !== undefined) pushUpdate('track_number', Number(body.track_number || 1));
        if (body.release_type !== undefined && VALID_RELEASE_TYPES.includes(String(body.release_type))) {
          pushUpdate('release_type', String(body.release_type));
        }
        if (body.genre !== undefined) pushUpdate('genre', String(body.genre));
        if (body.category_id !== undefined) pushUpdate('category_id', parseId(body.category_id));
        if (body.language !== undefined) pushUpdate('language', String(body.language));
        if (body.duration !== undefined) pushUpdate('duration', String(body.duration));
        if (body.release_date !== undefined) pushUpdate('release_date', body.release_date || null);
        if (body.description !== undefined) pushUpdate('description', String(body.description));
        if (body.rights_holder !== undefined) pushUpdate('rights_holder', String(body.rights_holder));
        if (body.license_info !== undefined) pushUpdate('license_info', String(body.license_info));
        if (body.provenance !== undefined) pushUpdate('provenance', String(body.provenance));

        const featuredVal = body.is_featured !== undefined ? body.is_featured : body.featured;
        if (featuredVal !== undefined) pushUpdate('is_featured', parseBoolean(featuredVal, false));

        const nextCover = resolvePublicImageUrl(uploadedImage) || (body.cover_url !== undefined ? body.cover_url : body.image);
        if (nextCover !== undefined) pushUpdate('cover_url', nextCover || '');

        if (uploadedAudio) {
          const storageKey = resolvePrivateStorageKey(uploadedAudio, 'audio');
          const assetRes = await client.query(
            `INSERT INTO media_assets (storage_key, original_name, mime_type, media_type, size_bytes, is_private, provenance, uploaded_by, status)
             VALUES ($1, $2, $3, 'audio', $4, true, $5, $6, 'ready') RETURNING id`,
            [storageKey, uploadedAudio.originalname, uploadedAudio.mimetype, uploadedAudio.size, String(body.provenance || existing.provenance || ''), req.user.id]
          );
          pushUpdate('audio_asset_id', assetRes.rows[0].id);
          pushUpdate('audio_url', '');
        } else if (body.audio_url !== undefined || body.audioUrl !== undefined) {
          pushUpdate('audio_url', String(body.audio_url ?? body.audioUrl ?? ''));
        }

        if (body.status !== undefined) {
          if (!VALID_STATUSES.includes(String(body.status))) {
            const err = new Error('Statut de publication invalide.');
            err.status = 400;
            throw err;
          }
          pushUpdate('status', String(body.status));
          if (body.status === 'published' && !existing.published_at) {
            pushUpdate('published_at', new Date());
          }
        }

        if (updates.length) {
          values.push(id);
          await client.query(`UPDATE songs SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`, values);
        }

        if (body.featured_artist_ids !== undefined) {
          const guests = (parseJsonField(body.featured_artist_ids, []) || []).map(parseId).filter(Boolean);
          await client.query(`DELETE FROM song_artists WHERE song_id = $1 AND role = 'featured'`, [id]);
          for (const guestId of guests) {
            await client.query(
              `INSERT INTO song_artists (song_id, artist_id, role) VALUES ($1, $2, 'featured') ON CONFLICT DO NOTHING`,
              [id, guestId]
            );
          }
        }

        const full = await client.query(
          `SELECT s.*, a.name AS artist_name, al.title AS album_title, ma.original_name AS audio_original_name, ma.status AS audio_status
           FROM songs s LEFT JOIN artists a ON a.id = s.artist_id LEFT JOIN albums al ON al.id = s.album_id LEFT JOIN media_assets ma ON ma.id = s.audio_asset_id
           WHERE s.id = $1`,
          [id]
        );
        return full.rows[0];
      });

      if (!updated) return res.status(404).json({ message: 'Musique introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'SONG_UPDATED',
        entityType: 'song',
        entityId: id,
        details: { status: body.status },
        ipAddress: req.ip,
      });

      return res.json(mapSong(updated, { includePrivateMeta: true }));
    },

    async remove(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

      const { rows } = await db.query('DELETE FROM songs WHERE id = $1 RETURNING id, title', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'SONG_DELETED',
        entityType: 'song',
        entityId: id,
        details: { title: rows[0].title },
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Musique supprimée.' });
    },

    async createStreamToken(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

      const { rows } = await db.query(
        `SELECT s.id, s.title, s.status, s.audio_asset_id, s.audio_url, ma.status AS asset_status
         FROM songs s
         LEFT JOIN media_assets ma ON ma.id = s.audio_asset_id
         WHERE s.id = $1`,
        [id]
      );
      const song = rows[0];
      if (!song) return res.status(404).json({ message: 'Musique introuvable.' });

      const isAdmin = req.user?.role === 'admin';
      if (song.status !== 'published' && !isAdmin) {
        await logAuditEvent(db, {
          actorId: req.user?.id || null,
          action: 'STREAM_ACCESS_DENIED',
          entityType: 'song',
          entityId: id,
          details: { reason: 'NOT_PUBLISHED' },
          ipAddress: req.ip,
        });
        return res.status(403).json({ message: 'Ce titre n’est pas disponible à l’écoute.' });
      }

      if (!song.audio_asset_id || song.asset_status !== 'ready') {
        if (song.audio_url && !String(song.audio_url).startsWith('/uploads/')) {
          return res.json({
            streamUrl: song.audio_url,
            protected: false,
            expiresIn: null,
          });
        }
        return res.status(404).json({ message: 'Aucun fichier audio prêt pour ce titre.' });
      }

      const issued = createStreamToken({
        songId: song.id,
        assetId: song.audio_asset_id,
        userId: req.user?.id || null,
        mode: isAdmin && song.status !== 'published' ? 'preview' : 'listen',
      });

      return res.json({
        streamUrl: `/api/stream/${issued.token}`,
        protected: true,
        expiresIn: issued.expiresIn,
        expiresAt: issued.expiresAt,
      });
    },

    async recordPlay(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant musique invalide.' });

      const { rows } = await db.query(
        `UPDATE songs SET play_count = play_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND status = 'published' RETURNING *`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Musique introuvable ou non publiée.' });
      return res.json({ success: true, play_count: Number(rows[0].play_count), song: mapSong(rows[0]) });
    },
  };
}
