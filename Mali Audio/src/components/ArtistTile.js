import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../styles/ThemeContext';

export default function ArtistTile({ artist, onPress, compact = false }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <Pressable onPress={onPress} style={[styles.tile, compact && styles.compact]}>
      <Image source={{ uri: artist.image }} style={[styles.image, compact && styles.compactImage]} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.name}>{artist.name}</Text>
        <Text style={styles.genre}>{artist.genre}</Text>
      </View>
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  tile: { flex: 1, minWidth: 145 },
  image: { aspectRatio: 0.88, backgroundColor: colors.paleGreen, borderRadius: 10, width: '100%' },
  copy: { gap: 4, paddingTop: 9 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  genre: { color: colors.muted, fontSize: 12 },
  compact: { flexDirection: 'row', alignItems: 'center', gap: 13, minWidth: 0, paddingVertical: 7 },
  compactImage: { aspectRatio: 1, borderRadius: 30, height: 58, width: 58 },
});