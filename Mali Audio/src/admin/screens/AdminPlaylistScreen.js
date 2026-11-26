import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { playlistService } from '../../services/playlistService';
import { useAuth } from '../../auth/AuthContext';
import { adminService } from '../../services/adminService';
import { useCatalog } from '../../data/CatalogContext';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminField from '../components/AdminField';
import AdminHeader from '../components/AdminHeader';

export default function AdminPlaylistScreen({ onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { tracks } = useCatalog();
  const { token } = useAuth();
  const safeTracks = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
  const [playlists, setPlaylists] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = async () => setPlaylists(await playlistService.list(token));

  useEffect(() => { refresh().catch((requestError) => setError(requestError.message)); }, [token]);
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTrack = (id) => setForm((current) => ({ ...current, trackIds: current.trackIds.includes(id) ? current.trackIds.filter((trackId) => trackId !== id) : [...current.trackIds, id] }));
  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.[0]?.uri) setValue('image', result.assets[0].uri);
  };
  const save = async () => {
    if (!form?.name?.trim()) { setError('Le nom de la playlist est obligatoire.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { ...form, name: form.name.trim() };
      if (form.id) await playlistService.update(form.id, payload, token);
      else await playlistService.create(payload, token);
      adminService.recordActivity(form.id ? 'Playlist modifiée' : 'Playlist créée', payload.name);
      setForm(null); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const remove = (playlist) => Alert.alert('Supprimer cette playlist ?', playlist.name, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => { try { await playlistService.remove(playlist.id, token); await refresh(); } catch (requestError) { setError(requestError.message); } } },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AdminHeader title="Playlists" subtitle="Collections enregistrées sur le serveur" onBack={onBack} onLogout={onLogout} />
      {form ? <View style={styles.form}>
        <Text style={styles.formTitle}>{form.id ? 'Modifier la playlist' : 'Créer une playlist'}</Text>
        <AdminField label="Nom *" value={form.name} onChangeText={(value) => setValue('name', value)} />
        <AdminField label="Description" value={form.description} onChangeText={(value) => setValue('description', value)} multiline />
        <Pressable onPress={pickCover} style={styles.cover}>{form.image ? <Image source={{ uri: form.image }} style={styles.coverImage} /> : <Ionicons name="image-outline" size={20} color={colors.green} />}<Text style={styles.coverText}>Choisir une couverture</Text></Pressable>
        <View style={styles.switchRow}><Text style={styles.label}>Playlist publique</Text><Switch value={Boolean(form.isPublic)} onValueChange={(value) => setValue('isPublic', value)} trackColor={{ false: colors.line, true: colors.green }} /></View>
        <Text style={styles.label}>Musiques associées</Text>
        {safeTracks.map((track) => <Pressable key={track.id} onPress={() => toggleTrack(track.id)} style={styles.track}><Ionicons name={form.trackIds.includes(track.id) ? 'checkbox' : 'square-outline'} size={19} color={colors.green} /><Text numberOfLines={1} style={styles.trackText}>{track.title} · {track.artist}</Text></Pressable>)}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}><Pressable onPress={() => setForm(null)} style={styles.cancel}><Text style={styles.cancelText}>Annuler</Text></Pressable><Pressable disabled={busy} onPress={save} style={styles.save}><Text style={styles.saveText}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Text></Pressable></View>
      </View> : <>
        <Pressable onPress={() => { setError(''); setForm({ name: '', description: '', image: '', isPublic: false, trackIds: [] }); }} style={styles.add}><Ionicons name="add" size={19} color={colors.white} /><Text style={styles.addText}>Créer une playlist</Text></Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {playlists.length ? playlists.map((playlist) => <View key={playlist.id} style={styles.row}>{playlist.image ? <Image source={{ uri: playlist.image }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="list-outline" size={19} color={colors.green} /></View>}<View style={styles.copy}><Text style={styles.name}>{playlist.name}</Text><Text style={styles.detail}>{(playlist.trackIds || []).length} titres · {playlist.isPublic ? 'Publique' : 'Privée'}</Text></View><Pressable onPress={() => setForm({ ...playlist, trackIds: [...(playlist.trackIds || [])] })} style={styles.icon}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable><Pressable onPress={() => remove(playlist)} style={styles.icon}><Ionicons name="trash-outline" size={18} color={colors.terracotta} /></Pressable></View>) : <Text style={styles.empty}>Aucune playlist pour le moment.</Text>}
      </>}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, padding: 18, paddingTop: 14 },
  form: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, padding: 13 },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 13 },
  cover: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: 7, flexDirection: 'row', gap: 9, marginBottom: 13, minHeight: 48, paddingHorizontal: 10 },
  coverImage: { borderRadius: 5, height: 34, width: 34 },
  coverText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  switchRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 49 },
  track: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 37 },
  trackText: { color: colors.ink, flex: 1, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 15 },
  cancel: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 43 },
  cancelText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  save: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 7, flex: 1, justifyContent: 'center', minHeight: 43 },
  saveText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  add: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.green, borderRadius: 7, flexDirection: 'row', gap: 5, minHeight: 40, paddingHorizontal: 12 },
  addText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  demo: { color: colors.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7, marginTop: 17 },
  row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 9, minHeight: 67 },
  image: { backgroundColor: colors.paleGreen, borderRadius: 6, height: 45, width: 45 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 11 },
  icon: { alignItems: 'center', height: 39, justifyContent: 'center', width: 31 },
  error: { color: colors.terracotta, fontSize: 12, marginTop: 8 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
});