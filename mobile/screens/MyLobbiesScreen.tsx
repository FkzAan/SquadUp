import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserId } from '../services/authService';
import { fetchMyJoinedLobbies, subscribeToLobbies } from '../services/lobbyService';
import { formatSchedule, formatTime, isEnded, statusLabel } from '../utils/lobby';
import type { JoinedLobby } from '../types';
import { useLanguage } from '../context/LanguageContext';

type Props = {
    onBack: () => void;
    onOpen: (id: string) => void;
};

export default function MyLobbiesScreen({ onBack, onOpen }: Props) {
    const { t, language } = useLanguage();
    const [items, setItems] = useState<JoinedLobby[]>([]);
    const [loading, setLoading] = useState(true);
    const [myId, setMyId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setItems(await fetchMyJoinedLobbies());
        setLoading(false);
    }, []);

    useEffect(() => {
        getCurrentUserId().then(setMyId);
        load();
        return subscribeToLobbies(load);
    }, [load]);

    const sections = [
        { title: t('active'), data: items.filter((l) => !isEnded(l)) },
        { title: t('history'), data: items.filter((l) => isEnded(l)) },
    ].filter((sec) => sec.data.length > 0);

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={s.title}>{t('myLobbies')}</Text>
            </View>

            <SectionList
                sections={sections}
                keyExtractor={(l) => l.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
                contentContainerStyle={{ paddingBottom: 40 }}
                ListEmptyComponent={
                    !loading ? (
                        <Text style={s.empty}>{t('noJoined')}</Text>
                    ) : null
                }
                renderSectionHeader={({ section }) => <Text style={s.section}>{section.title}</Text>}
                renderItem={({ item }) => {
                    const st = statusLabel(item, language);
                    const ended = isEnded(item);
                    return (
                        <TouchableOpacity
                            style={[s.card, ended && s.cardEnded]}
                            activeOpacity={0.8}
                            onPress={() => onOpen(item.id)}
                        >
                            <View style={s.cardTop}>
                                <Text style={s.activity}>{item.activity_type} · {item.skill_level}</Text>
                                <View style={[s.badge, { backgroundColor: st.bg }]}>
                                    <Text style={[s.badgeText, { color: st.fg }]}>{st.text}</Text>
                                </View>
                            </View>
                            <Text style={s.location}>{item.location_name}</Text>
                            <Text style={s.schedule}>{formatSchedule(item.starts_at, item.ends_at, language)}</Text>
                            <View style={s.metaRow}>
                                <Text style={s.meta}>{item.current_players}/{item.max_players} {t('players')}</Text>
                                {item.host_id === myId && <Text style={s.hostTag}>Host</Text>}
                            </View>
                            <Text style={s.meta}>{t('joinedAt', { time: formatTime(item.joined_at) })}</Text>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
    backBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
    title: { fontSize: 24, fontWeight: '800' },
    section: { marginHorizontal: 16, marginTop: 12, marginBottom: 8, fontWeight: '700', color: '#374151' },
    empty: { textAlign: 'center', color: '#6b7280', marginTop: 40, paddingHorizontal: 24 },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, elevation: 2 },
    cardEnded: { opacity: 0.7 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    activity: { fontWeight: '700', fontSize: 16, flex: 1 },
    badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    location: { color: '#374151', marginTop: 4 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    meta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
    hostTag: { backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: '700', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
    schedule: { color: '#2563eb', fontWeight: '600', marginTop: 4 },
});