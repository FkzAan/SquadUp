import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../localization/translations';

type Props = { expanded?: boolean };

export default function LanguageSelector({ expanded = false }: Props) {
  const { language, setLanguage, t } = useLanguage();
  const options: { code: Language; label: string }[] = [
    { code: 'ms', label: expanded ? t('malay') : 'BM' },
    { code: 'en', label: expanded ? t('english') : 'EN' },
  ];

  return (
    <View style={s.group} accessibilityRole="none">
      {options.map(({ code, label }) => (
        <TouchableOpacity
          key={code}
          style={[s.option, expanded && s.expanded, language === code && s.selected]}
          onPress={() => setLanguage(code)}
          accessibilityRole="button"
          accessibilityLabel={code === 'ms' ? t('malay') : t('english')}
          accessibilityState={{ selected: language === code }}
          activeOpacity={0.7}
        >
          <Text style={[s.label, language === code && s.selectedLabel]}>{label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  group: { flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: '#E5EFFB', borderRadius: 13, padding: 4, borderWidth: 1, borderColor: '#D9E7F7' },
  option: { paddingVertical: 9, paddingHorizontal: 15, alignItems: 'center', borderRadius: 10 },
  expanded: { flex: 1 }, selected: { backgroundColor: '#fff', elevation: 1 },
  label: { color: '#6E7E98', fontWeight: '800', fontSize: 13 },
  selectedLabel: { color: '#0768F9' },
});
