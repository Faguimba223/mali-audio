import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles/ThemeContext';
import { useAudioPlayback } from './AudioPlayer';

export default function MiniPlayer() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { currentTrack, status, openPlayer, toggleTrack } = useAudioPlayback();

  if (!currentTrack) return null;
  const progress = status.duration ? Math.min(1, status.currentTime / status.duration) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.progressTrack}>
        <View style={[styles.progress, { width: `${progress * 100}%` }]} />
      </View>
      <Pressable onPress={openPlayer} accessibilityRole="button" accessibilityLabel={`Ouvrir le lecteur pour ${currentTrack.title}`} style={styles.details}>
        <Image source={{ uri: currentTrack.image }} style={styles.cover} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.title}>{currentTrack.title}</Text>
          <Text numberOfLines={1} style={styles.artist}>{currentTrack.artist}</Text>
        </View>
      </Pressable>
      <Pressable onPress={() => toggleTrack(currentTrack.id)} accessibilityRole="button" accessibilityLabel={status.playing ? 'Mettre en pause' : 'Reprendre'} style={styles.action}>
        <Ionicons name={status.playing ? 'pause' : 'play'} size={20} color={colors.ink} />
      </Pressable>
      <Pressable onPress={openPlayer} accessibilityRole="button" accessibilityLabel="Afficher le lecteur complet" style={styles.action}>
        <Ionicons name="expand-outline" size={19} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginBottom: 8, marginHorizontal: 10, minHeight: 62, overflow: 'hidden', paddingHorizontal: 7 },
  progressTrack: { backgroundColor: colors.line, height: 2, left: 0, position: 'absolute', right: 0, top: 0 },
  progress: { backgroundColor: colors.green, height: 2 },
  details: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 9, minWidth: 0, paddingVertical: 8 },
  cover: { backgroundColor: colors.paleGreen, borderRadius: 5, height: 42, width: 42 },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  artist: { color: colors.muted, fontSize: 11 },
  action: { alignItems: 'center', height: 42, justifyContent: 'center', width: 38 },
});