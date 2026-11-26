import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.join(__dirname, '..', 'uploads');

const allowedExtensions = {
  audio: new Set(['.aac', '.flac', '.m4a', '.mp3', '.ogg', '.wav']),
  image: new Set(['.gif', '.jpeg', '.jpg', '.png', '.webp']),
};

const createUploader = (mediaType, maxFileSize) => multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const folder = mediaType === 'audio' ? 'music' : 'images';
      const uploadPath = path.join(baseUploadDir, folder);
      fs.mkdirSync(uploadPath, { recursive: true });
      callback(null, uploadPath);
    },
    filename: (_req, file, callback) => {
      callback(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const validMimeType = file.mimetype.startsWith(`${mediaType}/`);
    const validExtension = allowedExtensions[mediaType].has(extension);
    if (!validMimeType || !validExtension) {
      const error = new Error('Type de fichier non autorisé.');
      error.status = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: maxFileSize },
});

export const uploadAudio = createUploader('audio', 100 * 1024 * 1024).single('audio');
export const uploadImage = createUploader('image', 10 * 1024 * 1024).single('image');

const musicAssetsParser = multer({
  storage: multer.diskStorage({
    destination: (_req, file, callback) => {
      const mediaType = file.mimetype.startsWith('audio/') ? 'audio' : 'image';
      const folder = mediaType === 'audio' ? 'music' : 'images';
      const uploadPath = path.join(baseUploadDir, folder);
      fs.mkdirSync(uploadPath, { recursive: true });
      callback(null, uploadPath);
    },
    filename: (_req, file, callback) => {
      callback(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const mediaType = file.mimetype.startsWith('audio/') ? 'audio' : file.mimetype.startsWith('image/') ? 'image' : null;
    const extension = path.extname(file.originalname).toLowerCase();
    if (!mediaType || !allowedExtensions[mediaType].has(extension)) {
      const error = new Error('Type de fichier non autorisé.');
      error.status = 415;
      callback(error);
      return;
    }
    callback(null, true);
  },
  limits: { fileSize: 100 * 1024 * 1024 },
}).fields([
  { name: 'audio', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]);

export const uploadMusicAssets = (req, res, next) => {
  musicAssetsParser(req, res, (error) => {
    if (error) return next(error);
    const image = req.files?.image?.[0];
    if (image && image.size > 10 * 1024 * 1024) {
      const sizeError = new Error('La pochette ne peut pas dépasser 10 Mo.');
      sizeError.status = 413;
      fs.unlink(image.path, () => next(sizeError));
      return;
    }
    return next();
  });
};

export const resolveUploadUrl = (file, mediaType) => (
  file ? `/uploads/${mediaType}/${file.filename}` : null
);
