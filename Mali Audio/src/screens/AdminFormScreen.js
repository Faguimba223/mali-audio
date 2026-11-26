import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles/ThemeContext';
import { useCatalog } from '../data/CatalogContext';

const definitions = {
  music: {
    collection: 'tracks',
    title: 'Musique',
    fields: [
      { key: 'title', label: 'Titre', required: true },
      { key: 'artist', label: 'Artiste', required: true },
      { key: 'album', label: 'Album' },
      { key: 'duration', label: 'Durée (ex. 3:42)' },
    ],
    imageLabel: 'Pochette',
    audio: true,
  },
  artist: {
    collection: 'artists',
    title: 'Artiste',
    fields: [
      { key: 'name', label: 'Nom de l’artiste', required: true },
      { key: 'genre', label: 'Genre musical' },
    ],
    imageLabel: 'Photo de l’artiste',
  },
  news: {
    collection: 'stories',
    title: 'Actualité',
    fields: [
      { key: 'title', label: 'Titre', required: true },
      { key: 'category', label: 'Catégorie' },
      { key: 'date', label: 'Date' },
      { key: 'excerpt', label: 'Résumé', multiline: true },
    ],
    imageLabel: 'Image de couverture',
  },
};

export default function AdminFormScreen({ entity, mode, record, onNavigate }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { createRecord, updateRecord } = useCatalog();
  const definition = definitions[entity];
  const [values, setValues] = useState(record || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(record || {});
  }, [record]);

  const setField = (key, value) => setValues((current) => ({ ...current, [key]: value }));

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setField('image', result.assets[0].uri);
  };

  const chooseAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled) {
      setField('audioSource', result.assets[0].uri);
      setField('audioFileName', result.assets[0].name);
    }
  };

  const save = async () => {
    const missing = definition.fields.find((field) => field.required && !String(values[field.key] || '').trim());
    if (missing) {
      Alert.alert('Champ obligatoire', `Renseignez le champ « ${missing.label} ».`);
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit') await updateRecord(definition.collection, record.id, values);
      else await createRecord(definition.collection, values);
      onNavigate('Admin');
    } catch {
      Alert.alert('Enregistrement impossible', 'Les données locales n’ont pas pu être enregistrées.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onNavigate('Admin')} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour à l’administration">
        <Ionicons name="arrow-back" size={19} color={colors.green} />
        <Text style={styles.backText}>Administration</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{mode === 'edit' ? 'MODIFICATION' : 'NOUVEAU CONTENU'}</Text>
      <Text style={styles.heading}>{mode === 'edit' ? 'Modifier' : 'Ajouter'} {definition.title.toLowerCase()}</Text>

      {definition.fields.map((field) => (
        <View key={field.key} style={styles.field}>
          <Text style={styles.label}>{field.label}{field.required ? ' *' : ''}</Text>
          <TextInput
            value={String(values[field.key] || '')}
            onChangeText={(value) => setField(field.key, value)}
            placeholder={field.label}
            placeholderTextColor={colors.muted}
            multiline={field.multiline}
            textAlignVertical={field.multiline ? 'top' : 'center'}
            style={[styles.input, field.multiline && styles.textArea]}
          />
        </View>
      ))}

      <Text style={styles.label}>{definition.imageLabel}</Text>
      <Pressable onPress={chooseImage} style={styles.mediaButton} accessibilityRole="button">
        {values.image ? <Image source={{ uri: values.image }} style={styles.preview} /> : <Ionicons name="image-outline" size={22} color={colors.green} />}
        <Text numberOfLines={1} style={styles.mediaText}>{values.image ? 'Remplacer l’image' : 'Choisir une image'}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Pressable>

      {definition.audio ? (
        <>
          <Text style={[styles.label, styles.audioLabel]}>Fichier audio</Text>
          <Pressable onPress={chooseAudio} style={styles.mediaButton} accessibilityRole="button">
            <Ionicons name="musical-note" size={20} color={colors.green} />
            <Text numberOfLines={1} style={styles.mediaText}>{values.audioFileName || (values.audioSource ? 'Fichier audio sélectionné' : 'Sélectionner un fichier audio')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </>
      ) : null}

      <Pressable onPress={save} disabled={saving} style={[styles.save, saving && styles.saveDisabled]} accessibilityRole="button">
        <Ionicons name="checkmark" size={18} color={colors.white} />
        <Text style={styles.saveText}>{saving ? 'Enregistrement…' : mode === 'edit' ? 'Enregistrer les modifications' : 'Publier'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 36, paddingHorizontal: 20, paddingTop: 12 },
  back: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, marginBottom: 22, minHeight: 38 },
  backText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  heading: { color: colors.ink, fontSize: 27, fontWeight: '900', marginBottom: 22, marginTop: 6 },
  field: { marginBottom: 16 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 7, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 47, paddingHorizontal: 12 },
  textArea: { minHeight: 112, paddingTop: 12 },
  mediaButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 7, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 58, paddingHorizontal: 12 },
  preview: { backgroundColor: colors.paleGreen, borderRadius: 4, height: 38, width: 38 },
  mediaText: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '600' },
  audioLabel: { marginTop: 19 },
  save: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 7, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 28, minHeight: 49, paddingHorizontal: 16 },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '800' },
});