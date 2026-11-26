import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Album from '../models/Album.js';
import Artist from '../models/Artist.js';
import Category from '../models/Category.js';
import Favorite from '../models/Favorite.js';
import Music from '../models/Music.js';
import News from '../models/News.js';
import Playlist from '../models/Playlist.js';
import User, { hashUserPassword } from '../models/User.js';
import albumRoutes from '../routes/albums.js';
import artistRoutes from '../routes/artists.js';
import categoryRoutes from '../routes/categories.js';
import favoriteRoutes from '../routes/favorites.js';
import musicRoutes from '../routes/musics.js';
import newsRoutes from '../routes/news.js';
import playlistRoutes from '../routes/playlists.js';
import userRoutes from '../routes/users.js';

const hasRoute = (router, method, routePath) => router.stack.some(({ route }) => (
  route?.path === routePath && route.methods[method]
));

test('all requested resources map to explicit MongoDB collections', () => {
  const collections = [User, Artist, Music, Album, News, Category, Favorite, Playlist]
    .map((model) => model.collection.collectionName);

  assert.deepEqual(collections, ['users', 'artists', 'musics', 'albums', 'news', 'categories', 'favorites', 'playlists']);
});

test('music persists its required catalog metadata and references', async () => {
  const artistId = new mongoose.Types.ObjectId();
  const music = new Music({ title: 'Kuma', artist: 'Fatoumata Diawara', artistId });

  await music.validate();
  assert.equal(music.artistId.toString(), artistId.toString());
  assert.equal(music.playCount, 0);
  assert.ok(music.publishedAt instanceof Date);
  for (const field of ['albumId', 'genre', 'duration', 'audioFile', 'coverArt', 'image', 'audioUrl']) {
    assert.ok(Music.schema.path(field), `missing music field: ${field}`);
  }
  assert.equal(Music.schema.path('artistId').options.ref, 'Artist');
  assert.equal(Music.schema.path('albumId').options.ref, 'Album');
  assert.equal(Music.schema.path('categoryId').options.ref, 'Category');
});

test('user passwords are stored as bcrypt hashes', async () => {
  const plainPassword = 'mali-audio-password';
  const user = new User({ name: 'Test User', email: 'test@example.test', password: plainPassword });

  await hashUserPassword.call(user);
  assert.notEqual(user.password, plainPassword);
  assert.equal(await bcrypt.compare(plainPassword, user.password), true);
});

test('the default admin username and development password are valid model values', async () => {
  const user = new User({ name: 'Administrateur', username: 'admin', email: 'admin@maliaudio.local', password: 'root', role: 'admin' });

  await user.validate();
  await hashUserPassword.call(user);
  assert.equal(user.role, 'admin');
  assert.notEqual(user.password, 'root');
  assert.equal(await bcrypt.compare('root', user.password), true);
});

test('favorites and playlist tracks reference users and music with a unique favorite pair', () => {
  assert.equal(Favorite.schema.path('userId').options.ref, 'User');
  assert.equal(Favorite.schema.path('musicId').options.ref, 'Music');
  assert.ok(Favorite.schema.indexes().some(([keys, options]) => (
    keys.userId === 1 && keys.musicId === 1 && options.unique === true
  )));
  assert.equal(Playlist.schema.path('userId').options.ref, 'User');
  assert.equal(Playlist.schema.path('tracks').schema.path('musicId').options.ref, 'Music');
});

test('remaining models expose the expected relation references', () => {
  assert.equal(Album.schema.path('artistId').options.ref, 'Artist');
  assert.equal(Album.schema.path('categoryId').options.ref, 'Category');
  assert.equal(News.schema.path('categoryId').options.ref, 'Category');
  assert.equal(Artist.schema.path('categoryId').options.ref, 'Category');
  assert.ok(Category.schema.path('slug').options.unique);
});

test('REST routers expose persistence endpoints for all eight resources', () => {
  const requiredRoutes = [
    [userRoutes, 'post', '/register'],
    [userRoutes, 'post', '/login'],
    [userRoutes, 'get', '/profile'],
    [userRoutes, 'patch', '/profile'],
    [userRoutes, 'patch', '/password'],
    [userRoutes, 'post', '/logout'],
    [userRoutes, 'get', '/admin'],
    [userRoutes, 'patch', '/admin/:id/active'],
    [artistRoutes, 'get', '/'],
    [musicRoutes, 'post', '/'],
    [albumRoutes, 'get', '/'],
    [newsRoutes, 'post', '/'],
    [categoryRoutes, 'get', '/'],
    [favoriteRoutes, 'post', '/'],
    [playlistRoutes, 'post', '/'],
    [playlistRoutes, 'get', '/admin'],
    [playlistRoutes, 'post', '/admin'],
    [playlistRoutes, 'put', '/admin/:id'],
    [playlistRoutes, 'delete', '/admin/:id'],
  ];
  for (const [router, method, routePath] of requiredRoutes) {
    assert.ok(hasRoute(router, method, routePath), `missing ${method.toUpperCase()} ${routePath}`);
  }
});