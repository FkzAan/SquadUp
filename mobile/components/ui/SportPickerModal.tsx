import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SportVisual, { SPORT_PRESETS } from './SportVisual';
import { palette } from '../../theme';

/** Searchable selector: returns a string to an existing activity/filter callback. */
export default function SportPickerModal({ visible, selected, onSelect, onClose, language }: {
  visible: boolean;
  selected?: string;
  onSelect: (sport: string) => void;
  onClose: () => void;
  language: 'ms' | 'en';
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => SPORT_PRESETS.filter(s => s.toLowerCase().includes(query.trim().toLowerCase())), [query]);
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.handle} />
        <View style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>{language === 'ms' ? 'Pilih jenis sukan' : 'Choose a sport'}</Text>
            <Text style={s.subtitle}>{language === 'ms' ? 'Cari dan pilih aktiviti' : 'Search and select an activity'}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={s.close} accessibilityLabel="Close sport picker"><Ionicons name="close" size={22} color={palette.navy}/></TouchableOpacity>
        </View>
        <View style={s.search}>
          <Ionicons name="search-outline" size={19} color={palette.muted}/>
          <TextInput value={query} onChangeText={setQuery} style={s.input}
            placeholder={language === 'ms' ? 'Cari sukan, contoh: Chess' : 'Search sports, e.g. Chess'}
            placeholderTextColor={palette.muted} autoCorrect={false}/>
        </View>
        <ScrollView style={s.results} contentContainerStyle={s.grid} keyboardShouldPersistTaps="handled">
          {filtered.map(sport => <TouchableOpacity
            key={sport} style={[s.option, selected === sport && s.optionSelected]}
            onPress={() => { onSelect(sport); setQuery(''); onClose(); }}>
            <SportVisual activity={sport} style={s.optionPhoto} />
            <Text style={[s.optionText, selected === sport && s.optionTextSelected]} numberOfLines={2}>{sport}</Text>
          </TouchableOpacity>)}
          {filtered.length === 0 && <Text style={s.noResults}>{language === 'ms' ? 'Tiada dalam preset. Boleh taip aktiviti sendiri.' : 'Not in presets. You can enter a custom activity.'}</Text>}
        </ScrollView>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8,24,50,0.52)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#F7FAFF', borderTopLeftRadius: 27, borderTopRightRadius: 27,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 25, maxHeight: '84%' },
  handle: { height: 5, width: 48, borderRadius: 3, backgroundColor: '#CCD9EA', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 21, fontWeight: '900', color: palette.navy },
  subtitle: { fontSize: 12, color: palette.muted, marginTop: 3 },
  close: { backgroundColor: '#EAF1FA', borderRadius: 50, padding: 8 },
  search: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, height: 46,
    borderRadius: 14, backgroundColor: '#fff', borderColor: palette.border, borderWidth: 1, gap: 9 },
  input: { flex: 1, fontSize: 14, color: palette.navy, paddingVertical: 0 },
  results: { marginTop: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, paddingBottom: 20 },
  option: { width: '47.7%', flexDirection: 'row', alignItems: 'center', minHeight: 70, paddingHorizontal: 6, paddingVertical: 7,
    gap: 9, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: '#fff' },
  optionPhoto: { width: 58, height: 54, borderRadius: 10 },
  optionSelected: { backgroundColor: palette.blue, borderColor: palette.blue },
  optionText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: palette.navy },
  optionTextSelected: { color: '#fff' }, noResults: { color: palette.muted, paddingVertical: 20 },
});
