import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { fetchFacilities } from '../services/facilityService';
import { createLobby as createLobbyApi } from '../services/lobbyService';
import type { Facility, SkillLevel } from '../types';

const SKILLS: SkillLevel[] = ['Friendly', 'Competitive'];

export default function HostLobbyScreen({ onDone }: { onDone: () => void }) {
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [activity, setActivity] = useState('');
    const [locationName, setLocationName] = useState('');
    const [facility, setFacility] = useState<Facility | null>(null);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [skill, setSkill] = useState(SKILLS[0]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchFacilities().then(setFacilities);
    }, []);

    function pickFacility(f: Facility) {
        setFacility(f);
        setLocationName(f.name);
    }

    function onLocationChange(text: string) {
        setLocationName(text);
        setFacility(null); // lokasi ditaip sendiri, tiada koordinat peta
    }

    async function createLobby() {
        if (!activity.trim() || !locationName.trim()) {
            Alert.alert('Lengkapkan', 'Sila isi nama aktiviti dan lokasi.');
            return;
        }
        setSaving(true);
        const err = await createLobbyApi({
            activity_type: activity.trim(),
            location_name: locationName.trim(),
            facility,
            max_players: maxPlayers,
            skill_level: skill,
        });
        setSaving(false);
        if (err) Alert.alert('Ralat', err);
        else onDone();
    }

    return (
        <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
            <Text style={s.title}>Host a Squad</Text>

            <Text style={s.label}>Aktiviti</Text>
            <TextInput
                style={s.input}
                placeholder="cth: Badminton, Jogging, Main chess..."
                value={activity}
                onChangeText={setActivity}
            />

            <Text style={s.label}>Lokasi</Text>
            <TextInput
                style={s.input}
                placeholder="Taip lokasi mana-mana"
                value={locationName}
                onChangeText={onLocationChange}
            />
            {facilities.length > 0 && (
                <>
                    <Text style={s.hint}>Atau pilih fasiliti perbandaran (muncul di peta):</Text>
                    <View style={s.row}>
                        {facilities.map((f) => (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => pickFacility(f)}
                                style={[s.chip, f.id === facility?.id && s.chipActive]}
                            >
                                <Text style={[s.chipText, f.id === facility?.id && s.chipTextActive]}>{f.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <Text style={s.label}>Jumlah pemain (termasuk kamu): {maxPlayers}</Text>
            <Slider
                minimumValue={2}
                maximumValue={12}
                step={1}
                value={maxPlayers}
                onValueChange={setMaxPlayers}
                minimumTrackTintColor="#2563eb"
                thumbTintColor="#2563eb"
                style={{ height: 40 }}
            />
            <View style={s.sliderLabels}>
                <Text style={s.hint}>2</Text>
                <Text style={s.hint}>12</Text>
            </View>

            <Text style={s.label}>Aras kemahiran</Text>
            <View style={s.row}>
                {SKILLS.map((k) => (
                    <TouchableOpacity key={k} onPress={() => setSkill(k)} style={[s.chip, k === skill && s.chipActive]}>
                        <Text style={[s.chipText, k === skill && s.chipTextActive]}>{k}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity style={s.button} onPress={createLobby} disabled={saving}>
                <Text style={s.buttonText}>{saving ? 'Mencipta...' : 'Cipta Squad'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { padding: 20, paddingTop: 60 },
    title: { fontSize: 26, fontWeight: '800', marginBottom: 12 },
    label: { fontWeight: '600', marginTop: 16, marginBottom: 8, color: '#374151' },
    hint: { color: '#6b7280', fontSize: 12, marginBottom: 6 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
    chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    chipText: { color: '#374151' },
    chipTextActive: { color: '#fff', fontWeight: '700' },
    button: { backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
    buttonText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});