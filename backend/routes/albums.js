import { Router } from 'express';
import { createAlbum, deleteAlbum, getAlbum, getAlbums, updateAlbum } from '../controllers/albumController.js';
import { uploadImage } from '../config/upload.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getAlbums));
router.get('/:id', asyncHandler(getAlbum));
router.post('/', requireAuth, requireAdmin, uploadImage, asyncHandler(createAlbum));
router.put('/:id', requireAuth, requireAdmin, uploadImage, asyncHandler(updateAlbum));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteAlbum));

export default router;