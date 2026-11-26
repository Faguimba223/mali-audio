import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { albumService } from '../../services/albumService';
import { adminService } from '../../services/adminService';
import { useCatalog } from '../../data/CatalogContext';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminField from '../components/AdminField';
import AdminHeader from '../components/AdminHeader';

export default function AdminAlbumScreen({ onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { tracks, artists } = useCatalog();
  const { token } = useAuth();
  const safeTracks = Array.isArray(tracks) ? tracks.filter(Boolean) : [];
  const safeArtists = Array.isArray(artists) ? artists.filter(Boolean) : [];
  const [albums, setAlbums] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedArtist = useMemo(() => safeArtists.find((artist) => artist.id === form?.artistId), [safeArtists, form?.artistId]);

  const refresh = async () => setAlbums(await albumService.list(token));
  useEffect(() => { refresh().catch((requestError) => setError(requestError.message)); }, [token]);
  const setValue = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.85 });
    if (!result.canceled && result.assets?.[0]?.uri) setValue('image', result.assets[0].uri);
  };
  const toggleTrack = (trackId) => setForm((current) => ({ ...current, trackIds: current.trackIds.includes(trackId) ? current.trackIds.filter((id) => id !== trackId) : [...current.trackIds, trackId] }));
  const save = async () => {
    if (!form?.title?.trim() || !selectedArtist) { setError('Le titre de l’album et un artiste sont obligatoires.'); return; }
    setBusy(true); setError('');
    try {
      const payload = { ...form, title: form.title.trim(), artist: selectedArtist.name };
      if (form.id) await albumService.update(form.id, payload, token);
      else await albumService.create(payload, token);
      adminService.recordActivity(form.id ? 'Album modifié' : 'Album créé', payload.title);
      setForm(null); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };
  const remove = (album) => Alert.alert('Supprimer cet album ?', album.title, [
    { text: 'Annuler', style: 'cancel' },
    { text: 'Supprimer', style: 'destructive', onPress: async () => { try { await albumService.remove(album.id, token); await refresh(); } catch (requestError) { setError(requestError.message); } } },
  ]);

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <AdminHeader title="Albums" subtitle="Associer artistes, pochettes et musiques" onBack={onBack} onLogout={onLogout} />
      {form ? <View style={styles.form}>
        <Text style={styles.formTitle}>{form.id ? 'Modifier l’album' : 'Créer un album'}</Text>
        <AdminField label="Nom de l’album *" value={form.title} onChangeText={(value) => setValue('title', value)} />
        <Text style={styles.label}>Artiste associé</Text>
        <View style={styles.options}>{safeArtists.map((artist) => <Pressable key={artist.id} onPress={() => setValue('artistId', artist.id)} style={[styles.option, form.artistId === artist.id && styles.optionSelected]}><Text style={[styles.optionText, form.artistId === artist.id && styles.optionTextSelected]}>{artist.name}</Text></Pressable>)}</View>
        <AdminField label="Description" value={form.description} onChangeText={(value) => setValue('description', value)} multiline />
        <Pressable onPress={pickCover} style={styles.coverPick}>{form.image ? <Image source={{ uri: form.image }} style={styles.coverPreview} /> : <Ionicons name="image-outline" size={19} color={colors.green} />}<Text style={styles.coverText}>Ajouter / modifier la couverture</Text></Pressable>
        <Text style={styles.label}>Musiques de l’album</Text>
        {safeTracks.map((track) => <Pressable key={track.id} onPress={() => toggleTrack(track.id)} style={styles.trackOption}><Ionicons name={form.trackIds.includes(track.id) ? 'checkbox' : 'square-outline'} size={19} color={colors.green} /><Text numberOfLines={1} style={styles.trackText}>{track.title} · {track.artist}</Text></Pressable>)}
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.actions}><Pressable onPress={() => setForm(null)} style={styles.cancel}><Text style={styles.cancelText}>Annuler</Text></Pressable><Pressable disabled={busy} onPress={save} style={styles.save}><Text style={styles.saveText}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Text></Pressable></View>
      </View> : <>
        <Pressable onPress={() => { setError(''); setForm({ title: '', artistId: '', description: '', image: '', trackIds: [] }); }} style={styles.add}><Ionicons name="add" size={19} color={colors.white} /><Text style={styles.addText}>Créer un album</Text></Pressable>
        {!!error && <Text style={styles.error}>{error}</Text>}
        {albums.length ? albums.map((album) => <View key={album.id} style={styles.row}>{album.image ? <Image source={{ uri: album.image }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="albums-outline" size={20} color={colors.green} /></View>}<View style={styles.copy}><Text style={styles.title}>{album.title}</Text><Text style={styles.detail}>{album.artist} · {(album.trackIds || []).length} titres</Text></View><Pressable onPress={() => setForm({ ...album, trackIds: [...(album.trackIds || [])] })} style={styles.icon}><Ionicons name="create-outline" size={19} color={colors.green} /></Pressable><Pressable onPress={() => remove(album)} style={styles.icon}><Ionicons name="trash-outline" size={18} color={colors.terracotta} /></Pressable></View>) : <Text style={styles.empty}>Aucun album pour le moment.</Text>}
      </>}
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, padding: 18, paddingTop: 14 },
  form: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, padding: 13 },
  formTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 13 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  option: { backgroundColor: colors.paper, borderColor: colors.line, borderRadius: 15, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  optionSelected: { backgroundColor: colors.green, borderColor: colors.green },
  optionText: { color: colors.ink, fontSize: 11 },
  optionTextSelected: { color: colors.white, fontWeight: '700' },
  coverPick: { alignItems: 'center', backgroundColor: colors.paper, borderRadius: 7, flexDirection: 'row', gap: 10, marginBottom: 14, minHeight: 52, paddingHorizontal: 10 },
  coverPreview: { borderRadius: 5, height: 38, width: 38 },
  coverText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  trackOption: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 37 },
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
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 11 },
  icon: { alignItems: 'center', height: 39, justifyContent: 'center', width: 31 },
  error: { color: colors.terracotta, fontSize: 12, marginTop: 8 },
  empty: { color: colors.muted, fontSize: 13, paddingVertical: 24, textAlign: 'center' },
});