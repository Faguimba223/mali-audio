import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const jwtSecret = process.env.JWT_SECRET || 'mali-audio-dev-secret';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token manquant ou invalide.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtSecret);
    const { rows } = await query('SELECT id, name, email, role, is_active FROM users WHERE id = $1', [decoded.id]);
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Session expirée ou compte désactivé.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Session expirée ou token invalide.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }

  return next();
};

export default requireAuth;
