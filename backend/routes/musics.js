import { Router } from 'express';
import { createMusic, deleteMusic, getMusic, getMusics, recordPlay, updateMusic } from '../controllers/musicController.js';
import { uploadMusicAssets } from '../config/upload.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getMusics));
router.get('/:id', asyncHandler(getMusic));
router.post('/:id/play', asyncHandler(recordPlay));
router.post('/', requireAuth, requireAdmin, uploadMusicAssets, asyncHandler(createMusic));
router.put('/:id', requireAuth, requireAdmin, uploadMusicAssets, asyncHandler(updateMusic));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteMusic));

export default router;
