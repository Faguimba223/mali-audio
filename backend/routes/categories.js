import { Router } from 'express';
import { createCategory, deleteCategory, getCategories, getCategory, updateCategory } from '../controllers/categoryController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', asyncHandler(getCategories));
router.get('/:id', asyncHandler(getCategory));
router.post('/', requireAuth, requireAdmin, asyncHandler(createCategory));
router.put('/:id', requireAuth, requireAdmin, asyncHandler(updateCategory));
router.delete('/:id', requireAuth, requireAdmin, asyncHandler(deleteCategory));

export default router;