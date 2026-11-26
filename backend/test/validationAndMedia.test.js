import assert from 'node:assert/strict';
import test from 'node:test';
import { validateDatabaseUrl } from '../config/db.js';
import { detectMagicSignature } from '../config/upload.js';
import { createStreamToken, verifyStreamToken } from '../utils/streamToken.js';
import { isValidEmail, isValidHttpUrl, parseId, parsePagination, slugify } from '../utils/validation.js';

test('validation helpers parse ids, slugs, emails, urls and pagination safely', () => {
  assert.equal(parseId('42'), 42);
  assert.equal(parseId('0'), null);
  assert.equal(parseId('-3'), null);
  assert.equal(parseId('abc'), null);

  assert.equal(slugify('Fatoumata Diawara — Kuma!'), 'fatoumata-diawara-kuma');
  assert.equal(isValidEmail('contact@maliaudio.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidHttpUrl('https://maliaudio.com/video.mp4'), true);
  assert.equal(isValidHttpUrl('javascript:alert(1)'), false);

  const page1 = parsePagination({ page: '2', limit: '15' });
  assert.deepEqual(page1, { hasPagination: true, page: 2, limit: 15, offset: 15 });
});

test('validateDatabaseUrl accepts PostgreSQL URIs and rejects malformed strings', () => {
  assert.ok(validateDatabaseUrl('postgresql://postgres:secret@localhost:5432/maliaudio'));
  assert.throws(() => validateDatabaseUrl('mongodb://localhost:27017/maliaudio'));
  assert.throws(() => validateDatabaseUrl(''));
});

test('detectMagicSignature accepts valid audio/image/video/pdf headers and blocks spoofed executables', () => {
  assert.equal(detectMagicSignature(Buffer.from('ID3\x03\x00\x00'), 'audio'), true);
  assert.equal(detectMagicSignature(Buffer.from([0xff, 0xfb, 0x90, 0x00]), 'audio'), true);
  assert.equal(detectMagicSignature(Buffer.from('RIFF\x00\x00\x00\x00WAVE'), 'audio'), true);
  assert.equal(detectMagicSignature(Buffer.from('OggS\x00\x02'), 'audio'), true);
  assert.equal(detectMagicSignature(Buffer.from('fLaC\x00\x00'), 'audio'), true);
  assert.equal(detectMagicSignature(Buffer.from('\x00\x00\x00\x18ftypM4A '), 'audio'), true);

  assert.equal(detectMagicSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]), 'image'), true);
  assert.equal(detectMagicSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image'), true);
  assert.equal(detectMagicSignature(Buffer.from('%PDF-1.7'), 'document'), true);

  // Executable MZ header masquerading as audio or image must be rejected
  assert.equal(detectMagicSignature(Buffer.from('MZ\x90\x00\x03\x00\x00\x00'), 'audio'), false);
  assert.equal(detectMagicSignature(Buffer.from('<script>alert(1)</script>'), 'image'), false);
});

test('streamToken signs, verifies, rejects tampering and rejects expired tokens', () => {
  const secret = 'test-stream-secret-32-chars-minimum-1234';
  const issued = createStreamToken({ songId: 7, assetId: 12, userId: 3, ttlSeconds: 60 }, secret);
  const valid = verifyStreamToken(issued.token, secret);
  assert.equal(valid.valid, true);
  assert.equal(valid.payload.sid, 7);
  assert.equal(valid.payload.aid, 12);

  const tampered = `${issued.token.slice(0, -2)}xx`;
  assert.equal(verifyStreamToken(tampered, secret).valid, false);

  const expiredPayload = Buffer.from(JSON.stringify({ sid: 7, aid: 12, exp: Math.floor(Date.now() / 1000) - 10 })).toString('base64url');
  assert.equal(verifyStreamToken(`${expiredPayload}.bad`, secret).valid, false);
});
