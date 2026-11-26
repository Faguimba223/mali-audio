import { useEffect, useState } from 'react';
import { HeartIcon, PlayIcon } from '../components/Icons';
import SongRow from '../components/SongRow';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Link, useRouter } from '../context/RouterContext';
import useCatalogRefresh from '../hooks/useCatalogRefresh';
import { api, resolveMediaUrl } from '../services/api';

export function MusicPage() {
  const refreshVersion = useCatalogRefresh();
  const { query, navigate } = useRouter();
  const { isAuthenticated, token } = useAuth();
  const [songs, setSongs] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [q, setQ] = useState(() => query.get('q') || '');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');
  const [artistId, setArtistId] = useState('');
  const [sort, setSort] = useState(() => query.get('sort') || 'newest');

  const [playlistModalSong, setPlaylistModalSong] = useState(null);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [playlistMsg, setPlaylistMsg] = useState('');

  useEffect(() => {
    Promise.all([api.getLanguages(), api.getCategories(), api.getArtists()])
      .then(([langs, cats, arts]) => {
        setLanguages(Array.isArray(langs) ? langs : []);
        setCategories(Array.isArray(cats) ? cats : []);
        setArtists(Array.isArray(arts) ? arts : arts?.items || []);
      })
      .catch(() => {});
  }, [refreshVersion]);

  useEffect(() => {
    let active = true;
    api.getSongs({ q, genre, language, artistId, sort })
      .then((res) => {
        if (!active) return;
        setError('');
        setSongs(Array.isArray(res) ? res : res?.items || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Impossible de charger les morceaux.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [q, genre, language, artistId, sort, refreshVersion]);

  const openPlaylistPicker = async (song) => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }
    setPlaylistModalSong(song);
    setPlaylistMsg('');
    try {
      const list = await api.getMyPlaylists(token);
      setMyPlaylists(Array.isArray(list) ? list : []);
    } catch {
      setMyPlaylists([]);
    }
  };

  const addToPlaylist = async (playlistId) => {
    try {
      await api.addPlaylistTrack(playlistId, playlistModalSong.id, token);
      setPlaylistMsg('Morceau ajouté à la playlist.');
    } catch (err) {
      setPlaylistMsg(err.message || 'Impossible d’ajouter ce morceau.');
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Catalogue Musique</h1>
      <p style={{ color: 'var(--text-muted)' }}>Écoute en streaming intégré uniquement dans Mali Audio.</p>

      <div className="filters-bar">
        <input
          type="search"
          className="input"
          style={{ flex: '1 1 220px' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titre, artiste, album..."
          aria-label="Filtrer par texte"
        />
        <select className="select" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Filtrer par genre">
          <option value="">Tous les genres</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
        <select className="select" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Filtrer par langue">
          <option value="">Toutes les langues</option>
          {languages.map((lang) => (
            <option key={lang.id} value={lang.code}>{lang.name}</option>
          ))}
        </select>
        <select className="select" value={artistId} onChange={(e) => setArtistId(e.target.value)} aria-label="Filtrer par artiste">
          <option value="">Tous les artistes</option>
          {artists.map((art) => (
            <option key={art.id} value={art.id}>{art.name}</option>
          ))}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
          <option value="newest">Plus récents</option>
          <option value="popular">Popularité</option>
          <option value="title">Ordre alphabétique</option>
        </select>
      </div>

      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="state-box">Chargement du catalogue…</div>
      ) : songs.length === 0 ? (
        <div className="state-box">Aucun morceau ne correspond à ces critères.</div>
      ) : (
        <div className="track-table">
          {songs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              queueContext={songs}
              onAddToPlaylist={openPlaylistPicker}
            />
          ))}
        </div>
      )}

      {playlistModalSong && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Ajouter à une playlist">
          <div className="modal-card">
            <h2 style={{ marginTop: 0 }}>Ajouter « {playlistModalSong.title} »</h2>
            {playlistMsg && <div className="success-box">{playlistMsg}</div>}
            {myPlaylists.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>
                Vous n’avez pas encore de playlist personnelle. <Link to="/playlists" style={{ color: 'var(--gold)' }}>Créer une playlist</Link>.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {myPlaylists.map((pl) => (
                  <button key={pl.id} type="button" className="btn btn-secondary" onClick={() => addToPlaylist(pl.id)}>
                    {pl.title}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setPlaylistModalSong(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SongDetailPage({ id }) {
  const refreshVersion = useCatalogRefresh();
  const { navigate } = useRouter();
  const { isAuthenticated, favoriteIds, toggleFavorite } = useAuth();
  const { playSong } = usePlayer();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getSong(id)
      .then((res) => {
        if (!active) return;
        setError('');
        setSong(res);
      })
      .catch((err) => { if (active) setError(err.message || 'Morceau introuvable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, refreshVersion]);

  if (loading) return <div className="state-box">Chargement de la fiche…</div>;
  if (error || !song) return <div className="error-box">{error || 'Morceau introuvable.'}</div>;

  const isFav = favoriteIds.includes(Number(song.id));
  const cover = resolveMediaUrl(song.cover_url);

  return (
    <div>
      <div className="detail-header">
        {cover ? (
          <img src={cover} alt={song.title} className="detail-cover" />
        ) : (
          <div className="detail-cover card-placeholder">♪</div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="badge">{song.genre || song.release_type || 'Morceau'}</span>
          <h1 style={{ margin: '10px 0 6px' }}>{song.title}</h1>
          <p style={{ margin: '0 0 14px', color: 'var(--text-muted)' }}>
            Par {song.artist_id ? <Link to={`/artistes/${song.artist_id}`} style={{ color: 'var(--gold)' }}>{song.artist}</Link> : song.artist}
            {song.album ? ` · ${song.album}` : ''}
            {song.duration ? ` · ${song.duration}` : ''}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <button type="button" className="btn btn-primary" onClick={() => playSong(song, [song])}>
              <PlayIcon />
              <span>Écouter dans Mali Audio</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (isAuthenticated ? toggleFavorite(song.id) : navigate('/connexion'))}
            >
              <HeartIcon filled={isFav} />
              <span>{isFav ? 'Dans vos favoris' : 'Ajouter aux favoris'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Informations</h2>
        <p style={{ color: 'var(--text-muted)' }}>{song.description || 'Aucune description complémentaire.'}</p>
        {Array.isArray(song.featured_artists) && song.featured_artists.length > 0 && (
          <p>
            <strong>Artistes invités :</strong>{' '}
            {song.featured_artists.map((a, idx) => (
              <span key={a.id}>
                {idx > 0 ? ', ' : ''}
                <Link to={`/artistes/${a.id}`} style={{ color: 'var(--gold)' }}>{a.name}</Link>
              </span>
            ))}
          </p>
        )}
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          Écoutes : {song.play_count} · Langue : {song.language || 'fr'} · Diffusion protégée en streaming intégré uniquement.
        </p>
      </div>
    </div>
  );
}
