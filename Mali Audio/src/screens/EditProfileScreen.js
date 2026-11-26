import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useAppTheme } from '../styles/ThemeContext';

export default function EditProfileScreen({ onNavigate }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  const save = async () => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setMessage('Profil mis à jour.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onNavigate('Profil')} style={styles.back} accessibilityRole="button">
        <Ionicons name="arrow-back" size={19} color={colors.green} /><Text style={styles.backText}>Profil</Text>
      </Pressable>
      <Text style={styles.eyebrow}>VOTRE COMPTE</Text>
      <Text style={styles.heading}>Informations personnelles</Text>
      <Text style={styles.subtitle}>Modifiez les informations associées à votre compte.</Text>
      <Text style={styles.label}>Nom</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} autoCapitalize="words" textContentType="name" />
      <Text style={styles.label}>Adresse email</Text>
      <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.success}>{message}</Text>}
      <Pressable onPress={save} disabled={busy} style={[styles.submit, busy && styles.disabled]} accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Enregistrer</Text>}
      </Pressable>
      <Pressable onPress={() => onNavigate('MotDePasse')} style={styles.passwordLink} accessibilityRole="button">
        <Ionicons name="key-outline" size={18} color={colors.green} />
        <Text style={styles.passwordLinkText}>Modifier le mot de passe</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 30, paddingHorizontal: 22, paddingTop: 18 },
  back: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 40 },
  backText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 20 },
  heading: { color: colors.ink, fontSize: 26, fontWeight: '900', marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 20, marginTop: 7 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 15 },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 13 },
  error: { color: colors.terracotta, fontSize: 13, marginTop: 14 },
  success: { color: colors.green, fontSize: 13, marginTop: 14 },
  submit: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 8, justifyContent: 'center', marginTop: 22, minHeight: 50 },
  disabled: { opacity: 0.65 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  passwordLink: { alignItems: 'center', backgroundColor: colors.white, borderRadius: 8, flexDirection: 'row', gap: 10, marginTop: 12, minHeight: 54, paddingHorizontal: 14 },
  passwordLinkText: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '700' },
});