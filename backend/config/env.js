import 'dotenv/config';
import { createHmac, randomBytes } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

const isProduction = process.env.NODE_ENV === 'production';
const configuredJwtSecret = process.env.JWT_SECRET;

if (isProduction && (!configuredJwtSecret || configuredJwtSecret.length < 32 || configuredJwtSecret.startsWith('replace_with'))) {
  throw new Error('JWT_SECRET doit contenir au moins 32 caractères aléatoires en production.');
}

if (!configuredJwtSecret || configuredJwtSecret.length < 32 || configuredJwtSecret.startsWith('replace_with')) {
  console.warn('[config] JWT_SECRET non sécurisé ou absent : un secret temporaire est utilisé en développement.');
}

const jwtSecret = configuredJwtSecret && !configuredJwtSecret.startsWith('replace_with')
  ? configuredJwtSecret
  : randomBytes(32).toString('hex');

const streamSecret = process.env.STREAM_SECRET && process.env.STREAM_SECRET.length >= 32
  ? process.env.STREAM_SECRET
  : createHmac('sha256', jwtSecret).update('mali-audio-stream-signing-key').digest('hex');

export function normalizeCorsOrigins() {
  const configured = process.env.CORS_ORIGIN || '';
  if (!configured.trim()) {
    return isProduction ? [] : true;
  }
  return configured.split(',').map((origin) => origin.trim()).filter(Boolean);
}

export const env = {
  isProduction,
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret,
  streamSecret,
  streamTokenTtlSeconds: Math.max(30, Number(process.env.STREAM_TOKEN_TTL_SECONDS || 180)),
  corsOrigins: normalizeCorsOrigins(),
  uploadDir: path.resolve(backendRoot, process.env.UPLOAD_DIR || './uploads'),
  privateStorageDir: path.resolve(backendRoot, process.env.PRIVATE_STORAGE_DIR || './storage/private'),
  maxAudioBytes: Number(process.env.MAX_AUDIO_BYTES || 100 * 1024 * 1024),
  maxImageBytes: Number(process.env.MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  maxVideoBytes: Number(process.env.MAX_VIDEO_BYTES || 250 * 1024 * 1024),
  maxDocumentBytes: Number(process.env.MAX_DOCUMENT_BYTES || 15 * 1024 * 1024),
  defaultAdminEmail: (process.env.ADMIN_EMAIL || 'admin@maliaudio.local').trim().toLowerCase(),
  defaultAdminName: (process.env.ADMIN_NAME || 'Administrateur').trim(),
  defaultAdminPassword: process.env.ADMIN_PASSWORD || (isProduction ? '' : 'root'),
  defaultAdminEnabled: process.env.DEFAULT_ADMIN_ENABLED === 'true'
    || (!isProduction && process.env.DEFAULT_ADMIN_ENABLED !== 'false'),
};

export default env;
