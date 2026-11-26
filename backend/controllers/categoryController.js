import Album from '../models/Album.js';
import Artist from '../models/Artist.js';
import Category from '../models/Category.js';
import Music from '../models/Music.js';
import News from '../models/News.js';
import { slugify } from './relations.js';

const categoryTypes = ['genre', 'music', 'artist', 'album', 'news', 'general'];

export const getCategories = async (req, res) => {
  const filter = req.query.type ? { type: req.query.type } : {};
  if (filter.type && !categoryTypes.includes(filter.type)) return res.status(400).json({ message: 'Type de catégorie invalide.' });
  const categories = await Category.find(filter).sort({ name: 1 }).lean();
  return res.json(categories);
};

export const createCategory = async (req, res) => {
  if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ message: 'Le nom de la catégorie est obligatoire.' });
  }
  const type = req.body.type || 'general';
  if (!categoryTypes.includes(type)) return res.status(400).json({ message: 'Type de catégorie invalide.' });
  const name = req.body.name.trim();
  try {
    const category = await Category.create({
      name,
      slug: req.body.slug ? slugify(req.body.slug) : `${type}-${slugify(name)}`,
      type,
      description: req.body.description || '',
    });
    return res.status(201).json(category);
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ message: 'Impossible de créer la catégorie.' });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée.' });
    if (typeof req.body.name === 'string' && req.body.name.trim()) {
      category.name = req.body.name.trim();
      category.slug = req.body.slug ? slugify(req.body.slug) : `${category.type}-${slugify(category.name)}`;
    }
    if (req.body.description !== undefined) category.description = req.body.description;
    await category.save();
    return res.json(category);
  } catch (error) {
    return res.status(error.code === 11000 ? 409 : 400).json({ message: 'Impossible de modifier la catégorie.' });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée.' });
    const references = await Promise.all([
      Music.exists({ categoryId: category._id }),
      Artist.exists({ categoryId: category._id }),
      Album.exists({ categoryId: category._id }),
      News.exists({ categoryId: category._id }),
    ]);
    if (references.some(Boolean)) return res.status(409).json({ message: 'Cette catégorie est encore utilisée.' });
    await category.deleteOne();
    return res.json({ message: 'Catégorie supprimée.' });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de supprimer la catégorie.' });
  }
};

export const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ message: 'Catégorie non trouvée.' });
    return res.json(category);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant de catégorie invalide.' });
  }
};