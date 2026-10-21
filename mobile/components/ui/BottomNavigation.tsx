import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow, palette } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

/** Visual navigation only: actions are delegated to the app's existing callbacks. */
export default function BottomNavigation({ active, onHome, onMap, onHost, onMyLobbies, onProfile }: {
  active: 'home' | 'map';
  onHome: () => void; onMap: () => void; onHost: () => void; onMyLobbies: () => void; onProfile: () => void;
}) {
  const { t } = useLanguage();
  const items: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; action: () => void }[] = [
    { id: 'home', label: t('list'), icon: 'home-outline', action: onHome },
    { id: 'map', label: t('map'), icon: 'map-outline', action: onMap },
    { id: 'host', label: t('hostSquad'), icon: 'add', action: onHost },
    { id: 'mine', label: t('myLobbies'), icon: 'people-outline', action: onMyLobbies },
    { id: 'profile', label: t('myProfile'), icon: 'person-outline', action: onProfile },
  ];
  return <View style={s.bar}>
    {items.map(item => <TouchableOpacity key={item.id} onPress={item.action} accessibilityRole="button" accessibilityLabel={item.label}
      style={s.item} activeOpacity={0.7}>
      <View style={item.id === 'host' ? s.hostIcon : s.icon}>
        <Ionicons name={item.id === active ? (item.id === 'home' ? 'home' : 'map') : item.icon} size={item.id === 'host' ? 27 : 20}
          color={item.id === 'host' ? '#fff' : item.id === active ? palette.blue : palette.muted} />
      </View>
      <Text style={[s.label, item.id === active && s.selected]} numberOfLines={1}>{item.label}</Text>
    </TouchableOpacity>)}
  </View>;
}
const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingTop: 7, paddingBottom: 8, paddingHorizontal: 8, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: palette.border, ...cardShadow },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  icon: { height: 27, justifyContent: 'center' },
  hostIcon: { backgroundColor: palette.blue, width: 48, height: 48, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: -19, ...cardShadow },
  label: { fontSize: 10, color: palette.muted, fontWeight: '600', marginTop: 4 },
  selected: { color: palette.blue, fontWeight: '800' },
});
