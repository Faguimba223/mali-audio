import { Router } from 'express';
import { createNews, deleteNews, getNews, getNewsItem, updateNews } from '../controllers/newsController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getNews));
router.get('/:id', asyncHandler(getNewsItem));
router.post('/', requireAuth, requireAdmin, asyncHandler(createNews));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(updateNews));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteNews));

export default router;
