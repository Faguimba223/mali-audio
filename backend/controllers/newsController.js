import { resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapNews } from '../utils/mappers.js';
import { normalizeStatus, parseBoolean, parseId, parsePagination, slugify, VALID_STATUSES } from '../utils/validation.js';

export function createNewsController(db) {
  return {
    async list(req, res) {
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const q = String(req.query.q || '').trim();
      const { hasPagination, page, limit, offset } = parsePagination(req.query, 30, 100);

      const conditions = [];
      const params = [];

      if (!isAdminRequest) {
        conditions.push(`(status = 'published' OR published = true)`);
      } else if (req.query.status && VALID_STATUSES.includes(String(req.query.status))) {
        params.push(String(req.query.status));
        conditions.push(`status = $${params.length}`);
      }

      if (q) {
        params.push(`%${q}%`);
        conditions.push(`(title ILIKE $${params.length} OR content ILIKE $${params.length} OR COALESCE(summary, '') ILIKE $${params.length})`);
      }

      const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const baseSql = `SELECT * FROM news ${whereSql} ORDER BY published_at DESC NULLS LAST, created_at DESC`;

      if (hasPagination) {
        const countRes = await db.query(`SELECT COUNT(*)::int AS total FROM news ${whereSql}`, params);
        const { rows } = await db.query(`${baseSql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
        return res.json({ items: rows.map(mapNews), page, limit, total: countRes.rows[0]?.total || 0 });
      }

      const { rows } = await db.query(baseSql, params);
      return res.json(rows.map(mapNews));
    },

    async getOne(req, res) {
      const id = parseId(req.params.id);
      const isAdminRequest = req.user?.role === 'admin' && req.query.includeAll === 'true';
      const whereField = id ? 'id = $1' : 'slug = $1';
      const param = id || req.params.id;
      const pubClause = isAdminRequest ? '' : ` AND (status = 'published' OR published = true)`;

      const { rows } = await db.query(`SELECT * FROM news WHERE ${whereField}${pubClause}`, [param]);
      if (!rows[0]) return res.status(404).json({ message: 'Actualité introuvable.' });
      return res.json(mapNews(rows[0]));
    },

    async create(req, res) {
      const { title, summary, content, image_url, image, author, category_id, published, status } = req.body || {};
      if (!title || !String(title).trim() || !content || !String(content).trim()) {
        return res.status(400).json({ message: 'Titre et contenu sont requis.' });
      }

      const cleanTitle = String(title).trim();
      const cleanContent = String(content).trim();
      const resolvedStatus = status ? normalizeStatus(status, 'draft') : (parseBoolean(published, false) ? 'published' : 'draft');
      const isPublished = resolvedStatus === 'published';
      const imageUrl = resolvePublicImageUrl(req.file) || image_url || image || '';

      const { rows } = await db.query(
        `INSERT INTO news (title, slug, summary, content, image_url, author, category_id, published, status, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          cleanTitle,
          slugify(cleanTitle, Date.now().toString(36).slice(-4)),
          String(summary || cleanContent.slice(0, 180)),
          cleanContent,
          imageUrl,
          String(author || req.user.name || ''),
          parseId(category_id),
          isPublished,
          resolvedStatus,
          isPublished ? new Date() : null,
        ]
      );

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'NEWS_CREATED',
        entityType: 'news',
        entityId: rows[0].id,
        details: { title: cleanTitle, status: resolvedStatus },
        ipAddress: req.ip,
      });

      return res.status(201).json(mapNews(rows[0]));
    },

    async update(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant actualité invalide.' });

      const { title, summary, content, image_url, image, author, category_id, published, status } = req.body || {};
      const existing = await db.query('SELECT * FROM news WHERE id = $1', [id]);
      if (!existing.rows[0]) return res.status(404).json({ message: 'Actualité introuvable.' });

      const updates = [];
      const values = [];
      const push = (col, val) => {
        updates.push(`${col} = $${values.length + 1}`);
        values.push(val);
      };

      if (title !== undefined) push('title', String(title).trim());
      if (summary !== undefined) push('summary', String(summary));
      if (content !== undefined) push('content', String(content).trim());
      const nextImg = resolvePublicImageUrl(req.file) || (image_url !== undefined ? image_url : image);
      if (nextImg !== undefined) push('image_url', nextImg || '');
      if (author !== undefined) push('author', String(author));
      if (category_id !== undefined) push('category_id', parseId(category_id));

      if (status !== undefined || published !== undefined) {
        const nextStatus = status !== undefined
          ? normalizeStatus(status, existing.rows[0].status)
          : (parseBoolean(published, false) ? 'published' : 'unpublished');
        const nextPublished = nextStatus === 'published';

        const effectiveTitle = title !== undefined ? String(title).trim() : existing.rows[0].title;
        const effectiveContent = content !== undefined ? String(content).trim() : existing.rows[0].content;
        if (nextPublished && (!effectiveTitle || !effectiveContent)) {
          return res.status(400).json({ message: 'Impossible de publier un article incomplet (titre et contenu requis).' });
        }

        push('status', nextStatus);
        push('published', nextPublished);
        if (nextPublished && !existing.rows[0].published_at) {
          push('published_at', new Date());
        }
      }

      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(id);

      const { rows } = await db.query(
        `UPDATE news SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'NEWS_UPDATED',
        entityType: 'news',
        entityId: id,
        details: { status: rows[0].status },
        ipAddress: req.ip,
      });

      return res.json(mapNews(rows[0]));
    },

    async remove(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant actualité invalide.' });
      const { rows } = await db.query('DELETE FROM news WHERE id = $1 RETURNING id, title', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Actualité introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'NEWS_DELETED',
        entityType: 'news',
        entityId: id,
        details: { title: rows[0].title },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'Actualité supprimée.' });
    },
  };
}
