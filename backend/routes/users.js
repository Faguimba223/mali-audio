import { Router } from 'express';
import { changePassword, getProfile, listUsers, loginUser, logoutUser, registerUser, setUserActive, updateProfile } from '../controllers/userController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { rateLimit } from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';

const router = Router();
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

router.post('/register', authLimiter, asyncHandler(registerUser));
router.post('/login', authLimiter, asyncHandler(loginUser));
router.get('/profile', requireAuth, asyncHandler(getProfile));
router.patch('/profile', requireAuth, asyncHandler(updateProfile));
router.patch('/password', requireAuth, asyncHandler(changePassword));
router.post('/logout', requireAuth, asyncHandler(logoutUser));
router.get('/admin', requireAuth, requireAdmin, asyncHandler(listUsers));
router.patch('/admin/:id/active', requireAuth, requireAdmin, asyncHandler(setUserActive));

export default router;
