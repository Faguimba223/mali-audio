import mongoose from 'mongoose';

const playlistTrackSchema = new mongoose.Schema(
  {
    musicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Music', required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const playlistSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    isPublic: { type: Boolean, default: false },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  { timestamps: true }
);

playlistSchema.index({ userId: 1, updatedAt: -1 });

export default mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema, 'playlists');