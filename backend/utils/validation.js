export const VALID_STATUSES = ['draft', 'pending_review', 'published', 'unpublished', 'archived'];
export const VALID_RELEASE_TYPES = ['album', 'single', 'ep'];
export const VALID_ROLES = ['user', 'editor', 'admin'];

export function parseId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function slugify(text, suffix = '') {
  const base = String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120) || 'item';
  return suffix ? `${base}-${suffix}` : base;
}

export function parsePagination(query = {}, defaultLimit = 50, maxLimit = 100) {
  const hasPagination = query.page !== undefined || query.limit !== undefined;
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || defaultLimit, 1), maxLimit);
  const offset = (page - 1) * limit;
  return { hasPagination, page, limit, offset };
}

export function normalizeStatus(status, fallback = 'draft') {
  const value = String(status || '').trim().toLowerCase();
  return VALID_STATUSES.includes(value) ? value : fallback;
}

export function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'oui'].includes(normalized)) return true;
  if (['false', '0', 'no', 'non'].includes(normalized)) return false;
  return fallback;
}

export function isValidHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function parseJsonField(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}
