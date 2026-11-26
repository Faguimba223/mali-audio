import { catalogRepository } from '../data/catalogRepository';
import { apiRequest } from './api';

const toClientArtist = (artist) => ({
  ...artist,
  id: artist.id || artist._id,
  biography: artist.biography || artist.bio || '',
});

const toArtistFormData = (record) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries({ name: record.name, genre: record.genre, bio: record.biography || record.bio })) {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  }
  if (record.image?.match(/^(file|content):/)) {
    const name = record.image.split('/').pop() || 'artist.jpg';
    formData.append('image', { uri: record.image, name, type: 'image/jpeg' });
  } else if (record.image) {
    formData.append('image', record.image);
  }
  return formData;
};

export const artistService = {
  async list() {
    try {
      const artists = await apiRequest('/artists');
      return artists.map(toClientArtist);
    } catch (error) {
      return catalogRepository.list('artists');
    }
  },
  async create(record, token) {
    return toClientArtist(await apiRequest('/artists', { method: 'POST', token, body: toArtistFormData(record) }));
  },
  async update(id, changes, token) {
    return toClientArtist(await apiRequest(`/artists/${id}`, { method: 'PUT', token, body: toArtistFormData(changes) }));
  },
  async remove(id, token) {
    await apiRequest(`/artists/${id}`, { method: 'DELETE', token });
  },
};