import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import defaultDb from '../config/db.js';

export function createAuthMiddleware(db = defaultDb, secret = env.jwtSecret) {
  const resolveTokenUser = async (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    if (!token) return null;

    const decoded = jwt.verify(token, secret);
    const { rows } = await db.query(
      'SELECT id, name, username, email, role, is_active, token_version FROM users WHERE id = $1 AND deleted_at IS NULL',
      [decoded.id]
    );
    const user = rows[0];
    if (!user || !user.is_active) return null;
    if (decoded.tv !== undefined && Number(decoded.tv) !== Number(user.token_version || 0)) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      token_version: Number(user.token_version || 0),
    };
  };

  const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentification requise.' });
    }
    try {
      const user = await resolveTokenUser(authHeader);
      if (!user) {
        return res.status(401).json({ message: 'Session expirée ou compte désactivé.' });
      }
      req.user = user;
      return next();
    } catch {
      return res.status(401).json({ message: 'Session expirée ou token invalide.' });
    }
  };

  const optionalAuth = async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
    try {
      const user = await resolveTokenUser(authHeader);
      if (user) req.user = user;
    } catch {
      // Ignore invalid optional auth header for public routes
    }
    return next();
  };

  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
    }
    return next();
  };

  return { requireAuth, optionalAuth, requireAdmin };
}

const defaultAuth = createAuthMiddleware();
export const { requireAuth, optionalAuth, requireAdmin } = defaultAuth;
export default requireAuth;
