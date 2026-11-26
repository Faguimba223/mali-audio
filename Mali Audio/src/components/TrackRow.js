import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles/ThemeContext';

export default function TrackRow({ track, index, onToggleFavorite, isFavorite = false, onTogglePlay, isPlaying = false }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.index}>{String(index + 1).padStart(2, '0')}</Text>
      <Image source={{ uri: track.image }} style={styles.cover} />
      <View style={styles.details}>
        <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
        <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
      </View>
      <Text style={styles.duration}>{track.duration}</Text>
      <Pressable onPress={() => onTogglePlay?.(track.id)} accessibilityRole="button" accessibilityLabel={`${isPlaying ? 'Mettre en pause' : 'Lire'} ${track.title}`} hitSlop={8} style={styles.playButton}>
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={14} color={colors.ink} />
      </Pressable>
      <Pressable onPress={onToggleFavorite} accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Retirer des' : 'Ajouter aux'} favoris: ${track.title}`} hitSlop={8}>
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={isFavorite ? colors.terracotta : colors.muted} />
      </Pressable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 66, paddingVertical: 7 },
  index: { color: colors.muted, fontSize: 12, fontWeight: '700', width: 20 },
  cover: { backgroundColor: colors.paleGreen, borderRadius: 7, height: 48, width: 48 },
  details: { flex: 1, gap: 4, minWidth: 0 },
  title: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  artist: { color: colors.muted, fontSize: 12 },
  duration: { color: colors.muted, fontSize: 11, marginRight: 1 },
  playButton: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
});