import { Animated, Image, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ArtistTile from '../components/ArtistTile';
import MusicCard from '../components/MusicCard';
import SectionTitle from '../components/SectionTitle';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';
import { useEffect, useRef } from 'react';

export default function HomeScreen({ onNavigate, favorites = [], onToggleFavorite, playingTrackId, onTogglePlay }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const entrance = useRef(new Animated.Value(0)).current;
  const { tracks, artists, stories } = useCatalog();
  const trackList = Array.isArray(tracks) ? tracks.filter((track) => track && typeof track === 'object') : [];
  const artistList = Array.isArray(artists) ? artists.filter((artist) => artist && typeof artist === 'object') : [];
  const storyList = Array.isArray(stories) ? stories.filter((story) => story && typeof story === 'object') : [];

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, [entrance]);

  const hasFeaturedStory = Boolean(storyList?.[0]);
  const hasFeaturedImage = Boolean(storyList?.[0]?.image);
  const hasLatestStory = Boolean(storyList?.[1]);
  const heroContent = (
    <>
      <View style={styles.heroShade} />
      <View style={styles.heroContent}>
        <Text style={styles.heroEyebrow}>{hasFeaturedStory ? 'À LA UNE · FESTIVAL' : 'BIENTÔT SUR MALI AUDIO'}</Text>
        <Text style={styles.heroTitle}>{hasFeaturedStory ? <>Bamako{ '\n' }en musique</> : <>La musique{ '\n' }nous rassemble</>}</Text>
        <Text style={styles.heroCaption}>{hasFeaturedStory ? 'Les voix du Mali, au premier plan.' : 'Les actualités arrivent bientôt.'}</Text>
        <Pressable onPress={() => onNavigate('Actualités')} style={styles.heroButton}><Text style={styles.heroButtonText}>Découvrir</Text><Ionicons name="arrow-forward" size={16} color={colors.ink} /></Pressable>
      </View>
      {hasFeaturedStory ? <View style={styles.heroPager}><View style={styles.pagerActive} /><View style={styles.pagerDot} /><View style={styles.pagerDot} /></View> : null}
    </>
  );

  return (
    <Animated.ScrollView style={{ opacity: entrance }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.brandMark}><Text style={styles.brandInitial}>M</Text></View>
        <View style={styles.brandCopy}><Text style={styles.brand}>MALI AUDIO</Text><Text style={styles.tagline}>Les sons de chez nous</Text></View>
        <Pressable style={styles.notification} accessibilityRole="button" accessibilityLabel="Notifications"><Ionicons name="notifications-outline" size={21} color={colors.ink} /></Pressable>
      </View>

      <Text style={styles.greeting}>La musique nous rassemble.</Text>
      <Pressable onPress={() => onNavigate('Musiques')} style={styles.search} accessibilityRole="button" accessibilityLabel="Rechercher un titre ou un artiste">
        <Ionicons name="search" size={19} color={colors.muted} />
        <Text style={styles.searchText}>Un titre, un artiste...</Text>
        <Ionicons name="options-outline" size={19} color={colors.green} />
      </Pressable>
      {hasFeaturedImage ? (
        <ImageBackground source={{ uri: storyList?.[0]?.image }} imageStyle={styles.heroImage} style={styles.hero}>
          {heroContent}
        </ImageBackground>
      ) : (
        <View style={[styles.hero, styles.heroFallback]}>{heroContent}</View>
      )}

      <View style={styles.section}>
        <SectionTitle title="Écoutes du moment" action="Tout voir" onPress={() => onNavigate('Musiques')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
          {trackList.slice(0, 4).map((track) => <MusicCard key={track.id} track={track} isPlaying={playingTrackId === track.id} isFavorite={favorites.includes(track.id)} onTogglePlay={onTogglePlay} onToggleFavorite={() => onToggleFavorite(track.id)} />)}
        </ScrollView>
        {!trackList.length ? <Text style={styles.empty}>Aucune musique disponible pour le moment.</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionTitle title="Nos artistes" action="Explorer" onPress={() => onNavigate('Artistes')} />
        <View style={styles.artistRow}>{artistList.slice(0, 2).map((artist) => <ArtistTile key={artist.id} artist={artist} onPress={() => onNavigate('Artistes')} />)}</View>
        {!artistList.length ? <Text style={styles.empty}>Aucun artiste disponible pour le moment.</Text> : null}
      </View>

      <Pressable onPress={() => onNavigate('Actualités')} style={styles.newsTeaser}>
        {storyList?.[1]?.image ? <Image source={{ uri: storyList?.[1]?.image }} style={styles.newsImage} /> : <View style={[styles.newsImage, styles.newsImageFallback]}><Ionicons name="newspaper-outline" size={28} color={colors.green} /></View>}
        <View style={styles.newsCopy}>
          <Text style={styles.newsLabel}>À LIRE · {storyList?.[1]?.category || 'ACTUALITÉS'}</Text>
          <Text numberOfLines={2} style={styles.newsTitle}>{storyList?.[1]?.title || 'Les actualités arrivent bientôt'}</Text>
          <Text style={styles.newsLink}>{hasLatestStory ? 'Lire l’article' : 'Découvrir bientôt'} <Ionicons name="arrow-forward" size={12} color={colors.green} /></Text>
        </View>
      </Pressable>
      <Text style={styles.footer}>MALI AUDIO · AU RYTHME DE NOS RACINES</Text>
    </Animated.ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, paddingBottom: 22, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', paddingBottom: 24, paddingTop: 10 },
  brandMark: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  brandInitial: { color: colors.lime, fontSize: 23, fontWeight: '900' },
  brandCopy: { flex: 1, gap: 2, paddingLeft: 10 },
  brand: { color: colors.ink, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  tagline: { color: colors.muted, fontSize: 11 },
  notification: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 21, borderWidth: 1, height: 42, justifyContent: 'center', width: 42 },
  greeting: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: 0, lineHeight: 31, marginBottom: 15 },
  search: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, flexDirection: 'row', gap: 11, marginBottom: 18, minHeight: 48, paddingHorizontal: 13 },
  searchText: { color: colors.muted, flex: 1, fontSize: 13 },
  hero: { borderRadius: 14, height: 242, justifyContent: 'flex-end', overflow: 'hidden' },
  heroFallback: { backgroundColor: colors.greenDark },
  heroImage: { borderRadius: 14 },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13, 32, 22, 0.54)' },
  heroContent: { padding: 20 },
  heroEyebrow: { color: colors.lime, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: colors.white, fontSize: 31, fontWeight: '900', lineHeight: 34, marginTop: 9 },
  heroCaption: { color: '#F1F2EC', fontSize: 13, marginTop: 7 },
  heroButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.yellow, borderRadius: 7, flexDirection: 'row', gap: 9, marginTop: 14, paddingHorizontal: 13, paddingVertical: 9 },
  heroButtonText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  heroPager: { flexDirection: 'row', gap: 5, position: 'absolute', right: 17, top: 17 },
  pagerActive: { backgroundColor: colors.lime, borderRadius: 4, height: 6, width: 18 },
  pagerDot: { backgroundColor: 'rgba(255,255,255,0.68)', borderRadius: 4, height: 6, width: 6 },
  section: { marginTop: 29 },
  cards: { paddingRight: 6 },
  artistRow: { flexDirection: 'row', gap: 13 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 14, textAlign: 'center' },
  newsTeaser: { backgroundColor: colors.white, borderRadius: 10, flexDirection: 'row', marginTop: 29, overflow: 'hidden' },
  newsImage: { backgroundColor: colors.paleGreen, height: 135, width: '38%' },
  newsImageFallback: { alignItems: 'center', justifyContent: 'center' },
  newsCopy: { flex: 1, justifyContent: 'center', padding: 13 },
  newsLabel: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  newsTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 19, marginTop: 8 },
  newsLink: { color: colors.green, fontSize: 11, fontWeight: '700', marginTop: 12 },
  footer: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingTop: 24, textAlign: 'center' },
});