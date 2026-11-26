import Layout from './components/Layout';
import PlayerBar from './components/PlayerBar';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { PwaProvider } from './context/PwaContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import { AlbumDetailPage, AlbumsPage } from './pages/AlbumsPage';
import { ArtistDetailPage, ArtistsPage } from './pages/ArtistsPage';
import HomePage from './pages/HomePage';
import { AboutPage, ContactPage, CopyrightPage, NotFoundPage, PrivacyPage, TermsPage } from './pages/InfoPages';
import { MusicPage, SongDetailPage } from './pages/MusicPage';
import { PlaylistDetailPage, PlaylistsPage } from './pages/PlaylistsPage';
import { AuthPage, PasswordResetPage, ProfilePage, SearchPage } from './pages/SearchAndAccountPages';
import { NewsDetailPage, NewsPage, VideoDetailPage, VideosPage } from './pages/VideosAndNewsPages';

function RouteView() {
  const { pathname } = useRouter();
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const segments = cleanPath.split('/').filter(Boolean);

  if (cleanPath === '/') return <HomePage />;
  if (cleanPath === '/musique') return <MusicPage />;
  if (segments[0] === 'chansons' && segments[1]) return <SongDetailPage id={segments[1]} />;
  if (cleanPath === '/artistes') return <ArtistsPage />;
  if (segments[0] === 'artistes' && segments[1]) return <ArtistDetailPage id={segments[1]} />;
  if (cleanPath === '/albums') return <AlbumsPage />;
  if (segments[0] === 'albums' && segments[1]) return <AlbumDetailPage id={segments[1]} />;
  if (cleanPath === '/playlists') return <PlaylistsPage />;
  if (segments[0] === 'playlists' && segments[1]) return <PlaylistDetailPage id={segments[1]} />;
  if (cleanPath === '/videos') return <VideosPage />;
  if (segments[0] === 'videos' && segments[1]) return <VideoDetailPage id={segments[1]} />;
  if (cleanPath === '/actualites') return <NewsPage />;
  if (segments[0] === 'actualites' && segments[1]) return <NewsDetailPage id={segments[1]} />;
  if (cleanPath === '/recherche') return <SearchPage />;
  if (cleanPath === '/profil') return <ProfilePage />;
  if (cleanPath === '/connexion') return <AuthPage mode="login" />;
  if (cleanPath === '/inscription') return <AuthPage mode="register" />;
  if (cleanPath === '/mot-de-passe-oublie') return <PasswordResetPage />;
  if (cleanPath === '/a-propos') return <AboutPage />;
  if (cleanPath === '/contact') return <ContactPage />;
  if (cleanPath === '/conditions') return <TermsPage />;
  if (cleanPath === '/confidentialite') return <PrivacyPage />;
  if (cleanPath === '/droits') return <CopyrightPage />;

  return <NotFoundPage />;
}

export default function App() {
  return (
    <RouterProvider>
      <PwaProvider>
        <AuthProvider>
          <PlayerProvider>
            <Layout>
              <RouteView />
            </Layout>
            <PlayerBar />
          </PlayerProvider>
        </AuthProvider>
      </PwaProvider>
    </RouterProvider>
  );
}
