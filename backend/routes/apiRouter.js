import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import asyncHandler from '../middleware/asyncHandler.js';
import { createAuthMiddleware } from '../middleware/auth.js';
import { uploadImage, uploadMusicAssets, uploadVideoAssets } from '../config/upload.js';
import { createAuthController } from '../controllers/authController.js';
import { createArtistController } from '../controllers/artistController.js';
import { createAlbumController } from '../controllers/albumController.js';
import { createSongController } from '../controllers/songController.js';
import { createStreamController } from '../controllers/streamController.js';
import { createPlaylistController } from '../controllers/playlistController.js';
import { createVideoController } from '../controllers/videoController.js';
import { createNewsController } from '../controllers/newsController.js';
import { createCatalogMetaController } from '../controllers/catalogMetaController.js';
import { createUserActivityController } from '../controllers/userActivityController.js';
import { createAdminController } from '../controllers/adminController.js';

export function createApiRouter(db) {
  const router = Router();
  const { requireAuth, optionalAuth, requireAdmin } = createAuthMiddleware(db);

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de tentatives. Réessayez dans quelques minutes.' },
  });

  const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de requêtes de recherche. Veuillez patienter.' },
  });

  const auth = createAuthController(db);
  const artists = createArtistController(db);
  const albums = createAlbumController(db);
  const songs = createSongController(db);
  const stream = createStreamController(db);
  const playlists = createPlaylistController(db);
  const videos = createVideoController(db);
  const news = createNewsController(db);
  const meta = createCatalogMetaController(db);
  const activity = createUserActivityController(db);
  const admin = createAdminController(db);

  // Health
  router.get('/health', asyncHandler(async (_req, res) => {
    let dbStatus = 'ok';
    try {
      await db.query('SELECT 1');
    } catch {
      dbStatus = 'unavailable';
    }
    res.json({ success: true, status: 'ok', database: dbStatus, message: 'Mali Audio API fonctionne' });
  }));

  // Authentification & comptes
  router.post('/auth/register', authLimiter, asyncHandler(auth.register));
  router.post('/users/register', authLimiter, asyncHandler(auth.register));
  router.post('/auth/login', authLimiter, asyncHandler(auth.login));
  router.post('/users/login', authLimiter, asyncHandler(auth.login));
  router.post('/auth/password-reset/request', authLimiter, asyncHandler(auth.requestPasswordReset));
  router.post('/auth/password-reset/confirm', authLimiter, asyncHandler(auth.confirmPasswordReset));
  router.get('/auth/me', requireAuth, asyncHandler(auth.me));
  router.post('/auth/logout', requireAuth, asyncHandler(auth.logout));
  router.post('/users/logout', requireAuth, asyncHandler(auth.logout));
  router.get('/users/profile', requireAuth, asyncHandler(auth.me));
  router.patch('/users/profile', requireAuth, uploadImage('avatar'), asyncHandler(auth.updateProfile));
  router.patch('/users/password', requireAuth, asyncHandler(auth.changePassword));
  router.delete('/users/profile', requireAuth, asyncHandler(auth.deactivateOwnAccount));

  // Utilisateurs (Admin)
  router.get('/users', requireAuth, requireAdmin, asyncHandler(auth.adminListUsers));
  router.get('/users/admin', requireAuth, requireAdmin, asyncHandler(auth.adminListUsers));
  router.get('/users/:id', requireAuth, requireAdmin, asyncHandler(auth.adminGetUser));
  router.put('/users/:id', requireAuth, requireAdmin, asyncHandler(auth.adminUpdateUser));
  router.patch('/users/admin/:id/active', requireAuth, requireAdmin, asyncHandler(auth.adminSetActive));
  router.delete('/users/:id', requireAuth, requireAdmin, asyncHandler(auth.adminDeleteUser));

  // Artistes
  router.get('/artists', optionalAuth, asyncHandler(artists.list));
  router.get('/artists/:id', optionalAuth, asyncHandler(artists.getOne));
  router.post('/artists', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(artists.create));
  router.put('/artists/:id', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(artists.update));
  router.delete('/artists/:id', requireAuth, requireAdmin, asyncHandler(artists.remove));

  // Albums & Singles
  router.get('/albums', optionalAuth, asyncHandler(albums.list));
  router.get('/albums/:id', optionalAuth, asyncHandler(albums.getOne));
  router.post('/albums', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(albums.create));
  router.put('/albums/:id', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(albums.update));
  router.delete('/albums/:id', requireAuth, requireAdmin, asyncHandler(albums.remove));

  // Chansons (+ alias /musics pour rétrocompatibilité mobile)
  for (const prefix of ['/songs', '/musics']) {
    router.get(prefix, optionalAuth, asyncHandler(songs.list));
    router.get(`${prefix}/:id`, optionalAuth, asyncHandler(songs.getOne));
    router.post(`${prefix}/:id/stream-token`, optionalAuth, asyncHandler(songs.createStreamToken));
    router.post(`${prefix}/:id/play`, asyncHandler(songs.recordPlay));
    router.post(prefix, requireAuth, requireAdmin, uploadMusicAssets, asyncHandler(songs.create));
    router.put(`${prefix}/:id`, requireAuth, requireAdmin, uploadMusicAssets, asyncHandler(songs.update));
    router.delete(`${prefix}/:id`, requireAuth, requireAdmin, asyncHandler(songs.remove));
  }

  // Streaming audio protégé (aucune mise en cache)
  router.get('/stream/:token', asyncHandler(stream.streamAudio));

  // Playlists (publiques, personnelles et éditoriales admin)
  router.get('/playlists/public', asyncHandler(playlists.listPublic));
  router.get('/playlists/public/:id', asyncHandler(playlists.getPublicOne));
  router.get('/playlists/admin', requireAuth, requireAdmin, asyncHandler(playlists.adminList));
  router.post('/playlists/admin', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(playlists.adminCreate));
  router.put('/playlists/admin/:id', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(playlists.adminUpdate));
  router.delete('/playlists/admin/:id', requireAuth, requireAdmin, asyncHandler(playlists.adminDelete));
  router.get('/playlists', requireAuth, asyncHandler(playlists.listMine));
  router.post('/playlists', requireAuth, asyncHandler(playlists.createMine));
  router.get('/playlists/:id', requireAuth, asyncHandler(playlists.getOne));
  router.put('/playlists/:id', requireAuth, asyncHandler(playlists.updateMine));
  router.delete('/playlists/:id', requireAuth, asyncHandler(playlists.deleteMine));
  router.post('/playlists/:id/tracks', requireAuth, asyncHandler(playlists.addTrack));
  router.delete('/playlists/:id/tracks/:songId', requireAuth, asyncHandler(playlists.removeTrack));

  // Vidéos
  router.get('/videos', optionalAuth, asyncHandler(videos.list));
  router.get('/videos/:id', optionalAuth, asyncHandler(videos.getOne));
  router.get('/videos/:id/stream', optionalAuth, asyncHandler(videos.streamVideo));
  router.post('/videos', requireAuth, requireAdmin, uploadVideoAssets, asyncHandler(videos.create));
  router.put('/videos/:id', requireAuth, requireAdmin, uploadVideoAssets, asyncHandler(videos.update));
  router.delete('/videos/:id', requireAuth, requireAdmin, asyncHandler(videos.remove));

  // Actualités
  router.get('/news', optionalAuth, asyncHandler(news.list));
  router.get('/news/:id', optionalAuth, asyncHandler(news.getOne));
  router.post('/news', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(news.create));
  router.put('/news/:id', requireAuth, requireAdmin, uploadImage('image'), asyncHandler(news.update));
  router.delete('/news/:id', requireAuth, requireAdmin, asyncHandler(news.remove));

  // Catégories, Langues, Nouveautés, Recherche
  router.get('/categories', asyncHandler(meta.listCategories));
  router.post('/categories', requireAuth, requireAdmin, asyncHandler(meta.createCategory));
  router.put('/categories/:id', requireAuth, requireAdmin, asyncHandler(meta.updateCategory));
  router.delete('/categories/:id', requireAuth, requireAdmin, asyncHandler(meta.deleteCategory));

  router.get('/languages', asyncHandler(meta.listLanguages));
  router.post('/languages', requireAuth, requireAdmin, asyncHandler(meta.createLanguage));
  router.put('/languages/:id', requireAuth, requireAdmin, asyncHandler(meta.updateLanguage));
  router.delete('/languages/:id', requireAuth, requireAdmin, asyncHandler(meta.deleteLanguage));

  router.get('/new-releases', asyncHandler(meta.listNewReleases));
  router.post('/new-releases', requireAuth, requireAdmin, asyncHandler(meta.createNewRelease));
  router.put('/new-releases/:id', requireAuth, requireAdmin, asyncHandler(meta.updateNewRelease));
  router.delete('/new-releases/:id', requireAuth, requireAdmin, asyncHandler(meta.deleteNewRelease));

  router.get('/search', searchLimiter, asyncHandler(meta.globalSearch));

  // Favoris & Historique utilisateur
  router.get('/favorites', requireAuth, asyncHandler(activity.listFavorites));
  router.post('/favorites', requireAuth, asyncHandler(activity.addFavorite));
  router.delete('/favorites/:songId', requireAuth, asyncHandler(activity.removeFavorite));

  router.get('/history', requireAuth, asyncHandler(activity.listHistory));
  router.post('/history', requireAuth, asyncHandler(activity.recordHistory));
  router.delete('/history', requireAuth, asyncHandler(activity.clearHistory));

  // Paramètres publics & Administration centrale
  router.get('/settings/public', asyncHandler(admin.getPublicSettings));
  router.get('/admin/dashboard', requireAuth, requireAdmin, asyncHandler(admin.dashboard));
  router.get('/admin/settings', requireAuth, requireAdmin, asyncHandler(admin.getSettings));
  router.put('/admin/settings', requireAuth, requireAdmin, asyncHandler(admin.updateSettings));
  router.get('/admin/media', requireAuth, requireAdmin, asyncHandler(admin.listMediaAssets));
  router.delete('/admin/media/:id', requireAuth, requireAdmin, asyncHandler(admin.deleteMediaAsset));
  router.get('/admin/audit-logs', requireAuth, requireAdmin, asyncHandler(admin.listAuditLogs));

  return router;
}
