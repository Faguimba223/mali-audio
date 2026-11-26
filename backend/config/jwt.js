import 'dotenv/config';
import { randomBytes } from 'crypto';

const configuredSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production.');
}

if (!configuredSecret || configuredSecret.length < 32) {
  console.warn('JWT_SECRET is not set. A temporary secret is being used; sessions will reset when the server restarts.');
}

const jwtSecret = configuredSecret || randomBytes(32).toString('hex');

export default jwtSecret;