import mongoose from 'mongoose';

const musicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true, index: true },
    album: { type: String, default: '' },
    albumId: { type: mongoose.Schema.Types.ObjectId, ref: 'Album', default: null, index: true },
    genre: { type: String, default: '', trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    duration: { type: String, default: '0:00' },
    image: { type: String, default: '' },
    coverArt: { type: String, default: '' },
    audioUrl: { type: String, default: '' },
    audioFile: { type: String, default: '' },
    audioFileName: { type: String, default: '' },
    description: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: Date.now },
    playCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

musicSchema.index({ title: 'text', artist: 'text' });
musicSchema.index({ publishedAt: -1 });

export default mongoose.models.Music || mongoose.model('Music', musicSchema, 'musics');
