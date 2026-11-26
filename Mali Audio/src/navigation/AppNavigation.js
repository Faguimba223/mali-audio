import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ArtistsScreen from '../screens/ArtistsScreen';
import HomeScreen from '../screens/HomeScreen';
import MusicScreen from '../screens/MusicScreen';
import NewsScreen from '../screens/NewsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AdminScreen from '../screens/AdminScreen';
import AddMusicScreen from '../screens/AddMusicScreen';
import EditMusicScreen from '../screens/EditMusicScreen';
import AddArtistScreen from '../screens/AddArtistScreen';
import EditArtistScreen from '../screens/EditArtistScreen';
import AddNewsScreen from '../screens/AddNewsScreen';
import EditNewsScreen from '../screens/EditNewsScreen';
import AudioPlayer, { AudioPlayerProvider, useAudioPlayback } from '../components/AudioPlayer';
import MiniPlayer from '../components/MiniPlayer';
import TabBar from '../components/TabBar';
import { CatalogProvider, useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen, RegisterScreen } from '../screens/AuthScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import AdminNavigation from '../admin/AdminNavigation';

const screens = {
  Accueil: HomeScreen,
  Musiques: MusicScreen,
  Artistes: ArtistsScreen,
  Actualités: NewsScreen,
  Profil: ProfileScreen,
  Admin: AdminScreen,
  AddMusic: AddMusicScreen,
  EditMusic: EditMusicScreen,
  AddArtist: AddArtistScreen,
  EditArtist: EditArtistScreen,
  AddNews: AddNewsScreen,
  EditNews: EditNewsScreen,
  Connexion: LoginScreen,
  Inscription: RegisterScreen,
  ModifierProfil: EditProfileScreen,
  MotDePasse: ChangePasswordScreen,
  AdminSpace: AdminNavigation,
};
const adminScreens = new Set(['Admin', 'AddMusic', 'EditMusic', 'AddArtist', 'EditArtist', 'AddNews', 'EditNews']);

export default function AppNavigation() {
  return (
    <CatalogProvider>
      <AppNavigationContent />
    </CatalogProvider>
  );
}

function AppNavigationContent() {
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = createStyles(colors);
  const audio = useAudioPlayback();
  const auth = useAuth();
  const { tracks } = useCatalog();
  const [active, setActive] = useState('Accueil');
  const [routeParams, setRouteParams] = useState({});
  const [favorites, setFavorites] = useState([]);
  const [followingArtists, setFollowingArtists] = useState([]);
  const goTo = (screen, params = {}) => {
    if (adminScreens.has(screen) && auth.user?.role !== 'admin') {
      setActive(auth.user ? 'Profil' : 'Connexion');
      setRouteParams({});
      return;
    }
    setActive(screen);
    setRouteParams(params);
  };
  const Screen = screens[active] || HomeScreen;
  const toggleFavorite = (trackId) => setFavorites((current) => current.includes(trackId) ? current.filter((id) => id !== trackId) : [...current, trackId]);
  const toggleFollow = (artistId) => setFollowingArtists((current) => current.includes(artistId) ? current.filter((id) => id !== artistId) : [...current, artistId]);
  const tabActive = ['Accueil', 'Musiques', 'Artistes', 'Actualités', 'Profil'].includes(active) ? active : 'Accueil';

  return (
    <AudioPlayerProvider tracks={tracks}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        {active === 'AdminSpace' ? (
          <View style={styles.screen}><AdminNavigation onExit={() => goTo('Profil')} /></View>
        ) : (
          <>
            <View style={styles.screen}><Screen onNavigate={goTo} favorites={favorites} onToggleFavorite={toggleFavorite} playingTrackId={audio.status.playing ? audio.currentTrackId : null} onTogglePlay={audio.toggleTrack} isDark={isDark} onToggleTheme={toggleTheme} following={followingArtists} onToggleFollow={toggleFollow} followingCount={followingArtists.length} routeParams={routeParams} user={auth.user} authLoading={auth.isLoading} onLogout={auth.logout} /></View>
            <MiniPlayer />
            <TabBar active={tabActive} onChange={goTo} />
            <AudioPlayer visible={audio.isExpanded} onClose={audio.closePlayer} />
          </>
        )}
      </SafeAreaView>
    </AudioPlayerProvider>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safe: { backgroundColor: colors.paper, flex: 1 },
  screen: { flex: 1 },
});