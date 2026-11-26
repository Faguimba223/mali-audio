import { resolveMediaUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { Link, useRouter } from '../context/RouterContext';
import { HeartIcon, PauseIcon, PlayIcon } from './Icons';

export default function SongRow({ song, index, queueContext = [], onAddToPlaylist, onRemoveLocal }) {
  const { navigate } = useRouter();
  const { isAuthenticated, favoriteIds, toggleFavorite } = useAuth();
  const { currentTrack, playing, playSong, addToQueue } = usePlayer();

  const isCurrent = currentTrack?.id === song.id;
  const isPlayingThis = isCurrent && playing;
  const isLocalSong = song.isLocal === true;
  const isFav = !isLocalSong && favoriteIds.includes(Number(song.id));
  const cover = resolveMediaUrl(song.cover_url);

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      navigate('/connexion');
      return;
    }
    await toggleFavorite(song.id);
  };

  return (
    <div className={`track-row${isCurrent ? ' active' : ''}`}>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        style={{ width: 32, height: 32, color: isPlayingThis ? 'var(--gold-bright)' : undefined }}
        onClick={() => playSong(song, queueContext)}
        aria-label={isPlayingThis ? `Mettre en pause ${song.title}` : `Lire ${song.title}`}
      >
        {isPlayingThis ? <PauseIcon size={16} /> : (typeof index === 'number' ? <span style={{ fontSize: '0.82rem' }}>{index + 1}</span> : <PlayIcon size={16} />)}
      </button>

      {cover ? (
        <img src={cover} alt="" className="track-cover" />
      ) : (
        <div className="track-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>♪</div>
      )}

      <div style={{ minWidth: 0 }}>
        {isLocalSong ? (
          <span className="card-title" style={{ display: 'block', color: isCurrent ? 'var(--gold-bright)' : undefined }}>
            {song.title}
          </span>
        ) : (
          <Link to={`/chansons/${song.id}`} className="card-title" style={{ display: 'block', color: isCurrent ? 'var(--gold-bright)' : undefined }}>
            {song.title}
          </Link>
        )}
        <div className="card-sub">
          {song.artist_id ? <Link to={`/artistes/${song.artist_id}`}>{song.artist}</Link> : song.artist}
        </div>
      </div>

      <div className="card-sub hide-sm">
        {song.album_id ? <Link to={`/albums/${song.album_id}`}>{song.album || 'Single'}</Link> : (song.album || 'Single')}
      </div>

      <div className="card-sub hide-sm" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {song.duration || '--:--'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {!isLocalSong && (
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ color: isFav ? 'var(--crimson)' : undefined }}
            onClick={handleFavorite}
            aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          >
            <HeartIcon filled={isFav} />
          </button>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: '0.78rem', padding: '6px 8px' }}
          onClick={() => addToQueue(song)}
          title="Ajouter à la file d’attente"
        >
          + File
        </button>
        {!isLocalSong && onAddToPlaylist && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '6px 8px' }}
            onClick={() => onAddToPlaylist(song)}
            title="Ajouter à une playlist"
          >
            + Playlist
          </button>
        )}
        {isLocalSong && onRemoveLocal && (
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '0.78rem', padding: '6px 8px' }}
            onClick={() => onRemoveLocal(song)}
            aria-label={`Retirer ${song.title} de la musique hors connexion`}
          >
            Retirer
          </button>
        )}
      </div>
    </div>
  );
}
