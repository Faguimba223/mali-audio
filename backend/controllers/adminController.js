import { resolvePrivateFilePath, safeUnlink } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { parseId } from '../utils/validation.js';

export function createAdminController(db) {
  return {
    async dashboard(_req, res) {
      const [countsRes, recentSongsRes, draftsRes, failedMediaRes] = await Promise.all([
        db.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users WHERE deleted_at IS NULL) AS users,
            (SELECT COUNT(*)::int FROM artists) AS artists,
            (SELECT COUNT(*)::int FROM songs) AS songs,
            (SELECT COUNT(*)::int FROM songs WHERE status = 'published') AS published_songs,
            (SELECT COUNT(*)::int FROM albums) AS albums,
            (SELECT COUNT(*)::int FROM albums WHERE release_type = 'single') AS singles,
            (SELECT COUNT(*)::int FROM playlists) AS playlists,
            (SELECT COUNT(*)::int FROM videos) AS videos,
            (SELECT COUNT(*)::int FROM news) AS news,
            (SELECT COALESCE(SUM(play_count), 0)::bigint FROM songs) AS total_plays
        `),
        db.query(
          `SELECT s.id, s.title, s.status, s.created_at, a.name AS artist_name
           FROM songs s LEFT JOIN artists a ON a.id = s.artist_id
           ORDER BY s.created_at DESC LIMIT 6`
        ),
        db.query(`
          SELECT 'song' AS type, id, title, created_at FROM songs WHERE status IN ('draft', 'pending_review')
          UNION ALL
          SELECT 'album' AS type, id, title, created_at FROM albums WHERE status IN ('draft', 'pending_review')
          UNION ALL
          SELECT 'news' AS type, id, title, created_at FROM news WHERE status IN ('draft', 'pending_review')
          UNION ALL
          SELECT 'video' AS type, id, title, created_at FROM videos WHERE status IN ('draft', 'pending_review')
          ORDER BY created_at DESC LIMIT 10
        `),
        db.query(`SELECT id, original_name, media_type, status, created_at FROM media_assets WHERE status = 'failed' ORDER BY created_at DESC LIMIT 5`),
      ]);

      const counts = countsRes.rows[0] || {};
      return res.json({
        counts: {
          ...counts,
          total_plays: Number(counts.total_plays || 0),
        },
        recentSongs: recentSongsRes.rows,
        drafts: draftsRes.rows,
        alerts: failedMediaRes.rows.map((asset) => ({
          type: 'media_error',
          message: `Échec de traitement média : ${asset.original_name || `#${asset.id}`}`,
          created_at: asset.created_at,
        })),
      });
    },

    async getPublicSettings(_req, res) {
      const { rows } = await db.query(`SELECT key, value FROM settings WHERE key IN ('branding', 'player', 'system')`);
      const result = {};
      for (const row of rows) result[row.key] = row.value;
      return res.json(result);
    },

    async getSettings(_req, res) {
      const { rows } = await db.query('SELECT key, value, updated_at FROM settings ORDER BY key ASC');
      const map = {};
      for (const row of rows) {
        map[row.key] = { ...row.value, updated_at: row.updated_at };
      }
      return res.json(map);
    },

    async updateSettings(req, res) {
      const body = req.body || {};
      const allowedKeys = new Set(['branding', 'player', 'uploads', 'system']);
      const entries = Object.entries(body).filter(([key, val]) => allowedKeys.has(key) && val && typeof val === 'object');
      if (!entries.length) {
        return res.status(400).json({ message: 'Aucune section de paramètres valide fournie.' });
      }

      for (const [key, value] of entries) {
        await db.query(
          `INSERT INTO settings (key, value, updated_by, updated_at)
           VALUES ($1, $2::jsonb, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (key) DO UPDATE
           SET value = settings.value || EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
          [key, JSON.stringify(value), req.user.id]
        );
      }

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'SETTINGS_UPDATED',
        entityType: 'settings',
        details: { keys: entries.map(([k]) => k) },
        ipAddress: req.ip,
      });

      const { rows } = await db.query('SELECT key, value, updated_at FROM settings ORDER BY key ASC');
      const map = {};
      for (const row of rows) map[row.key] = row.value;
      return res.json(map);
    },

    async listMediaAssets(req, res) {
      const { rows } = await db.query(
        `SELECT id, original_name, mime_type, media_type, size_bytes, duration_seconds, is_private, provenance, status, created_at
         FROM media_assets ORDER BY created_at DESC LIMIT 100`
      );
      return res.json(rows);
    },

    async deleteMediaAsset(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant média invalide.' });

      const inUse = await db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM songs WHERE audio_asset_id = $1 OR cover_asset_id = $1) AS song_refs,
           (SELECT COUNT(*)::int FROM videos WHERE media_asset_id = $1) AS video_refs`,
        [id]
      );
      const refs = inUse.rows[0] || { song_refs: 0, video_refs: 0 };
      if (refs.song_refs > 0 || refs.video_refs > 0) {
        return res.status(409).json({ message: 'Ce fichier média est encore associé à une œuvre publiée ou en brouillon.' });
      }

      const { rows } = await db.query('DELETE FROM media_assets WHERE id = $1 RETURNING id, storage_key, is_private, original_name', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Fichier média introuvable.' });

      if (rows[0].is_private) {
        safeUnlink(resolvePrivateFilePath(rows[0].storage_key));
      }

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'MEDIA_ASSET_DELETED',
        entityType: 'media_asset',
        entityId: id,
        details: { original_name: rows[0].original_name },
        ipAddress: req.ip,
      });
      return res.json({ success: true, message: 'Ressource média supprimée.' });
    },

    async listAuditLogs(req, res) {
      const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
      const { rows } = await db.query(
        `SELECT id, actor_id, actor_email, action, entity_type, entity_id, details, ip_address, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return res.json(rows);
    },
  };
}
