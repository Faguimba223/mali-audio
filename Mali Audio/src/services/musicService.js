import { catalogRepository } from '../data/catalogRepository';
import { apiRequest } from './api';

const toClientTrack = (track) => ({
  ...track,
  id: track.id || track._id,
  artist: typeof track.artist === 'string' ? track.artist : track.artistId?.name || '',
  album: typeof track.album === 'string' ? track.album : track.albumId?.title || '',
  image: track.image || track.coverArt || '',
  audioSource: '',
  audioFileName: track.audioFileName || track.audioFile?.split('/').pop() || '',
});

const appendValue = (formData, key, value) => {
  if (value !== undefined && value !== null && typeof value !== 'object') formData.append(key, String(value));
};

const asUpload = (uri, fallbackName, fallbackType) => ({
  uri,
  name: uri.split('/').pop() || fallbackName,
  type: fallbackType,
});

const toMusicFormData = (record) => {
  const formData = new FormData();
  appendValue(formData, 'title', record.title);
  appendValue(formData, 'artist', record.artist);
  appendValue(formData, 'album', record.album);
  appendValue(formData, 'genre', record.category || record.genre);
  appendValue(formData, 'duration', record.duration);
  appendValue(formData, 'description', record.description);
  appendValue(formData, 'featured', record.isPopular || record.featured);
  appendValue(formData, 'audioUrl', record.audioUrl);

  if (record.image?.match(/^(file|content):/)) {
    formData.append('image', asUpload(record.image, 'cover.jpg', 'image/jpeg'));
  } else {
    appendValue(formData, 'image', record.image);
  }
  if (record.audioSource?.match(/^(file|content):/)) {
    formData.append('audio', asUpload(record.audioSource, record.audioFileName || 'audio', 'audio/mpeg'));
  }
  return formData;
};

export const musicService = {
  async list() {
    try {
      const tracks = await apiRequest('/musics');
      return tracks.map(toClientTrack);
    } catch (error) {
      return catalogRepository.list('tracks');
    }
  },
  async create(record, token) {
    return toClientTrack(await apiRequest('/musics', { method: 'POST', token, body: toMusicFormData(record) }));
  },
  async update(id, changes, token) {
    return toClientTrack(await apiRequest(`/musics/${id}`, { method: 'PUT', token, body: toMusicFormData(changes) }));
  },
  async remove(id, token) {
    await apiRequest(`/musics/${id}`, { method: 'DELETE', token });
  },
};