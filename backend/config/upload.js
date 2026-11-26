import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import env from './env.js';

const ALLOWED_EXTENSIONS = {
  audio: new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav']),
  image: new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']),
  video: new Set(['.mp4', '.webm', '.mov']),
  document: new Set(['.pdf']),
};

const ALLOWED_MIME_PREFIXES = {
  audio: ['audio/', 'application/ogg'],
  image: ['image/'],
  video: ['video/'],
  document: ['application/pdf'],
};

function getMediaDestination(mediaType) {
  if (mediaType === 'image') {
    return path.join(env.uploadDir, 'images');
  }
  const subFolder = mediaType === 'audio' ? 'audio' : mediaType === 'video' ? 'video' : 'documents';
  return path.join(env.privateStorageDir, subFolder);
}

function resolveMediaType(fieldName, mimeType = '') {
  if (fieldName === 'audio') return 'audio';
  if (fieldName === 'video') return 'video';
  if (fieldName === 'document') return 'document';
  if (fieldName === 'image' || fieldName === 'cover' || fieldName === 'avatar' || fieldName === 'thumbnail') return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'document';
  return null;
}

export function detectMagicSignature(buffer, mediaType) {
  if (!buffer || buffer.length < 4) return false;
  const b0 = buffer[0];
  const b1 = buffer[1];
  const b2 = buffer[2];
  const b3 = buffer[3];
  const ascii4 = buffer.subarray(0, 4).toString('ascii');
  const ascii8_12 = buffer.length >= 12 ? buffer.subarray(8, 12).toString('ascii') : '';
  const ascii4_8 = buffer.length >= 8 ? buffer.subarray(4, 8).toString('ascii') : '';

  if (mediaType === 'image') {
    const isJpeg = b0 === 0xff && b1 === 0xd8 && b2 === 0xff;
    const isPng = b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47;
    const isGif = ascii4 === 'GIF8';
    const isWebp = ascii4 === 'RIFF' && ascii8_12 === 'WEBP';
    return isJpeg || isPng || isGif || isWebp;
  }

  if (mediaType === 'audio') {
    const isId3 = ascii4.startsWith('ID3');
    const isMp3Frame = b0 === 0xff && (b1 & 0xe0) === 0xe0; // MP3 / ADTS AAC syncword
    const isWav = ascii4 === 'RIFF' && ascii8_12 === 'WAVE';
    const isOgg = ascii4 === 'OggS';
    const isFlac = ascii4 === 'fLaC';
    const isM4a = ascii4_8 === 'ftyp';
    return isId3 || isMp3Frame || isWav || isOgg || isFlac || isM4a;
  }

  if (mediaType === 'video') {
    const isMp4OrMov = ascii4_8 === 'ftyp';
    const isWebm = b0 === 0x1a && b1 === 0x45 && b2 === 0xdf && b3 === 0xa3;
    return isMp4OrMov || isWebm;
  }

  if (mediaType === 'document') {
    return ascii4 === '%PDF';
  }

  return false;
}

export async function validateUploadedFileSignature(file, mediaType) {
  if (!file?.path) return false;
  const fd = await fs.promises.open(file.path, 'r');
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await fd.read(buffer, 0, 16, 0);
    return detectMagicSignature(buffer.subarray(0, bytesRead), mediaType);
  } finally {
    await fd.close();
  }
}

export function safeUnlink(filePath) {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
}

const createDiskStorage = () => multer.diskStorage({
  destination: (_req, file, callback) => {
    const mediaType = resolveMediaType(file.fieldname, file.mimetype) || 'document';
    const dest = getMediaDestination(mediaType);
    fs.mkdirSync(dest, { recursive: true });
    callback(null, dest);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    callback(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const mediaType = resolveMediaType(file.fieldname, file.mimetype);
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!mediaType || !ALLOWED_EXTENSIONS[mediaType]?.has(extension)) {
    const error = new Error('Type ou extension de fichier non autorisé.');
    error.status = 415;
    callback(error);
    return;
  }
  const allowedMimes = ALLOWED_MIME_PREFIXES[mediaType] || [];
  const validMime = allowedMimes.some((prefix) => String(file.mimetype || '').toLowerCase().startsWith(prefix));
  if (!validMime) {
    const error = new Error('Type MIME non autorisé.');
    error.status = 415;
    callback(error);
    return;
  }
  callback(null, true);
};

async function enforceUploadedFilesMagic(filesList) {
  for (const { file, mediaType, maxBytes, label } of filesList) {
    if (!file) continue;
    if (maxBytes && file.size > maxBytes) {
      safeUnlink(file.path);
      const error = new Error(`${label} dépasse la taille maximale autorisée.`);
      error.status = 413;
      throw error;
    }
    const validMagic = await validateUploadedFileSignature(file, mediaType);
    if (!validMagic) {
      safeUnlink(file.path);
      const error = new Error(`Le contenu réel du fichier (${label}) ne correspond pas à un format autorisé.`);
      error.status = 415;
      throw error;
    }
  }
}

export const uploadAudio = (req, res, next) => {
  const parser = multer({ storage: createDiskStorage(), fileFilter, limits: { fileSize: env.maxAudioBytes } }).single('audio');
  parser(req, res, async (err) => {
    if (err) return next(err);
    try {
      await enforceUploadedFilesMagic([{ file: req.file, mediaType: 'audio', maxBytes: env.maxAudioBytes, label: 'Fichier audio' }]);
      return next();
    } catch (validationErr) {
      return next(validationErr);
    }
  });
};

export const uploadImage = (fieldName = 'image') => (req, res, next) => {
  const parser = multer({ storage: createDiskStorage(), fileFilter, limits: { fileSize: env.maxImageBytes } }).single(fieldName);
  parser(req, res, async (err) => {
    if (err) return next(err);
    try {
      await enforceUploadedFilesMagic([{ file: req.file, mediaType: 'image', maxBytes: env.maxImageBytes, label: 'Image' }]);
      return next();
    } catch (validationErr) {
      return next(validationErr);
    }
  });
};

export const uploadMusicAssets = (req, res, next) => {
  const parser = multer({
    storage: createDiskStorage(),
    fileFilter,
    limits: { fileSize: env.maxAudioBytes },
  }).fields([
    { name: 'audio', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  parser(req, res, async (err) => {
    if (err) return next(err);
    try {
      const audioFile = req.files?.audio?.[0];
      const imageFile = req.files?.image?.[0];
      await enforceUploadedFilesMagic([
        { file: audioFile, mediaType: 'audio', maxBytes: env.maxAudioBytes, label: 'Fichier audio' },
        { file: imageFile, mediaType: 'image', maxBytes: env.maxImageBytes, label: 'Pochette' },
      ]);
      return next();
    } catch (validationErr) {
      safeUnlink(req.files?.audio?.[0]?.path);
      safeUnlink(req.files?.image?.[0]?.path);
      return next(validationErr);
    }
  });
};

export const uploadVideoAssets = (req, res, next) => {
  const parser = multer({
    storage: createDiskStorage(),
    fileFilter,
    limits: { fileSize: env.maxVideoBytes },
  }).fields([
    { name: 'video', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  parser(req, res, async (err) => {
    if (err) return next(err);
    try {
      const videoFile = req.files?.video?.[0];
      const imageFile = req.files?.image?.[0];
      await enforceUploadedFilesMagic([
        { file: videoFile, mediaType: 'video', maxBytes: env.maxVideoBytes, label: 'Fichier vidéo' },
        { file: imageFile, mediaType: 'image', maxBytes: env.maxImageBytes, label: 'Miniature' },
      ]);
      return next();
    } catch (validationErr) {
      safeUnlink(req.files?.video?.[0]?.path);
      safeUnlink(req.files?.image?.[0]?.path);
      return next(validationErr);
    }
  });
};

export function resolvePublicImageUrl(file) {
  return file ? `/uploads/images/${file.filename}` : null;
}

export function resolvePrivateStorageKey(file, mediaType) {
  if (!file) return null;
  const subFolder = mediaType === 'audio' ? 'audio' : mediaType === 'video' ? 'video' : 'documents';
  return `${subFolder}/${file.filename}`;
}

export function resolvePrivateFilePath(storageKey) {
  if (!storageKey || typeof storageKey !== 'string') return null;
  const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
  const fullPath = path.resolve(env.privateStorageDir, normalized);
  if (!fullPath.startsWith(path.resolve(env.privateStorageDir))) {
    return null;
  }
  return fullPath;
}
