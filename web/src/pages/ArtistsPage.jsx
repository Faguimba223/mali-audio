import { useEffect, useState } from 'react';
import SongRow from '../components/SongRow';
import { Link } from '../context/RouterContext';
import useCatalogRefresh from '../hooks/useCatalogRefresh';
import { api, resolveMediaUrl } from '../services/api';

export function ArtistsPage() {
  const refreshVersion = useCatalogRefresh();
  const [artists, setArtists] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getArtists({ q })
      .then((res) => {
        if (!active) return;
        setError('');
        setArtists(Array.isArray(res) ? res : res?.items || []);
      })
      .catch((err) => { if (active) setError(err.message || 'Erreur de chargement.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [q, refreshVersion]);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Artistes</h1>
      <div className="filters-bar">
        <input
          type="search"
          className="input"
          style={{ maxWidth: 380, width: '100%' }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un artiste ou un genre..."
          aria-label="Rechercher un artiste"
        />
      </div>
      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="state-box">Chargement des artistes…</div>
      ) : artists.length === 0 ? (
        <div className="state-box">Aucun artiste publié trouvé.</div>
      ) : (
        <div className="grid-cards">
          {artists.map((artist) => {
            const photo = resolveMediaUrl(artist.photo);
            return (
              <Link key={artist.id} to={`/artistes/${artist.id}`} className="card">
                <div className="card-media">
                  {photo ? <img src={photo} alt={artist.name} /> : <div className="card-placeholder">{artist.name?.[0] || 'A'}</div>}
                </div>
                <div className="card-body">
                  <div className="card-title">{artist.name}</div>
                  <div className="card-sub">{artist.genres || artist.country || 'Artiste Mali Audio'}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ArtistDetailPage({ id }) {
  const refreshVersion = useCatalogRefresh();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getArtist(id)
      .then((res) => {
        if (!active) return;
        setError('');
        setArtist(res);
      })
      .catch((err) => { if (active) setError(err.message || 'Artiste introuvable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, refreshVersion]);

  if (loading) return <div className="state-box">Chargement de la fiche artiste…</div>;
  if (error || !artist) return <div className="error-box">{error || 'Artiste introuvable.'}</div>;

  const photo = resolveMediaUrl(artist.photo);

  return (
    <div>
      <div className="detail-header">
        {photo ? (
          <img src={photo} alt={artist.name} className="detail-cover" />
        ) : (
          <div className="detail-cover card-placeholder">{artist.name?.[0] || 'A'}</div>
        )}
        <div style={{ flex: 1, minWidth: 220 }}>
          <span className="badge">{artist.country || 'Mali'}</span>
          <h1 style={{ margin: '10px 0 8px' }}>{artist.name}</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0 0 8px' }}>
            {[artist.genres, artist.language].filter(Boolean).join(' · ') || 'Scène musicale'}
          </p>
          <p style={{ margin: 0 }}>{artist.biography || 'Biographie à venir.'}</p>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2>Chansons ({artist.songs?.length || 0})</h2>
        </div>
        {artist.songs?.length ? (
          <div className="track-table">
            {artist.songs.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} queueContext={artist.songs} />
            ))}
          </div>
        ) : (
          <div className="state-box">Aucune chanson publiée pour cet artiste.</div>
        )}
      </section>

      {artist.albums?.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Albums et singles</h2>
          </div>
          <div className="grid-cards">
            {artist.albums.map((album) => {
              const cover = resolveMediaUrl(album.cover_url);
              return (
                <Link key={album.id} to={`/albums/${album.id}`} className="card">
                  <div className="card-media">
                    {cover ? <img src={cover} alt={album.title} /> : <div className="card-placeholder">◉</div>}
                  </div>
                  <div className="card-body">
                    <span className="badge">{album.release_type}</span>
                    <div className="card-title">{album.title}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {artist.videos?.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2>Vidéos associées</h2>
          </div>
          <div className="grid-wide">
            {artist.videos.map((video) => {
              const thumb = resolveMediaUrl(video.thumbnail_url);
              return (
                <Link key={video.id} to={`/videos/${video.id}`} className="card">
                  <div className="card-media wide">
                    {thumb ? <img src={thumb} alt={video.title} /> : <div className="card-placeholder">▶</div>}
                  </div>
                  <div className="card-body">
                    <div className="card-title">{video.title}</div>
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
