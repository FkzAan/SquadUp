import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { fetchFacilities } from '../services/facilityService';
import { createLobby as createLobbyApi } from '../services/lobbyService';
import LocationPickerModal from '../components/LocationPickerModal';
import DateTimeField from '../components/DateTimeField';
import { formatClock } from '../utils/lobby';
import type { Coords } from '../components/LocationPickerModal';
import type { Facility, SkillLevel } from '../types';
import { useLanguage } from '../context/LanguageContext';
import SportVisual, { sportIcon } from '../components/ui/SportVisual';
import SportPickerModal from '../components/ui/SportPickerModal';
import { palette, radius, cardShadow } from '../theme';

const SKILLS: SkillLevel[] = ['Friendly', 'Competitive'];
const SPORT_PRESETS = ['Running', 'Badminton', 'Futsal', 'Basketball', 'Pickleball', 'Chess', 'Tennis', 'Cycling'];
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const GRACE_MINUTES = 15;
const MAX_DURATION_HOURS = 8;

function nextQuarterHour(): Date {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setMinutes(d.getMinutes() + (15 - (d.getMinutes() % 15)));
    return d;
}

// gabung tarikh (day) dengan jam/minit (time)
function combine(day: Date, time: Date): Date {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes(), 0, 0);
}

// kalau masa tamat <= masa mula, anggap tamat pada hari berikutnya (cth 23:00 - 01:00)
function computeRange(day: Date, startTime: Date, endTime: Date) {
    const start = combine(day, startTime);
    let end = combine(day, endTime);
    let overnight = false;
    if (end.getTime() <= start.getTime()) {
        end = new Date(end.getTime() + 24 * HOUR);
        overnight = true;
    }
    return { start, end, overnight };
}

export default function HostLobbyScreen({ onDone }: { onDone: () => void }) {
    const { t, language } = useLanguage();
    const [facilities, setFacilities] = useState<Facility[]>([]);
    const [activity, setActivity] = useState('');
    const [sportPickerOpen, setSportPickerOpen] = useState(false);
    const [locationName, setLocationName] = useState('');
    const [facility, setFacility] = useState<Facility | null>(null);
    const [coords, setCoords] = useState<Coords | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(4);
    const [skill, setSkill] = useState<SkillLevel>(SKILLS[0]);
    const [saving, setSaving] = useState(false);

    const [day, setDay] = useState<Date>(new Date());
    const [startTime, setStartTime] = useState<Date>(() => nextQuarterHour());
    const [endTime, setEndTime] = useState<Date>(() => new Date(nextQuarterHour().getTime() + 2 * HOUR));

    const range = computeRange(day, startTime, endTime);
    const closing = new Date(range.end.getTime() + GRACE_MINUTES * MINUTE);
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);

    useEffect(() => {
        fetchFacilities().then(setFacilities);
    }, []);

    // tukar masa mula: masa tamat ikut bergerak (tempoh kekal sama)
    function onStartChange(d: Date) {
        const current = computeRange(day, startTime, endTime);
        const duration = current.end.getTime() - current.start.getTime();
        setStartTime(d);
        setEndTime(new Date(combine(day, d).getTime() + duration));
    }

    function pickFacility(f: Facility) {
        setFacility(f);
        setLocationName(f.name);
        setCoords({ latitude: f.latitude, longitude: f.longitude });
    }

    function onLocationChange(text: string) {
        setLocationName(text);
        setFacility(null);
    }

    function onPicked(c: Coords) {
        setCoords(c);
        setFacility(null);
        setPickerOpen(false);
    }

    async function createLobby() {
        if (!activity.trim() || !locationName.trim()) {
            Alert.alert(t('complete'), t('fillActivityLocation'));
            return;
        }
        if (!coords) {
            Alert.alert(t('locationUnmarked'), t('pickExactLocation'));
            return;
        }
        if (range.end.getTime() <= Date.now()) {
            Alert.alert(t('invalidTime'), t('endMustBeFuture'));
            return;
        }
        if (range.end.getTime() - range.start.getTime() > MAX_DURATION_HOURS * HOUR) {
            Alert.alert(t('tooLong'), t('maxDuration', { hours: MAX_DURATION_HOURS }));
            return;
        }

        setSaving(true);
        const err = await createLobbyApi({
            activity_type: activity.trim(),
            location_name: locationName.trim(),
            facility,
            latitude: coords.latitude,
            longitude: coords.longitude,
            max_players: maxPlayers,
            starts_at: range.start.toISOString(),
            ends_at: range.end.toISOString(),
            skill_level: skill,
        });
        setSaving(false);
        if (err) Alert.alert(t('error'), err);
        else onDone();
    }

    return (
        <>
            <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
                <View style={s.topRow}>
                    <TouchableOpacity style={s.backBtn} onPress={onDone} activeOpacity={0.7}>
                        <Ionicons name="arrow-back" size={24} color={palette.navy} />
                    </TouchableOpacity>
                    <Text style={s.title}>{t('hostSquad')}</Text>
                </View>

                <Text style={s.sectionEyebrow}>01  •  {t('activity')}</Text>
                <Text style={s.label}>{t('activity')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.sportScroll}>
                    {SPORT_PRESETS.map((sp) => (
                        <TouchableOpacity key={sp} onPress={() => setActivity(sp)} style={[s.sportChip, activity.toLowerCase() === sp.toLowerCase() && s.sportChipActive]}>
                            <SportVisual activity={sp} style={s.sportChipImage} />
                            <Text numberOfLines={1} style={[s.sportLabel, activity.toLowerCase() === sp.toLowerCase() && s.sportLabelActive]}>{sp}</Text>
                        </TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setSportPickerOpen(true)} style={[s.sportChip, s.moreChip]} accessibilityLabel={language === 'ms' ? 'Lagi sukan' : 'More sports'}>
                        <Ionicons name="grid-outline" size={21} color={palette.blue} />
                        <Text style={s.sportLabel}>{language === 'ms' ? 'Lagi sukan' : 'More sports'}</Text>
                    </TouchableOpacity>
                </ScrollView>
                {!!activity.trim() && <SportVisual activity={activity} style={s.sportBanner} />}
                <TextInput
                    style={s.input}
                    placeholder={t('activityExample')}
                    value={activity}
                    onChangeText={setActivity}
                />

                <Text style={s.sectionEyebrow}>02  •  {t('location')}</Text>
                <Text style={s.label}>{t('locationName')}</Text>
                <TextInput
                    style={s.input}
                    placeholder={t('locationExample')}
                    value={locationName}
                    onChangeText={onLocationChange}
                />
                {facilities.length > 0 && (
                    <>
                        <Text style={s.hint}>{t('orFacility')}</Text>
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

                <Text style={s.label}>{t('exactMapLocation')}</Text>
                <TouchableOpacity
                    style={[s.mapBtn, coords && s.mapBtnDone]}
                    onPress={() => setPickerOpen(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={coords ? 'location' : 'location-outline'}
                        size={20}
                        color={coords ? '#16a34a' : '#2563eb'}
                    />
                    <Text style={[s.mapBtnText, coords && s.mapBtnTextDone]}>
                        {coords
                            ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (${t('change')})`
                            : t('pickOnMap')}
                    </Text>
                </TouchableOpacity>

                <Text style={s.sectionEyebrow}>03  •  {t('whenPlay')}</Text>
                <Text style={s.label}>{t('whenPlay')}</Text>
                <View style={s.timeRow}>
                    <DateTimeField label={t('date')} mode="date" value={day} onChange={setDay} minimumDate={today0} />
                    <DateTimeField label={t('start')} mode="time" value={startTime} onChange={onStartChange} />
                    <DateTimeField label={t('end')} mode="time" value={endTime} onChange={setEndTime} />
                </View>
                <View style={s.summary}>
                    <Text style={s.summaryMain}>
                        {formatClock(range.start)} – {formatClock(range.end)}
                        {range.overnight ? t('nextDay') : ''}
                    </Text>
                    <Text style={s.summarySub}>
                        {t('autoClose', { time: formatClock(closing), minutes: GRACE_MINUTES })}
                    </Text>
                </View>

                <Text style={s.sectionEyebrow}>04  •  {t('players')}</Text>
                <Text style={s.label}>{t('totalPlayers', { count: maxPlayers })}</Text>
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

                <Text style={s.label}>{t('skillLevel')}</Text>
                <View style={s.row}>
                    {SKILLS.map((k) => (
                        <TouchableOpacity key={k} onPress={() => setSkill(k)} style={[s.chip, k === skill && s.chipActive]}>
                            <Text style={[s.chipText, k === skill && s.chipTextActive]}>{k}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={s.button} onPress={createLobby} disabled={saving}>
                    <Text style={s.buttonText}>{saving ? t('creating') : t('createSquad')}</Text>
                </TouchableOpacity>
            </ScrollView>

            <SportPickerModal visible={sportPickerOpen} selected={activity} onSelect={setActivity} onClose={() => setSportPickerOpen(false)} language={language} />
            <LocationPickerModal
                visible={pickerOpen}
                initial={coords}
                onConfirm={onPicked}
                onClose={() => setPickerOpen(false)}
            />
        </>
    );
}

const s = StyleSheet.create({
  container: { backgroundColor: palette.canvas, paddingHorizontal: 19, paddingTop: 57, paddingBottom: 45 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
  backBtn: { backgroundColor: '#fff', borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  title: { fontSize: 23, fontWeight: '900', color: palette.navy },
  sectionEyebrow: { color: palette.blue, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 20, marginBottom: 4 },
  label: { color: palette.navy, fontWeight: '800', marginTop: 8, marginBottom: 8, fontSize: 14 },
  hint: { color: palette.muted, fontSize: 12, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 14, color: palette.navy, fontSize: 15 },
  sportScroll: { gap: 9, paddingVertical: 2, paddingRight: 18 },
  sportChip: { backgroundColor: '#fff', borderColor: palette.border, borderWidth: 1, borderRadius: 14, width: 104, minHeight: 96, padding: 7, alignItems: 'center', justifyContent: 'center', gap: 6 },
  sportChipImage: { width: 88, height: 58, borderRadius: 9 },
  sportChipActive: { backgroundColor: palette.blue, borderColor: palette.blue },
  moreChip: { backgroundColor: palette.blueSoft, borderStyle: 'dashed', borderColor: '#9CC4FF' },
  sportLabel: { color: palette.navy, fontWeight: '700', fontSize: 11 }, sportLabelActive: { color: '#fff' },
  sportBanner: { width: '100%', height: 96, borderRadius: 16, marginTop: 9 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, timeRow: { flexDirection: 'row', gap: 8 },
  summary: { backgroundColor: '#DFEDFF', borderRadius: 15, padding: 13, marginTop: 12 },
  summaryMain: { color: palette.blueDark, fontWeight: '900' }, summarySub: { color: '#426996', fontSize: 12, marginTop: 5 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 16, borderRadius: 15, borderWidth: 1, borderColor: palette.border },
  mapBtnDone: { backgroundColor: '#ECFCF4', borderColor: '#B5E9CD' },
  mapBtnText: { color: palette.blue, fontWeight: '700', flexShrink: 1 }, mapBtnTextDone: { color: '#12804E' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: { backgroundColor: '#fff', borderWidth: 1, borderColor: palette.border, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 17 },
  chipActive: { backgroundColor: palette.blue, borderColor: palette.blue },
  chipText: { color: palette.navy, fontWeight: '600' }, chipTextActive: { color: '#fff', fontWeight: '800' },
  button: { backgroundColor: palette.blue, borderRadius: 16, padding: 17, alignItems: 'center', marginTop: 29, ...cardShadow },
  buttonText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
