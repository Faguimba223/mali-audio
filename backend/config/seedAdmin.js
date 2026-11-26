import User from '../models/User.js';

export default async function seedDefaultAdmin() {
  const isProduction = process.env.NODE_ENV === 'production';
  const enabled = process.env.DEFAULT_ADMIN_ENABLED === 'true'
    || (!isProduction && process.env.DEFAULT_ADMIN_ENABLED !== 'false');

  if (!enabled) return;

  const username = (process.env.DEFAULT_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const password = process.env.DEFAULT_ADMIN_PASSWORD || (isProduction ? '' : 'root');
  const email = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@maliaudio.local').trim().toLowerCase();

  if (!username || !password || !email) {
    throw new Error('DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD et DEFAULT_ADMIN_EMAIL sont requis pour créer l’admin.');
  }
  if (isProduction && (!process.env.DEFAULT_ADMIN_PASSWORD || password.length < 8)) {
    throw new Error('En production, définissez DEFAULT_ADMIN_PASSWORD avec au moins 8 caractères.');
  }

  const existingAdmin = await User.findOne({ username });
  if (existingAdmin) {
    if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
    }
    return;
  }
  if (await User.exists({ email })) {
    console.warn(`Default admin not created: ${email} is already assigned to another account.`);
    return;
  }

  await User.create({ name: 'Administrateur', username, email, password, role: 'admin' });
  console.log(`Default admin account created: ${username}`);
}