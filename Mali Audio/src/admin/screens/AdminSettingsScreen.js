import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { adminService } from '../../services/adminService';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminField from '../components/AdminField';
import AdminHeader from '../components/AdminHeader';

export default function AdminSettingsScreen({ onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { adminService.getSettings().then(setSettings); }, []);
  const setValue = (key, value) => { setSaved(false); setSettings((current) => ({ ...current, [key]: value })); };
  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!result.canceled && result.assets?.[0]?.uri) setValue('logo', result.assets[0].uri);
  };
  const save = async () => { const result = await adminService.updateSettings(settings); setSettings(result); setSaved(true); };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AdminHeader title="Paramètres" subtitle="Identité et préférences de l’application" onBack={onBack} onLogout={onLogout} />
      <Text style={styles.demo}>PARAMÈTRES LOCAUX · DÉMONSTRATION</Text>
      {settings ? <>
        <AdminField label="Nom de l’application" value={settings.appName} onChangeText={(value) => setValue('appName', value)} />
        <AdminField label="Informations générales" value={settings.description} onChangeText={(value) => setValue('description', value)} multiline />
        <Pressable onPress={pickLogo} style={styles.logoPick}>{settings.logo ? <Image source={{ uri: settings.logo }} style={styles.logo} /> : <View style={styles.logoPlaceholder}><Ionicons name="image-outline" size={20} color={colors.green} /></View>}<View style={styles.logoCopy}><Text style={styles.logoTitle}>Logo de l’application</Text><Text style={styles.logoDetail}>Sélectionner une image sur l’appareil</Text></View><Ionicons name="chevron-forward" size={17} color={colors.muted} /></Pressable>
        <View style={styles.toggles}>
          <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.toggleTitle}>Notifications</Text><Text style={styles.toggleDetail}>Autoriser les notifications du service</Text></View><Switch value={settings.notificationsEnabled} onValueChange={(value) => setValue('notificationsEnabled', value)} trackColor={{ false: colors.line, true: colors.green }} /></View>
          <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.toggleTitle}>Contenu éditorial</Text><Text style={styles.toggleDetail}>Afficher les actualités dans l’application</Text></View><Switch value={settings.editorialEnabled} onValueChange={(value) => setValue('editorialEnabled', value)} trackColor={{ false: colors.line, true: colors.green }} /></View>
        </View>
        <Pressable onPress={save} style={styles.save}><Ionicons name="checkmark" size={18} color={colors.white} /><Text style={styles.saveText}>{saved ? 'Modifications enregistrées' : 'Enregistrer les paramètres'}</Text></Pressable>
      </> : null}
      <Pressable onPress={() => Alert.alert('Déconnexion', 'Fermer la session administrateur ?', [{ text: 'Annuler', style: 'cancel' }, { text: 'Déconnexion', style: 'destructive', onPress: onLogout }])} style={styles.logout}><Ionicons name="log-out-outline" size={19} color={colors.terracotta} /><Text style={styles.logoutText}>Déconnexion administrateur</Text></Pressable>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, padding: 18, paddingTop: 14 },
  demo: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginBottom: 15 },
  logoPick: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 11, marginBottom: 14, minHeight: 64, paddingHorizontal: 11 },
  logo: { borderRadius: 6, height: 42, width: 42 },
  logoPlaceholder: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 6, height: 42, justifyContent: 'center', width: 42 },
  logoCopy: { flex: 1, gap: 4 },
  logoTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  logoDetail: { color: colors.muted, fontSize: 10 },
  toggles: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, marginTop: 7, paddingHorizontal: 12 },
  toggleRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, minHeight: 63 },
  toggleCopy: { flex: 1, gap: 4 },
  toggleTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  toggleDetail: { color: colors.muted, fontSize: 10 },
  save: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 7, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 18, minHeight: 46 },
  saveText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  logout: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8, marginTop: 26, minHeight: 40 },
  logoutText: { color: colors.terracotta, fontSize: 12, fontWeight: '700' },
});