import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: 'Actualité' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    date: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    image: { type: String, default: '' },
    content: { type: String, default: '' },
    author: { type: String, default: 'Mali Audio' },
    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

newsSchema.index({ title: 'text', category: 'text' });

export default mongoose.models.News || mongoose.model('News', newsSchema, 'news');
