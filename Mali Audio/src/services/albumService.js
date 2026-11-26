import { apiRequest } from './api';

const toClientAlbum = (album) => ({
  ...album,
  id: album.id || album._id,
  artistId: typeof album.artistId === 'object' ? album.artistId?._id : album.artistId,
  artist: typeof album.artist === 'string' ? album.artist : album.artistId?.name || '',
  image: album.image || album.coverArt || '',
  trackIds: Array.isArray(album.trackIds) ? album.trackIds.map(String) : [],
});

const toAlbumFormData = (album) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries({
    title: album.title,
    artistId: album.artistId,
    artist: album.artist,
    description: album.description,
    trackIds: JSON.stringify(album.trackIds || []),
  })) {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  }
  if (album.image?.match(/^(file|content):/)) {
    const name = album.image.split('/').pop() || 'album-cover.jpg';
    formData.append('image', { uri: album.image, name, type: 'image/jpeg' });
  } else if (album.image) {
    formData.append('image', album.image);
  }
  return formData;
};

export const albumService = {
  async list(token) {
    const albums = await apiRequest('/albums', { token });
    return albums.map(toClientAlbum);
  },
  async create(payload, token) {
    return toClientAlbum(await apiRequest('/albums', { method: 'POST', token, body: toAlbumFormData(payload) }));
  },
  async update(id, payload, token) {
    return toClientAlbum(await apiRequest(`/albums/${id}`, { method: 'PUT', token, body: toAlbumFormData(payload) }));
  },
  async remove(id, token) {
    await apiRequest(`/albums/${id}`, { method: 'DELETE', token });
  },
};