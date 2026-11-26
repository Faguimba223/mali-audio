import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/ThemeContext';

export default function AdminMenuItem({ icon, title, detail, onPress, danger = false }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
      <View style={[styles.icon, danger && styles.dangerIcon]}><Ionicons name={icon} size={19} color={danger ? colors.terracotta : colors.green} /></View>
      <View style={styles.copy}><Text style={[styles.title, danger && styles.dangerText]}>{title}</Text>{detail ? <Text style={styles.detail}>{detail}</Text> : null}</View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { alignItems: 'center', backgroundColor: colors.white, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 11, minHeight: 68, paddingHorizontal: 13 },
  pressed: { opacity: 0.7 },
  icon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  dangerIcon: { backgroundColor: `${colors.terracotta}18` },
  copy: { flex: 1, gap: 4 },
  title: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  dangerText: { color: colors.terracotta },
  detail: { color: colors.muted, fontSize: 11 },
});