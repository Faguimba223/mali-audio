import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { userService } from '../../services/userService';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminHeader from '../components/AdminHeader';

export default function AdminUserScreen({ onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const filtered = useMemo(() => users, [users]);
  const refresh = async () => setUsers(await userService.list(query, token));

  useEffect(() => { refresh().catch((requestError) => setError(requestError.message)); }, [query, token]);
  const showProfile = (user) => Alert.alert(user.name, `${user.email}\nCompte ${user.active ? 'actif' : 'désactivé'}\nRôle : ${user.role}\nInscription : ${new Date(user.createdAt).toLocaleDateString('fr-FR')}`);
  const toggleActive = (user) => Alert.alert(user.active ? 'Désactiver le compte ?' : 'Activer le compte ?', user.email, [
    { text: 'Annuler', style: 'cancel' },
    { text: user.active ? 'Désactiver' : 'Activer', style: user.active ? 'destructive' : 'default', onPress: async () => { try { await userService.setActive(user.id, !user.active, token); await refresh(); } catch (requestError) { setError(requestError.message); } } },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AdminHeader title="Utilisateurs" subtitle="Comptes enregistrés sur le serveur" onBack={onBack} onLogout={onLogout} />
      <View style={styles.notice}><Ionicons name="information-circle-outline" size={17} color={colors.green} /><Text style={styles.noticeText}>Aucun mot de passe n’est exposé. La désactivation bloque aussi les sessions en cours.</Text></View>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Nom ou email" placeholderTextColor={colors.muted} style={styles.input} /></View>
      <Text style={styles.count}>{filtered.length} COMPTES</Text>
      {!!error && <Text style={styles.error}>{error}</Text>}
      {filtered.length ? filtered.map((user) => <View key={user.id} style={styles.row}>
        <View style={styles.avatar}><Text style={styles.initial}>{user.name?.[0]?.toUpperCase() || 'U'}</Text></View>
        <View style={styles.copy}><Text numberOfLines={1} style={styles.name}>{user.name}</Text><Text numberOfLines={1} style={styles.email}>{user.email}</Text><Text style={styles.meta}>{user.role} · inscrit le {new Date(user.createdAt).toLocaleDateString('fr-FR')}</Text></View>
        <Pressable onPress={() => showProfile(user)} style={styles.icon} accessibilityRole="button" accessibilityLabel="Voir le profil"><Ionicons name="eye-outline" size={19} color={colors.green} /></Pressable>
        <Pressable onPress={() => toggleActive(user)} style={styles.icon} accessibilityRole="button" accessibilityLabel={user.active ? 'Désactiver' : 'Activer'}><Ionicons name={user.active ? 'pause-circle-outline' : 'checkmark-circle-outline'} size={20} color={user.active ? colors.terracotta : colors.green} /></Pressable>
      </View>) : <Text style={styles.empty}>{query ? 'Aucun utilisateur trouvé.' : 'Aucun compte.'}</Text>}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, padding: 17, paddingTop: 14 },
  notice: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 7, flexDirection: 'row', gap: 8, marginBottom: 14, padding: 11 },
  noticeText: { color: colors.greenDark, flex: 1, fontSize: 10, lineHeight: 15 },
  search: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 45, paddingHorizontal: 12 },
  input: { color: colors.ink, flex: 1, fontSize: 13 },
  count: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginTop: 20 },
  row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, minHeight: 77 },
  avatar: { alignItems: 'center', backgroundColor: colors.lime, borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  initial: { color: colors.greenDark, fontSize: 16, fontWeight: '900' },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  name: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  email: { color: colors.muted, fontSize: 10 },
  meta: { color: colors.muted, fontSize: 9 },
  icon: { alignItems: 'center', height: 38, justifyContent: 'center', width: 29 },
  error: { color: colors.terracotta, fontSize: 12, marginTop: 12 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
});