import fs from 'fs';
import { resolvePrivateFilePath, resolvePrivateStorageKey, resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapVideo } from '../utils/mappers.js';
import { isValidHttpUrl, normalizeStatus, parseId, parsePagination, slugify, VALID_STATUSES } from '../utils/validation.js';

export function createVideoController(db) {
  return {
    async list(req, res) {
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const q = String(req.query.q || '').trim();
      const artistId = parseId(req.query.artistId);
      const { hasPagination, page, limit, offset } = parsePagination(req.query, 30, 100);

      const conditions = [];
      const params = [];

      if (!isAdminRequest) {
        conditions.push(`v.status = 'published'`);
      } else if (req.query.status && VALID_STATUSES.includes(String(req.query.status))) {
        params.push(String(req.query.status));
        conditions.push(`v.status = $${params.length}`);
      }
      if (artistId) {
        params.push(artistId);
        conditions.push(`v.artist_id = $${params.length}`);
      }
      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(v.title ILIKE $${params.length} OR COALESCE(a.name, '') ILIKE $${params.length})`);
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const baseSql = `
        SELECT v.*, a.name AS artist_name
        FROM videos v LEFT JOIN artists a ON a.id = v.artist_id
        ${whereSql}
        ORDER BY v.published_at DESC NULLS LAST, v.created_at DESC
      `;

      if (hasPagination) {
        const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM videos v LEFT JOIN artists a ON a.id = v.artist_id ${whereSql}`, params);
        const { rows } = await db.query(`${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return res.json({ items: rows.map(mapVideo), page, limit, total: countRes.rows[0]?.total || 0 });
      }

      const { rows } = await db.query(baseSql, params);
      return res.json(rows.map(mapVideo));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const whereField = id ? 'v.id = $1' : 'v.slug = $1';
      const param = id || req.params.id;

      const { rows } = await db.query(
        `SELECT v.*, a.name AS artist_name FROM videos v LEFT JOIN artists a ON a.id = v.artist_id
         WHERE ${whereField}${isAdminRequest ? '' : " AND v.status = 'published'"}`,
        [param]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Vidéo introuvable.' });
      return res.json(mapVideo(rows[0]));
    },

    async create(req, res) {
      const { title, artist_id, artistId, description, thumbnail_url, source_url, duration, release_date, rights_holder, status } = req.body || {};
      if (!title || !String(title).trim()) {
        return res.status(400).json({ message: 'Le titre de la vidéo est obligatoire.' });
      }

      const uploadedVideo = req.files?.video?.[0];
      const uploadedThumb = req.files?.image?.[0];
      if (!uploadedVideo && !isValidHttpUrl(source_url)) {
        return res.status(400).json({ message: 'Fournissez un fichier vidéo valide ou une URL HTTP/HTTPS autorisée.' });
      }

      const cleanTitle = String(title).trim();
      const cleanStatus = normalizeStatus(status, 'draft');
      const thumbUrl = resolvePublicImageUrl(uploadedThumb) || thumbnail_url || '';

      const created = await db.withTransaction(async (client) => {
        let mediaAssetId = null;
        if (uploadedVideo) {
          const storageKey = resolvePrivateStorageKey(uploadedVideo, 'video');
          const assetRes = await client.query(
            `INSERT INTO media_assets (storage_key, original_name, mime_type, media_type, size_bytes, is_private, uploaded_by, status)
             VALUES ($1, $2, $3, 'video', $4, true, $5, 'ready') RETURNING id`,
            [storageKey, uploadedVideo.originalname, uploadedVideo.mimetype, uploadedVideo.size, req.user.id]
          );
          mediaAssetId = assetRes.rows[0].id;
        }

        const { rows } = await client.query(
          `INSERT INTO videos (title, slug, artist_id, description, thumbnail_url, source_type, source_url, media_asset_id, duration, release_date, rights_holder, status, published_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
          [
            cleanTitle,
            slugify(cleanTitle, Date.now().toString(36).slice(-4)),
            parseId(artist_id || artistId),
            String(description || ''),
            thumbUrl,
            uploadedVideo ? 'upload' : 'external',
            uploadedVideo ? '' : String(source_url || ''),
            mediaAssetId,
            String(duration || ''),
            release_date || null,
            String(rights_holder || ''),
            cleanStatus,
            cleanStatus === 'published' ? new Date() : null,
          ]
        );
        return rows[0];
      });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'VIDEO_CREATED',
        entityType: 'video',
        entityId: created.id,
        details: { title: cleanTitle, status: cleanStatus },
        ipAddress: req.ip,
      });

      return res.status(201).json(mapVideo(created));
    },

    async update(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant vidéo invalide.' });

      const body = req.body || {};
      const uploadedVideo = req.files?.video?.[0];
      const uploadedThumb = req.files?.image?.[0];

      const updated = await db.withTransaction(async (client) => {
        const existingRes = await client.query('SELECT * FROM videos WHERE id = $1', [id]);
        if (!existingRes.rows[0]) return null;

        const updates = [];
        const values = [];
        const pushUpdate = (col, val) => {
          updates.push(`${col} = $${values.length + 1}`);
          values.push(val);
        };

        if (body.title !== undefined) pushUpdate('title', String(body.title).trim());
        if (body.artist_id !== undefined || body.artistId !== undefined) pushUpdate('artist_id', parseId(body.artist_id || body.artistId));
        if (body.description !== undefined) pushUpdate('description', String(body.description));
        if (body.duration !== undefined) pushUpdate('duration', String(body.duration));
        if (body.release_date !== undefined) pushUpdate('release_date', body.release_date || null);
        if (body.rights_holder !== undefined) pushUpdate('rights_holder', String(body.rights_holder));

        const nextThumb = resolvePublicImageUrl(uploadedThumb) || body.thumbnail_url;
        if (nextThumb !== undefined) pushUpdate('thumbnail_url', nextThumb || '');

        if (uploadedVideo) {
          const storageKey = resolvePrivateStorageKey(uploadedVideo, 'video');
          const assetRes = await client.query(
            `INSERT INTO media_assets (storage_key, original_name, mime_type, media_type, size_bytes, is_private, uploaded_by, status)
             VALUES ($1, $2, $3, 'video', $4, true, $5, 'ready') RETURNING id`,
            [storageKey, uploadedVideo.originalname, uploadedVideo.mimetype, uploadedVideo.size, req.user.id]
          );
          pushUpdate('media_asset_id', assetRes.rows[0].id);
          pushUpdate('source_type', 'upload');
          pushUpdate('source_url', '');
        } else if (body.source_url !== undefined) {
          if (body.source_url && !isValidHttpUrl(body.source_url)) {
            const err = new Error('URL vidéo externe invalide.');
            err.status = 400;
            throw err;
          }
          pushUpdate('source_type', 'external');
          pushUpdate('source_url', String(body.source_url || ''));
        }

        if (body.status !== undefined) {
          if (!VALID_STATUSES.includes(String(body.status))) {
            const err = new Error('Statut invalide.');
            err.status = 400;
            throw err;
          }
          pushUpdate('status', String(body.status));
          if (body.status === 'published' && !existingRes.rows[0].published_at) {
            pushUpdate('published_at', new Date());
          }
        }

        if (!updates.length) return existingRes.rows[0];
        values.push(id);
        const { rows } = await client.query(`UPDATE videos SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`, values);
        return rows[0];
      });

      if (!updated) return res.status(404).json({ message: 'Vidéo introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'VIDEO_UPDATED',
        entityType: 'video',
        entityId: id,
        ipAddress: req.ip,
      });

      return res.json(mapVideo(updated));
    },

    async remove(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant vidéo invalide.' });
      const { rows } = await db.query('DELETE FROM videos WHERE id = $1 RETURNING id, title', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Vidéo introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'VIDEO_DELETED',
        entityType: 'video',
        entityId: id,
        details: { title: rows[0].title },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'Vidéo supprimée.' });
    },

    async streamVideo(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant vidéo invalide.' });

      const isAdmin = req.user?.role === 'admin';
      const { rows } = await db.query(
        `SELECT v.status, ma.storage_key, ma.mime_type
         FROM videos v JOIN media_assets ma ON ma.id = v.media_asset_id
         WHERE v.id = $1`,
        [id]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Fichier vidéo introuvable.' });
      if (rows[0].status !== 'published' && !isAdmin) {
        return res.status(403).json({ message: 'Vidéo non publiée.' });
      }

      const filePath = resolvePrivateFilePath(rows[0].storage_key);
      if (!filePath || !fs.existsSync(filePath)) return res.status(404).json({ message: 'Fichier vidéo indisponible.' });

      const stat = fs.statSync(filePath);
      const totalSize = stat.size;
      const rangeHeader = req.headers.range;
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', rows[0].mime_type || 'video/mp4');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'private, no-store');

      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
        if (!match) return res.status(416).end();
        const start = match[1] ? Number.parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(Number.parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
        if (start < 0 || start >= totalSize || end < start) return res.status(416).end();
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', String(end - start + 1));
        return fs.createReadStream(filePath, { start, end }).pipe(res);
      }

      res.status(200);
      res.setHeader('Content-Length', String(totalSize));
      return fs.createReadStream(filePath).pipe(res);
    },
  };
}
