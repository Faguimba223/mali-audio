import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../styles/ThemeContext';

export default function AdminStatCard({ label, value, icon, accent }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.card}>
      <View style={[styles.icon, accent && { backgroundColor: accent }]}><Ionicons name={icon} size={19} color={colors.greenDark} /></View>
      <Text style={styles.value}>{value}</Text>
      <Text numberOfLines={1} style={styles.label}>{label}</Text>
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  card: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 9, borderWidth: 1, flexBasis: '47%', flexGrow: 1, minHeight: 112, padding: 13 },
  icon: { alignItems: 'center', backgroundColor: colors.paleGreen, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  value: { color: colors.ink, fontSize: 23, fontWeight: '900', marginTop: 8 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1 },
});