import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, resolveMediaUrl } from '../services/api';
import { useAuth } from './AuthContext';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const { token } = useAuth();
  const audioRef = useRef(null);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // 'off' | 'all' | 'one'
  const [error, setError] = useState('');
  const [queueOpen, setQueueOpen] = useState(false);

  const currentTrack = currentIndex >= 0 && currentIndex < queue.length ? queue[currentIndex] : null;

  const startStreamForTrack = useCallback(async (track) => {
    const audio = audioRef.current;
    if (!audio || !track) return;

    setError('');
    setLoadingTrack(true);
    setCurrentTime(0);
    setDuration(0);

    try {
      const streamInfo = await api.getStreamToken(track.id, token);
      const src = resolveMediaUrl(streamInfo.streamUrl);
      if (!src) throw new Error('Aucun flux audio disponible pour ce titre.');

      audio.src = src;
      audio.volume = volume;
      await audio.play();
      setPlaying(true);
      api.recordPlay(track.id).catch(() => {});
      if (token) {
        api.recordHistory(track.id, 0, token).catch(() => {});
      }
    } catch (err) {
      setPlaying(false);
      setError(err?.message || 'Impossible de lire ce morceau. Vérifiez votre connexion.');
    } finally {
      setLoadingTrack(false);
    }
  }, [token, volume]);

  const playSong = useCallback((track, nextQueue = null) => {
    if (!track) return;
    if (Array.isArray(nextQueue) && nextQueue.length > 0) {
      const idx = nextQueue.findIndex((item) => item.id === track.id);
      const safeIdx = idx >= 0 ? idx : 0;
      setQueue(nextQueue);
      setCurrentIndex(safeIdx);
      startStreamForTrack(nextQueue[safeIdx]);
      return;
    }

    const existingIdx = queue.findIndex((item) => item.id === track.id);
    if (existingIdx >= 0) {
      if (existingIdx === currentIndex && audioRef.current?.src) {
        if (playing) {
          audioRef.current.pause();
          setPlaying(false);
        } else {
          audioRef.current.play().then(() => setPlaying(true)).catch(() => startStreamForTrack(track));
        }
        return;
      }
      setCurrentIndex(existingIdx);
      startStreamForTrack(queue[existingIdx]);
      return;
    }

    const updated = [...queue, track];
    setQueue(updated);
    setCurrentIndex(updated.length - 1);
    startStreamForTrack(track);
  }, [queue, currentIndex, playing, startStreamForTrack]);

  const playQueue = useCallback((tracksList, startIndex = 0) => {
    if (!Array.isArray(tracksList) || !tracksList.length) return;
    const idx = Math.max(0, Math.min(startIndex, tracksList.length - 1));
    setQueue(tracksList);
    setCurrentIndex(idx);
    startStreamForTrack(tracksList[idx]);
  }, [startStreamForTrack]);

  const addToQueue = useCallback((track) => {
    if (!track) return;
    setQueue((curr) => (curr.some((item) => item.id === track.id) ? curr : [...curr, track]));
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    try {
      if (!audio.src) {
        await startStreamForTrack(currentTrack);
        return;
      }
      await audio.play();
      setPlaying(true);
    } catch {
      await startStreamForTrack(currentTrack);
    }
  }, [currentTrack, playing, startStreamForTrack]);

  const nextTrack = useCallback(() => {
    if (!queue.length) return;
    if (repeat === 'one' && currentTrack) {
      startStreamForTrack(currentTrack);
      return;
    }
    if (shuffle && queue.length > 1) {
      let randIdx = Math.floor(Math.random() * queue.length);
      if (randIdx === currentIndex) randIdx = (currentIndex + 1) % queue.length;
      setCurrentIndex(randIdx);
      startStreamForTrack(queue[randIdx]);
      return;
    }
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        setCurrentIndex(0);
        startStreamForTrack(queue[0]);
      } else {
        setPlaying(false);
      }
      return;
    }
    setCurrentIndex(nextIdx);
    startStreamForTrack(queue[nextIdx]);
  }, [queue, currentIndex, repeat, shuffle, currentTrack, startStreamForTrack]);

  const prevTrack = useCallback(() => {
    if (!queue.length) return;
    if (audioRef.current && audioRef.current.currentTime > 4) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + queue.length) % queue.length;
    setCurrentIndex(prevIdx);
    startStreamForTrack(queue[prevIdx]);
  }, [queue, currentIndex, startStreamForTrack]);

  const seek = useCallback((seconds) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(seconds)) return;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
    setCurrentTime(audio.currentTime);
  }, []);

  const changeVolume = useCallback((val) => {
    const clamped = Math.max(0, Math.min(1, Number(val)));
    setVolume(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeat((curr) => (curr === 'off' ? 'all' : curr === 'all' ? 'one' : 'off'));
  }, []);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist || 'Mali Audio',
        album: currentTrack.album || 'Mali Audio',
        artwork: currentTrack.cover_url ? [{ src: resolveMediaUrl(currentTrack.cover_url), sizes: '512x512' }] : [],
      });
    }
  }, [currentTrack]);

  return (
    <PlayerContext.Provider value={{
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
      playSong,
      playQueue,
      addToQueue,
      togglePlay,
      nextTrack,
      prevTrack,
      seek,
      changeVolume,
      clearError: () => setError(''),
    }}>
      {children}
      {/* Élément audio protégé sans contrôle de téléchargement natif */}
      <audio
        ref={audioRef}
        preload="none"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime || 0)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={nextTrack}
        onError={() => {
          setPlaying(false);
          setError('Erreur de lecture : flux expiré, format incompatible ou connexion interrompue.');
        }}
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer doit être utilisé dans PlayerProvider');
  return ctx;
}
