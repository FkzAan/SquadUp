import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserId } from '../services/authService';
import { fetchMyJoinedLobbies, subscribeToLobbies } from '../services/lobbyService';
import { formatSchedule, formatTime, isEnded, statusLabel } from '../utils/lobby';
import type { JoinedLobby } from '../types';
import { useLanguage } from '../context/LanguageContext';
import SportVisual from '../components/ui/SportVisual';
import { palette, cardShadow } from '../theme';

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
                            <SportVisual activity={item.activity_type} style={s.thumbnail}/>
                            <View style={s.cardContent}>
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
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />
        </View>
    );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 16 },
  backBtn: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  title: { fontSize: 23, fontWeight: '900', color: palette.navy },
  section: { marginHorizontal: 16, marginTop: 13, marginBottom: 12, fontSize: 16, fontWeight: '900', color: palette.navy },
  empty: { textAlign: 'center', color: palette.muted, marginTop: 42, paddingHorizontal: 24 },
  card: { flexDirection: 'row', overflow: 'hidden', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 13, borderRadius: 19, borderWidth: 1, borderColor: palette.border, ...cardShadow },
  cardEnded: { opacity: 0.77 }, thumbnail: { width: 100, minHeight: 145 }, cardContent: { flex: 1, padding: 12, gap: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  activity: { fontWeight: '900', color: palette.navy, fontSize: 13, flex: 1 },
  badge: { borderRadius: 9, paddingVertical: 4, paddingHorizontal: 7 }, badgeText: { fontSize: 10, fontWeight: '800' },
  location: { color: palette.muted, fontSize: 12 }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  meta: { color: palette.muted, fontSize: 11, marginTop: 2 },
  hostTag: { backgroundColor: palette.blueSoft, color: palette.blueDark, fontSize: 11, fontWeight: '800', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
  schedule: { color: palette.blue, fontWeight: '700', fontSize: 12 },
});
