import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import { createApp } from '../app.js';

function createMockDb(fixtures) {
  return {
    async query(sql, params = []) {
      const text = sql.replace(/\s+/g, ' ').trim();

      if (text === 'SELECT 1') return { rows: [{ '?column?': 1 }] };

      if (text.startsWith('SELECT id, name, username, email, role, is_active, token_version FROM users WHERE id = $1')) {
        const user = fixtures.users.find((u) => u.id === Number(params[0]));
        return { rows: user ? [user] : [] };
      }

      if (text.startsWith('SELECT s.id, s.title, s.status, s.audio_asset_id, s.audio_url, ma.status AS asset_status FROM songs s')) {
        const song = fixtures.songs.find((s) => s.id === Number(params[0]));
        if (!song) return { rows: [] };
        const asset = fixtures.mediaAssets.find((m) => m.id === song.audio_asset_id);
        return { rows: [{ ...song, asset_status: asset?.status || null }] };
      }

      if (text.startsWith('SELECT s.id AS song_id, s.status AS song_status, ma.id AS asset_id, ma.storage_key, ma.mime_type, ma.status AS asset_status FROM songs s')) {
        const song = fixtures.songs.find((s) => s.id === Number(params[0]));
        const asset = fixtures.mediaAssets.find((m) => m.id === Number(params[1]));
        if (!song || !asset || song.audio_asset_id !== asset.id) return { rows: [] };
        return {
          rows: [{
            song_id: song.id,
            song_status: song.status,
            asset_id: asset.id,
            storage_key: asset.storage_key,
            mime_type: asset.mime_type,
            asset_status: asset.status,
          }],
        };
      }

      if (text.startsWith('SELECT s.*, a.name AS artist_name, al.title AS album_title')) {
        const isPublicOnly = text.includes("WHERE s.status = 'published'");
        const rows = fixtures.songs
          .filter((s) => !isPublicOnly || s.status === 'published')
          .map((s) => ({ ...s, artist_name: 'Fatoumata Diawara', album_title: 'Fenfo' }));
        return { rows };
      }

      if (text.startsWith('SELECT user_id, is_editorial FROM playlists WHERE id = $1') || text.startsWith('SELECT * FROM playlists WHERE id = $1')) {
        const playlist = fixtures.playlists.find((p) => p.id === Number(params[0]));
        return { rows: playlist ? [playlist] : [] };
      }

      if (text.includes('FROM users WHERE deleted_at IS NULL') && text.includes('(SELECT COUNT(*)::int FROM songs)')) {
        return {
          rows: [{
            users: fixtures.users.length,
            artists: 1,
            songs: fixtures.songs.length,
            published_songs: fixtures.songs.filter((s) => s.status === 'published').length,
            albums: 1,
            singles: 0,
            playlists: fixtures.playlists.length,
            videos: 0,
            news: 0,
            total_plays: 42,
          }],
        };
      }

      if (text.startsWith('SELECT s.id, s.title, s.status, s.created_at, a.name AS artist_name')) return { rows: [] };
      if (text.includes("SELECT 'song' AS type")) return { rows: [] };
      if (text.startsWith('SELECT id, original_name, media_type, status, created_at FROM media_assets')) return { rows: [] };
      if (text.startsWith('INSERT INTO audit_logs')) return { rows: [] };

      return { rows: [] };
    },
    async withTransaction(fn) {
      return fn(this);
    },
  };
}

test('API security, RBAC, publication filtering, and protected HTTP Range streaming', async (t) => {
  const audioFolder = path.join(env.privateStorageDir, 'audio');
  fs.mkdirSync(audioFolder, { recursive: true });
  const testFileName = 'test-stream-sample.mp3';
  const testFilePath = path.join(audioFolder, testFileName);
  const sampleBytes = Buffer.from('ID3-MALIAUDIO');
  fs.writeFileSync(testFilePath, sampleBytes);

  const fixtures = {
    users: [
      { id: 1, name: 'Admin', username: 'admin', email: 'admin@maliaudio.local', role: 'admin', is_active: true, token_version: 2 },
      { id: 2, name: 'Auditeur', username: 'auditeur', email: 'user@maliaudio.local', role: 'user', is_active: true, token_version: 0 },
      { id: 3, name: 'Autre', username: 'autre', email: 'other@maliaudio.local', role: 'user', is_active: true, token_version: 0 },
    ],
    mediaAssets: [
      { id: 10, storage_key: `audio/${testFileName}`, mime_type: 'audio/mpeg', status: 'ready' },
    ],
    songs: [
      { id: 100, title: 'Kuma', artist_id: 1, status: 'published', audio_asset_id: 10, audio_url: '', play_count: 10 },
      { id: 101, title: 'Brouillon Secret', artist_id: 1, status: 'draft', audio_asset_id: 10, audio_url: '', play_count: 0 },
    ],
    playlists: [
      { id: 50, user_id: 2, title: 'Ma Playlist', is_editorial: false, is_public: false, status: 'published' },
    ],
  };

  const app = createApp(createMockDb(fixtures));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(testFilePath, { force: true });
  });

  const adminToken = jwt.sign({ id: 1, email: 'admin@maliaudio.local', role: 'admin', tv: 2 }, env.jwtSecret);
  const staleAdminToken = jwt.sign({ id: 1, email: 'admin@maliaudio.local', role: 'admin', tv: 1 }, env.jwtSecret);
  const userToken = jwt.sign({ id: 2, email: 'user@maliaudio.local', role: 'user', tv: 0 }, env.jwtSecret);
  const otherUserToken = jwt.sign({ id: 3, email: 'other@maliaudio.local', role: 'user', tv: 0 }, env.jwtSecret);

  // 1. Health & OpenAPI
  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const openApiRes = await fetch(`${baseUrl}/api/openapi.json`);
  assert.equal(openApiRes.status, 200);

  // 2. RBAC & token revocation
  assert.equal((await fetch(`${baseUrl}/api/admin/dashboard`)).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${staleAdminToken}` } })).status, 401);
  assert.equal((await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${userToken}` } })).status, 403);
  assert.equal((await fetch(`${baseUrl}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${adminToken}` } })).status, 200);

  // 3. Publication filtering & no private path exposure
  const songsRes = await fetch(`${baseUrl}/api/songs`);
  const publicSongs = await songsRes.json();
  assert.equal(publicSongs.length, 1);
  assert.equal(publicSongs[0].title, 'Kuma');
  assert.equal(publicSongs[0].stream_protected, true);
  assert.equal(publicSongs[0].storage_key, undefined);
  assert.equal(publicSongs[0].audio_url, undefined);

  // 4. Draft audio cannot be streamed by public visitor
  const draftTokenRes = await fetch(`${baseUrl}/api/songs/101/stream-token`, { method: 'POST' });
  assert.equal(draftTokenRes.status, 403);

  // 5. Private audio directory is never exposed statically
  const staticAttempt = await fetch(`${baseUrl}/uploads/audio/${testFileName}`);
  assert.equal(staticAttempt.status, 404);

  // 6. Published song issues short-lived streamUrl & supports HTTP Range 206 + no-store
  const tokenRes = await fetch(`${baseUrl}/api/songs/100/stream-token`, { method: 'POST' });
  assert.equal(tokenRes.status, 200);
  const { streamUrl, protected: isProtected } = await tokenRes.json();
  assert.equal(isProtected, true);
  assert.ok(streamUrl.startsWith('/api/stream/'));

  const fullStreamRes = await fetch(`${baseUrl}${streamUrl}`);
  assert.equal(fullStreamRes.status, 200);
  assert.equal(fullStreamRes.headers.get('cache-control'), 'no-store, no-cache, must-revalidate, private');
  assert.equal(fullStreamRes.headers.get('content-disposition'), 'inline');
  assert.equal(fullStreamRes.headers.get('accept-ranges'), 'bytes');
  assert.equal(await fullStreamRes.text(), 'ID3-MALIAUDIO');

  const rangeStreamRes = await fetch(`${baseUrl}${streamUrl}`, { headers: { Range: 'bytes=4-7' } });
  assert.equal(rangeStreamRes.status, 206);
  assert.equal(rangeStreamRes.headers.get('content-range'), `bytes 4-7/${sampleBytes.length}`);
  assert.equal(await rangeStreamRes.text(), 'MALI');

  const invalidRangeRes = await fetch(`${baseUrl}${streamUrl}`, { headers: { Range: 'bytes=999-1005' } });
  assert.equal(invalidRangeRes.status, 416);

  // 7. Playlist ownership check
  const hijackRes = await fetch(`${baseUrl}/api/playlists/50`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${otherUserToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Piraté' }),
  });
  assert.equal(hijackRes.status, 403);
});
