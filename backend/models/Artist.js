import mongoose from 'mongoose';

const artistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true, index: true },
    genre: { type: String, default: '' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: String, default: '' },
    bio: { type: String, default: '' },
    country: { type: String, default: 'Mali' },
  },
  { timestamps: true }
);

artistSchema.index({ name: 'text' });

export default mongoose.models.Artist || mongoose.model('Artist', artistSchema, 'artists');
