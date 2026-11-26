import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';

export default function NewsScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { stories } = useCatalog();
  const storyList = Array.isArray(stories) ? stories.filter((story) => story && typeof story === 'object') : [];
  const featuredStory = storyList[0];
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>LE JOURNAL</Text>
      <Text style={styles.heading}>Actualités</Text>
      <Text style={styles.subheading}>La culture malienne, en mouvement.</Text>
      {featuredStory ? (
        <View style={styles.featured}>
          {featuredStory?.image ? <Image source={{ uri: featuredStory.image }} style={styles.featuredImage} /> : <View style={[styles.featuredImage, styles.featuredImageFallback]}><Ionicons name="newspaper-outline" size={34} color={colors.green} /></View>}
          <View style={styles.featuredBody}>
            <Text style={styles.category}>{featuredStory?.category || 'ACTUALITÉS'}{featuredStory?.date ? <Text style={styles.date}> · {featuredStory.date}</Text> : null}</Text>
            <Text style={styles.featuredTitle}>{featuredStory?.title || 'Titre indisponible'}</Text>
            <Text style={styles.excerpt}>{featuredStory?.excerpt || 'Aucun résumé disponible pour le moment.'}</Text>
            <Pressable style={styles.read}><Text style={styles.readText}>Lire l’article</Text><Ionicons name="arrow-forward" size={15} color={colors.green} /></Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="newspaper-outline" size={25} color={colors.green} />
          <Text style={styles.emptyText}>Aucune actualité disponible pour le moment.</Text>
        </View>
      )}
      {storyList.length > 1 ? <View style={styles.sectionHead}><Text style={styles.sectionTitle}>À la une</Text><Text style={styles.count}>LES DERNIÈRES HISTOIRES</Text></View> : null}
      {storyList.length > 1 ? storyList.slice(1).map((story, index) => (
        <Pressable key={story?.id ?? `story-${index}`} style={styles.story}>
          {story?.image ? <Image source={{ uri: story.image }} style={styles.storyImage} /> : <View style={[styles.storyImage, styles.storyImageFallback]}><Ionicons name="newspaper-outline" size={22} color={colors.green} /></View>}
          <View style={styles.storyBody}>
            <Text style={styles.category}>{story?.category || 'ACTUALITÉS'}{story?.date ? <Text style={styles.date}> · {story.date}</Text> : null}</Text>
            <Text style={styles.storyTitle}>{story?.title || 'Titre indisponible'}</Text>
            <Text numberOfLines={2} style={styles.excerpt}>{story?.excerpt || 'Aucun résumé disponible pour le moment.'}</Text>
            <Text style={styles.storyLink}>Continuer la lecture <Ionicons name="arrow-forward" size={12} color={colors.green} /></Text>
          </View>
        </Pressable>
      )) : null}
      <Text style={styles.end}>MALI AUDIO · LE JOURNAL MUSICAL DU MALI</Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 17 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heading: { color: colors.ink, fontSize: 32, fontWeight: '900', marginTop: 7 },
  subheading: { color: colors.muted, fontSize: 14, marginTop: 5 },
  featured: { backgroundColor: colors.white, borderRadius: 10, marginTop: 23, overflow: 'hidden' },
  featuredImage: { backgroundColor: colors.paleGreen, height: 205, width: '100%' },
  featuredImageFallback: { alignItems: 'center', justifyContent: 'center' },
  featuredBody: { padding: 16 },
  category: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  date: { color: colors.muted, fontWeight: '600' },
  featuredTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', lineHeight: 26, marginTop: 9 },
  excerpt: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 7 },
  read: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 14 },
  readText: { color: colors.green, fontSize: 12, fontWeight: '800' },
  sectionHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: 29 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  count: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  story: { backgroundColor: colors.white, borderRadius: 9, flexDirection: 'row', marginBottom: 12, minHeight: 132, overflow: 'hidden' },
  storyImage: { backgroundColor: colors.paleGreen, width: '35%' },
  storyImageFallback: { alignItems: 'center', justifyContent: 'center' },
  storyBody: { flex: 1, justifyContent: 'center', padding: 12 },
  storyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', lineHeight: 18, marginTop: 7 },
  storyLink: { color: colors.green, fontSize: 10, fontWeight: '700', marginTop: 9 },
  empty: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, gap: 9, justifyContent: 'center', marginTop: 23, minHeight: 150, padding: 18 },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  end: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.7, paddingTop: 14, textAlign: 'center' },
});