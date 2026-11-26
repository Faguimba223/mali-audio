import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme } from '../../styles/ThemeContext';
import AdminHeader from '../components/AdminHeader';

export default function AdminLoginScreen({ onBack }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { login, logout } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async () => {
    setError('');
    if (!identifier.trim() || !password) {
      setError('Saisissez votre identifiant ou votre email et votre mot de passe.');
      return;
    }
    setBusy(true);
    try {
      const user = await login({ identifier: identifier.trim(), password });
      if (user?.role !== 'admin') {
        await logout();
        setError('Ce compte ne possède pas le rôle administrateur.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Connexion administrateur impossible.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AdminHeader title="Connexion admin" subtitle="Accès réservé au personnel autorisé" onBack={onBack} />
        <View style={styles.mark}><Ionicons name="shield-checkmark" size={25} color={colors.lime} /></View>
        <Text style={styles.heading}>Espace sécurisé</Text>
        <Text style={styles.subheading}>Connectez-vous avec votre compte administrateur.</Text>
        <Text style={styles.label}>Identifiant ou email</Text>
        <View style={styles.inputRow}><Ionicons name="person-outline" size={18} color={colors.muted} /><TextInput value={identifier} onChangeText={setIdentifier} placeholder="admin" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={styles.input} returnKeyType="next" /></View>
        <Text style={styles.label}>Mot de passe</Text>
        <View style={styles.inputRow}><Ionicons name="lock-closed-outline" size={18} color={colors.muted} /><TextInput value={password} onChangeText={setPassword} placeholder="Mot de passe" placeholderTextColor={colors.muted} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" style={styles.input} onSubmitEditing={submit} returnKeyType="done" /><Pressable onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} /></Pressable></View>
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable onPress={submit} disabled={busy} style={[styles.submit, busy && styles.disabled]} accessibilityRole="button">{busy ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.submitText}>Se connecter</Text><Ionicons name="arrow-forward" size={17} color={colors.white} /></>}</Pressable>
        <Text style={styles.notice}>Les mots de passe ne sont ni enregistrés ni validés dans l’application.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  flex: { flex: 1 },
  content: { backgroundColor: colors.paper, flexGrow: 1, padding: 20, paddingTop: 14 },
  mark: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 15, height: 54, justifyContent: 'center', marginTop: 20, width: 54 },
  heading: { color: colors.ink, fontSize: 25, fontWeight: '900', marginTop: 17 },
  subheading: { color: colors.muted, fontSize: 13, lineHeight: 19, marginBottom: 19, marginTop: 6 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7, marginTop: 13 },
  inputRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, minHeight: 50, paddingHorizontal: 13 },
  input: { color: colors.ink, flex: 1, fontSize: 14, minHeight: 48 },
  error: { color: colors.terracotta, fontSize: 12, lineHeight: 18, marginTop: 13 },
  submit: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 8, flexDirection: 'row', gap: 9, justifyContent: 'center', marginTop: 22, minHeight: 49 },
  disabled: { opacity: 0.65 },
  submitText: { color: colors.white, fontSize: 13, fontWeight: '800' },
  notice: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 16 },
});