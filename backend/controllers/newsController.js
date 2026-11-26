import News from '../models/News.js';
import { resolveCategory } from './relations.js';

export const getNews = async (req, res) => {
  try {
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const [items, total] = await Promise.all([
      News.find({}).sort({ publishedAt: -1 }).skip((page - 1) * limit).limit(limit).populate('categoryId', 'name slug').lean(),
      News.countDocuments(),
    ]);
    return res.json(req.query.page || req.query.limit ? { items, page, limit, total } : items);
  } catch (error) {
    return res.status(500).json({ message: 'Impossible de récupérer les actualités.', error: error.message });
  }
};

export const getNewsItem = async (req, res) => {
  try {
    const item = await News.findById(req.params.id).populate('categoryId', 'name slug').lean();
    if (!item) return res.status(404).json({ message: 'Actualité non trouvée.' });
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Identifiant d’actualité invalide.' });
  }
};

export const createNews = async (req, res) => {
  if (typeof req.body.title !== 'string' || !req.body.title.trim()) {
    return res.status(400).json({ message: 'Le titre de l’actualité est obligatoire.' });
  }

  try {
    const categoryName = req.body.category || 'Actualité';
    const category = await resolveCategory(req.body.categoryId, categoryName, 'news');
    if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie d’actualité introuvable.' });
    const item = await News.create({
      title: req.body.title.trim(),
      category: categoryName,
      categoryId: category?._id || null,
      date: req.body.date || '',
      publishedAt: req.body.publishedAt || new Date(),
      excerpt: req.body.excerpt || '',
      image: req.body.image || '',
      content: req.body.content || '',
      author: req.body.author || 'Mali Audio',
    });
    return res.status(201).json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de créer l’actualité.', error: error.message });
  }
};

export const updateNews = async (req, res) => {
  try {
    const item = await News.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Actualité non trouvée.' });
    for (const field of ['title', 'category', 'date', 'publishedAt', 'excerpt', 'image', 'content', 'author']) {
      if (req.body[field] !== undefined) item[field] = req.body[field];
    }
    if (req.body.category !== undefined || req.body.categoryId) {
      const category = await resolveCategory(req.body.categoryId, req.body.category, 'news');
      if (req.body.categoryId && !category) return res.status(400).json({ message: 'Catégorie d’actualité introuvable.' });
      item.categoryId = category?._id || null;
    }
    await item.save();
    return res.json(item);
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de modifier l’actualité.', error: error.message });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const item = await News.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Actualité non trouvée.' });
    return res.json({ message: 'Actualité supprimée.' });
  } catch (error) {
    return res.status(400).json({ message: 'Impossible de supprimer l’actualité.', error: error.message });
  }
};
