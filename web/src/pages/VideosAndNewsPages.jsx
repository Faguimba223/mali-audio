import { useEffect, useState } from 'react';
import { Link } from '../context/RouterContext';
import { api, resolveMediaUrl } from '../services/api';

function extractYoutubeEmbed(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function VideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getVideos()
      .then((res) => { if (active) setVideos(Array.isArray(res) ? res : res?.items || []); })
      .catch((err) => { if (active) setError(err.message || 'Impossible de charger les vidéos.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Clips & Vidéos</h1>
      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="state-box">Chargement des vidéos…</div>
      ) : videos.length === 0 ? (
        <div className="state-box">Aucune vidéo publiée pour le moment.</div>
      ) : (
        <div className="grid-wide">
          {videos.map((video) => {
            const thumb = resolveMediaUrl(video.thumbnail_url);
            return (
              <Link key={video.id} to={`/videos/${video.id}`} className="card">
                <div className="card-media wide">
                  {thumb ? <img src={thumb} alt={video.title} loading="lazy" /> : <div className="card-placeholder">▶</div>}
                </div>
                <div className="card-body">
                  <div className="card-title">{video.title}</div>
                  <div className="card-sub">{video.artist || 'Mali Audio'}{video.duration ? ` · ${video.duration}` : ''}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function VideoDetailPage({ id }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setVideoError(false);
    api.getVideo(id)
      .then((res) => { if (active) setVideo(res); })
      .catch((err) => { if (active) setError(err.message || 'Vidéo introuvable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="state-box">Chargement de la vidéo…</div>;
  if (error || !video) return <div className="error-box">{error || 'Vidéo introuvable.'}</div>;

  const srcUrl = resolveMediaUrl(video.source_url);
  const embedUrl = video.source_type === 'external' ? extractYoutubeEmbed(video.source_url) : null;

  return (
    <div>
      <Link to="/videos" className="section-link">← Retour aux vidéos</Link>
      <h1 style={{ marginTop: 12 }}>{video.title}</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        {video.artist_id ? <Link to={`/artistes/${video.artist_id}`} style={{ color: 'var(--gold)' }}>{video.artist}</Link> : video.artist}
        {video.duration ? ` · ${video.duration}` : ''}
      </p>

      <div className="panel" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
        {!srcUrl ? (
          <div className="state-box">Cette vidéo est actuellement indisponible.</div>
        ) : embedUrl ? (
          <div style={{ aspectRatio: '16 / 9', width: '100%' }}>
            <iframe
              src={embedUrl}
              title={video.title}
              style={{ width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : videoError ? (
          <div className="state-box">Impossible de lire cette source vidéo dans votre navigateur.</div>
        ) : (
          <video
            controls
            preload="metadata"
            controlsList="nodownload"
            poster={resolveMediaUrl(video.thumbnail_url) || undefined}
            style={{ width: '100%', maxHeight: 540, background: '#000' }}
            src={srcUrl}
            onError={() => setVideoError(true)}
          />
        )}
      </div>

      {video.description && (
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>À propos de ce clip</h2>
          <p style={{ margin: 0 }}>{video.description}</p>
        </div>
      )}
    </div>
  );
}

export function NewsPage() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getNews()
      .then((res) => { if (active) setStories(Array.isArray(res) ? res : res?.items || []); })
      .catch((err) => { if (active) setError(err.message || 'Impossible de charger les actualités.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Actualités & Événements</h1>
      {error && <div className="error-box">{error}</div>}
      {loading ? (
        <div className="state-box">Chargement…</div>
      ) : stories.length === 0 ? (
        <div className="state-box">Aucune actualité publiée pour le moment.</div>
      ) : (
        <div className="grid-wide">
          {stories.map((story) => {
            const img = resolveMediaUrl(story.image_url);
            return (
              <Link key={story.id} to={`/actualites/${story.id}`} className="card">
                <div className="card-media wide">
                  {img ? <img src={img} alt={story.title} /> : <div className="card-placeholder">✦</div>}
                </div>
                <div className="card-body">
                  {story.published_at && (
                    <span className="badge">{new Date(story.published_at).toLocaleDateString('fr-FR')}</span>
                  )}
                  <div className="card-title">{story.title}</div>
                  <div className="card-sub">{story.summary || story.author || ''}</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function NewsDetailPage({ id }) {
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getNewsItem(id)
      .then((res) => { if (active) setStory(res); })
      .catch((err) => { if (active) setError(err.message || 'Actualité introuvable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <div className="state-box">Chargement…</div>;
  if (error || !story) return <div className="error-box">{error || 'Actualité introuvable.'}</div>;

  const img = resolveMediaUrl(story.image_url);
  const share = () => {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  return (
    <article style={{ maxWidth: 820, margin: '0 auto' }}>
      <Link to="/actualites" className="section-link">← Retour aux actualités</Link>
      <h1 style={{ marginTop: 14 }}>{story.title}</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {story.author || 'Rédaction Mali Audio'}
          {story.published_at ? ` · ${new Date(story.published_at).toLocaleDateString('fr-FR', { dateStyle: 'long' })}` : ''}
        </span>
        <button type="button" className="btn btn-secondary" onClick={share}>
          {copied ? 'Lien copié !' : 'Partager l’article'}
        </button>
      </div>
      {img && (
        <img
          src={img}
          alt={story.title}
          style={{ width: '100%', maxHeight: 420, objectFit: 'cover', borderRadius: 14, marginBottom: 22 }}
        />
      )}
      <div className="panel" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.75 }}>
        {story.content}
      </div>
    </article>
  );
}
