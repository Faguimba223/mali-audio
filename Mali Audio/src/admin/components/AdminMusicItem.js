import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/ThemeContext';

export default function AdminMusicItem({ track, onEdit, onDelete }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      {track?.image ? <Image source={{ uri: track.image }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="musical-notes" size={19} color={colors.green} /></View>}
      <View style={styles.copy}>
        <Text numberOfLines={1} style={styles.title}>{track?.title || 'Titre sans nom'}</Text>
        <Text numberOfLines={1} style={styles.detail}>{track?.artist || 'Artiste inconnu'}{track?.album ? ` · ${track.album}` : ''}</Text>
        <View style={styles.badges}>{track?.isNewRelease ? <Text style={styles.badge}>NOUVEAU</Text> : null}{track?.isPopular ? <Text style={styles.badge}>POPULAIRE</Text> : null}</View>
      </View>
      <Pressable onPress={onEdit} style={styles.action} accessibilityRole="button" accessibilityLabel="Modifier la musique"><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable>
      <Pressable onPress={onDelete} style={styles.action} accessibilityRole="button" accessibilityLabel="Supprimer la musique"><Ionicons name="trash-outline" size={18} color={colors.terracotta} /></Pressable>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, minHeight: 76, paddingVertical: 9 },
  image: { backgroundColor: colors.paleGreen, borderRadius: 7, height: 52, width: 52 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4, minWidth: 0 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 11 },
  badges: { flexDirection: 'row', gap: 5 },
  badge: { backgroundColor: colors.paleGreen, borderRadius: 3, color: colors.green, fontSize: 8, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 5, paddingVertical: 3 },
  action: { alignItems: 'center', height: 38, justifyContent: 'center', width: 30 },
});