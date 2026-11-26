import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrackRow from '../components/TrackRow';
import { useCatalog } from '../data/CatalogContext';
import { useAppTheme } from '../styles/ThemeContext';

const menu = [
  { icon: 'notifications-outline', title: 'Notifications', detail: 'Actualités et nouveautés' },
  { icon: 'language-outline', title: 'Langue', detail: 'Français' },
  { icon: 'call-outline', title: 'Aide & contact', detail: 'Appeler le 73611046', phone: '73611046' },
];

export default function ProfileScreen({ favorites, onToggleFavorite, playingTrackId, onTogglePlay, isDark, onToggleTheme, followingCount = 0, onNavigate, user, authLoading, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { tracks } = useCatalog();
  const savedTracks = tracks.filter((track) => favorites.includes(track.id));
  const initial = user?.name?.trim()?.[0]?.toUpperCase() || 'M';
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '';
  const signOut = () => Alert.alert('Déconnexion', 'Voulez-vous fermer votre session ?', [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Déconnexion', style: 'destructive', onPress: async () => {
      try {
        await onLogout();
      } catch (error) {
        Alert.alert('Déconnexion impossible', error.message);
      }
    } },
  ]);
  const callContact = async (phone) => {
    try {
      await Linking.openURL(`tel:${phone}`);
    } catch {
      Alert.alert('Appel indisponible', 'Impossible d’ouvrir l’application Téléphone sur cet appareil.');
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>VOTRE ESPACE</Text>
      <Text style={styles.heading}>Profil</Text>
      <View style={styles.profile}>
        <View style={styles.avatar}><Text style={styles.initial}>{initial}</Text></View>
        <View style={styles.identity}>
          <Text style={styles.name}>{user?.name || (authLoading ? 'Chargement du compte' : 'Votre espace')}</Text>
          <Text style={styles.member}>{user?.email || (authLoading ? ' ' : 'Connectez-vous pour retrouver votre compte')}</Text>
          {!!joined && <Text style={styles.member}>Membre depuis {joined}</Text>}
        </View>
        {!!user && <Pressable onPress={() => onNavigate('ModifierProfil')} accessibilityRole="button" accessibilityLabel="Modifier le profil" style={styles.edit}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable>}
      </View>
      {!user && !authLoading && (
        <View style={styles.authActions}>
          <Pressable onPress={() => onNavigate('Connexion')} style={styles.authPrimary} accessibilityRole="button"><Text style={styles.authPrimaryText}>Se connecter</Text></Pressable>
          <Pressable onPress={() => onNavigate('Inscription')} style={styles.authSecondary} accessibilityRole="button"><Text style={styles.authSecondaryText}>Créer un compte</Text></Pressable>
        </View>
      )}
      {authLoading && <ActivityIndicator color={colors.green} style={styles.loading} />}
      <View style={styles.stats}><View style={styles.stat}><Text style={styles.statNumber}>{savedTracks.length}</Text><Text style={styles.statLabel}>TITRES AIMÉS</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>PLAYLISTS</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statNumber}>{followingCount}</Text><Text style={styles.statLabel}>ARTISTES SUIVIS</Text></View></View>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Mes favoris</Text><Ionicons name="heart" size={17} color={colors.terracotta} /></View>
      {savedTracks.length ? savedTracks.map((track, index) => <TrackRow key={track.id} track={track} index={index} isPlaying={playingTrackId === track.id} onTogglePlay={onTogglePlay} isFavorite onToggleFavorite={() => onToggleFavorite(track.id)} />) : <View style={styles.empty}><Ionicons name="heart-outline" size={23} color={colors.green} /><Text style={styles.emptyText}>Vos titres aimés apparaîtront ici.</Text></View>}
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Préférences</Text></View>
      <View style={styles.menu}>
        <Pressable onPress={() => onNavigate('AdminSpace')} style={styles.menuRow} accessibilityRole="button">
          <View style={styles.menuIcon}><Ionicons name="shield-checkmark-outline" size={19} color={colors.green} /></View>
          <View style={styles.menuCopy}><Text style={styles.menuTitle}>{user?.role === 'admin' ? 'Espace administrateur' : 'Connexion administrateur'}</Text><Text style={styles.menuDetail}>{user?.role === 'admin' ? 'Gérer les contenus et les utilisateurs' : 'Accès réservé au personnel autorisé'}</Text></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>
        {!!user && <Pressable onPress={() => onNavigate('ModifierProfil')} style={styles.menuRow} accessibilityRole="button">
          <View style={styles.menuIcon}><Ionicons name="person-outline" size={19} color={colors.green} /></View>
          <View style={styles.menuCopy}><Text style={styles.menuTitle}>Informations personnelles</Text><Text style={styles.menuDetail}>Nom et adresse email</Text></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>}
        {!!user && <Pressable onPress={() => onNavigate('MotDePasse')} style={styles.menuRow} accessibilityRole="button">
          <View style={styles.menuIcon}><Ionicons name="key-outline" size={19} color={colors.green} /></View>
          <View style={styles.menuCopy}><Text style={styles.menuTitle}>Mot de passe</Text><Text style={styles.menuDetail}>Modifier les accès au compte</Text></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>}
        <Pressable onPress={onToggleTheme} style={styles.menuRow} accessibilityRole="switch" accessibilityState={{ checked: isDark }}>
          <View style={styles.menuIcon}><Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={19} color={colors.green} /></View>
          <View style={styles.menuCopy}><Text style={styles.menuTitle}>Mode sombre</Text><Text style={styles.menuDetail}>{isDark ? 'Activé' : 'Désactivé'}</Text></View>
          <View style={[styles.switchTrack, isDark && styles.switchActive]}><View style={[styles.switchThumb, isDark && styles.switchThumbActive]} /></View>
        </Pressable>
        {menu.map((item) => <Pressable key={item.title} onPress={item.phone ? () => callContact(item.phone) : undefined} style={styles.menuRow} accessibilityRole={item.phone ? 'button' : undefined}><View style={styles.menuIcon}><Ionicons name={item.icon} size={19} color={colors.green} /></View><View style={styles.menuCopy}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuDetail}>{item.detail}</Text></View><Ionicons name={item.phone ? 'call-outline' : 'chevron-forward'} size={17} color={colors.muted} /></Pressable>)}
        {!!user && <Pressable onPress={signOut} style={styles.menuRow} accessibilityRole="button">
          <View style={styles.menuIcon}><Ionicons name="log-out-outline" size={19} color={colors.terracotta} /></View>
          <View style={styles.menuCopy}><Text style={styles.signOutTitle}>Déconnexion</Text><Text style={styles.menuDetail}>Fermer cette session sur l’appareil</Text></View>
          <Ionicons name="chevron-forward" size={17} color={colors.muted} />
        </Pressable>}
      </View>
      <Text style={styles.version}>MALI AUDIO · VERSION 1.0.0</Text>
      <Text style={styles.attribution}>Made by FagDev</Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, paddingBottom: 30, paddingHorizontal: 20, paddingTop: 17 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  heading: { color: colors.ink, fontSize: 32, fontWeight: '900', marginTop: 7 },
  profile: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, flexDirection: 'row', marginTop: 23, padding: 16 },
  avatar: { alignItems: 'center', backgroundColor: colors.lime, borderRadius: 29, height: 58, justifyContent: 'center', width: 58 },
  initial: { color: colors.greenDark, fontSize: 25, fontWeight: '900' },
  identity: { flex: 1, gap: 4, paddingLeft: 12 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  member: { color: colors.muted, fontSize: 11 },
  authActions: { flexDirection: 'row', gap: 9, marginTop: 10 },
  authPrimary: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 45 },
  authPrimaryText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  authSecondary: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 45 },
  authSecondaryText: { color: colors.green, fontSize: 13, fontWeight: '800' },
  loading: { marginTop: 12 },
  edit: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  stats: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingVertical: 17 },
  stat: { alignItems: 'center', flex: 1, gap: 4 },
  statNumber: { color: colors.green, fontSize: 21, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 8, fontWeight: '800', textAlign: 'center' },
  divider: { backgroundColor: colors.line, height: 31, width: 1 },
  sectionHead: { alignItems: 'center', flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 27 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 9, gap: 8, paddingVertical: 18 },
  emptyText: { color: colors.muted, fontSize: 12 },
  menu: { backgroundColor: colors.white, borderRadius: 10, paddingHorizontal: 13 },
  menuRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 67 },
  menuIcon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  menuCopy: { flex: 1, gap: 4, paddingLeft: 11 },
  menuTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  menuDetail: { color: colors.muted, fontSize: 11 },
  signOutTitle: { color: colors.terracotta, fontSize: 13, fontWeight: '700' },
  switchTrack: { backgroundColor: colors.line, borderRadius: 12, height: 24, justifyContent: 'center', paddingHorizontal: 3, width: 42 },
  switchActive: { backgroundColor: colors.green },
  switchThumb: { backgroundColor: '#FFFFFF', borderRadius: 9, height: 18, width: 18 },
  switchThumbActive: { alignSelf: 'flex-end' },
  version: { color: colors.muted, fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingTop: 21, textAlign: 'center' },
  attribution: { color: colors.muted, fontSize: 10, paddingTop: 5, textAlign: 'center' },
});