import { resolveMediaUrl } from '../services/api';
import { usePlayer } from '../context/PlayerContext';
import { Link } from '../context/RouterContext';
import { NextIcon, PauseIcon, PlayIcon, PrevIcon, QueueIcon, RepeatIcon, ShuffleIcon } from './Icons';

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export default function PlayerBar() {
  const {
    queue,
    currentTrack,
    currentIndex,
    playing,
    loadingTrack,
    currentTime,
    duration,
    volume,
    shuffle,
    repeat,
    error,
    queueOpen,
    setQueueOpen,
    setShuffle,
    cycleRepeat,
    playQueue,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    changeVolume,
    clearError,
  } = usePlayer();

  if (!currentTrack && !error) return null;

  const cover = resolveMediaUrl(currentTrack?.cover_url);

  return (
    <>
      {queueOpen && (
        <aside className="queue-drawer" aria-label="File d’attente de lecture">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>File d’attente ({queue.length})</strong>
            <button type="button" className="btn btn-ghost" onClick={() => setQueueOpen(false)}>Fermer</button>
          </div>
          {queue.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Aucun morceau dans la file.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {queue.map((item, idx) => (
                <button
                  key={`${item.id}-${idx}`}
                  type="button"
                  onClick={() => playQueue(queue, idx)}
                  className="btn btn-ghost"
                  style={{
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    borderRadius: 8,
                    background: idx === currentIndex ? 'rgba(224, 175, 66, 0.16)' : 'transparent',
                    color: idx === currentIndex ? 'var(--gold-bright)' : 'var(--text)',
                  }}
                >
                  <span style={{ width: 22, opacity: 0.7 }}>{idx + 1}.</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title} — {item.artist}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>
      )}

      <section className="player-dock" aria-label="Lecteur audio Mali Audio">
        {error && (
          <div className="error-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span>{error}</span>
            <button type="button" className="btn btn-ghost" onClick={clearError}>Fermer</button>
          </div>
        )}

        {currentTrack && (
          <div className="player-inner">
            <div className="player-track">
              {cover ? (
                <img src={cover} alt={`Pochette de ${currentTrack.title}`} />
              ) : (
                <div className="track-cover" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)' }}>♪</div>
              )}
              <div style={{ minWidth: 0 }}>
                {currentTrack.isLocal ? (
                  <strong className="card-title" style={{ display: 'block' }}>{currentTrack.title}</strong>
                ) : (
                  <Link to={`/chansons/${currentTrack.id}`} className="card-title" style={{ display: 'block' }}>
                    {currentTrack.title}
                  </Link>
                )}
                <div className="card-sub">{currentTrack.artist}</div>
              </div>
            </div>

            <div className="player-controls">
              <div className="player-buttons">
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => setShuffle((v) => !v)}
                  aria-label="Lecture aléatoire"
                  aria-pressed={shuffle}
                  style={{ color: shuffle ? 'var(--gold-bright)' : undefined }}
                >
                  <ShuffleIcon />
                </button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={prevTrack} aria-label="Morceau précédent">
                  <PrevIcon />
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  onClick={togglePlay}
                  disabled={loadingTrack}
                  aria-label={playing ? 'Pause' : 'Lecture'}
                >
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button type="button" className="btn btn-ghost btn-icon" onClick={nextTrack} aria-label="Morceau suivant">
                  <NextIcon />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={cycleRepeat}
                  aria-label={`Répétition : ${repeat}`}
                  style={{ color: repeat !== 'off' ? 'var(--gold-bright)' : undefined }}
                  title={`Répétition : ${repeat === 'off' ? 'désactivée' : repeat === 'all' ? 'liste' : 'morceau'}`}
                >
                  <RepeatIcon />
                  {repeat === 'one' && <span style={{ fontSize: 10, fontWeight: 800 }}>1</span>}
                </button>
              </div>

              <div className="player-progress">
                <span>{formatTime(currentTime)}</span>
                <input
                  type="range"
                  className="range-slider"
                  min={0}
                  max={duration || 1}
                  step={0.5}
                  value={Math.min(currentTime, duration || 1)}
                  onChange={(e) => seek(Number(e.target.value))}
                  disabled={!duration}
                  aria-label="Position de lecture"
                />
                <span>{duration ? formatTime(duration) : (currentTrack.duration || '--:--')}</span>
              </div>
            </div>

            <div className="player-extras">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Vol</span>
                <input
                  type="range"
                  className="range-slider"
                  style={{ width: 84 }}
                  min={0}
                  max={1}
                  step={0.05}
                  value={volume}
                  onChange={(e) => changeVolume(Number(e.target.value))}
                  aria-label="Volume"
                />
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setQueueOpen((v) => !v)}
                aria-label="Afficher la file d’attente"
                aria-expanded={queueOpen}
              >
                <QueueIcon />
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
