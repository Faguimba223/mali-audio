import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/ThemeContext';

export default function AdminHeader({ title, subtitle, onBack, onLogout }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      {onBack ? <Pressable onPress={onBack} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Retour"><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable> : null}
      <View style={styles.copy}><Text style={styles.eyebrow}>MALI AUDIO · ADMIN</Text><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
      {onLogout ? <Pressable onPress={onLogout} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Déconnexion administrateur"><Ionicons name="log-out-outline" size={20} color={colors.terracotta} /></Pressable> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 19, minHeight: 52 },
  copy: { flex: 1, gap: 3 },
  eyebrow: { color: colors.green, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 12 },
  iconButton: { alignItems: 'center', backgroundColor: colors.white, borderColor: colors.line, borderRadius: 20, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
});