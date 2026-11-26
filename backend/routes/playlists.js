import { Router } from 'express';
import {
  addPlaylistTrack,
  createAdminPlaylist,
  createPlaylist,
  deleteAdminPlaylist,
  deletePlaylist,
  getPlaylist,
  getAdminPlaylists,
  getPublicPlaylist,
  getPlaylists,
  removePlaylistTrack,
  updatePlaylist,
  updateAdminPlaylist,
} from '../controllers/playlistController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../config/upload.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/public/:id', asyncHandler(getPublicPlaylist));
router.use(requireAuth);
router.get('/admin', requireAdmin, asyncHandler(getAdminPlaylists));
router.post('/admin', requireAdmin, uploadImage, asyncHandler(createAdminPlaylist));
router.put('/admin/:id', requireAdmin, uploadImage, asyncHandler(updateAdminPlaylist));
router.delete('/admin/:id', requireAdmin, asyncHandler(deleteAdminPlaylist));
router.get('/', asyncHandler(getPlaylists));
router.post('/', asyncHandler(createPlaylist));
router.get('/:id', asyncHandler(getPlaylist));
router.put('/:id', asyncHandler(updatePlaylist));
router.delete('/:id', asyncHandler(deletePlaylist));
router.post('/:id/tracks', asyncHandler(addPlaylistTrack));
router.delete('/:id/tracks/:musicId', asyncHandler(removePlaylistTrack));

export default router;