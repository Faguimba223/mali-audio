import fs from 'fs';
import { resolvePrivateFilePath } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { verifyStreamToken } from '../utils/streamToken.js';

export function createStreamController(db) {
  return {
    async streamAudio(req, res) {
      const verification = verifyStreamToken(req.params.token);
      if (!verification.valid) {
        return res.status(verification.reason === 'EXPIRED' ? 401 : 403).json({
          message: verification.reason === 'EXPIRED'
            ? 'Le lien d’écoute temporaire a expiré.'
            : 'Accès au flux audio refusé.',
        });
      }

      const { sid, aid, mode } = verification.payload;
      const { rows } = await db.query(
        `SELECT s.id AS song_id, s.status AS song_status, ma.id AS asset_id, ma.storage_key, ma.mime_type, ma.status AS asset_status
         FROM songs s
         JOIN media_assets ma ON ma.id = s.audio_asset_id
         WHERE s.id = $1 AND ma.id = $2`,
        [sid, aid]
      );

      const record = rows[0];
      if (!record || record.asset_status !== 'ready') {
        return res.status(404).json({ message: 'Flux audio introuvable.' });
      }
      if (record.song_status !== 'published' && mode !== 'preview') {
        await logAuditEvent(db, {
          action: 'STREAM_BLOCKED_UNPUBLISHED',
          entityType: 'song',
          entityId: sid,
          ipAddress: req.ip,
        });
        return res.status(403).json({ message: 'Ce contenu n’est plus publié.' });
      }

      const filePath = resolvePrivateFilePath(record.storage_key);
      if (!filePath || !fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Fichier audio indisponible.' });
      }

      const stat = fs.statSync(filePath);
      const totalSize = stat.size;
      const rangeHeader = req.headers.range;

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Type', record.mime_type || 'audio/mpeg');

      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(rangeHeader).trim());
        if (!match) {
          res.setHeader('Content-Range', `bytes */${totalSize}`);
          return res.status(416).end();
        }
        const start = match[1] ? Number.parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(Number.parseInt(match[2], 10), totalSize - 1) : totalSize - 1;

        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= totalSize || end < start) {
          res.setHeader('Content-Range', `bytes */${totalSize}`);
          return res.status(416).end();
        }

        const chunkSize = end - start + 1;
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
        res.setHeader('Content-Length', String(chunkSize));

        const stream = fs.createReadStream(filePath, { start, end });
        stream.on('error', () => {
          if (!res.headersSent) res.status(500).end();
        });
        return stream.pipe(res);
      }

      res.status(200);
      res.setHeader('Content-Length', String(totalSize));
      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) res.status(500).end();
      });
      return stream.pipe(res);
    },
  };
}
