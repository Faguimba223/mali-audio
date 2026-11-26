import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../styles/ThemeContext';

const tabs = [
  { key: 'Accueil', icon: 'home-outline', active: 'home' },
  { key: 'Musiques', icon: 'musical-notes-outline', active: 'musical-notes' },
  { key: 'Artistes', icon: 'people-outline', active: 'people' },
  { key: 'Actualités', icon: 'newspaper-outline', active: 'newspaper' },
  { key: 'Profil', icon: 'person-outline', active: 'person' },
];

export default function TabBar({ active, onChange }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected }}>
            <Ionicons name={selected ? tab.active : tab.icon} size={21} color={selected ? colors.green : colors.muted} />
            <Text numberOfLines={1} style={[styles.label, selected && styles.selected]}>{tab.key}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors) => StyleSheet.create({
  bar: { backgroundColor: colors.white, borderTopColor: colors.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 8, paddingHorizontal: 6, paddingTop: 10 },
  item: { alignItems: 'center', flex: 1, gap: 4, minWidth: 0 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  selected: { color: colors.green, fontWeight: '800' },
});