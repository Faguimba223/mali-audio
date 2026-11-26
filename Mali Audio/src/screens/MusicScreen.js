import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrackRow from '../components/TrackRow';
import { useAudioPlayback } from '../components/AudioPlayer';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';

const filters = ['Tout', 'Afro-folk', 'Afropop', 'Traditionnel'];

export default function MusicScreen({ favorites, onToggleFavorite }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { tracks } = useCatalog();
  const audio = useAudioPlayback();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Tout');
  const visibleTracks = useMemo(() => tracks.filter((track) => {
    const matchesQuery = `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'Tout' || (filter === 'Afro-folk' && track.artist.includes('Fatoumata')) || (filter === 'Afropop' && track.artist.includes('Salif')) || (filter === 'Traditionnel' && track.artist.includes('Oumou'));
    return matchesQuery && matchesFilter;
  }), [tracks, query, filter]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>LE CATALOGUE</Text>
      <Text style={styles.heading}>Musiques</Text>
      <Text style={styles.subheading}>Les sons qui racontent le Mali.</Text>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Titre, artiste, album" placeholderTextColor={colors.muted} style={styles.input} returnKeyType="search" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((item) => <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
      </ScrollView>
      <View style={styles.featured}>
        <View style={styles.featuredText}><Text style={styles.featuredEyebrow}>SÉLECTION MALI AUDIO</Text><Text style={styles.featuredTitle}>Mandingue{ '\n' }sans frontières</Text><Text style={styles.featuredMeta}>12 titres · 48 min</Text></View>
        <Ionicons name="musical-notes" size={64} color="rgba(255,255,255,0.19)" />
      </View>
      {audio.currentTrack ? (
        <Pressable onPress={audio.openPlayer} style={styles.nowPlaying} accessibilityRole="button" accessibilityLabel="Ouvrir le lecteur audio">
          <Ionicons name="volume-high" size={17} color={colors.green} />
          <View style={styles.nowPlayingCopy}>
            <Text style={styles.nowPlayingLabel}>{audio.status.playing ? 'EN LECTURE' : 'EN PAUSE'}</Text>
            <Text numberOfLines={1} style={styles.nowPlayingTitle}>{audio.currentTrack.title} · {audio.currentTrack.artist}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
      <View style={styles.listHeader}><Text style={styles.listTitle}>À écouter</Text><Text style={styles.count}>{visibleTracks.length} TITRES</Text></View>
      {visibleTracks.length ? visibleTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} isPlaying={audio.status.playing && audio.currentTrackId === track.id} onTogglePlay={audio.toggleTrack} isFavorite={favorites.includes(track.id)} onToggleFavorite={() => onToggleFavorite(track.id)} />) : <Text style={styles.empty}>Aucun titre ne correspond à cette recherche.</Text>}
      <Text style={styles.note}>Sources audio non configurées pour ce catalogue.</Text>
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
  filters: { gap: 8, paddingTop: 14 },
  filter: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  filterActive: { backgroundColor: colors.green, borderColor: colors.green },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  featured: { alignItems: 'center', backgroundColor: colors.greenDark, borderRadius: 11, flexDirection: 'row', justifyContent: 'space-between', marginTop: 23, minHeight: 148, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 18 },
  featuredText: { gap: 7 },
  featuredEyebrow: { color: colors.lime, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  featuredTitle: { color: colors.white, fontSize: 22, fontWeight: '900', lineHeight: 26 },
  featuredMeta: { color: '#CFD8D0', fontSize: 11 },
  nowPlaying: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 12, paddingHorizontal: 12, paddingVertical: 11 },
  nowPlayingCopy: { flex: 1, gap: 3, minWidth: 0 },
  nowPlayingLabel: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  nowPlayingTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, marginTop: 29 },
  listTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  count: { color: colors.muted, fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  empty: { color: colors.muted, fontSize: 14, paddingVertical: 28, textAlign: 'center' },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 16 },
});