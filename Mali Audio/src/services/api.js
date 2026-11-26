import { Platform } from 'react-native';

const defaultHost = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || `${defaultHost}/api`).replace(/\/$/, '');

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
  } catch (error) {
    throw new ApiError(`Impossible de joindre l’API (${API_BASE_URL}). Vérifiez l’adresse et le réseau.`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(payload?.message || 'Une erreur est survenue.', response.status);
  }
  return payload;
}

export const login = (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials });
export const register = (details) => apiRequest('/auth/register', { method: 'POST', body: details });
export const getCurrentUser = (token) => apiRequest('/auth/me', { token });
export const getSongs = (query) => apiRequest(`/songs${query ? `?q=${encodeURIComponent(query)}` : ''}`);
export const getSong = (id) => apiRequest(`/songs/${id}`);
export const getArtists = (query) => apiRequest(`/artists${query ? `?q=${encodeURIComponent(query)}` : ''}`);
export const getArtist = (id) => apiRequest(`/artists/${id}`);
export const getNews = () => apiRequest('/news');
export const getNewReleases = () => apiRequest('/new-releases');
export const getLanguages = () => apiRequest('/languages');
export const getCategories = () => apiRequest('/categories');
export const addFavorite = (songId, token) => apiRequest('/favorites', { method: 'POST', token, body: { song_id: songId } });
export const removeFavorite = (songId, token) => apiRequest(`/favorites/${songId}`, { method: 'DELETE', token });
export const getFavorites = (token) => apiRequest('/favorites', { token });
export const getHistory = (token) => apiRequest('/history', { token });
export const search = (term) => apiRequest(`/search?q=${encodeURIComponent(term || '')}`);