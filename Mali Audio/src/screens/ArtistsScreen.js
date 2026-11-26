import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArtistTile from '../components/ArtistTile';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';

export default function ArtistsScreen({ following = [], onToggleFollow }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [query, setQuery] = useState('');
  const { artists } = useCatalog();
  const filtered = useMemo(() => artists.filter((artist) => `${artist.name} ${artist.genre}`.toLowerCase().includes(query.toLowerCase())), [artists, query]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>LES VOIX DU MALI</Text>
      <Text style={styles.heading}>Artistes</Text>
      <Text style={styles.subheading}>Des légendes aux nouvelles voix.</Text>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher un artiste" placeholderTextColor={colors.muted} style={styles.input} /></View>
      <View style={styles.spotlight}><View style={styles.spotlightCopy}><Text style={styles.spotlightLabel}>PORTRAIT DU MOIS</Text><Text style={styles.spotlightName}>La voix{ '\n' }du Wassoulou</Text><Text style={styles.spotlightBy}>Oumou Sangaré</Text></View><View style={styles.sun} /><Ionicons name="mic" size={41} color={colors.greenDark} style={styles.mic} /></View>
      <View style={styles.titleRow}><Text style={styles.sectionTitle}>À découvrir</Text><Text style={styles.total}>{filtered.length} ARTISTES</Text></View>
      <View style={styles.grid}>{filtered.map((artist) => <View key={artist.id} style={styles.gridItem}><ArtistTile artist={artist} /><Pressable accessibilityRole="button" onPress={() => onToggleFollow(artist.id)} style={[styles.follow, following.includes(artist.id) && styles.following]}><Ionicons name={following.includes(artist.id) ? 'checkmark' : 'add'} size={15} color={following.includes(artist.id) ? colors.white : colors.green} /><Text style={[styles.followText, following.includes(artist.id) && styles.followTextActive]}>{following.includes(artist.id) ? 'Suivi' : 'Suivre'}</Text></Pressable></View>)}</View>
      {!filtered.length ? <Text style={styles.empty}>Aucun artiste trouvé.</Text> : null}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 17 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heading: { color: colors.ink, fontSize: 32, fontWeight: '900', marginTop: 7 },
  subheading: { color: colors.muted, fontSize: 14, marginTop: 5 },
  search: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 22, paddingHorizontal: 13 },
  input: { color: colors.ink, flex: 1, fontSize: 14, height: 46 },
  spotlight: { backgroundColor: colors.lime, borderRadius: 11, height: 167, justifyContent: 'center', marginTop: 22, overflow: 'hidden', padding: 18 },
  spotlightCopy: { zIndex: 1 },
  spotlightLabel: { color: colors.greenDark, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  spotlightName: { color: colors.greenDark, fontSize: 25, fontWeight: '900', lineHeight: 28, marginTop: 9 },
  spotlightBy: { color: colors.greenDark, fontSize: 12, marginTop: 6 },
  sun: { backgroundColor: 'rgba(255,255,255,0.48)', borderRadius: 90, height: 180, position: 'absolute', right: -20, top: -28, width: 180 },
  mic: { bottom: 20, position: 'absolute', right: 29, transform: [{ rotate: '12deg' }] },
  titleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, marginTop: 28 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  total: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  gridItem: { flexBasis: '47%', flexGrow: 1, minWidth: 140 },
  follow: { alignItems: 'center', alignSelf: 'flex-start', borderColor: colors.green, borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 3, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5 },
  following: { backgroundColor: colors.green },
  followText: { color: colors.green, fontSize: 11, fontWeight: '700' },
  followTextActive: { color: colors.white },
  empty: { color: colors.muted, paddingVertical: 24, textAlign: 'center' },
});