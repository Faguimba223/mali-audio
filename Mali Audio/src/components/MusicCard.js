import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles/ThemeContext';

export default function MusicCard({ track, isPlaying, isFavorite, onTogglePlay, onToggleFavorite }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.artworkWrap}>
        <Image source={{ uri: track.image }} style={styles.artwork} />
        <Pressable onPress={() => onTogglePlay?.(track.id)} accessibilityRole="button" accessibilityLabel={`${isPlaying ? 'Mettre en pause' : 'Lire'} ${track.title}`} style={({ pressed }) => [styles.play, pressed && styles.pressed]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={19} color={colors.ink} />
        </Pressable>
        <Pressable onPress={onToggleFavorite} accessibilityRole="button" accessibilityLabel={`${isFavorite ? 'Retirer des' : 'Ajouter aux'} favoris: ${track.title}`} hitSlop={8} style={styles.favorite}>
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={16} color={isFavorite ? colors.terracotta : colors.white} />
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.title}>{track.title}</Text>
      <Text numberOfLines={1} style={styles.artist}>{track.artist}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { marginRight: 14, width: 150 },
  artworkWrap: { aspectRatio: 1, backgroundColor: colors.paleGreen, borderRadius: 10, overflow: 'hidden', position: 'relative', width: '100%' },
  artwork: { height: '100%', width: '100%' },
  play: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: 22, bottom: 10, height: 42, justifyContent: 'center', position: 'absolute', right: 10, width: 42 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.94 }] },
  favorite: { alignItems: 'center', backgroundColor: 'rgba(15, 24, 18, 0.55)', borderRadius: 16, height: 32, justifyContent: 'center', position: 'absolute', right: 9, top: 9, width: 32 },
  title: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10 },
  artist: { color: colors.muted, fontSize: 12, marginTop: 3 },
});