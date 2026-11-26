import mongoose from 'mongoose';
import Music from '../models/Music.js';
import Playlist from '../models/Playlist.js';
import { resolveUploadUrl } from '../config/upload.js';

const populatedPlaylist = (query) => query.populate({
  path: 'tracks.musicId',
  populate: [
    { path: 'artistId', select: 'name image' },
    { path: 'albumId', select: 'title coverArt' },
  ],
});

const ownedPlaylist = (id, userId) => Playlist.findOne({ _id: id, userId });

export const getPlaylists = async (req, res) => {
  const items = await Playlist.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
  return res.json(items);
};

export const getPlaylist = async (req, res) => {
  try {
    const playlist = await populatedPlaylist(Playlist.findOne({
      _id: req.params.id,
      $or: [{ userId: req.user.id }, { isPublic: true }],
    })).lean();
    if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
    return res.json(playlist);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant de playlist invalide.' });
  }
};

export const createPlaylist = async (req, res) => {
  if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Le nom de la playlist est obligatoire.' });
  }
  const playlist = await Playlist.create({
    userId: req.user.id,
    name: req.body.name.trim(),
    description: req.body.description || '',
    isPublic: req.body.isPublic === true || req.body.isPublic === 'true',
  });
  return res.status(201).json(playlist);
};

export const updatePlaylist = async (req, res) => {
  const playlist = await ownedPlaylist(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
  if (typeof req.body.name === 'string' && req.body.name.trim()) playlist.name = req.body.name.trim();
  if (req.body.description !== undefined) playlist.description = req.body.description;
  if (req.body.isPublic !== undefined) playlist.isPublic = req.body.isPublic === true || req.body.isPublic === 'true';
  await playlist.save();
  return res.json(playlist);
};

export const deletePlaylist = async (req, res) => {
  const playlist = await ownedPlaylist(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
  await playlist.deleteOne();
  return res.json({ message: 'Playlist supprimée.' });
};

export const addPlaylistTrack = async (req, res) => {
  const { musicId } = req.body;
  if (!mongoose.isValidObjectId(musicId)) return res.status(400).json({ message: 'musicId invalide.' });
  const playlist = await ownedPlaylist(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
  if (!await Music.exists({ _id: musicId })) return res.status(404).json({ message: 'Musique non trouvée.' });
  if (playlist.tracks.some((track) => track.musicId.equals(musicId))) {
    return res.status(409).json({ message: 'Cette musique est déjà dans la playlist.' });
  }
  playlist.tracks.push({ musicId });
  await playlist.save();
  return res.status(201).json(await populatedPlaylist(Playlist.findById(playlist._id)));
};

export const removePlaylistTrack = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.musicId)) return res.status(400).json({ message: 'musicId invalide.' });
  const playlist = await ownedPlaylist(req.params.id, req.user.id);
  if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
  const initialLength = playlist.tracks.length;
  playlist.tracks = playlist.tracks.filter((track) => !track.musicId.equals(req.params.musicId));
  if (playlist.tracks.length === initialLength) return res.status(404).json({ message: 'Musique absente de la playlist.' });
  await playlist.save();
  return res.json(await populatedPlaylist(Playlist.findById(playlist._id)));
};

export const getPublicPlaylist = async (req, res) => {
  try {
    const playlist = await populatedPlaylist(Playlist.findOne({ _id: req.params.id, isPublic: true })).lean();
    if (!playlist) return res.status(404).json({ message: 'Playlist publique non trouvée.' });
    return res.json(playlist);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant de playlist invalide.' });
  }
};

export const getAdminPlaylists = async (_req, res) => {
  const items = await populatedPlaylist(Playlist.find({}).sort({ updatedAt: -1 })).lean();
  return res.json(items.map((item) => ({
    ...item,
    id: item._id.toString(),
    trackIds: item.tracks.map((track) => track.musicId?._id?.toString() || track.musicId?.toString()).filter(Boolean),
  })));
};

export const createAdminPlaylist = async (req, res) => {
  if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Le nom de la playlist est obligatoire.' });
  }
  try {
    const trackIds = req.body.trackIds === undefined ? [] : JSON.parse(req.body.trackIds);
    if (!Array.isArray(trackIds) || trackIds.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ message: 'La sélection des musiques est invalide.' });
    }
    if (trackIds.length && await Music.countDocuments({ _id: { $in: trackIds } }) !== new Set(trackIds.map(String)).size) {
      return res.status(400).json({ message: 'Une musique sélectionnée est introuvable.' });
    }
    const playlist = await Playlist.create({
      userId: req.user.id,
      name: req.body.name.trim(),
      description: req.body.description || '',
      image: resolveUploadUrl(req.file, 'images') || req.body.image || '',
      isPublic: req.body.isPublic === true || req.body.isPublic === 'true',
      tracks: [...new Set(trackIds.map(String))].map((musicId) => ({ musicId })),
    });
    return res.status(201).json(await populatedPlaylist(Playlist.findById(playlist._id)));
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Impossible de créer la playlist.' });
  }
};

export const updateAdminPlaylist = async (req, res) => {
  try {
    const playlist = await Playlist.findById(req.params.id);
    if (!playlist) return res.status(404).json({ message: 'Playlist non trouvée.' });
    if (typeof req.body.name === 'string' && req.body.name.trim()) playlist.name = req.body.name.trim();
    if (req.body.description !== undefined) playlist.description = req.body.description;
    if (req.body.isPublic !== undefined) playlist.isPublic = req.body.isPublic === true || req.body.isPublic === 'true';
    if (req.body.image !== undefined) playlist.image = req.body.image;
    if (req.file) playlist.image = resolveUploadUrl(req.file, 'images');
    if (req.body.trackIds !== undefined) {
      const trackIds = JSON.parse(req.body.trackIds);
      if (!Array.isArray(trackIds) || trackIds.some((id) => !mongoose.isValidObjectId(id))) {
        return res.status(400).json({ message: 'La sélection des musiques est invalide.' });
      }
      const uniqueIds = [...new Set(trackIds.map(String))];
      if (uniqueIds.length && await Music.countDocuments({ _id: { $in: uniqueIds } }) !== uniqueIds.length) {
        return res.status(400).json({ message: 'Une musique sélectionnée est introuvable.' });
      }
      playlist.tracks = uniqueIds.map((musicId) => ({ musicId }));
    }
    await playlist.save();
    return res.json(await populatedPlaylist(Playlist.findById(playlist._id)));
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Identifiant de playlist invalide.' });
    return res.status(400).json({ message: error.message || 'Impossible de modifier la playlist.' });
  }
};

export const deleteAdminPlaylist = async (req, res) => {
  try {
    const deleted = await Playlist.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Playlist non trouvée.' });
    return res.json({ message: 'Playlist supprimée.' });
  } catch (error) {
    if (error.name === 'CastError') return res.status(400).json({ message: 'Identifiant de playlist invalide.' });
    return res.status(500).json({ message: 'Impossible de supprimer la playlist.' });
  }
};