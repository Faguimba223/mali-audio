import Album from '../models/Album.js';
import Artist from '../models/Artist.js';
import Music from '../models/Music.js';
import { resolveCategory, slugify } from './relations.js';
import { resolveUploadUrl } from '../config/upload.js';

export const getArtists = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const [items, total] = await Promise.all([
      Artist.find({}).sort({ name: 1 }).skip((page - 1) * limit).limit(limit).populate('categoryId', 'name slug').lean(),
      Artist.countDocuments(),
    ]);
    return res.json(req.query.page || req.query.limit ? { items, page, limit, total } : items);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer les artistes.', error: error.message });
  }
};

export const getArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id).populate('categoryId', 'name slug').lean();
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé.' });
    return res.json(artist);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant d’artiste invalide.' });
  }
};

export const createArtist = async (req, res) => {
  if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Le nom de l’artiste est obligatoire.' });
  }

  try {
    const genre = req.body.genre || '';
    const category = await resolveCategory(req.body.categoryId, genre, 'genre');
    if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie introuvable.' });
    const artist = await Artist.create({
      name: req.body.name.trim(),
      slug: slugify(req.body.name),
      genre,
      categoryId: category?._id || null,
      image: resolveUploadUrl(req.file, 'images') || req.body.image || '',
      bio: req.body.bio || '',
      country: req.body.country || 'Mali',
    });
    return res.status(201).json(artist);
  } catch (error) {
    return res.status(400).json({ message: 'Impossible d’ajouter l’artiste.', error: error.message });
  }
};

export const updateArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé.' });
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      artist.name = req.body.name.trim();
      artist.slug = slugify(artist.name);
      await Promise.all([
        Music.updateMany({ artistId: artist._id }, { $set: { artist: artist.name } }),
        Album.updateMany({ artistId: artist._id }, { $set: { artist: artist.name } }),
      ]);
    }
    if (req.body.genre !== undefined || req.body.categoryId) {
      const category = await resolveCategory(req.body.categoryId, req.body.genre, 'genre');
      if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie de genre introuvable.' });
      artist.genre = req.body.genre || category?.name || '';
      artist.categoryId = category?._id || null;
    }
    for (const field of ['bio', 'country', 'image']) {
      if (req.body[field] !== undefined) artist[field] = req.body[field];
    }
    if (req.file) artist.image = resolveUploadUrl(req.file, 'images');
    await artist.save();
    return res.json(artist);
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de modifier l’artiste.', error: error.message });
  }
};

export const deleteArtist = async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return res.status(404).json({ message: 'Artiste non trouvé.' });
    const [musicCount, albumCount] = await Promise.all([
      Music.countDocuments({ artistId: artist._id }),
      Album.countDocuments({ artistId: artist._id }),
    ]);
    if (musicCount || albumCount) return res.status(409).json({ message: 'Supprimez d’abord les albums et musiques de cet artiste.' });
    await artist.deleteOne();
    return res.json({ message: 'Artiste supprimé.' });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de supprimer l’artiste.', error: error.message });
  }
};
