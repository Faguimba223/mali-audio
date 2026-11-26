import { apiRequest } from './api';

export const userService = {
  list: (query, token) => apiRequest(`/users/admin${query ? `?q=${encodeURIComponent(query)}` : ''}`, { token }),
  setActive: (id, active, token) => apiRequest(`/users/admin/${id}/active`, { method: 'PATCH', token, body: { active } }),
};