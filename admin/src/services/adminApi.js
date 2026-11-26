const RAW_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const API_ORIGIN = RAW_BASE.startsWith('http') ? RAW_BASE.replace(/\/api$/, '') : '';

export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/')) return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  return url;
}

export async function adminRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${RAW_BASE}/${path.replace(/^\//, '')}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `Erreur HTTP ${res.status}`);
  }
  return data;
}

export function uploadWithProgress(path, { method = 'POST', token, formData, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${RAW_BASE}/${path.replace(/^\//, '')}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      let data = null;
      try {
        data = JSON.parse(xhr.responseText || '{}');
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
      } else {
        reject(new Error(data?.message || `Erreur d'envoi HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Erreur réseau pendant l’envoi du fichier.'));
    xhr.send(formData);
  });
}

export const adminApi = {
  login: (payload) => adminRequest('/auth/login', { method: 'POST', body: payload }),
  me: (token) => adminRequest('/auth/me', { token }),
  logout: (token) => adminRequest('/auth/logout', { method: 'POST', token }),
  dashboard: (token) => adminRequest('/admin/dashboard', { token }),

  listArtists: (token) => adminRequest('/artists?includeAll=true', { token }),
  saveArtist: (id, formData, token) =>
    adminRequest(id ? `/artists/${id}` : '/artists', { method: id ? 'PUT' : 'POST', token, body: formData }),
  deleteArtist: (id, token) => adminRequest(`/artists/${id}`, { method: 'DELETE', token }),

  listSongs: (token) => adminRequest('/songs?includeAll=true', { token }),
  saveSong: (id, formData, token, onProgress) =>
    uploadWithProgress(id ? `/songs/${id}` : '/songs', { method: id ? 'PUT' : 'POST', token, formData, onProgress }),
  deleteSong: (id, token) => adminRequest(`/songs/${id}`, { method: 'DELETE', token }),
  streamToken: (songId, token) => adminRequest(`/songs/${songId}/stream-token`, { method: 'POST', token }),

  listAlbums: (token) => adminRequest('/albums?includeAll=true', { token }),
  saveAlbum: (id, formData, token) =>
    adminRequest(id ? `/albums/${id}` : '/albums', { method: id ? 'PUT' : 'POST', token, body: formData }),
  deleteAlbum: (id, token) => adminRequest(`/albums/${id}`, { method: 'DELETE', token }),

  listPlaylists: (token) => adminRequest('/playlists/admin', { token }),
  savePlaylist: (id, formData, token) =>
    adminRequest(id ? `/playlists/admin/${id}` : '/playlists/admin', { method: id ? 'PUT' : 'POST', token, body: formData }),
  deletePlaylist: (id, token) => adminRequest(`/playlists/admin/${id}`, { method: 'DELETE', token }),

  listVideos: (token) => adminRequest('/videos?includeAll=true', { token }),
  saveVideo: (id, formData, token, onProgress) =>
    uploadWithProgress(id ? `/videos/${id}` : '/videos', { method: id ? 'PUT' : 'POST', token, formData, onProgress }),
  deleteVideo: (id, token) => adminRequest(`/videos/${id}`, { method: 'DELETE', token }),

  listNews: (token) => adminRequest('/news?includeAll=true', { token }),
  saveNews: (id, formData, token) =>
    adminRequest(id ? `/news/${id}` : '/news', { method: id ? 'PUT' : 'POST', token, body: formData }),
  deleteNews: (id, token) => adminRequest(`/news/${id}`, { method: 'DELETE', token }),

  listUsers: (q, token) => adminRequest(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`, { token }),
  updateUser: (id, body, token) => adminRequest(`/users/${id}`, { method: 'PUT', token, body }),
  setUserActive: (id, is_active, token) => adminRequest(`/users/admin/${id}/active`, { method: 'PATCH', token, body: { is_active } }),

  listCategories: () => adminRequest('/categories'),
  createCategory: (body, token) => adminRequest('/categories', { method: 'POST', token, body }),
  deleteCategory: (id, token) => adminRequest(`/categories/${id}`, { method: 'DELETE', token }),

  listLanguages: () => adminRequest('/languages'),
  createLanguage: (body, token) => adminRequest('/languages', { method: 'POST', token, body }),
  deleteLanguage: (id, token) => adminRequest(`/languages/${id}`, { method: 'DELETE', token }),

  listMedia: (token) => adminRequest('/admin/media', { token }),
  deleteMedia: (id, token) => adminRequest(`/admin/media/${id}`, { method: 'DELETE', token }),

  getSettings: (token) => adminRequest('/admin/settings', { token }),
  updateSettings: (body, token) => adminRequest('/admin/settings', { method: 'PUT', token, body }),

  listAuditLogs: (token) => adminRequest('/admin/audit-logs?limit=100', { token }),
};
