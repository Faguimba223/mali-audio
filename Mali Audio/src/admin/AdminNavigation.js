import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useAppTheme } from '../styles/ThemeContext';
import AdminAlbumScreen from './screens/AdminAlbumScreen';
import AdminArtistScreen from './screens/AdminArtistScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminMusicScreen from './screens/AdminMusicScreen';
import AdminPlaylistScreen from './screens/AdminPlaylistScreen';
import AdminSettingsScreen from './screens/AdminSettingsScreen';
import AdminUserScreen from './screens/AdminUserScreen';

const protectedScreens = {
  dashboard: AdminDashboardScreen,
  music: AdminMusicScreen,
  artists: AdminArtistScreen,
  albums: AdminAlbumScreen,
  users: AdminUserScreen,
  playlists: AdminPlaylistScreen,
  settings: AdminSettingsScreen,
};

export default function AdminNavigation({ onExit }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { user, isLoading, logout } = useAuth();
  const [route, setRoute] = useState('login');
  const [logoutError, setLogoutError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin' && route === 'login') setRoute('dashboard');
    if (user && user.role !== 'admin') setRoute('login');
  }, [user, route]);

  const signOut = async () => {
    try {
      await logout();
      setRoute('login');
      setLogoutError('');
    } catch (error) {
      setLogoutError(error.message || 'Déconnexion impossible.');
    }
  };

  if (isLoading) return <View style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Vérification de la session…</Text></View>;
  if (user?.role !== 'admin') return <View style={styles.container}><AdminLoginScreen onBack={onExit} />{!!logoutError && <Text style={styles.error}>{logoutError}</Text>}</View>;

  const Screen = protectedScreens[route] || AdminDashboardScreen;
  return (
    <View style={styles.container}>
      <Screen onNavigate={setRoute} onBack={() => setRoute('dashboard')} onLogout={signOut} />
      {!!logoutError && <Text style={styles.error}>{logoutError}</Text>}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { backgroundColor: colors.paper, flex: 1 },
  loading: { alignItems: 'center', backgroundColor: colors.paper, flex: 1, gap: 10, justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: 12 },
  error: { backgroundColor: colors.paper, color: colors.terracotta, padding: 10, textAlign: 'center' },
});