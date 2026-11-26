import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useCatalog } from '../../data/CatalogContext';
import { useAuth } from '../../auth/AuthContext';
import { adminService } from '../../services/adminService';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminField from './AdminField';
import AdminHeader from './AdminHeader';
import AdminMusicItem from './AdminMusicItem';
import AdminMenuItem from './AdminMenuItem';

const emptyMusic = { title: '', artist: '', album: '', category: '', duration: '', image: '', audioSource: '', audioFileName: '', isNewRelease: false, isPopular: false };
const emptyArtist = { name: '', genre: '', biography: '', image: '' };

export default function AdminCatalogManager({ kind, onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const catalog = useCatalog();
  const { token } = useAuth();
  const isMusic = kind === 'music';
  const collection = isMusic ? catalog.tracks : catalog.artists;
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const items = Array.isArray(collection) ? collection.filter((item) => item && typeof item === 'object') : [];
  const filtered = useMemo(() => items.filter((item) => `${item.title || item.name || ''} ${item.artist || item.genre || ''} ${item.album || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);

  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.[0]?.uri) setValue('image', result.assets[0].uri);
  };
  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setValue('audioSource', result.assets[0].uri);
      setValue('audioFileName', result.assets[0].name || 'Audio sélectionné');
    }
  };
  const remove = (record) => Alert.alert('Confirmer la suppression', `Supprimer « ${record.title || record.name} » ?`, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => {
      try {
        await catalog.deleteRecord(isMusic ? 'tracks' : 'artists', record.id, token);
        adminService.recordActivity(isMusic ? 'Musique supprimée' : 'Artiste supprimé', record.title || record.name);
      } catch (requestError) { setError(requestError.message); }
    } },
  ]);
  const save = async () => {
    const required = isMusic ? ['title', 'artist'] : ['name'];
    if (required.some((key) => !String(form?.[key] || '').trim())) {
      setError(isMusic ? 'Le titre et l’artiste sont obligatoires.' : 'Le nom de l’artiste est obligatoire.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const changes = { ...form };
      if (form.id) await catalog.updateRecord(isMusic ? 'tracks' : 'artists', form.id, changes, token);
      else await catalog.createRecord(isMusic ? 'tracks' : 'artists', changes, token);
      adminService.recordActivity(form.id ? 'Contenu modifié' : 'Contenu ajouté', form.title || form.name);
      setForm(null);
    } catch (requestError) { setError(requestError.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <AdminHeader title={isMusic ? 'Musiques' : 'Artistes'} subtitle="Catalogue du serveur" onBack={onBack} onLogout={onLogout} />
      {form ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>{form.id ? 'Modifier' : 'Ajouter'} {isMusic ? 'une musique' : 'un artiste'}</Text>
          {isMusic ? <>
            <AdminField label="Titre *" value={form.title} onChangeText={(value) => setValue('title', value)} />
            <AdminField label="Artiste *" value={form.artist} onChangeText={(value) => setValue('artist', value)} />
            <AdminField label="Album" value={form.album} onChangeText={(value) => setValue('album', value)} />
            <AdminField label="Catégorie" value={form.category} onChangeText={(value) => setValue('category', value)} />
            <AdminField label="Durée" value={form.duration} onChangeText={(value) => setValue('duration', value)} placeholder="3:42" />
          </> : <>
            <AdminField label="Nom de l’artiste *" value={form.name} onChangeText={(value) => setValue('name', value)} />
            <AdminField label="Genre musical" value={form.genre} onChangeText={(value) => setValue('genre', value)} />
            <AdminField label="Biographie" value={form.biography} onChangeText={(value) => setValue('biography', value)} multiline />
          </>}
          <AdminMenuItem icon="image-outline" title={form.image ? 'Remplacer la couverture / photo' : 'Ajouter une couverture / photo'} detail={form.image ? 'Image sélectionnée' : 'Choisir dans la galerie'} onPress={pickImage} />
          {isMusic ? <AdminMenuItem icon="musical-note-outline" title={form.audioFileName || (form.audioSource ? 'Fichier audio sélectionné' : 'Ajouter un fichier audio')} detail="Sélectionner un fichier sur l’appareil" onPress={pickAudio} /> : null}
          {isMusic ? <>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Nouvelle sortie</Text><Switch value={Boolean(form.isNewRelease)} onValueChange={(value) => setValue('isNewRelease', value)} trackColor={{ false: colors.line, true: colors.green }} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>Musique populaire</Text><Switch value={Boolean(form.isPopular)} onValueChange={(value) => setValue('isPopular', value)} trackColor={{ false: colors.line, true: colors.green }} /></View>
          </> : null}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}><Pressable onPress={() => setForm(null)} style={styles.secondary}><Text style={styles.secondaryText}>Annuler</Text></Pressable><Pressable disabled={saving} onPress={save} style={styles.primary}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>Enregistrer</Text>}</Pressable></View>
        </View>
      ) : <>
        <View style={styles.search}><Ionicons name="search" size={18} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Rechercher" placeholderTextColor={colors.muted} style={styles.searchInput} /></View>
        <Pressable onPress={() => { setError(''); setForm({ ...(isMusic ? emptyMusic : emptyArtist) }); }} style={styles.addButton} accessibilityRole="button"><Ionicons name="add" size={19} color={colors.white} /><Text style={styles.addText}>Ajouter {isMusic ? 'une musique' : 'un artiste'}</Text></Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.count}>{filtered.length} {isMusic ? 'MUSIQUES' : 'ARTISTES'}</Text>
        {filtered.length ? filtered.map((record) => isMusic
          ? <AdminMusicItem key={record.id} track={record} onEdit={() => { setError(''); setForm({ ...record }); }} onDelete={() => remove(record)} />
          : <View key={record.id} style={styles.artistRow}><View style={styles.artistCopy}><Text numberOfLines={1} style={styles.artistName}>{record.name || 'Artiste sans nom'}</Text><Text numberOfLines={1} style={styles.artistDetail}>{record.genre || 'Artiste malien'}</Text><Text numberOfLines={2} style={styles.artistDetail}>{record.biography || ''}</Text></View><Pressable onPress={() => { setError(''); setForm({ ...record }); }} style={styles.action}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable><Pressable onPress={() => remove(record)} style={styles.action}><Ionicons name="trash-outline" size={18} color={colors.terracotta} /></Pressable></View>)
          : <Text style={styles.empty}>{query ? 'Aucun résultat.' : `Aucune ${isMusic ? 'musique' : 'fiche artiste'} pour le moment.`}</Text>}
      </>}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 28, paddingHorizontal: 18, paddingTop: 14 },
  form: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, padding: 14 },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 14 },
  search: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 46, paddingHorizontal: 12 },
  searchInput: { color: colors.ink, flex: 1, fontSize: 14 },
  addButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: 7, flexDirection: 'row', gap: 6, marginTop: 13, minHeight: 40, paddingHorizontal: 12 },
  addText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  count: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 22 },
  artistRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 8, minHeight: 70 },
  artistCopy: { flex: 1, gap: 4, minWidth: 0 },
  artistName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  artistDetail: { color: colors.muted, fontSize: 11 },
  action: { alignItems: 'center', height: 40, justifyContent: 'center', width: 31 },
  switchRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 49 },
  switchLabel: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 9, marginTop: 16 },
  secondary: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 45 },
  secondaryText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  primary: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 45 },
  primaryText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  error: { color: colors.terracotta, fontSize: 12, marginTop: 10 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
});