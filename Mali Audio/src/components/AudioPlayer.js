import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useAppTheme } from '../styles/ThemeContext';

const AudioPlaybackContext = createContext(null);

function formatTime(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function AudioPlayerProvider({ tracks = [], children }) {
  const player = useAudioPlayer(null, { updateInterval: 300 });
  const status = useAudioPlayerStatus(player);
  const [currentTrackId, setCurrentTrackId] = useState(null);
  const [volume, setVolume] = useState(0.8);
  const [isExpanded, setIsExpanded] = useState(false);
  const currentTrack = tracks.find((track) => track.id === currentTrackId) || null;

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => {});
  }, []);

  const playTrack = async (trackId) => {
    const track = tracks.find((item) => item.id === trackId);
    const source = track?.audioUrl || track?.audioSource;
    if (!track) return;
    if (!source) {
      Alert.alert('Source audio manquante', `Ajoutez une URL audio au titre « ${track.title} » pour le lire.`);
      return;
    }

    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
      });
      player.replace(source);
      player.volume = volume;
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        albumTitle: track.album,
        artworkUrl: track.image,
      });
      setCurrentTrackId(track.id);
      player.play();
    } catch {
      Alert.alert('Lecture impossible', 'Le fichier audio n’a pas pu être chargé. Vérifiez son URL.');
    }
  };

  const toggleTrack = async (trackId) => {
    if (trackId === currentTrackId && status.playing) {
      player.pause();
      return;
    }
    if (trackId === currentTrackId && currentTrack) {
      if (status.duration && status.currentTime >= status.duration) await player.seekTo(0);
      player.play();
      return;
    }
    playTrack(trackId);
  };

  const changeTrack = (offset) => {
    if (!currentTrack) return;
    const currentIndex = tracks.findIndex((track) => track.id === currentTrack.id);
    const nextIndex = (currentIndex + offset + tracks.length) % tracks.length;
    playTrack(tracks[nextIndex].id);
  };

  const seekTo = (seconds) => {
    if (status.isLoaded && Number.isFinite(seconds)) player.seekTo(seconds);
  };

  const updateVolume = (nextVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, nextVolume));
    player.volume = clampedVolume;
    setVolume(clampedVolume);
  };

  const value = {
    currentTrack,
    currentTrackId,
    isExpanded,
    openPlayer: () => setIsExpanded(true),
    closePlayer: () => setIsExpanded(false),
    status,
    volume,
    toggleTrack,
    changeTrack,
    seekTo,
    updateVolume,
  };

  return <AudioPlaybackContext.Provider value={value}>{children}</AudioPlaybackContext.Provider>;
}

export function useAudioPlayback() {
  const context = useContext(AudioPlaybackContext);
  if (!context) throw new Error('useAudioPlayback doit être utilisé dans AudioPlayerProvider.');
  return context;
}

export default function AudioPlayer({ visible, onClose }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { currentTrack, status, volume, toggleTrack, changeTrack, seekTo, updateVolume } = useAudioPlayback();

  if (!currentTrack) return null;

  const duration = Math.max(0, status.duration || 0);
  const currentTime = Math.min(status.currentTime || 0, duration || 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer le lecteur" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Réduire le lecteur" style={styles.iconButton}>
              <Ionicons name="chevron-down" size={24} color={colors.ink} />
            </Pressable>
            <Text style={styles.headerLabel}>LECTEUR AUDIO</Text>
            <View style={styles.iconButton} />
          </View>

          <Image source={{ uri: currentTrack.image }} style={styles.cover} />
          <Text numberOfLines={1} style={styles.title}>{currentTrack.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{currentTrack.artist} · {currentTrack.album}</Text>

          <Slider
            minimumValue={0}
            maximumValue={duration || 1}
            value={Math.min(currentTime, duration || 1)}
            disabled={!status.isLoaded || !duration}
            minimumTrackTintColor={colors.green}
            maximumTrackTintColor={colors.line}
            thumbTintColor={colors.green}
            onSlidingComplete={seekTo}
            accessibilityLabel="Position de lecture"
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatTime(currentTime)}</Text>
            <Text style={styles.time}>{duration ? formatTime(duration) : '--:--'}</Text>
          </View>

          <View style={styles.transport}>
            <Pressable onPress={() => changeTrack(-1)} accessibilityRole="button" accessibilityLabel="Morceau précédent" style={styles.transportButton}>
              <Ionicons name="play-skip-back" size={27} color={colors.ink} />
            </Pressable>
            <Pressable onPress={() => toggleTrack(currentTrack.id)} accessibilityRole="button" accessibilityLabel={status.playing ? 'Mettre en pause' : 'Reprendre'} style={styles.playButton}>
              <Ionicons name={status.playing ? 'pause' : 'play'} size={25} color={colors.white} />
            </Pressable>
            <Pressable onPress={() => changeTrack(1)} accessibilityRole="button" accessibilityLabel="Morceau suivant" style={styles.transportButton}>
              <Ionicons name="play-skip-forward" size={27} color={colors.ink} />
            </Pressable>
          </View>

          <View style={styles.volumeRow}>
            <Ionicons name={volume === 0 ? 'volume-mute' : 'volume-low'} size={18} color={colors.muted} />
            <Slider
              style={styles.volumeSlider}
              minimumValue={0}
              maximumValue={1}
              value={volume}
              minimumTrackTintColor={colors.green}
              maximumTrackTintColor={colors.line}
              thumbTintColor={colors.green}
              onValueChange={updateVolume}
              accessibilityLabel="Volume"
            />
            <Ionicons name="volume-high" size={18} color={colors.muted} />
          </View>
          {status.error ? <Text style={styles.error}>{status.error}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors) => StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.42)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paper, borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingBottom: 30, paddingHorizontal: 24, paddingTop: 12 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  iconButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  headerLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cover: { alignSelf: 'center', aspectRatio: 1, backgroundColor: colors.paleGreen, borderRadius: 8, marginBottom: 23, maxWidth: 300, width: '78%' },
  title: { color: colors.ink, fontSize: 23, fontWeight: '900', textAlign: 'center' },
  artist: { color: colors.muted, fontSize: 13, marginTop: 6, textAlign: 'center' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -7 },
  time: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
  transport: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
  transportButton: { alignItems: 'center', height: 52, justifyContent: 'center', width: 70 },
  playButton: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  volumeRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 18 },
  volumeSlider: { flex: 1 },
  error: { color: colors.terracotta, fontSize: 12, marginTop: 8, textAlign: 'center' },
});