import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';

const sections = [
  { key: 'tracks', label: 'Musiques', singular: 'musique', addRoute: 'AddMusic', editRoute: 'EditMusic', icon: 'musical-notes-outline' },
  { key: 'artists', label: 'Artistes', singular: 'artiste', addRoute: 'AddArtist', editRoute: 'EditArtist', icon: 'people-outline' },
  { key: 'stories', label: 'Actualités', singular: 'actualité', addRoute: 'AddNews', editRoute: 'EditNews', icon: 'newspaper-outline' },
];

export default function AdminScreen({ onNavigate }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const catalog = useCatalog();
  const { deleteRecord } = catalog;

  const remove = (section, record) => Alert.alert(
    `Supprimer ${section.singular}`,
    `« ${record.title || record.name} » sera retiré du catalogue local.`,
    [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteRecord(section.key, record.id) },
    ],
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={() => onNavigate('Profil')} style={styles.back} accessibilityRole="button">
        <Ionicons name="arrow-back" size={19} color={colors.green} />
        <Text style={styles.backText}>Profil</Text>
      </Pressable>
      <Text style={styles.eyebrow}>GESTION DU CONTENU</Text>
      <Text style={styles.heading}>Administration</Text>
      <Text style={styles.subheading}>Gérez le catalogue local de Mali Audio.</Text>

      <View style={styles.summary}>
        {sections.map((section, index) => (
          <View key={section.key} style={[styles.summaryItem, index > 0 && styles.summaryDivider]}>
            <Text style={styles.summaryCount}>{catalog[section.key].length}</Text>
            <Text style={styles.summaryLabel}>{section.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>

      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleWrap}>
              <Ionicons name={section.icon} size={18} color={colors.green} />
              <Text style={styles.sectionTitle}>{section.label}</Text>
              <Text style={styles.count}>{catalog[section.key].length}</Text>
            </View>
            <Pressable onPress={() => onNavigate(section.addRoute)} style={styles.addButton} accessibilityRole="button" accessibilityLabel={`Ajouter ${section.singular}`}>
              <Ionicons name="add" size={19} color={colors.white} />
            </Pressable>
          </View>
          {catalog[section.key].length ? catalog[section.key].map((record) => {
            const title = record.title || record.name;
            const detail = section.key === 'tracks'
              ? `${record.artist}${record.album ? ` · ${record.album}` : ''}`
              : section.key === 'artists' ? record.genre : `${record.category || 'ACTUALITÉ'} · ${record.date || ''}`;
            return (
              <View key={record.id} style={styles.row}>
                {record.image ? <Image source={{ uri: record.image }} style={styles.thumbnail} /> : <View style={styles.placeholder}><Ionicons name={section.icon} size={18} color={colors.green} /></View>}
                <View style={styles.rowCopy}>
                  <Text numberOfLines={1} style={styles.rowTitle}>{title}</Text>
                  <Text numberOfLines={1} style={styles.rowDetail}>{detail}</Text>
                </View>
                {section.key === 'tracks' && record.audioSource ? <Ionicons name="volume-high" size={16} color={colors.green} style={styles.audioIcon} /> : null}
                <Pressable onPress={() => onNavigate(section.editRoute, { record })} style={styles.rowAction} accessibilityRole="button" accessibilityLabel={`Modifier ${title}`}>
                  <Ionicons name="create-outline" size={19} color={colors.green} />
                </Pressable>
                <Pressable onPress={() => remove(section, record)} style={styles.rowAction} accessibilityRole="button" accessibilityLabel={`Supprimer ${title}`}>
                  <Ionicons name="trash-outline" size={18} color={colors.terracotta} />
                </Pressable>
              </View>
            );
          }) : <Text style={styles.empty}>Aucun contenu. Utilisez + pour en ajouter.</Text>}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 12 },
  back: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, marginBottom: 18, minHeight: 38 },
  backText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heading: { color: colors.ink, fontSize: 31, fontWeight: '900', marginTop: 6 },
  subheading: { color: colors.muted, fontSize: 13, marginTop: 5 },
  summary: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', marginTop: 20, paddingVertical: 14 },
  summaryItem: { alignItems: 'center', flex: 1, gap: 4 },
  summaryDivider: { borderLeftColor: colors.line, borderLeftWidth: StyleSheet.hairlineWidth },
  summaryCount: { color: colors.green, fontSize: 20, fontWeight: '900' },
  summaryLabel: { color: colors.muted, fontSize: 8, fontWeight: '800' },
  section: { marginTop: 25 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitleWrap: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  count: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  addButton: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 5, height: 34, justifyContent: 'center', width: 36 },
  row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, minHeight: 65 },
  thumbnail: { backgroundColor: colors.paleGreen, borderRadius: 5, height: 42, width: 42 },
  placeholder: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 5, height: 42, justifyContent: 'center', width: 42 },
  rowCopy: { flex: 1, gap: 4, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  rowDetail: { color: colors.muted, fontSize: 10 },
  audioIcon: { marginHorizontal: 1 },
  rowAction: { alignItems: 'center', height: 40, justifyContent: 'center', width: 32 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 17 },
});
