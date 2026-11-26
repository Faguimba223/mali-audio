import { useCallback, useEffect, useState } from 'react';
import { PlayIcon } from '../components/Icons';
import SongRow from '../components/SongRow';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Link, useRouter } from '../context/RouterContext';
import useCatalogRefresh from '../hooks/useCatalogRefresh';
import { api, resolveMediaUrl } from '../services/api';

export function PlaylistsPage() {
  const refreshVersion = useCatalogRefresh();
  const { isAuthenticated, token } = useAuth();
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');

  const loadPlaylists = useCallback(async () => {
    try {
      const pub = await api.getPublicPlaylists(false);
      setError('');
      setPublicPlaylists(Array.isArray(pub) ? pub : []);
      if (isAuthenticated && token) {
        const mine = await api.getMyPlaylists(token);
        setMyPlaylists(Array.isArray(mine) ? mine : []);
      } else {
        setMyPlaylists([]);
      }
    } catch (err) {
      setError(err.message || 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists, refreshVersion]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.createPlaylist({ title, description, is_public: isPublic }, token);
      setTitle('');
      setDescription('');
      setIsPublic(false);
      await loadPlaylists();
    } catch (err) {
      setError(err.message || 'Impossible de créer la playlist.');
    }
  };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Playlists</h1>
      {error && <div className="error-box">{error}</div>}

      {isAuthenticated && (
        <section className="panel" style={{ marginBottom: 28 }}>
          <h2 style={{ marginTop: 0 }}>Créer une playlist personnelle</h2>
          <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12, maxWidth: 520 }}>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nom de la playlist" />
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optionnel)" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.9rem' }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              <span>Rendre cette playlist publique</span>
            </label>
            <button type="submit" className="btn btn-primary" style={{ width: 'fit-content' }}>Créer la playlist</button>
          </form>

          <h3 style={{ marginTop: 24 }}>Mes playlists ({myPlaylists.length})</h3>
          {myPlaylists.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Vous n’avez pas encore créé de playlist.</p>
          ) : (
            <div className="grid-cards">
              {myPlaylists.map((pl) => (
                <Link key={pl.id} to={`/playlists/${pl.id}`} className="card">
                  <div className="card-media"><div className="card-placeholder">♫</div></div>
                  <div className="card-body">
                    <span className="badge">{pl.is_public ? 'Publique' : 'Privée'}</span>
                    <div className="card-title">{pl.title}</div>
                    <div className="card-sub">{pl.track_count || 0} titres</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="section" style={{ marginTop: 10 }}>
        <div className="section-header"><h2>Playlists éditoriales et publiques</h2></div>
        {loading ? (
          <div className="state-box">Chargement…</div>
        ) : publicPlaylists.length === 0 ? (
          <div className="state-box">Aucune playlist publique disponible.</div>
        ) : (
          <div className="grid-cards">
            {publicPlaylists.map((pl) => {
              const cover = resolveMediaUrl(pl.cover_url);
              return (
                <Link key={pl.id} to={`/playlists/${pl.id}`} className="card">
                  <div className="card-media">
                    {cover ? <img src={cover} alt={pl.title} /> : <div className="card-placeholder">♫</div>}
                  </div>
                  <div className="card-body">
                    <span className="badge">{pl.is_editorial ? 'Éditoriale' : 'Publique'}</span>
                    <div className="card-title">{pl.title}</div>
                    <div className="card-sub">{pl.track_count || 0} titres</div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function PlaylistDetailPage({ id }) {
  const refreshVersion = useCatalogRefresh();
  const { navigate } = useRouter();
  const { token, user } = useAuth();
  const { playQueue } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTitle, setEditingTitle] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = token ? await api.getPlaylist(id, token) : await api.getPublicPlaylist(id);
      setPlaylist(data);
      setEditingTitle(data.title || '');
    } catch (err) {
      setError(err.message || 'Playlist introuvable.');
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => {
    load();
  }, [load, refreshVersion]);

  if (loading) return <div className="state-box">Chargement…</div>;
  if (error || !playlist) return <div className="error-box">{error || 'Playlist introuvable.'}</div>;

  const isOwner = user && playlist.user_id === user.id && !playlist.is_editorial;
  const cover = resolveMediaUrl(playlist.cover_url);

  const handleRename = async (e) => {
    e.preventDefault();
    await api.updatePlaylist(playlist.id, { title: editingTitle }, token);
    await load();
  };

  const handleDelete = async () => {
    await api.deletePlaylist(playlist.id, token);
    navigate('/playlists');
  };

  const handleRemoveTrack = async (songId) => {
    await api.removePlaylistTrack(playlist.id, songId, token);
    await load();
  };

  const moveTrack = async (idx, dir) => {
    const tracks = [...(playlist.tracks || [])];
    const target = idx + dir;
    if (target < 0 || target >= tracks.length) return;
    [tracks[idx], tracks[target]] = [tracks[target], tracks[idx]];
    await api.updatePlaylist(playlist.id, { trackIds: tracks.map((t) => t.id) }, token);
    await load();
  };

  return (
    <div>
      <div className="detail-header">
        {cover ? <img src={cover} alt={playlist.title} className="detail-cover" /> : <div className="detail-cover card-placeholder">♫</div>}
        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="badge">{playlist.is_editorial ? 'Éditoriale' : playlist.is_public ? 'Publique' : 'Privée'}</span>
          <h1 style={{ margin: '10px 0 6px' }}>{playlist.title}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>
            {playlist.description || 'Playlist Mali Audio'} · {playlist.tracks?.length || 0} titres
          </p>
          {playlist.tracks?.length > 0 && (
            <button type="button" className="btn btn-primary" onClick={() => playQueue(playlist.tracks, 0)}>
              <PlayIcon />
              <span>Lire la playlist</span>
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="panel" style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <form onSubmit={handleRename} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input className="input" value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} aria-label="Renommer la playlist" />
            <button type="submit" className="btn btn-secondary">Renommer</button>
          </form>
          <button type="button" className="btn btn-crimson" onClick={handleDelete}>Supprimer la playlist</button>
        </div>
      )}

      {playlist.tracks?.length ? (
        <div className="track-table">
          {playlist.tracks.map((song, idx) => (
            <div key={song.id}>
              <SongRow song={song} index={idx} queueContext={playlist.tracks} />
              {isOwner && (
                <div style={{ display: 'flex', gap: 8, padding: '6px 14px 10px', background: 'rgba(255,255,255,0.02)' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => moveTrack(idx, -1)} disabled={idx === 0}>↑ Monter</button>
                  <button type="button" className="btn btn-ghost" onClick={() => moveTrack(idx, 1)} disabled={idx === playlist.tracks.length - 1}>↓ Descendre</button>
                  <button type="button" className="btn btn-ghost" style={{ color: '#ff9ba1' }} onClick={() => handleRemoveTrack(song.id)}>Retirer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="state-box">Aucun morceau dans cette playlist pour le moment.</div>
      )}
    </div>
  );
}
