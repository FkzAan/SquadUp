import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

type Props = {
    label: string;
    value: Date;
    mode: 'date' | 'time';
    onChange: (d: Date) => void;
    minimumDate?: Date;
};

const pad = (n: number) => String(n).padStart(2, '0');

function display(value: Date, mode: 'date' | 'time'): string {
    if (mode === 'date') return `${pad(value.getDate())}/${pad(value.getMonth() + 1)}/${value.getFullYear()}`;
    return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default function DateTimeField({ label, value, mode, onChange, minimumDate }: Props) {
    function openAndroid() {
        DateTimePickerAndroid.open({
            value,
            mode,
            is24Hour: true,
            minimumDate,
            onValueChange: (_e, d) => onChange(d),
        });
    }

    return (
        <View style={s.wrap}>
            <Text style={s.label}>{label}</Text>
            {Platform.OS === 'android' ? (
                <TouchableOpacity style={s.field} onPress={openAndroid} activeOpacity={0.7}>
                    <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color="#2563eb" />
                    <Text style={s.value}>{display(value, mode)}</Text>
                </TouchableOpacity>
            ) : (
                <DateTimePicker
                    value={value}
                    mode={mode}
                    display="compact"
                    minimumDate={minimumDate}
                    onValueChange={(_e, d) => onChange(d)}
                    style={{ alignSelf: 'flex-start' }}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    wrap: { flex: 1 },
    label: { fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: '600' },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 10,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    value: { fontWeight: '700', color: '#111827' },
});