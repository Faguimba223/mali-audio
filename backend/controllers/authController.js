import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'crypto';
import env from '../config/env.js';
import { resolvePublicImageUrl } from '../config/upload.js';
import { logAuditEvent } from '../utils/audit.js';
import { mapUser } from '../utils/mappers.js';
import { isValidEmail, parseId, VALID_ROLES } from '../utils/validation.js';

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tv: Number(user.token_version || 0) },
    env.jwtSecret,
    { expiresIn: '7d' }
  );
}

export function createAuthController(db) {
  return {
    async register(req, res) {
      const { name, username, email, password, phone, language, acceptTerms } = req.body || {};
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedName = String(name || '').trim();
      const normalizedUsername = username ? String(username).trim().toLowerCase() : null;

      if (!normalizedName || !isValidEmail(normalizedEmail) || !password || String(password).length < 6) {
        return res.status(400).json({ message: 'Nom, email valide et mot de passe (6 caractères minimum) sont requis.' });
      }
      if (acceptTerms === false) {
        return res.status(400).json({ message: 'Vous devez accepter les conditions d’utilisation et la politique de confidentialité.' });
      }
      if (normalizedUsername && !/^[a-z0-9._-]{3,50}$/.test(normalizedUsername)) {
        return res.status(400).json({ message: 'Nom d’utilisateur invalide (3 à 50 caractères alphanumériques).' });
      }

      const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'Un compte avec cette adresse e-mail existe déjà.' });
      }

      const passwordHash = await bcrypt.hash(String(password), 10);
      const created = await db.query(
        `INSERT INTO users (name, username, email, phone, password_hash, role, language, is_active)
         VALUES ($1, $2, $3, $4, $5, 'user', $6, true) RETURNING *`,
        [normalizedName, normalizedUsername, normalizedEmail, phone || null, passwordHash, language || 'fr']
      );

      const user = mapUser(created.rows[0]);
      const token = signUserToken(created.rows[0]);
      return res.status(201).json({ token, user });
    },

    async login(req, res) {
      const { email, identifier, password } = req.body || {};
      const loginValue = String(identifier || email || '').trim().toLowerCase();

      if (!loginValue || !password) {
        return res.status(400).json({ message: 'Identifiant et mot de passe requis.' });
      }

      const { rows } = await db.query(
        `SELECT * FROM users
         WHERE deleted_at IS NULL AND (LOWER(email) = $1 OR LOWER(COALESCE(username, '')) = $1 OR LOWER(name) = $1)
         ORDER BY id ASC LIMIT 1`,
        [loginValue]
      );
      const user = rows[0];

      if (!user) {
        return res.status(401).json({ message: 'Identifiants invalides.' });
      }
      if (!user.is_active) {
        return res.status(403).json({ message: 'Ce compte est désactivé ou suspendu.' });
      }

      const isValidPassword = await bcrypt.compare(String(password), user.password_hash);
      if (!isValidPassword) {
        if (user.role === 'admin') {
          await logAuditEvent(db, {
            actorId: user.id,
            actorEmail: user.email,
            action: 'ADMIN_LOGIN_FAILED',
            entityType: 'user',
            entityId: user.id,
            ipAddress: req.ip,
          });
        }
        return res.status(401).json({ message: 'Identifiants invalides.' });
      }

      if (user.role === 'admin') {
        await logAuditEvent(db, {
          actorId: user.id,
          actorEmail: user.email,
          action: 'ADMIN_LOGIN_SUCCESS',
          entityType: 'user',
          entityId: user.id,
          ipAddress: req.ip,
        });
      }

      const token = signUserToken(user);
      return res.json({ token, user: mapUser(user) });
    },

    async me(req, res) {
      const { rows } = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
      if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
      return res.json(mapUser(rows[0]));
    },

    async logout(req, res) {
      await db.query('UPDATE users SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [req.user.id]);
      return res.json({ success: true, message: 'Déconnexion réussie.' });
    },

    async updateProfile(req, res) {
      const { name, email, phone, language } = req.body || {};
      const updates = [];
      const values = [];

      if (name !== undefined) {
        const cleanName = String(name).trim();
        if (!cleanName) return res.status(400).json({ message: 'Le nom public ne peut pas être vide.' });
        updates.push(`name = $${values.length + 1}`);
        values.push(cleanName);
      }
      if (email !== undefined) {
        const cleanEmail = String(email).trim().toLowerCase();
        if (!isValidEmail(cleanEmail)) return res.status(400).json({ message: 'Adresse e-mail invalide.' });
        updates.push(`email = $${values.length + 1}`);
        values.push(cleanEmail);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${values.length + 1}`);
        values.push(phone || null);
      }
      if (language !== undefined) {
        updates.push(`language = $${values.length + 1}`);
        values.push(String(language).trim() || 'fr');
      }
      if (req.file) {
        updates.push(`avatar = $${values.length + 1}`);
        values.push(resolvePublicImageUrl(req.file));
      }

      if (!updates.length) return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
      values.push(req.user.id);

      const { rows } = await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );
      return res.json(mapUser(rows[0]));
    },

    async changePassword(req, res) {
      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Mot de passe actuel et nouveau mot de passe (6 caractères minimum) requis.' });
      }

      const { rows } = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [req.user.id]);
      const user = rows[0];
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      const isValid = await bcrypt.compare(String(currentPassword), user.password_hash);
      if (!isValid) return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });

      const hash = await bcrypt.hash(String(newPassword), 10);
      const updated = await db.query(
        `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2 RETURNING *`,
        [hash, req.user.id]
      );
      const token = signUserToken(updated.rows[0]);
      return res.json({ token, user: mapUser(updated.rows[0]) });
    },

    async requestPasswordReset(req, res) {
      const email = String(req.body?.email || '').trim().toLowerCase();
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'Veuillez fournir une adresse e-mail valide.' });
      }

      // Réponse neutre pour ne jamais révéler l'existence d'un compte
      const genericResponse = {
        success: true,
        message: 'Si un compte correspond à cette adresse e-mail, un lien de réinitialisation temporaire a été généré.',
      };

      const { rows } = await db.query('SELECT id, email FROM users WHERE email = $1 AND is_active = true AND deleted_at IS NULL', [email]);
      if (!rows[0]) {
        return res.json(genericResponse);
      }

      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await db.query('DELETE FROM password_resets WHERE user_id = $1 AND used_at IS NULL', [rows[0].id]);
      await db.query(
        'INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [rows[0].id, tokenHash, expiresAt]
      );

      if (!env.isProduction) {
        return res.json({ ...genericResponse, devResetToken: rawToken, expiresAt: expiresAt.toISOString() });
      }
      return res.json(genericResponse);
    },

    async confirmPasswordReset(req, res) {
      const { token, newPassword } = req.body || {};
      if (!token || !newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Jeton valide et nouveau mot de passe (6 caractères minimum) requis.' });
      }

      const tokenHash = createHash('sha256').update(String(token)).digest('hex');
      const { rows } = await db.query(
        `SELECT * FROM password_resets
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
        [tokenHash]
      );
      const resetRecord = rows[0];
      if (!resetRecord) {
        return res.status(400).json({ message: 'Ce lien de réinitialisation est invalide ou expiré.' });
      }

      const passwordHash = await bcrypt.hash(String(newPassword), 10);
      await db.withTransaction(async (client) => {
        await client.query(
          'UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [passwordHash, resetRecord.user_id]
        );
        await client.query('UPDATE password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [resetRecord.id]);
      });

      return res.json({ success: true, message: 'Mot de passe réinitialisé avec succès.' });
    },

    async deactivateOwnAccount(req, res) {
      await db.query(
        `UPDATE users
         SET is_active = false, deleted_at = CURRENT_TIMESTAMP, token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [req.user.id]
      );
      return res.json({ success: true, message: 'Votre compte a été désactivé.' });
    },

    async adminListUsers(req, res) {
      const q = String(req.query.q || '').trim();
      let sql = 'SELECT * FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC';
      const params = [];
      if (q) {
        sql = `SELECT * FROM users WHERE deleted_at IS NULL AND (name ILIKE $1 OR email ILIKE $1 OR COALESCE(username, '') ILIKE $1)
               ORDER BY created_at DESC`;
        params.push(`%${q}%`);
      }
      const { rows } = await db.query(sql, params);
      return res.json(rows.map(mapUser));
    },

    async adminGetUser(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
      const { rows } = await db.query('SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
      return res.json(mapUser(rows[0]));
    },

    async adminUpdateUser(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });

      const { name, email, role, is_active, active } = req.body || {};
      const updates = [];
      const values = [];

      if (name !== undefined) {
        updates.push(`name = $${values.length + 1}`);
        values.push(String(name).trim());
      }
      if (email !== undefined) {
        if (!isValidEmail(email)) return res.status(400).json({ message: 'Adresse e-mail invalide.' });
        updates.push(`email = $${values.length + 1}`);
        values.push(String(email).trim().toLowerCase());
      }
      if (role !== undefined) {
        const nextRole = String(role).trim().toLowerCase();
        if (!VALID_ROLES.includes(nextRole)) return res.status(400).json({ message: 'Rôle invalide.' });
        updates.push(`role = $${values.length + 1}`);
        values.push(nextRole);
      }
      const nextActive = is_active !== undefined ? is_active : active;
      if (nextActive !== undefined) {
        updates.push(`is_active = $${values.length + 1}`);
        values.push(Boolean(nextActive));
        if (!nextActive) {
          updates.push('token_version = token_version + 1');
        }
      }

      if (!updates.length) return res.status(400).json({ message: 'Aucune modification fournie.' });
      values.push(id);

      const { rows } = await db.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
        values
      );
      if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: id,
        details: { role, is_active: nextActive },
        ipAddress: req.ip,
      });

      return res.json(mapUser(rows[0]));
    },

    async adminSetActive(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
      const rawActive = req.body?.is_active !== undefined ? req.body.is_active : req.body?.active;
      if (rawActive === undefined) return res.status(400).json({ message: 'Statut is_active requis.' });
      const nextActive = Boolean(rawActive);

      if (req.user.id === id && !nextActive) {
        return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte administrateur.' });
      }

      const { rows } = await db.query(
        `UPDATE users SET is_active = $1, token_version = token_version + $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND deleted_at IS NULL RETURNING *`,
        [nextActive, nextActive ? 0 : 1, id]
      );
      if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: nextActive ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
        entityType: 'user',
        entityId: id,
        ipAddress: req.ip,
      });

      return res.json(mapUser(rows[0]));
    },

    async adminDeleteUser(req, res) {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
      if (req.user.id === id) return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte.' });

      const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id, email', [id]);
      if (!rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });

      await logAuditEvent(db, {
        actorId: req.user.id,
        actorEmail: req.user.email,
        action: 'USER_DELETED',
        entityType: 'user',
        entityId: id,
        details: { email: rows[0].email },
        ipAddress: req.ip,
      });

      return res.json({ success: true, message: 'Utilisateur supprimé.' });
    },
  };
}
