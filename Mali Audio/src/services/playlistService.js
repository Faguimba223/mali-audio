import { apiRequest } from './api';

const toClientPlaylist = (playlist) => ({
  ...playlist,
  id: playlist.id || playlist._id,
  trackIds: Array.isArray(playlist.trackIds)
    ? playlist.trackIds.map(String)
    : (playlist.tracks || []).map((track) => String(track.musicId?._id || track.musicId)).filter(Boolean),
});

const toPlaylistFormData = (playlist) => {
  const formData = new FormData();
  for (const [key, value] of Object.entries({
    name: playlist.name,
    description: playlist.description,
    isPublic: playlist.isPublic,
    trackIds: JSON.stringify(playlist.trackIds || []),
  })) {
    if (value !== undefined && value !== null) formData.append(key, String(value));
  }
  if (playlist.image?.match(/^(file|content):/)) {
    const name = playlist.image.split('/').pop() || 'playlist-cover.jpg';
    formData.append('image', { uri: playlist.image, name, type: 'image/jpeg' });
  } else if (playlist.image) {
    formData.append('image', playlist.image);
  }
  return formData;
};

export const playlistService = {
  async list(token) {
    const playlists = await apiRequest('/playlists/admin', { token });
    return playlists.map(toClientPlaylist);
  },
  async create(payload, token) {
    return toClientPlaylist(await apiRequest('/playlists/admin', { method: 'POST', token, body: toPlaylistFormData(payload) }));
  },
  async update(id, payload, token) {
    return toClientPlaylist(await apiRequest(`/playlists/admin/${id}`, { method: 'PUT', token, body: toPlaylistFormData(payload) }));
  },
  async remove(id, token) {
    await apiRequest(`/playlists/admin/${id}`, { method: 'DELETE', token });
  },
};