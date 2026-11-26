import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, lowercase: true, trim: true, minlength: 3, match: /^[a-z0-9._-]+$/, unique: true, sparse: true },
    password: { type: String, required: true, minlength: 4 },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    active: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0, select: false },
  },
  { timestamps: true }
);

export async function hashUserPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
}

userSchema.pre('save', hashUserPassword);

userSchema.methods.comparePassword = async function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema, 'users');
