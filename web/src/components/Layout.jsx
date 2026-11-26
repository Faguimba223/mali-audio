import { useState } from 'react';
import logoImg from '../assets/mali-audio-logo.png';
import { useAuth } from '../context/AuthContext';
import { usePwa } from '../context/PwaContext';
import { Link, useRouter } from '../context/RouterContext';
import { DownloadInstallIcon, MenuIcon, SearchIcon } from './Icons';

const NAV_ITEMS = [
  { to: '/', label: 'Accueil' },
  { to: '/musique', label: 'Musique' },
  { to: '/artistes', label: 'Artistes' },
  { to: '/albums', label: 'Albums' },
  { to: '/playlists', label: 'Playlists' },
  { to: '/videos', label: 'Vidéos' },
  { to: '/actualites', label: 'Actualités' },
];

export default function Layout({ children }) {
  const { pathname, navigate } = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { canInstall, isIosInstallable, showIosHelp, setShowIosHelp, showInstallHelp, setShowInstallHelp, hasUpdate, isOnline, promptInstall, applyUpdate } = usePwa();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const onSearchSubmit = (event) => {
    event.preventDefault();
    const clean = searchTerm.trim();
    if (!clean) return;
    navigate(`/recherche?q=${encodeURIComponent(clean)}`);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        {!isOnline && (
          <div className="banner banner-offline" role="status">
            <span>Mode hors connexion : l’interface et les pages publiques en cache restent accessibles. L’écoute des titres protégés nécessite une connexion Internet.</span>
          </div>
        )}
        {hasUpdate && (
          <div className="banner" role="status">
            <span>Une nouvelle version de Mali Audio est prête.</span>
            <button type="button" className="btn btn-primary" onClick={applyUpdate}>
              Mettre à jour
            </button>
          </div>
        )}

        <div className="topbar-inner">
          <Link to="/" className="brand-link" aria-label="Accueil Mali Audio">
            <img src={logoImg} alt="Logo officiel Mali Audio" className="brand-logo" />
            <div className="brand-text">
              <span className="brand-name">MALI AUDIO</span>
              <span className="brand-tagline">Les sons de chez nous</span>
            </div>
          </Link>

          <nav className="nav-links" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) => {
              const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
              return (
                <Link key={item.to} to={item.to} className={`nav-link${active ? ' active' : ''}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form className="search-bar" onSubmit={onSearchSubmit} role="search">
            <SearchIcon />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un titre, artiste..."
              aria-label="Rechercher dans Mali Audio"
            />
          </form>

          <div className="topbar-actions">
            {(canInstall || isIosInstallable) && (
              <button type="button" className="btn btn-secondary" onClick={promptInstall}>
                <DownloadInstallIcon />
                <span>Installer Mali Audio</span>
              </button>
            )}
            {isAuthenticated ? (
              <Link to="/profil" className="btn btn-primary">
                {user?.name?.split(' ')[0] || 'Profil'}
              </Link>
            ) : (
              <Link to="/connexion" className="btn btn-primary">
                Connexion
              </Link>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-icon mobile-menu-btn"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Ouvrir le menu"
              aria-expanded={mobileMenuOpen}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border-subtle)', display: 'grid', gap: 10 }}>
            <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: 8 }}>
              <input
                type="search"
                className="input"
                style={{ flex: 1 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                aria-label="Rechercher"
              />
              <button type="submit" className="btn btn-primary">OK</button>
            </form>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`nav-link${pathname === item.to ? ' active' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/profil" className="nav-link" onClick={() => setMobileMenuOpen(false)}>
                Profil
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="main-content">{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong style={{ color: 'var(--gold-bright)' }}>MALI AUDIO</strong> — Plateforme musicale numérique · Promoteur : Faguimba Traoré
          </div>
          <div className="footer-links">
            <Link to="/a-propos">À propos</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/conditions">Conditions d’utilisation</Link>
            <Link to="/confidentialite">Confidentialité</Link>
            <Link to="/droits">Droits d’auteur</Link>
          </div>
        </div>
      </footer>

      {showIosHelp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="ios-install-title">
          <div className="modal-card">
            <h2 id="ios-install-title" style={{ marginTop: 0 }}>Installer Mali Audio sur iPhone / iPad</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Sur Safari iOS, l’ajout à l’écran d’accueil se fait depuis le menu du navigateur :
            </p>
            <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
              <li>Touchez le bouton <strong>Partager</strong> (carré avec flèche vers le haut) dans la barre Safari.</li>
              <li>Faites défiler et choisissez <strong>Sur l’écran d’accueil</strong>.</li>
              <li>Confirmez en appuyant sur <strong>Ajouter</strong>.</li>
            </ol>
            <button type="button" className="btn btn-primary" onClick={() => setShowIosHelp(false)}>
              Compris
            </button>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
          <div className="modal-card">
            <h2 id="install-help-title" style={{ marginTop: 0 }}>Installer Mali Audio</h2>
            <p style={{ color: 'var(--text-muted)' }}>
              Dans Chrome ou Edge, ouvrez le menu du navigateur et choisissez <strong>Installer Mali Audio</strong> ou <strong>Installer cette application</strong>.
              Sur Android, choisissez <strong>Ajouter à l’écran d’accueil</strong>.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => setShowInstallHelp(false)}>
              Compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
