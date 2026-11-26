import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCatalog } from '../../data/CatalogContext';
import { adminService } from '../../services/adminService';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminHeader from '../components/AdminHeader';
import AdminMenuItem from '../components/AdminMenuItem';
import AdminStatCard from '../components/AdminStatCard';

const sections = [
  { key: 'music', label: 'Musiques', detail: 'Sorties, métadonnées et fichiers', icon: 'musical-notes-outline' },
  { key: 'artists', label: 'Artistes', detail: 'Profils, biographies et photos', icon: 'people-outline' },
  { key: 'albums', label: 'Albums', detail: 'Pochettes et titres associés', icon: 'albums-outline' },
  { key: 'users', label: 'Utilisateurs', detail: 'Comptes et activité', icon: 'person-outline' },
  { key: 'playlists', label: 'Playlists', detail: 'Listes et morceaux associés', icon: 'list-outline' },
  { key: 'settings', label: 'Paramètres', detail: 'Identité et préférences', icon: 'settings-outline' },
];

export default function AdminDashboardScreen({ onNavigate, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { tracks, artists } = useCatalog();
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let active = true;
    adminService.getOverview({ musicCount: Array.isArray(tracks) ? tracks.length : 0, artistCount: Array.isArray(artists) ? artists.length : 0 })
      .then((result) => { if (active) setOverview(result); })
      .catch((error) => console.error('[AdminDashboard] Chargement des indicateurs impossible.', error));
    return () => { active = false; };
  }, [artists, tracks]);

  const stats = [
    { label: 'Utilisateurs', value: overview?.users ?? '—', icon: 'people-outline' },
    { label: 'Artistes', value: overview?.artists ?? '—', icon: 'mic-outline' },
    { label: 'Musiques', value: overview?.tracks ?? '—', icon: 'musical-notes-outline' },
    { label: 'Albums', value: overview?.albums ?? '—', icon: 'albums-outline' },
    { label: 'Playlists', value: overview?.playlists ?? '—', icon: 'list-outline' },
    { label: 'Écoutes', value: overview?.plays ?? '—', icon: 'headset-outline' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <AdminHeader title="Tableau de bord" subtitle="Vue d’ensemble de Mali Audio" onLogout={onLogout} />
      {overview?.isDemo ? <Text style={styles.demo}>INDICATEURS DE DÉMONSTRATION · À CONNECTER À L’API</Text> : null}
      {!overview ? <ActivityIndicator color={colors.green} style={styles.loading} /> : <View style={styles.grid}>{stats.map((stat, index) => <AdminStatCard key={stat.label} {...stat} accent={index === 0 ? colors.lime : undefined} />)}</View>}
      <Text style={styles.sectionTitle}>Gestion</Text>
      <View style={styles.menu}>{sections.map((section) => <AdminMenuItem key={section.key} {...section} onPress={() => onNavigate(section.key)} />)}</View>
      <Text style={styles.sectionTitle}>Activité récente</Text>
      <View style={styles.activity}>{overview?.recentActivity?.length ? overview.recentActivity.map((item) => <View key={item.id} style={styles.activityRow}><View style={styles.activityDot} /><View style={styles.activityCopy}><Text style={styles.activityTitle}>{item.label}</Text><Text style={styles.activityDetail}>{item.detail}</Text></View><Text style={styles.activityDate}>{new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</Text></View>) : <Text style={styles.empty}>Aucune activité récente.</Text>}</View>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 30, paddingHorizontal: 17, paddingTop: 14 },
  demo: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.55, marginBottom: 11 },
  loading: { marginVertical: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800', marginBottom: 10, marginTop: 25 },
  menu: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, overflow: 'hidden' },
  activity: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, paddingHorizontal: 12 },
  activityRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 10, minHeight: 58 },
  activityDot: { backgroundColor: colors.yellow, borderRadius: 5, height: 9, width: 9 },
  activityCopy: { flex: 1, gap: 4 },
  activityTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  activityDetail: { color: colors.muted, fontSize: 10 },
  activityDate: { color: colors.muted, fontSize: 9 },
  empty: { color: colors.muted, fontSize: 12, paddingVertical: 18 },
});