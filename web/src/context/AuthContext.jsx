import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = 'maliaudio.web.jwt';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_STORAGE_KEY) || '');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [favoriteIds, setFavoriteIds] = useState([]);

  const refreshFavorites = useCallback(async (activeToken) => {
    if (!activeToken) {
      setFavoriteIds([]);
      return;
    }
    try {
      const list = await api.getFavorites(activeToken);
      setFavoriteIds(Array.isArray(list) ? list.map((f) => Number(f.song_id)) : []);
    } catch {
      setFavoriteIds([]);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    api.me(token)
      .then((profile) => {
        if (!active) return;
        setUser(profile);
        refreshFavorites(token);
      })
      .catch((error) => {
        if (!active) return;
        if (error.status === 401 || error.status === 403) {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
          setToken('');
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token, refreshFavorites]);

  const applySession = async (result) => {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, result.token);
    setToken(result.token);
    setUser(result.user);
    await refreshFavorites(result.token);
    return result.user;
  };

  const login = async (credentials) => applySession(await api.login(credentials));
  const register = async (details) => applySession(await api.register(details));

  const logout = async () => {
    try {
      if (token) await api.logout(token);
    } catch {
      // ignore network error on logout
    } finally {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken('');
      setUser(null);
      setFavoriteIds([]);
    }
  };

  const updateProfile = async (payload) => {
    const updated = await api.updateProfile(payload, token);
    setUser(updated);
    return updated;
  };

  const changePassword = async (payload) => {
    const res = await api.changePassword(payload, token);
    return applySession(res);
  };

  const toggleFavorite = async (songId) => {
    if (!token) return { requiresAuth: true };
    const id = Number(songId);
    const isFav = favoriteIds.includes(id);
    if (isFav) {
      await api.removeFavorite(id, token);
      setFavoriteIds((curr) => curr.filter((x) => x !== id));
      return { isFavorite: false };
    }
    await api.addFavorite(id, token);
    setFavoriteIds((curr) => [id, ...curr]);
    return { isFavorite: true };
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      favoriteIds,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      toggleFavorite,
      refreshFavorites: () => refreshFavorites(token),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
