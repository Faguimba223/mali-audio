import mongoose from 'mongoose';
import Album from '../models/Album.js';
import Artist from '../models/Artist.js';
import Category from '../models/Category.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const slugify = (value) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

export const resolveArtist = async (artistId, artistName) => {
  if (artistId && mongoose.isValidObjectId(artistId)) {
    return Artist.findById(artistId);
  }

  if (typeof artistName !== 'string' || !artistName.trim()) return null;
  return Artist.findOne({ name: { $regex: `^${escapeRegex(artistName.trim())}$`, $options: 'i' } });
};

export const resolveCategory = async (categoryId, name, type) => {
  if (categoryId) {
    if (!mongoose.isValidObjectId(categoryId)) return null;
    const category = await Category.findById(categoryId);
    return category && (category.type === type || category.type === 'general') ? category : null;
  }

  if (typeof name !== 'string' || !name.trim()) return null;
  const cleanName = name.trim();
  const slug = `${type}-${slugify(cleanName)}`;
  return Category.findOneAndUpdate(
    { slug },
    { $setOnInsert: { name: cleanName, slug, type } },
    { new: true, upsert: true, runValidators: true }
  );
};

export const resolveAlbum = async ({ albumId, title, artist, coverArt }) => {
  if (albumId) {
    if (!mongoose.isValidObjectId(albumId)) return null;
    const album = await Album.findById(albumId);
    return album && album.artistId.equals(artist._id) ? album : null;
  }

  if (typeof title !== 'string' || !title.trim()) return null;
  const cleanTitle = title.trim();
  let album = await Album.findOne({ artistId: artist._id, title: cleanTitle });
  if (!album) {
    album = await Album.create({
      title: cleanTitle,
      artistId: artist._id,
      artist: artist.name,
      coverArt: coverArt || '',
    });
  }
  return album;
};