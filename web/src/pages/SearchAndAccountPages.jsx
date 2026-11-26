import { useEffect, useState } from 'react';
import logoImg from '../assets/mali-audio-logo.png';
import SongRow from '../components/SongRow';
import { useAuth } from '../context/AuthContext';
import { Link, useRouter } from '../context/RouterContext';
import { api, resolveMediaUrl } from '../services/api';

export function SearchPage() {
  const { query, navigate } = useRouter();
  const initialQ = query.get('q') || '';
  const [term, setTerm] = useState(initialQ);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTerm(initialQ);
    if (!initialQ.trim()) {
      setResults(null);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.search(initialQ)
      .then((res) => { if (active) setResults(res); })
      .catch((err) => { if (active) setError(err.message || 'Erreur lors de la recherche.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialQ]);

  const onSubmit = (e) => {
    e.preventDefault();
    navigate(`/recherche?q=${encodeURIComponent(term.trim())}`);
  };

  const totalCount = results
    ? (results.songs?.length || 0) + (results.artists?.length || 0) + (results.albums?.length || 0) +
      (results.playlists?.length || 0) + (results.videos?.length || 0) + (results.news?.length || 0)
    : 0;

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Recherche globale</h1>
      <form onSubmit={onSubmit} style={{ display: 'flex', gap: 10, maxWidth: 560, marginBottom: 24 }}>
        <input
          type="search"
          className="input"
          style={{ flex: 1 }}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Chansons, artistes, albums, playlists, vidéos, actualités..."
          aria-label="Terme de recherche"
        />
        <button type="submit" className="btn btn-primary">Rechercher</button>
      </form>

      {error && <div className="error-box">{error}</div>}
      {loading && <div className="state-box">Recherche en cours…</div>}

      {!loading && results && totalCount === 0 && (
        <div className="state-box">Aucun résultat trouvé pour « {initialQ} ».</div>
      )}

      {!loading && results && totalCount > 0 && (
        <div style={{ display: 'grid', gap: 28 }}>
          {results.songs?.length > 0 && (
            <section>
              <h2>Chansons ({results.songs.length})</h2>
              <div className="track-table">
                {results.songs.map((s, idx) => <SongRow key={s.id} song={s} index={idx} queueContext={results.songs} />)}
              </div>
            </section>
          )}
          {results.artists?.length > 0 && (
            <section>
              <h2>Artistes ({results.artists.length})</h2>
              <div className="grid-cards">
                {results.artists.map((a) => (
                  <Link key={a.id} to={`/artistes/${a.id}`} className="card">
                    <div className="card-body"><div className="card-title">{a.name}</div><div className="card-sub">{a.genres || a.country}</div></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.albums?.length > 0 && (
            <section>
              <h2>Albums & Singles ({results.albums.length})</h2>
              <div className="grid-cards">
                {results.albums.map((al) => (
                  <Link key={al.id} to={`/albums/${al.id}`} className="card">
                    <div className="card-body"><div className="card-title">{al.title}</div><div className="card-sub">{al.artist}</div></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.playlists?.length > 0 && (
            <section>
              <h2>Playlists ({results.playlists.length})</h2>
              <div className="grid-cards">
                {results.playlists.map((pl) => (
                  <Link key={pl.id} to={`/playlists/${pl.id}`} className="card">
                    <div className="card-body"><div className="card-title">{pl.title}</div></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.videos?.length > 0 && (
            <section>
              <h2>Vidéos ({results.videos.length})</h2>
              <div className="grid-cards">
                {results.videos.map((v) => (
                  <Link key={v.id} to={`/videos/${v.id}`} className="card">
                    <div className="card-body"><div className="card-title">{v.title}</div><div className="card-sub">{v.artist}</div></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {results.news?.length > 0 && (
            <section>
              <h2>Actualités ({results.news.length})</h2>
              <div className="grid-cards">
                {results.news.map((n) => (
                  <Link key={n.id} to={`/actualites/${n.id}`} className="card">
                    <div className="card-body"><div className="card-title">{n.title}</div></div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function AuthPage({ mode = 'login' }) {
  const { navigate } = useRouter();
  const { login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isRegister = mode === 'register';

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRegister && !acceptTerms) {
      setError('Veuillez accepter les conditions d’utilisation et la politique de confidentialité.');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) {
        await register({ name, email, password, acceptTerms });
      } else {
        await login({ identifier: email, password });
      }
      navigate('/profil');
    } catch (err) {
      setError(err.message || 'Authentification impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 440, margin: '20px auto' }} className="panel">
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <img src={logoImg} alt="Mali Audio" style={{ height: 58, margin: '0 auto 10px' }} />
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{isRegister ? 'Créer un compte' : 'Connexion à Mali Audio'}</h1>
      </div>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={onSubmit}>
        {isRegister && (
          <div className="field">
            <label htmlFor="auth-name">Nom ou pseudonyme</label>
            <input id="auth-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="auth-email">{isRegister ? 'Adresse e-mail' : 'Adresse e-mail ou identifiant'}</label>
          <input
            id="auth-email"
            type={isRegister ? 'email' : 'text'}
            className="input"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="auth-password">Mot de passe</label>
          <input
            id="auth-password"
            type="password"
            className="input"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {isRegister && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 14 }}>
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />
            <span>
              J’accepte les <Link to="/conditions" style={{ color: 'var(--gold)' }}>conditions d’utilisation</Link> et la{' '}
              <Link to="/confidentialite" style={{ color: 'var(--gold)' }}>politique de confidentialité</Link>.
            </span>
          </label>
        )}
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Patientez…' : isRegister ? 'Créer mon compte' : 'Se connecter'}
        </button>
      </form>

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
        {isRegister ? (
          <Link to="/connexion" style={{ color: 'var(--gold)' }}>Déjà un compte ? Se connecter</Link>
        ) : (
          <>
            <Link to="/inscription" style={{ color: 'var(--gold)' }}>Créer un compte</Link>
            <Link to="/mot-de-passe-oublie" style={{ color: 'var(--gold)' }}>Mot de passe oublié ?</Link>
          </>
        )}
      </div>
    </div>
  );
}

export function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.requestPasswordReset(email);
      setMessage(res.message + (res.devResetToken ? ` (Jeton dev : ${res.devResetToken})` : ''));
      if (res.devResetToken) setToken(res.devResetToken);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      const res = await api.confirmPasswordReset(token, newPassword);
      setMessage(res.message);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: '20px auto' }} className="panel">
      <h1 style={{ marginTop: 0 }}>Réinitialiser le mot de passe</h1>
      {error && <div className="error-box">{error}</div>}
      {message && <div className="success-box">{message}</div>}

      <form onSubmit={handleRequest} style={{ marginBottom: 24 }}>
        <div className="field">
          <label htmlFor="reset-email">Adresse e-mail</label>
          <input id="reset-email" type="email" className="input" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-secondary">Demander un jeton temporaire</button>
      </form>

      <form onSubmit={handleConfirm}>
        <div className="field">
          <label htmlFor="reset-token">Jeton de réinitialisation</label>
          <input id="reset-token" className="input" required value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="reset-pass">Nouveau mot de passe</label>
          <input id="reset-pass" type="password" minLength={6} className="input" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Valider le nouveau mot de passe</button>
      </form>
    </div>
  );
}

export function ProfilePage() {
  const { navigate } = useRouter();
  const { user, token, isAuthenticated, loading, logout, updateProfile, changePassword } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [history, setHistory] = useState([]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('fr');
  const [avatarFile, setAvatarFile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setLanguage(user.language || 'fr');
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    Promise.all([api.getFavorites(token), api.getMyPlaylists(token), api.getHistory(token)])
      .then(([favs, pls, hist]) => {
        setFavorites(Array.isArray(favs) ? favs.map((f) => f.song).filter(Boolean) : []);
        setPlaylists(Array.isArray(pls) ? pls : []);
        setHistory(Array.isArray(hist) ? hist : []);
      })
      .catch(() => {});
  }, [isAuthenticated, token]);

  if (loading) return <div className="state-box">Chargement du profil…</div>;
  if (!isAuthenticated) {
    return (
      <div className="panel" style={{ maxWidth: 480, margin: '20px auto', textAlign: 'center' }}>
        <h1 style={{ marginTop: 0 }}>Votre espace personnel</h1>
        <p style={{ color: 'var(--text-muted)' }}>Connectez-vous pour retrouver vos favoris, playlists et votre historique.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link to="/connexion" className="btn btn-primary">Se connecter</Link>
          <Link to="/inscription" className="btn btn-secondary">Créer un compte</Link>
        </div>
      </div>
    );
  }

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('language', language);
      if (avatarFile) formData.append('avatar', avatarFile);
      await updateProfile(formData);
      setAvatarFile(null);
      setMsg('Profil mis à jour.');
    } catch (error) {
      setErr(error.message);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMsg('Mot de passe modifié.');
    } catch (error) {
      setErr(error.message);
    }
  };

  const handleClearHistory = async () => {
    await api.clearHistory(token);
    setHistory([]);
    setMsg('Historique d’écoute effacé.');
  };

  const handleDeactivate = async () => {
    if (!window.confirm('Confirmer la désactivation de votre compte ?')) return;
    await api.deactivateAccount(token);
    await logout();
    navigate('/');
  };

  const avatar = resolveMediaUrl(user?.avatar);

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div className="detail-header">
        {avatar ? (
          <img src={avatar} alt={user.name} className="detail-cover" style={{ width: 110, height: 110, borderRadius: '50%' }} />
        ) : (
          <div className="detail-cover card-placeholder" style={{ width: 110, height: 110, borderRadius: '50%' }}>
            {user?.name?.[0]?.toUpperCase() || 'M'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 6px' }}>{user.name}</h1>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>{user.email}</p>
          <button type="button" className="btn btn-secondary" onClick={logout}>Déconnexion</button>
        </div>
      </div>

      {err && <div className="error-box">{err}</div>}
      {msg && <div className="success-box">{msg}</div>}

      <section>
        <h2>Mes favoris ({favorites.length})</h2>
        {favorites.length === 0 ? (
          <div className="state-box">Aucun morceau en favori.</div>
        ) : (
          <div className="track-table">
            {favorites.map((song, idx) => <SongRow key={song.id} song={song} index={idx} queueContext={favorites} />)}
          </div>
        )}
      </section>

      <section>
        <div className="section-header">
          <h2>Mes playlists ({playlists.length})</h2>
          <Link to="/playlists" className="section-link">Gérer →</Link>
        </div>
        {playlists.length === 0 ? (
          <div className="state-box">Aucune playlist personnelle.</div>
        ) : (
          <div className="grid-cards">
            {playlists.map((pl) => (
              <Link key={pl.id} to={`/playlists/${pl.id}`} className="card">
                <div className="card-body">
                  <div className="card-title">{pl.title}</div>
                  <div className="card-sub">{pl.track_count || 0} titres</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-header">
          <h2>Historique d’écoute ({history.length})</h2>
          {history.length > 0 && (
            <button type="button" className="btn btn-ghost" onClick={handleClearHistory}>Effacer l’historique</button>
          )}
        </div>
        {history.length === 0 ? (
          <div className="state-box">Aucune écoute enregistrée récemment.</div>
        ) : (
          <div className="track-table">
            {history.slice(0, 10).map((entry, idx) => entry.song && <SongRow key={entry.id} song={entry.song} index={idx} />)}
          </div>
        )}
      </section>

      <div className="grid-wide">
        <form className="panel" onSubmit={saveProfile}>
          <h2 style={{ marginTop: 0 }}>Informations du profil</h2>
          <div className="field">
            <label htmlFor="prof-name">Nom public</label>
            <input id="prof-name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="prof-phone">Téléphone</label>
            <input id="prof-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="prof-lang">Langue préférée</label>
            <select id="prof-lang" className="select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="fr">Français</option>
              <option value="bm">Bambara</option>
              <option value="en">Anglais</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="prof-avatar">Photo de profil (JPG, PNG, WebP)</label>
            <input id="prof-avatar" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </div>
          <button type="submit" className="btn btn-primary">Enregistrer</button>
        </form>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Sécurité du compte</h2>
          <form onSubmit={savePassword} style={{ marginBottom: 20 }}>
            <div className="field">
              <label htmlFor="curr-pass">Mot de passe actuel</label>
              <input id="curr-pass" type="password" className="input" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="new-pass">Nouveau mot de passe</label>
              <input id="new-pass" type="password" minLength={6} className="input" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-secondary">Modifier le mot de passe</button>
          </form>
          <button type="button" className="btn btn-crimson" onClick={handleDeactivate}>Désactiver mon compte</button>
        </div>
      </div>
    </div>
  );
}
