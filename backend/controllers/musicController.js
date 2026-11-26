import mongoose from 'mongoose';
import Album from '../models/Album.js';
import Favorite from '../models/Favorite.js';
import Music from '../models/Music.js';
import Playlist from '../models/Playlist.js';
import { resolveAlbum, resolveArtist, resolveCategory } from './relations.js';
import { resolveUploadUrl } from '../config/upload.js';

const toBoolean = (value) => value === true || value === 'true' || value === '1' || value === 1;
const populateMusic = (query) => query
  .populate('artistId', 'name slug image')
  .populate('albumId', 'title coverArt releaseDate')
  .populate('categoryId', 'name slug type');

export const getMusics = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const filter = {};
    if (req.query.artistId && mongoose.isValidObjectId(req.query.artistId)) filter.artistId = req.query.artistId;
    if (req.query.albumId && mongoose.isValidObjectId(req.query.albumId)) filter.albumId = req.query.albumId;
    if (req.query.categoryId && mongoose.isValidObjectId(req.query.categoryId)) filter.categoryId = req.query.categoryId;
    if (req.query.search) filter.$text = { $search: String(req.query.search) };

    const [items, total] = await Promise.all([
      populateMusic(Music.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
      Music.countDocuments(filter),
    ]);
    return res.json(req.query.page || req.query.limit ? { items, page, limit, total } : items);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer les musiques.', error: error.message });
  }
};

export const getMusic = async (req, res) => {
  try {
    const music = await populateMusic(Music.findById(req.params.id));
    if (!music) return res.status(404).json({ message: 'Musique non trouvée.' });
    return res.json(music);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant de musique invalide.' });
  }
};

export const createMusic = async (req, res) => {
  try {
    const { title, artist, artistId, album, albumId, genre, categoryId, duration, image, coverArt, audioUrl, description, featured, publishedAt } = req.body;
    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ message: 'Le titre est obligatoire.' });
    const artistRecord = await resolveArtist(artistId, artist);
    if (!artistRecord) return res.status(400).json({ message: 'Sélectionnez un artiste existant avec artistId.' });

    const uploadedAudio = req.files?.audio?.[0];
    const uploadedImage = req.files?.image?.[0];
    const imageUrl = resolveUploadUrl(uploadedImage, 'images') || coverArt || image || '';
    const albumRecord = await resolveAlbum({ albumId, title: album, artist: artistRecord, coverArt: imageUrl });
    if (albumId && !albumRecord) return res.status(400).json({ message: 'Album introuvable ou lié à un autre artiste.' });
    const category = await resolveCategory(categoryId, genre, 'genre');
    if (categoryId && !category) return res.status(400).json({ message: 'Catégorie introuvable.' });
    const audioFile = uploadedAudio ? resolveUploadUrl(uploadedAudio, 'music') : '';
    const music = await Music.create({
      title: title.trim(),
      artist: artistRecord.name,
      artistId: artistRecord._id,
      album: albumRecord?.title || '',
      albumId: albumRecord?._id || null,
      genre: typeof genre === 'string' ? genre.trim() : '',
      categoryId: category?._id || null,
      duration: duration || '0:00',
      image: imageUrl,
      coverArt: imageUrl,
      audioUrl: audioFile || audioUrl || '',
      audioFile,
      audioFileName: uploadedAudio?.filename || req.body.audioFileName || '',
      description: description || '',
      featured: toBoolean(featured),
      publishedAt: publishedAt || new Date(),
    });
    return res.status(201).json(await populateMusic(Music.findById(music._id)));
  } catch (error) {
    return res.status(400).json({ message: 'Impossible d’ajouter la musique.', error: error.message });
  }
};

export const updateMusic = async (req, res) => {
  try {
    const music = await Music.findById(req.params.id);
    if (!music) return res.status(404).json({ message: 'Musique non trouvée.' });
    const body = req.body;
    if (typeof body.title === 'string') music.title = body.title.trim();
    let artistChanged = false;
    if (body.artistId || body.artist) {
      const artistRecord = await resolveArtist(body.artistId, body.artist);
      if (!artistRecord) return res.status(400).json({ message: 'Artiste introuvable.' });
      artistChanged = !music.artistId.equals(artistRecord._id);
      music.artistId = artistRecord._id;
      music.artist = artistRecord.name;
    }
    if (body.albumId || body.album !== undefined) {
      const artistRecord = await resolveArtist(music.artistId, music.artist);
      const albumRecord = await resolveAlbum({ albumId: body.albumId, title: body.album, artist: artistRecord, coverArt: music.coverArt });
      if (body.albumId && !albumRecord) return res.status(400).json({ message: 'Album introuvable ou lié à un autre artiste.' });
      music.albumId = albumRecord?._id || null;
      music.album = albumRecord?.title || '';
    } else if (artistChanged) {
      music.albumId = null;
      music.album = '';
    }
    if (body.genre !== undefined || body.categoryId) {
      const category = await resolveCategory(body.categoryId, body.genre, 'genre');
      if (body.categoryId && !category) return res.status(400).json({ message: 'Catégorie introuvable.' });
      music.categoryId = category?._id || null;
      music.genre = body.genre || category?.name || '';
    }
    for (const field of ['duration', 'description', 'publishedAt']) {
      if (body[field] !== undefined) music[field] = body[field];
    }
    if (body.featured !== undefined) music.featured = toBoolean(body.featured);
    if (body.image !== undefined || body.coverArt !== undefined) {
      music.image = body.image || body.coverArt || '';
      music.coverArt = music.image;
    }
    const uploadedAudio = req.files?.audio?.[0];
    const uploadedImage = req.files?.image?.[0];
    if (uploadedAudio) {
      music.audioUrl = resolveUploadUrl(uploadedAudio, 'music');
      music.audioFile = music.audioUrl;
      music.audioFileName = uploadedAudio.filename;
    }
    if (uploadedImage) {
      music.image = resolveUploadUrl(uploadedImage, 'images');
      music.coverArt = music.image;
    }
    if (!uploadedAudio && body.audioUrl !== undefined) music.audioUrl = body.audioUrl;
    await music.save();
    return res.json(await populateMusic(Music.findById(music._id)));
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de modifier la musique.', error: error.message });
  }
};

export const deleteMusic = async (req, res) => {
  try {
    const deleted = await Music.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Musique non trouvée.' });
    await Promise.all([
      Favorite.deleteMany({ musicId: deleted._id }),
      Playlist.updateMany({}, { $pull: { tracks: { musicId: deleted._id } } }),
    ]);
    return res.json({ message: 'Musique supprimée.' });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de supprimer la musique.', error: error.message });
  }
};

export const recordPlay = async (req, res) => {
  try {
    const music = await Music.findByIdAndUpdate(req.params.id, { $inc: { playCount: 1 } }, { new: true });
    if (!music) return res.status(404).json({ message: 'Musique non trouvée.' });
    return res.json({ id: music._id, playCount: music.playCount });
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant de musique invalide.' });
  }
};
