import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    type: { type: String, enum: ['genre', 'music', 'artist', 'album', 'news', 'general'], default: 'general' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Category || mongoose.model('Category', categorySchema, 'categories');