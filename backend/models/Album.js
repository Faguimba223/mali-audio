import mongoose from 'mongoose';

const albumSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Artist', required: true },
    artist: { type: String, required: true, trim: true },
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    coverArt: { type: String, default: '' },
    releaseDate: { type: Date, default: null },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

albumSchema.index({ artistId: 1, title: 1 });

export default mongoose.models.Album || mongoose.model('Album', albumSchema, 'albums');