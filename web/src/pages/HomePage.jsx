import { useEffect, useState } from 'react';
import logoImg from '../assets/mali-audio-logo.png';
import { PlayIcon } from '../components/Icons';
import SongRow from '../components/SongRow';
import { usePlayer } from '../context/PlayerContext';
import { Link } from '../context/RouterContext';
import useCatalogRefresh from '../hooks/useCatalogRefresh';
import { api, resolveMediaUrl } from '../services/api';

export default function HomePage() {
  const { playSong } = usePlayer();
  const refreshVersion = useCatalogRefresh();
  const [data, setData] = useState({ songs: [], popular: [], artists: [], albums: [], playlists: [], videos: [], news: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getSongs({ limit: 8, sort: 'newest' }),
      api.getSongs({ limit: 6, sort: 'popular' }),
      api.getArtists({ limit: 6 }),
      api.getAlbums({ limit: 6 }),
      api.getPublicPlaylists(true),
      api.getVideos({ limit: 4 }),
      api.getNews(),
    ])
      .then(([songsRes, popularRes, artistsRes, albumsRes, playlistsRes, videosRes, newsRes]) => {
        if (!active) return;
        const pick = (r) => (Array.isArray(r) ? r : r?.items || []);
        setError('');
        setData({
          songs: pick(songsRes),
          popular: pick(popularRes),
          artists: pick(artistsRes),
          albums: pick(albumsRes),
          playlists: pick(playlistsRes).slice(0, 4),
          videos: pick(videosRes),
          news: pick(newsRes).slice(0, 3),
        });
      })
      .catch((err) => {
        if (active) setError(err.message || 'Impossible de charger les contenus.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [refreshVersion]);

  return (
    <div>
      <section className="hero">
        <div>
          <div className="hero-eyebrow">Plateforme musicale malienne</div>
          <h1>Découvrez et écoutez les voix du Mali.</h1>
          <p>
            Artistes, singles, albums, playlists éditoriales, clips vidéo et actualités culturelles réunis dans une application web progressive.
          </p>
          <div className="hero-actions">
            <Link to="/musique" className="btn btn-primary">Explorer la musique</Link>
            <Link to="/artistes" className="btn btn-secondary">Découvrir les artistes</Link>
          </div>
        </div>
        <div className="hero-visual">
          <img src={logoImg} alt="Emblème officiel Mali Audio" />
        </div>
      </section>

      {error && <div className="error-box" style={{ marginTop: 20 }}>{error}</div>}
      {loading && <div className="state-box" style={{ marginTop: 20 }}>Chargement du catalogue Mali Audio…</div>}

      {!loading && !error && (
        <>
          <section className="section">
            <div className="section-header">
              <h2>Dernières sorties</h2>
              <Link to="/musique" className="section-link">Tout voir →</Link>
            </div>
            {data.songs.length === 0 ? (
              <div className="state-box">Aucun morceau publié pour le moment.</div>
            ) : (
              <div className="grid-cards">
                {data.songs.slice(0, 5).map((song) => {
                  const cover = resolveMediaUrl(song.cover_url);
                  return (
                    <article key={song.id} className="card">
                      <div className="card-media">
                        {cover ? <img src={cover} alt={song.title} /> : <div className="card-placeholder">♪</div>}
                        <button
                          type="button"
                          className="card-play-overlay"
                          onClick={() => playSong(song, data.songs)}
                          aria-label={`Écouter ${song.title}`}
                        >
                          <PlayIcon />
                        </button>
                      </div>
                      <div className="card-body">
                        <Link to={`/chansons/${song.id}`} className="card-title">{song.title}</Link>
                        <div className="card-sub">{song.artist}</div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {data.popular.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Chansons populaires</h2>
                <Link to="/musique?sort=popular" className="section-link">Classement →</Link>
              </div>
              <div className="track-table">
                {data.popular.map((song, idx) => (
                  <SongRow key={song.id} song={song} index={idx} queueContext={data.popular} />
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-header">
              <h2>Artistes à découvrir</h2>
              <Link to="/artistes" className="section-link">Tous les artistes →</Link>
            </div>
            {data.artists.length === 0 ? (
              <div className="state-box">Aucun artiste publié pour le moment.</div>
            ) : (
              <div className="grid-cards">
                {data.artists.map((artist) => {
                  const photo = resolveMediaUrl(artist.photo);
                  return (
                    <Link key={artist.id} to={`/artistes/${artist.id}`} className="card">
                      <div className="card-media">
                        {photo ? <img src={photo} alt={artist.name} /> : <div className="card-placeholder">{artist.name?.[0] || 'A'}</div>}
                      </div>
                      <div className="card-body">
                        <div className="card-title">{artist.name}</div>
                        <div className="card-sub">{artist.genres || artist.country || 'Artiste'}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {data.albums.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Albums et singles récents</h2>
                <Link to="/albums" className="section-link">Voir tout →</Link>
              </div>
              <div className="grid-cards">
                {data.albums.map((album) => {
                  const cover = resolveMediaUrl(album.cover_url);
                  return (
                    <Link key={album.id} to={`/albums/${album.id}`} className="card">
                      <div className="card-media">
                        {cover ? <img src={cover} alt={album.title} /> : <div className="card-placeholder">◉</div>}
                      </div>
                      <div className="card-body">
                        <span className="badge">{album.release_type}</span>
                        <div className="card-title">{album.title}</div>
                        <div className="card-sub">{album.artist}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {data.playlists.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Playlists sélectionnées</h2>
                <Link to="/playlists" className="section-link">Toutes les playlists →</Link>
              </div>
              <div className="grid-cards">
                {data.playlists.map((pl) => {
                  const cover = resolveMediaUrl(pl.cover_url);
                  return (
                    <Link key={pl.id} to={`/playlists/${pl.id}`} className="card">
                      <div className="card-media">
                        {cover ? <img src={cover} alt={pl.title} /> : <div className="card-placeholder">♫</div>}
                      </div>
                      <div className="card-body">
                        <div className="card-title">{pl.title}</div>
                        <div className="card-sub">{pl.track_count || 0} titres</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {data.videos.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Clips et vidéos</h2>
                <Link to="/videos" className="section-link">Toutes les vidéos →</Link>
              </div>
              <div className="grid-wide">
                {data.videos.map((video) => {
                  const thumb = resolveMediaUrl(video.thumbnail_url);
                  return (
                    <Link key={video.id} to={`/videos/${video.id}`} className="card">
                      <div className="card-media wide">
                        {thumb ? <img src={thumb} alt={video.title} /> : <div className="card-placeholder">▶</div>}
                      </div>
                      <div className="card-body">
                        <div className="card-title">{video.title}</div>
                        <div className="card-sub">{video.artist || 'Mali Audio'}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {data.news.length > 0 && (
            <section className="section">
              <div className="section-header">
                <h2>Actualités et événements</h2>
                <Link to="/actualites" className="section-link">Toutes les actualités →</Link>
              </div>
              <div className="grid-wide">
                {data.news.map((story) => {
                  const img = resolveMediaUrl(story.image_url);
                  return (
                    <Link key={story.id} to={`/actualites/${story.id}`} className="card">
                      <div className="card-media wide">
                        {img ? <img src={img} alt={story.title} /> : <div className="card-placeholder">✦</div>}
                      </div>
                      <div className="card-body">
                        <div className="card-title">{story.title}</div>
                        <div className="card-sub">{story.summary || story.author || 'Actualité Mali Audio'}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
