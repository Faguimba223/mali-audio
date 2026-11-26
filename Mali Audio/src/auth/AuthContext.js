import { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);
const tokenKey = 'mali-audio.auth-token';
let webToken = null;

const readToken = () => Platform.OS === 'web' ? Promise.resolve(webToken) : SecureStore.getItemAsync(tokenKey);
const writeToken = (token) => {
  if (Platform.OS === 'web') {
    webToken = token;
    return Promise.resolve();
  }
  return SecureStore.setItemAsync(tokenKey, token);
};
const clearToken = () => {
  if (Platform.OS === 'web') {
    webToken = null;
    return Promise.resolve();
  }
  return SecureStore.deleteItemAsync(tokenKey);
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      try {
        const savedToken = await readToken();
        if (!savedToken) return;
        const profile = await apiRequest('/auth/me', { token: savedToken });
        if (active) {
          setToken(savedToken);
          setUser(profile);
          setSessionError('');
        }
      } catch (error) {
        if (error.status === 401) await clearToken();
        else if (active) setSessionError(error.message);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    restoreSession();
    return () => { active = false; };
  }, []);

  const saveSession = async (result) => {
    await writeToken(result.token);
    setToken(result.token);
    setUser(result.user);
    setSessionError('');
    return result.user;
  };

  const login = async (credentials) => saveSession(await apiRequest('/auth/login', { method: 'POST', body: credentials }));
  const register = async (details) => saveSession(await apiRequest('/auth/register', { method: 'POST', body: details }));

  const logout = async () => {
    const activeToken = token;
    try {
      if (activeToken) await apiRequest('/auth/logout', { method: 'POST', token: activeToken });
    } finally {
      await clearToken();
      setToken(null);
      setUser(null);
      setSessionError('');
    }
  };

  const updateProfile = async (changes) => {
    const updated = await apiRequest('/users/profile', { method: 'PATCH', token, body: changes });
    setUser(updated);
    return updated;
  };

  const changePassword = async (passwords) => {
    const result = await apiRequest('/users/password', { method: 'PATCH', token, body: passwords });
    return saveSession(result);
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isLoading,
      sessionError,
      isAuthenticated: Boolean(user && token),
      login,
      register,
      logout,
      updateProfile,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}