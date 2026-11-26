import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '../../styles/ThemeContext';

export default function AdminField({ label, value, onChangeText, placeholder, multiline = false, keyboardType }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput value={value ?? ''} onChangeText={onChangeText} placeholder={placeholder || label} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline]} />
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  field: { gap: 6, marginBottom: 13 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  input: { backgroundColor: colors.white, borderColor: colors.line, borderRadius: 7, borderWidth: 1, color: colors.ink, fontSize: 14, minHeight: 45, paddingHorizontal: 12 },
  multiline: { minHeight: 88, paddingTop: 11 },
});