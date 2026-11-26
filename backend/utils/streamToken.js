import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import env from '../config/env.js';

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

export function createStreamToken({ songId, assetId, userId = null, mode = 'listen', ttlSeconds = env.streamTokenTtlSeconds }, secret = env.streamSecret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sid: Number(songId),
    aid: Number(assetId),
    uid: userId ? Number(userId) : null,
    mode,
    exp: now + Math.max(15, Number(ttlSeconds || 120)),
    jti: randomBytes(8).toString('hex'),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  return {
    token: `${encodedPayload}.${signature}`,
    expiresIn: payload.exp - now,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
}

export function verifyStreamToken(token, secret = env.streamSecret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return { valid: false, reason: 'FORMAT_INVALID' };
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'FORMAT_INVALID' };
  }
  const [encodedPayload, providedSig] = parts;
  const expectedSig = createHmac('sha256', secret).update(encodedPayload).digest('base64url');
  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  }
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.sid || !payload.aid || !payload.exp || payload.exp < now) {
      return { valid: false, reason: 'EXPIRED' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'PAYLOAD_INVALID' };
  }
}
