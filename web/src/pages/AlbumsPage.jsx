import { useEffect, useState } from 'react';
import { PlayIcon } from '../components/Icons';
import SongRow from '../components/SongRow';
import { usePlayer } from '../context/PlayerContext';
import { Link } from '../context/RouterContext';
import { api, resolveMediaUrl } from '../services/api';

export function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getAlbums({ type: typeFilter })
      .then((res) => { if (active) setAlbums(Array.isArray(res) ? res : res?.items || []); })
      .catch((err) => { if (active) setError(err.message || 'Impossible de charger les albums.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [typeFilter]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Albums & Singles</h1>
      <div className="filters-bar">
        {['', 'album', 'single', 'ep'].map((t) => (
          <button
            key={t || 'all'}
            type="button"
            className={`btn ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTypeFilter(t)}
          >
            {t === '' ? 'Tout' : t === 'album' ? 'Albums' : t === 'single' ? 'Singles' : 'EP'}
          </button>
        ))}
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="state-box">Chargement…</div>
      ) : albums.length === 0 ? (
        <div className="state-box">Aucun album ou single publié.</div>
      ) : (
        <div className="grid-cards">
          {albums.map((album) => {
            const cover = resolveMediaUrl(album.cover_url);
            return (
              <Link key={album.id} to={`/albums/${album.id}`} className="card">
                <div className="card-media">
                  {cover ? <img src={cover} alt={album.title} /> : <div className="card-placeholder">◉</div>}
                </div>
                <div className="card-body">
                  <span className="badge">{album.release_type}</span>
                  <div className="card-title">{album.title}</div>
                  <div className="card-sub">{album.artist} · {album.track_count || 0} titres</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function AlbumDetailPage({ id }) {
  const { playQueue } = usePlayer();
  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getAlbum(id)
      .then((res) => { if (active) setAlbum(res); })
      .catch((err) => { if (active) setError(err.message || 'Album introuvable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="state-box">Chargement…</div>;
  if (error || !album) return <div className="error-box">{error || 'Album introuvable.'}</div>;

  const cover = resolveMediaUrl(album.cover_url);
  const shareUrl = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  return (
    <div>
      <div className="detail-header">
        {cover ? <img src={cover} alt={album.title} className="detail-cover" /> : <div className="detail-cover card-placeholder">◉</div>}
        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="badge">{album.release_type}</span>
          <h1 style={{ margin: '10px 0 6px' }}>{album.title}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 12px' }}>
            {album.artist_id ? <Link to={`/artistes/${album.artist_id}`} style={{ color: 'var(--gold)' }}>{album.artist}</Link> : album.artist}
            {album.release_date ? ` · ${new Date(album.release_date).toLocaleDateString('fr-FR')}` : ''}
          </p>
          {album.description && <p style={{ margin: '0 0 14px' }}>{album.description}</p>}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {album.tracks?.length > 0 && (
              <button type="button" className="btn btn-primary" onClick={() => playQueue(album.tracks, 0)}>
                <PlayIcon />
                <span>Lire tout</span>
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={shareUrl}>
              {copied ? 'Lien copié !' : 'Partager'}
            </button>
          </div>
        </div>
      </div>

      <section className="section">
        <div className="section-header"><h2>Liste des morceaux</h2></div>
        {album.tracks?.length ? (
          <div className="track-table">
            {album.tracks.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} queueContext={album.tracks} />
            ))}
          </div>
        ) : (
          <div className="state-box">Aucun morceau associé pour le moment.</div>
        )}
      </section>

      {album.other_releases?.length > 0 && (
        <section className="section">
          <div className="section-header"><h2>Autres œuvres de {album.artist}</h2></div>
          <div className="grid-cards">
            {album.other_releases.map((other) => {
              const otherCover = resolveMediaUrl(other.cover_url);
              return (
                <Link key={other.id} to={`/albums/${other.id}`} className="card">
                  <div className="card-media">
                    {otherCover ? <img src={otherCover} alt={other.title} /> : <div className="card-placeholder">◉</div>}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{other.title}</div>
                    <div className="card-sub">{other.release_type}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
