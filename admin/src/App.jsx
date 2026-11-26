import { useEffect, useState } from 'react';
import logoImg from './assets/mali-audio-logo.png';
import AdminLogin from './components/AdminLogin';
import { AlbumsAdminPage, ArtistsAdminPage, PlaylistsAdminPage, SongsAdminPage } from './pages/CatalogAdminPages';
import { NewsAdminPage, TaxonomyAdminPage, UsersAdminPage, VideosAdminPage } from './pages/EditorialAdminPages';
import { AuditLogsPage, DashboardPage, MediaAssetsPage, SettingsPage } from './pages/OverviewAndAuditPages';
import { adminApi } from './services/adminApi';

const TOKEN_KEY = 'maliaudio.admin.jwt';

const SECTIONS = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'songs', label: 'Chansons' },
  { key: 'artists', label: 'Artistes' },
  { key: 'albums', label: 'Albums & Singles' },
  { key: 'playlists', label: 'Playlists éditoriales' },
  { key: 'videos', label: 'Vidéos' },
  { key: 'news', label: 'Actualités' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'taxonomy', label: 'Genres & Langues' },
  { key: 'media', label: 'Médias privés' },
  { key: 'settings', label: 'Paramètres' },
  { key: 'audit', label: 'Journal d’activité' },
];

export default function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem(TOKEN_KEY) || '');
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(token));
  const [active, setActive] = useState('dashboard');

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let mounted = true;
    adminApi.me(token)
      .then((profile) => {
        if (!mounted) return;
        if (profile.role !== 'admin') {
          window.localStorage.removeItem(TOKEN_KEY);
          setToken('');
          setUser(null);
        } else {
          setUser(profile);
        }
      })
      .catch(() => {
        if (!mounted) return;
        window.localStorage.removeItem(TOKEN_KEY);
        setToken('');
        setUser(null);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => { mounted = false; };
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    window.localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = async () => {
    try {
      if (token) await adminApi.logout(token);
    } catch {
      // ignore network error
    } finally {
      window.localStorage.removeItem(TOKEN_KEY);
      setToken('');
      setUser(null);
    }
  };

  if (checking) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Vérification de la session…</div>;
  }

  if (!token || !user) {
    return <AdminLogin onSuccess={handleLogin} />;
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <img src={logoImg} alt="Mali Audio" />
          <div>
            <strong style={{ color: 'var(--gold-bright)', letterSpacing: '0.08em' }}>MALI AUDIO</strong>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Administration</div>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Menu d’administration">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={active === s.key ? 'active' : ''}
              onClick={() => setActive(s.key)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>{user.email}</div>
          <button type="button" className="btn btn-sec btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Espace Administrateur
            </div>
            <h1 style={{ margin: '4px 0 0', fontSize: '1.65rem' }}>
              {SECTIONS.find((s) => s.key === active)?.label}
            </h1>
          </div>
        </header>

        {active === 'dashboard' && <DashboardPage token={token} onNavigate={setActive} />}
        {active === 'songs' && <SongsAdminPage token={token} />}
        {active === 'artists' && <ArtistsAdminPage token={token} />}
        {active === 'albums' && <AlbumsAdminPage token={token} />}
        {active === 'playlists' && <PlaylistsAdminPage token={token} />}
        {active === 'videos' && <VideosAdminPage token={token} />}
        {active === 'news' && <NewsAdminPage token={token} />}
        {active === 'users' && <UsersAdminPage token={token} currentUserId={user.id} />}
        {active === 'taxonomy' && <TaxonomyAdminPage token={token} />}
        {active === 'media' && <MediaAssetsPage token={token} />}
        {active === 'settings' && <SettingsPage token={token} />}
        {active === 'audit' && <AuditLogsPage token={token} />}
      </main>
    </div>
  );
}
