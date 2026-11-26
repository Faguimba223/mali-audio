import mongoose from 'mongoose';
import Album from '../models/Album.js';
import Artist from '../models/Artist.js';
import Music from '../models/Music.js';
import { resolveArtist, resolveCategory } from './relations.js';
import { resolveUploadUrl } from '../config/upload.js';

const parseTrackIds = (value) => {
  if (value === undefined) return undefined;
  const trackIds = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(trackIds) || trackIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error('La sélection des musiques est invalide.');
  }
  return [...new Set(trackIds.map(String))];
};

const syncAlbumTracks = async (album, trackIds) => {
  if (trackIds === undefined) return;
  const selectedIds = trackIds.map((id) => new mongoose.Types.ObjectId(id));
  if (selectedIds.length && await Music.countDocuments({ _id: { $in: selectedIds }, artistId: { $ne: album.artistId } })) {
    throw new Error('Toutes les musiques sélectionnées doivent appartenir à l’artiste de l’album.');
  }
  await Music.updateMany({ albumId: album._id, _id: { $nin: selectedIds } }, { $set: { albumId: null, album: '' } });
  if (selectedIds.length) {
    await Music.updateMany({ _id: { $in: selectedIds }, artistId: album.artistId }, { $set: { albumId: album._id, album: album.title } });
  }
};

const populateAlbum = (query) => query
  .populate('artistId', 'name slug image')
  .populate('categoryId', 'name slug type');

export const getAlbums = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const filter = {};
    if (req.query.artistId && mongoose.isValidObjectId(req.query.artistId)) filter.artistId = req.query.artistId;
    const [items, total] = await Promise.all([
      populateAlbum(Album.find(filter).sort({ releaseDate: -1, title: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
      Album.countDocuments(filter),
    ]);
    const trackGroups = await Music.aggregate([
      { $match: { albumId: { $in: items.map((album) => album._id) } } },
      { $group: { _id: '$albumId', trackIds: { $push: '$_id' } } },
    ]);
    const trackIdsByAlbum = new Map(trackGroups.map((group) => [group._id.toString(), group.trackIds.map(String)]));
    const albums = items.map((album) => ({ ...album, id: album._id.toString(), trackIds: trackIdsByAlbum.get(album._id.toString()) || [] }));
    return res.json(req.query.page || req.query.limit ? { items: albums, page, limit, total } : albums);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer les albums.' });
  }
};

export const getAlbum = async (req, res) => {
  try {
    const album = await populateAlbum(Album.findById(req.params.id)).lean();
    if (!album) return res.status(404).json({ message: 'Album non trouvé.' });
    return res.json(album);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant d’album invalide.' });
  }
};

export const createAlbum = async (req, res) => {
  if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
    return res.status(400).json({ message: 'Le titre de l’album est obligatoire.' });
  }
  try {
    const artist = await resolveArtist(req.body.artistId, req.body.artist);
    if (!artist) return res.status(400).json({ message: 'Sélectionnez un artiste existant avec artistId.' });
    const trackIds = parseTrackIds(req.body.trackIds);
    const category = await resolveCategory(req.body.categoryId, req.body.genre, 'genre');
    if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie de genre introuvable.' });
    const album = await Album.create({
      title: req.body.title.trim(),
      artistId: artist._id,
      artist: artist.name,
      categoryId: category?._id || null,
      coverArt: resolveUploadUrl(req.file, 'images') || req.body.coverArt || req.body.image || '',
      releaseDate: req.body.releaseDate || null,
      description: req.body.description || '',
    });
    await syncAlbumTracks(album, trackIds);
    return res.status(201).json(await populateAlbum(Album.findById(album._id)));
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de créer l’album.', error: error.message });
  }
};

export const updateAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album non trouvé.' });
    const trackIds = parseTrackIds(req.body.trackIds);
    if (typeof req.body.title === 'string') album.title = req.body.title.trim();
    if (req.body.artistId || req.body.artist) {
      const artist = await resolveArtist(req.body.artistId, req.body.artist);
      if (!artist) return res.status(400).json({ message: 'Artiste introuvable.' });
      album.artistId = artist._id;
      album.artist = artist.name;
      await Music.updateMany({ albumId: album._id }, { $set: { artistId: artist._id, artist: artist.name } });
    }
    for (const field of ['releaseDate', 'description']) {
      if (req.body[field] !== undefined) album[field] = req.body[field];
    }
    if (req.body.coverArt !== undefined || req.body.image !== undefined) album.coverArt = req.body.coverArt || req.body.image || '';
    if (req.file) album.coverArt = resolveUploadUrl(req.file, 'images');
    if (req.body.categoryId || req.body.genre !== undefined) {
      const category = await resolveCategory(req.body.categoryId, req.body.genre, 'genre');
      if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie introuvable.' });
      album.categoryId = category?._id || null;
    }
    await album.save();
    await syncAlbumTracks(album, trackIds);
    return res.json(await populateAlbum(Album.findById(album._id)));
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de modifier l’album.', error: error.message });
  }
};

export const deleteAlbum = async (req, res) => {
  try {
    const album = await Album.findById(req.params.id);
    if (!album) return res.status(404).json({ message: 'Album non trouvé.' });
    if (await Music.exists({ albumId: album._id })) {
      return res.status(409).json({ message: 'Cet album contient des musiques.' });
    }
    await album.deleteOne();
    return res.json({ message: 'Album supprimé.' });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de supprimer l’album.', error: error.message });
  }
};