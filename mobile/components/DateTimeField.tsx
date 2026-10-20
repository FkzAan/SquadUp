import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { palette, radius, cardShadow } from '../theme';
import { useLanguage } from '../context/LanguageContext';

type Props = { label: string; value: Date; mode: 'date' | 'time'; onChange: (d: Date) => void; minimumDate?: Date };
const pad = (n: number) => String(n).padStart(2, '0');
function display(value: Date, mode: 'date' | 'time') {
  return mode === 'date' ? `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}` : `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}
function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export default function DateTimeField({ label, value, mode, onChange, minimumDate }: Props) {
  const { language } = useLanguage();
  const [dateOpen, setDateOpen] = useState(false);
  const [month, setMonth] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
  const [iosTimeOpen, setIosTimeOpen] = useState(false);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const gap = first.getDay();
  const cells: (number | null)[] = [...Array(gap).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  function handlePress() {
    if (mode === 'date') { setMonth(new Date(value.getFullYear(), value.getMonth(), 1)); setDateOpen(true); return; }
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value, mode: 'time', is24Hour: true, onValueChange: (_e, d) => { if (d) onChange(d); } });
    } else setIosTimeOpen(true);
  }
  function selectDay(day: number) {
    const chosen = new Date(month.getFullYear(), month.getMonth(), day, value.getHours(), value.getMinutes());
    if (minimumDate && startOfDay(chosen) < startOfDay(minimumDate)) return;
    onChange(chosen);
    setDateOpen(false);
  }
  return <View style={s.wrap}>
    <Text style={s.label}>{label}</Text>
    <TouchableOpacity style={s.field} onPress={handlePress} accessibilityRole="button">
      <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={palette.blue} />
      <Text style={s.value} numberOfLines={1}>{display(value, mode)}</Text>
    </TouchableOpacity>
    {mode === 'date' && <Modal visible={dateOpen} transparent animationType="fade" onRequestClose={() => setDateOpen(false)}>
      <View style={s.modalShade}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDateOpen(false)} />
        <View style={s.calendar}>
          <View style={s.modalHead}>
            <View><Text style={s.modalEyebrow}>SQUADUP</Text><Text style={s.modalTitle}>{label}</Text></View>
            <TouchableOpacity onPress={() => setDateOpen(false)} style={s.close}><Ionicons name="close" color={palette.navy} size={20}/></TouchableOpacity>
          </View>
          <View style={s.monthHead}>
            <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={s.monthBtn}><Ionicons name="chevron-back" size={18} color={palette.blue} /></TouchableOpacity>
            <Text style={s.monthTitle}>{month.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-US', { month: 'long', year: 'numeric' })}</Text>
            <TouchableOpacity onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={s.monthBtn}><Ionicons name="chevron-forward" size={18} color={palette.blue} /></TouchableOpacity>
          </View>
          <View style={s.grid}>
            {(language === 'ms' ? ['A', 'I', 'S', 'R', 'K', 'J', 'S'] : ['S', 'M', 'T', 'W', 'T', 'F', 'S']).map((d, i) => <View key={`weekday-${i}`} style={s.dayCell}><Text style={s.weekday}>{d}</Text></View>)}
            {cells.map((day, i) => {
              const current = day == null ? null : new Date(month.getFullYear(), month.getMonth(), day);
              const blocked = !!current && !!minimumDate && current < startOfDay(minimumDate);
              const selected = !!current && current.getFullYear() === value.getFullYear() && current.getMonth() === value.getMonth() && current.getDate() === value.getDate();
              return <View key={`date-${i}`} style={s.dayCell}>{day != null && <TouchableOpacity disabled={blocked} onPress={() => selectDay(day)} style={[s.dayButton, selected && s.daySelected]}>
                <Text style={[s.dayLabel, blocked && s.dayDisabled, selected && s.dayLabelSelected]}>{day}</Text>
              </TouchableOpacity>}</View>;
            })}
          </View>
          <TouchableOpacity onPress={() => setDateOpen(false)} style={s.done}><Text style={s.doneText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>}
    {mode === 'time' && Platform.OS === 'ios' && <Modal visible={iosTimeOpen} transparent animationType="fade" onRequestClose={() => setIosTimeOpen(false)}>
      <View style={s.modalShade}><Pressable style={StyleSheet.absoluteFill} onPress={() => setIosTimeOpen(false)}/>
        <View style={s.calendar}><Text style={s.modalTitle}>{label}</Text><DateTimePicker value={value} mode="time" display="spinner" onValueChange={(_e, d) => { if (d) onChange(d); }} style={{ alignSelf: 'center' }}/>
          <TouchableOpacity style={s.done} onPress={() => setIosTimeOpen(false)}><Text style={s.doneText}>OK</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>}
  </View>;
}
const s = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0 }, label: { fontSize: 12, fontWeight: '700', marginBottom: 7, color: palette.muted },
  field: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.border, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 13, flexDirection: 'row', gap: 6, alignItems: 'center' },
  value: { color: palette.navy, fontWeight: '800', fontSize: 12, flexShrink: 1 },
  modalShade: { flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(13,30,58,0.45)' },
  calendar: { backgroundColor: palette.white, borderRadius: 27, padding: 19, ...cardShadow },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, modalEyebrow: { color: palette.blue, fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  modalTitle: { fontSize: 20, color: palette.navy, fontWeight: '900' }, close: { width: 35, height: 35, borderRadius: 18, backgroundColor: palette.blueSoft, alignItems: 'center', justifyContent: 'center' },
  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 }, monthBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.blueSoft, alignItems: 'center', justifyContent: 'center' }, monthTitle: { color: palette.navy, fontWeight: '800', fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 7 }, dayCell: { width: '14.2857%', alignItems: 'center', justifyContent: 'center', height: 43 }, weekday: { color: palette.muted, fontSize: 12, fontWeight: '700' },
  dayButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }, daySelected: { backgroundColor: palette.blue }, dayLabel: { color: palette.navy, fontSize: 13, fontWeight: '600' }, dayDisabled: { color: '#C1CEDE' }, dayLabelSelected: { color: '#fff', fontWeight: '900' },
  done: { marginTop: 18, paddingVertical: 14, alignItems: 'center', borderRadius: radius.input, backgroundColor: palette.blue }, doneText: { color: '#fff', fontWeight: '800' },
});
