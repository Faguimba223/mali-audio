import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { useAppTheme } from '../styles/ThemeContext';

function AuthFormScreen({ mode, onNavigate }) {
  const isRegister = mode === 'register';
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    if (isRegister && password !== confirmation) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      if (isRegister) await register({ name: name.trim(), email: email.trim(), password });
      else await login({ email: email.trim(), password });
      onNavigate('Profil');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => onNavigate('Profil')} style={styles.back} accessibilityRole="button" accessibilityLabel="Retour au profil">
          <Ionicons name="arrow-back" size={20} color={colors.green} />
        </Pressable>
        <View style={styles.brandMark}><Ionicons name="musical-notes" size={22} color={colors.lime} /></View>
        <Text style={styles.eyebrow}>MALI AUDIO</Text>
        <Text style={styles.heading}>{isRegister ? 'Créer un compte' : 'Ravi de vous revoir'}</Text>
        <Text style={styles.subtitle}>{isRegister ? 'Votre musique, votre espace.' : 'Connectez-vous à votre espace personnel.'}</Text>

        {isRegister && <FormField label="Nom" value={name} onChangeText={setName} autoCapitalize="words" returnKeyType="next" />}
        <FormField label="Adresse email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" returnKeyType="next" />
        <FormField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          textContentType={isRegister ? 'newPassword' : 'password'}
          returnKeyType={isRegister ? 'next' : 'done'}
          trailing={(
            <Pressable onPress={() => setShowPassword((visible) => !visible)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.muted} />
            </Pressable>
          )}
        />
        {isRegister && <FormField label="Confirmer le mot de passe" value={confirmation} onChangeText={setConfirmation} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="done" />}

        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable onPress={submit} disabled={busy} style={[styles.submit, busy && styles.disabled]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>{isRegister ? 'Créer mon compte' : 'Se connecter'}</Text>}
          {!busy && <Ionicons name="arrow-forward" size={18} color={colors.white} />}
        </Pressable>
        <View style={styles.switchLine}>
          <Text style={styles.switchCopy}>{isRegister ? 'Déjà inscrit ?' : 'Nouveau sur Mali Audio ?'}</Text>
          <Pressable onPress={() => onNavigate(isRegister ? 'Connexion' : 'Inscription')} accessibilityRole="button">
            <Text style={styles.switchAction}>{isRegister ? 'Se connecter' : 'Créer un compte'}</Text>
          </Pressable>
        </View>
        {isRegister && <Text style={styles.passwordHint}>8 caractères minimum</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, trailing, ...inputProps }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput {...inputProps} style={styles.input} placeholderTextColor={colors.muted} autoCorrect={false} />
        {trailing}
      </View>
    </View>
  );
}

export function LoginScreen(props) {
  return <AuthFormScreen {...props} mode="login" />;
}

export function RegisterScreen(props) {
  return <AuthFormScreen {...props} mode="register" />;
}

const createStyles = (colors) => StyleSheet.create({
  keyboard: { flex: 1 },
  content: { backgroundColor: colors.paper, flexGrow: 1, paddingBottom: 38, paddingHorizontal: 24, paddingTop: 18 },
  back: { alignItems: 'center', height: 42, justifyContent: 'center', width: 42 },
  brandMark: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 13, height: 48, justifyContent: 'center', marginTop: 24, width: 48 },
  eyebrow: { color: colors.green, fontSize: 10, fontWeight: '800', marginTop: 22 },
  heading: { color: colors.ink, fontSize: 30, fontWeight: '900', marginTop: 7 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 22, marginTop: 7 },
  field: { marginTop: 13 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  inputRow: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 8, borderWidth: 1, flexDirection: 'row', minHeight: 52, paddingHorizontal: 14 },
  input: { color: colors.ink, flex: 1, fontSize: 15, minHeight: 50, paddingVertical: 10 },
  error: { color: colors.terracotta, fontSize: 13, lineHeight: 19, marginTop: 14 },
  submit: { alignItems: 'center', backgroundColor: colors.green, borderRadius: 8, flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 23, minHeight: 52 },
  disabled: { opacity: 0.65 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  switchLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center', marginTop: 22 },
  switchCopy: { color: colors.muted, fontSize: 13 },
  switchAction: { color: colors.green, fontSize: 13, fontWeight: '800' },
  passwordHint: { color: colors.muted, fontSize: 11, marginTop: 14, textAlign: 'center' },
});