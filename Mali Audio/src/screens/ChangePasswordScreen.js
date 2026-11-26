import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useAppTheme } from '../styles/ThemeContext';

export default function ChangePasswordScreen({ onNavigate }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const save = async () => {
    setError('');
    setMessage('');
    if (newPassword !== confirmation) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      setMessage('Mot de passe modifié. Vos autres sessions ont été fermées.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => onNavigate('ModifierProfil')} style={styles.back} accessibilityRole="button">
        <Ionicons name="arrow-back" size={19} color={colors.green} /><Text style={styles.backText}>Profil</Text>
      </Pressable>
      <Text style={styles.eyebrow}>SÉCURITÉ</Text>
      <Text style={styles.heading}>Mot de passe</Text>
      <Text style={styles.subtitle}>Choisissez un mot de passe d’au moins 8 caractères.</Text>
      <PasswordField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} hidden={!showPasswords} />
      <PasswordField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} hidden={!showPasswords} />
      <PasswordField label="Confirmer le nouveau mot de passe" value={confirmation} onChangeText={setConfirmation} hidden={!showPasswords} />
      <Pressable onPress={() => setShowPasswords((visible) => !visible)} style={styles.visibility} accessibilityRole="button">
        <Ionicons name={showPasswords ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.green} />
        <Text style={styles.visibilityText}>{showPasswords ? 'Masquer les mots de passe' : 'Afficher les mots de passe'}</Text>
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!!message && <Text style={styles.success}>{message}</Text>}
      <Pressable onPress={save} disabled={busy} style={[styles.submit, busy && styles.disabled]} accessibilityRole="button">
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>Mettre à jour</Text>}
      </Pressable>
    </ScrollView>
  );
}

function PasswordField({ label, value, onChangeText, hidden }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} style={styles.input} secureTextEntry={hidden} autoCapitalize="none" autoCorrect={false} textContentType="newPassword" />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 30, paddingHorizontal: 22, paddingTop: 18 },
  back: { alignItems: 'center', flexDirection: 'row', gap: 7, minHeight: 40 },
  backText: { color: colors.green, fontSize: 13, fontWeight: '700' },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 20 },
  heading: { color: colors.ink, fontSize: 28, fontWeight: '900', marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 16, marginTop: 7 },
  field: { marginTop: 13 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, color: colors.ink, fontSize: 15, minHeight: 50, paddingHorizontal: 13 },
  visibility: { alignItems: 'center', alignSelf: 'flex-end', flexDirection: 'row', gap: 6, marginTop: 12 },
  visibilityText: { color: colors.green, fontSize: 12, fontWeight: '700' },
  error: { color: colors.terracotta, fontSize: 13, marginTop: 14 },
  success: { color: colors.green, fontSize: 13, lineHeight: 19, marginTop: 14 },
  submit: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 8, justifyContent: 'center', marginTop: 22, minHeight: 50 },
  disabled: { opacity: 0.65 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
});