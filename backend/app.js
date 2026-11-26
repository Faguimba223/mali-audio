import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import env from './config/env.js';
import defaultDb from './config/db.js';
import { createApiRouter } from './routes/apiRouter.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(db = defaultDb) {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({
    origin: env.corsOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Seules les images publiques sont exposées ; les fichiers audio/documents sont en stockage privé
  const publicImagesDir = path.join(env.uploadDir, 'images');
  fs.mkdirSync(publicImagesDir, { recursive: true });
  app.use('/uploads/images', express.static(publicImagesDir, { maxAge: '7d' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'Mali Audio API fonctionne' });
  });

  // Spécification OpenAPI
  const openApiPath = path.join(__dirname, 'docs', 'openapi.json');
  app.get('/api/openapi.json', (_req, res) => {
    if (!fs.existsSync(openApiPath)) return res.status(404).json({ message: 'Documentation OpenAPI absente.' });
    return res.sendFile(openApiPath);
  });

  app.get('/api/docs', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Mali Audio API — Documentation</title>
    <style>
      body { font-family: system-ui, sans-serif; background: #0b0b0d; color: #f4f1ea; margin: 0; padding: 2rem; }
      a { color: #e2b44c; }
      code { background: #19191f; padding: 0.2rem 0.4rem; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Mali Audio API v1.2</h1>
    <p>Spécification OpenAPI 3.0 disponible sur <a href="/api/openapi.json">/api/openapi.json</a>.</p>
    <p>Vérification de santé : <a href="/api/health">/api/health</a></p>
  </body>
</html>`);
  });

  app.use('/api', createApiRouter(db));

  app.use((_req, res) => {
    res.status(404).json({ message: 'Route API introuvable.' });
  });

  app.use(errorHandler);
  return app;
}

export default createApp;
