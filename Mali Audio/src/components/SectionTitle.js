import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../styles/ThemeContext';

export default function SectionTitle({ title, action, onPress }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? <Pressable onPress={onPress} hitSlop={10}><Text style={styles.action}>{action}</Text></Pressable> : null}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  action: { color: colors.green, fontSize: 13, fontWeight: '700' },
});