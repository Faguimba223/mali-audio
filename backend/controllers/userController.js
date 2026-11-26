import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import jwtSecret from '../config/jwt.js';

const signToken = (user) => jwt.sign(
  { id: user.id || user._id, email: user.email, role: user.role || 'user', tokenVersion: user.tokenVersion || 0 },
  jwtSecret,
  { expiresIn: '7d' }
);

export const registerUser = async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (typeof name !== 'string' || !name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'Nom, email valide et mot de passe (8 caractères minimum) sont obligatoires.' });
  }

  try {
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password });
    const token = signToken(user);
    return res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
    return res.status(400).json({ message: 'Impossible de créer l’utilisateur.' });
  }
};

export const loginUser = async (req, res) => {
  const { email, identifier, password } = req.body;
  const normalizedIdentifier = typeof (identifier || email) === 'string' ? (identifier || email).trim().toLowerCase() : '';

  if (!normalizedIdentifier || typeof password !== 'string' || !password) {
    return res.status(400).json({ message: 'Identifiant ou email et mot de passe requis.' });
  }

  try {
    const user = await User.findOne({ $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }] }).select('+tokenVersion');
    if (!user) return res.status(401).json({ message: 'Identifiants invalides.' });
    if (!user.active) return res.status(403).json({ message: 'Ce compte est désactivé.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Identifiants invalides.' });

    const token = signToken(user);
    return res.json({ user: { id: user._id, name: user.name, email: user.email, username: user.username, role: user.role }, token });
  } catch (error) {
    return res.status(400).json({ message: 'Connexion impossible.' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -tokenVersion').lean();
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer le profil.', error: error.message });
  }
};

export const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : undefined;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return res.status(400).json({ message: 'Le nom ne peut pas être vide.' });
  }
  if (normalizedEmail !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Adresse email invalide.' });
  }
  if (name === undefined && normalizedEmail === undefined) {
    return res.status(400).json({ message: 'Aucune modification à enregistrer.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (name !== undefined) user.name = name.trim();
    if (normalizedEmail !== undefined) user.email = normalizedEmail;
    await user.save();
    return res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Un compte utilise déjà cette adresse email.' });
    return res.status(400).json({ message: 'Impossible de modifier le profil.' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ message: 'Mot de passe actuel requis et nouveau mot de passe de 8 caractères minimum.' });
  }

  try {
    const user = await User.findById(req.user.id).select('+tokenVersion');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
    }
    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    return res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      token: signToken(user),
    });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de modifier le mot de passe.' });
  }
};

export const logoutUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    return res.status(204).end();
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de fermer la session.' });
  }
};

export const listUsers = async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const filter = query
    ? { $or: [{ name: { $regex: query, $options: 'i' } }, { email: { $regex: query, $options: 'i' } }] }
    : {};

  try {
    const users = await User.find(filter).select('name email role active createdAt').sort({ createdAt: -1 }).lean();
    return res.json(users.map((user) => ({ ...user, id: user._id.toString() })));
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer les utilisateurs.' });
  }
};

export const setUserActive = async (req, res) => {
  const { active } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'État du compte invalide.' });

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    if (!active && user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
    }
    if (!active && user.role === 'admin') {
      const otherActiveAdmins = await User.countDocuments({ role: 'admin', active: true, _id: { $ne: user._id } });
      if (!otherActiveAdmins) return res.status(400).json({ message: 'Le dernier compte administrateur actif ne peut pas être désactivé.' });
    }

    user.active = active;
    await user.save();
    return res.json({ id: user._id.toString(), name: user.name, email: user.email, role: user.role, active: user.active });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Identifiant utilisateur invalide.' });
    return res.status(500).json({ message: 'Impossible de modifier le compte.' });
  }
};
