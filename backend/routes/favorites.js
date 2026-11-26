import { Router } from 'express';
import { addFavorite, getFavorites, removeFavorite } from '../controllers/favoriteController.js';
import { requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.use(requireAuth);
router.get('/', asyncHandler(getFavorites));
router.post('/', asyncHandler(addFavorite));
router.delete('/:musicId', asyncHandler(removeFavorite));

export default router;