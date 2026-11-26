import { Router } from 'express';
import { createArtist, deleteArtist, getArtist, getArtists, updateArtist } from '../controllers/artistController.js';
import { uploadImage } from '../config/upload.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getArtists));
router.get('/:id', asyncHandler(getArtist));
router.post('/', requireAuth, requireAdmin, uploadImage, asyncHandler(createArtist));
router.put('/:id', requireAuth, requireAdmin, uploadImage, asyncHandler(updateArtist));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteArtist));

export default router;
