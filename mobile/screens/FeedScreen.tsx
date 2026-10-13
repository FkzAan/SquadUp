import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLobbies } from '../hooks/useLobbies';
import { fetchMyJoinedLobbies, joinLobby } from '../services/lobbyService';
import Sidebar from '../components/Sidebar';
import LobbyMap from '../components/LobbyMap';
import type { Lobby } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatSchedule, isOver } from '../utils/lobby';

type Props = {
    onHost: () => void;
    onMyLobbies: () => void;
    onOpenLobby: (id: string) => void;
    onProfile: () => void;
};

export default function FeedScreen({ onHost, onMyLobbies, onOpenLobby, onProfile }: Props) {
    const { t, language } = useLanguage();
    const { lobbies, loading, refresh } = useLobbies();
    const [menuOpen, setMenuOpen] = useState(false);
    const [view, setView] = useState<'list' | 'map'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());

    const selected = lobbies.find((l) => l.id === selectedId) ?? null;
    const unmapped = lobbies.filter((l) => l.latitude == null || l.longitude == null).length;

    // senarai squad yang dah saya join (untuk tukar butang Join kepada Lihat detail)
    useEffect(() => {
        fetchMyJoinedLobbies().then((rows) => setJoinedIds(new Set(rows.map((r) => r.id))));
    }, [lobbies]);

    async function onJoin(id: string) {
        const err = await joinLobby(id);
        if (err) Alert.alert(t('cannotJoin'), err);
        else onOpenLobby(id);
    }

    function renderCard(item: Lobby) {
        const joined = joinedIds.has(item.id);
        const over = isOver(item);
        const unavailable = item.status === 'full' || over;
        return (
            <View style={s.card}>
                <Text style={s.activity}>{item.activity_type} · {item.skill_level}</Text>
                <Text style={s.location}>{item.location_name}</Text>
                <Text style={s.schedule}>{formatSchedule(item.starts_at, item.ends_at, language)}</Text>
                {item.latitude != null && item.longitude != null && (
                    <Text style={s.coords}>{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
                )}
                <Text style={s.players}>{item.current_players}/{item.max_players} {t('players')}</Text>

                {joined ? (
                    <TouchableOpacity style={s.viewBtn} onPress={() => onOpenLobby(item.id)}>
                        <Text style={s.viewText}>{t('alreadyJoined')}</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[s.joinBtn, unavailable && s.joinBtnDisabled]}
                        disabled={unavailable}
                        onPress={() => onJoin(item.id)}
                    >
                        <Text style={s.joinText}>{over ? t('alreadyEnded') : item.status === 'full' ? t('full') : t('join')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity style={s.menuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                    <Ionicons name="menu" size={26} color="#111827" />
                </TouchableOpacity>
                <Text style={s.title}>{t('nearbySquads')}</Text>
            </View>

            <View style={s.tabs}>
                <TouchableOpacity style={[s.tab, view === 'list' && s.tabActive]} onPress={() => setView('list')}>
                    <Text style={[s.tabText, view === 'list' && s.tabTextActive]}>{t('list')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.tab, view === 'map' && s.tabActive]} onPress={() => setView('map')}>
                    <Text style={[s.tabText, view === 'map' && s.tabTextActive]}>{t('map')}</Text>
                </TouchableOpacity>
            </View>

            {view === 'list' ? (
                <FlatList
                    data={lobbies}
                    keyExtractor={(l) => l.id}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
                    ListEmptyComponent={<Text style={s.empty}>{t('noActiveSquads')}</Text>}
                    renderItem={({ item }) => renderCard(item)}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    {unmapped > 0 && (
                        <Text style={s.note}>{t('noMapLocation', { count: unmapped })}</Text>
                    )}
                    <View style={s.mapBox}>
                        <LobbyMap lobbies={lobbies} onSelect={setSelectedId} />
                    </View>

                    {selected && (
                        <View style={s.sheet}>
                            <TouchableOpacity style={s.sheetClose} onPress={() => setSelectedId(null)}>
                                <Ionicons name="close" size={20} color="#6b7280" />
                            </TouchableOpacity>
                            {renderCard(selected)}
                        </View>
                    )}
                </View>
            )}

            <TouchableOpacity style={s.fab} onPress={onHost}>
                <Text style={s.fabText}>+ Host</Text>
            </TouchableOpacity>

            <Sidebar
                visible={menuOpen}
                onClose={() => setMenuOpen(false)}
                onHost={onHost}
                onMyLobbies={onMyLobbies}
                onProfile={onProfile}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    menuBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
    title: { fontSize: 24, fontWeight: '800' },
    tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#e5e7eb', borderRadius: 12, padding: 3 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    tabActive: { backgroundColor: '#fff', elevation: 1 },
    tabText: { color: '#6b7280', fontWeight: '600' },
    tabTextActive: { color: '#111827', fontWeight: '800' },
    note: { marginHorizontal: 16, marginBottom: 8, color: '#6b7280', fontSize: 12 },
    mapBox: { flex: 1, marginHorizontal: 16, marginBottom: 16, backgroundColor: '#e5e7eb' },
    sheet: { position: 'absolute', left: 0, right: 0, bottom: 90 },
    sheetClose: { position: 'absolute', top: 8, right: 26, zIndex: 2, padding: 4 },
    empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, elevation: 2 },
    activity: { fontWeight: '700', fontSize: 16 },
    location: { color: '#374151', marginTop: 2 },
    coords: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
    players: { color: '#6b7280', marginTop: 6 },
    joinBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
    joinBtnDisabled: { backgroundColor: '#9ca3af' },
    joinText: { color: '#fff', fontWeight: '700' },
    viewBtn: { borderWidth: 1, borderColor: '#16a34a', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
    viewText: { color: '#166534', fontWeight: '700' },
    fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#16a34a', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22, elevation: 4 },
    fabText: { color: '#fff', fontWeight: '800' },
    schedule: { color: '#2563eb', fontWeight: '600', marginTop: 4 },
});