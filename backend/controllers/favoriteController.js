import mongoose from 'mongoose';
import Favorite from '../models/Favorite.js';
import Music from '../models/Music.js';

const favoriteQuery = (query) => query.populate({
  path: 'musicId',
  populate: [
    { path: 'artistId', select: 'name image' },
    { path: 'albumId', select: 'title coverArt' },
  ],
});

export const getFavorites = async (req, res) => {
  const items = await favoriteQuery(Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 })).lean();
  return res.json(items);
};

export const addFavorite = async (req, res) => {
  const musicId = req.body.musicId;
  if (!mongoose.isValidObjectId(musicId)) return res.status(400).json({ message: 'musicId invalide.' });
  if (!await Music.exists({ _id: musicId })) return res.status(404).json({ message: 'Musique non trouvée.' });
  try {
    const favorite = await Favorite.create({ userId: req.user.id, musicId });
    return res.status(201).json(await favoriteQuery(Favorite.findById(favorite._id)));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Cette musique est déjà dans vos favoris.' });
    return res.status(400).json({ message: 'Impossible d’ajouter ce favori.' });
  }
};

export const removeFavorite = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.musicId)) return res.status(400).json({ message: 'musicId invalide.' });
  const favorite = await Favorite.findOneAndDelete({ userId: req.user.id, musicId: req.params.musicId });
  if (!favorite) return res.status(404).json({ message: 'Favori non trouvé.' });
  return res.json({ message: 'Favori supprimé.' });
};