import { artists as initialArtists, stories as initialStories, tracks as initialTracks } from './catalog';

const collections = {
  tracks: [...initialTracks],
  artists: [...initialArtists],
  stories: [...initialStories],
};

const makeId = (collection) => `${collection.slice(0, 1)}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const catalogRepository = {
  async list(collection) {
    return [...collections[collection]];
  },
  async create(collection, payload) {
    const record = { ...payload, id: makeId(collection) };
    collections[collection] = [record, ...collections[collection]];
    return record;
  },
  async update(collection, id, payload) {
    const record = { ...payload, id };
    collections[collection] = collections[collection].map((item) => item.id === id ? record : item);
    return record;
  },
  async remove(collection, id) {
    collections[collection] = collections[collection].filter((item) => item.id !== id);
  },
};