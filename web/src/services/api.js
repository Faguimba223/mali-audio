const RAW_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_ORIGIN = RAW_BASE.startsWith('http') ? RAW_BASE.replace(/\/api$/, '') : '';

export const API_BASE_URL = RAW_BASE;

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/')) {
    return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  }
  return url;
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/${path.replace(/^\//, '')}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('Serveur inaccessible. Vérifiez votre connexion Internet.', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new ApiError(data?.message || 'Une erreur est survenue.', response.status);
  }
  return data;
}

export const api = {
  health: () => apiRequest('/health'),
  publicSettings: () => apiRequest('/settings/public'),

  // Auth & Profil
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: payload }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: payload }),
  me: (token) => apiRequest('/auth/me', { token }),
  logout: (token) => apiRequest('/auth/logout', { method: 'POST', token }),
  updateProfile: (payload, token) => apiRequest('/users/profile', { method: 'PATCH', token, body: payload }),
  changePassword: (payload, token) => apiRequest('/users/password', { method: 'PATCH', token, body: payload }),
  deactivateAccount: (token) => apiRequest('/users/profile', { method: 'DELETE', token }),
  requestPasswordReset: (email) => apiRequest('/auth/password-reset/request', { method: 'POST', body: { email } }),
  confirmPasswordReset: (token, newPassword) => apiRequest('/auth/password-reset/confirm', { method: 'POST', body: { token, newPassword } }),

  // Catalogue public
  getSongs: (params = {}) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    }
    const qs = search.toString();
    return apiRequest(`/songs${qs ? `?${qs}` : ''}`);
  },
  getSong: (id) => apiRequest(`/songs/${id}`),
  getStreamToken: (songId, token) => apiRequest(`/songs/${songId}/stream-token`, { method: 'POST', token }),
  recordPlay: (songId) => apiRequest(`/songs/${songId}/play`, { method: 'POST' }),

  getArtists: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`/artists${qs ? `?${qs}` : ''}`);
  },
  getArtist: (id) => apiRequest(`/artists/${id}`),

  getAlbums: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`/albums${qs ? `?${qs}` : ''}`);
  },
  getAlbum: (id) => apiRequest(`/albums/${id}`),

  getPublicPlaylists: (editorialOnly = false) =>
    apiRequest(`/playlists/public${editorialOnly ? '?editorial=true' : ''}`),
  getPublicPlaylist: (id) => apiRequest(`/playlists/public/${id}`),

  getVideos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return apiRequest(`/videos${qs ? `?${qs}` : ''}`);
  },
  getVideo: (id) => apiRequest(`/videos/${id}`),

  getNews: () => apiRequest('/news'),
  getNewsItem: (id) => apiRequest(`/news/${id}`),

  getCategories: () => apiRequest('/categories'),
  getLanguages: () => apiRequest('/languages'),
  search: (q) => apiRequest(`/search?q=${encodeURIComponent(q || '')}`),

  // Espace utilisateur
  getFavorites: (token) => apiRequest('/favorites', { token }),
  addFavorite: (songId, token) => apiRequest('/favorites', { method: 'POST', token, body: { song_id: songId } }),
  removeFavorite: (songId, token) => apiRequest(`/favorites/${songId}`, { method: 'DELETE', token }),

  getHistory: (token) => apiRequest('/history', { token }),
  recordHistory: (songId, progress, token) => apiRequest('/history', { method: 'POST', token, body: { song_id: songId, progress } }),
  clearHistory: (token) => apiRequest('/history', { method: 'DELETE', token }),

  getMyPlaylists: (token) => apiRequest('/playlists', { token }),
  getPlaylist: (id, token) => apiRequest(`/playlists/${id}`, { token }),
  createPlaylist: (payload, token) => apiRequest('/playlists', { method: 'POST', token, body: payload }),
  updatePlaylist: (id, payload, token) => apiRequest(`/playlists/${id}`, { method: 'PUT', token, body: payload }),
  deletePlaylist: (id, token) => apiRequest(`/playlists/${id}`, { method: 'DELETE', token }),
  addPlaylistTrack: (playlistId, songId, token) =>
    apiRequest(`/playlists/${playlistId}/tracks`, { method: 'POST', token, body: { song_id: songId } }),
  removePlaylistTrack: (playlistId, songId, token) =>
    apiRequest(`/playlists/${playlistId}/tracks/${songId}`, { method: 'DELETE', token }),
};
