import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLobbies } from '../hooks/useLobbies';
import { joinLobby } from '../services/lobbyService';
import Sidebar from '../components/Sidebar';

export default function FeedScreen({ onHost }: { onHost: () => void }) {
    const { lobbies, loading, refresh } = useLobbies();
    const [menuOpen, setMenuOpen] = useState(false);

    async function onJoin(id: string) {
        const err = await joinLobby(id);
        if (err) Alert.alert('Tak dapat join', err);
        else Alert.alert('Berjaya!', 'Kamu dah masuk squad. Chat dibuka bila squad penuh.');
    }

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity style={s.menuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
                    <Ionicons name="menu" size={26} color="#111827" />
                </TouchableOpacity>
                <Text style={s.title}>Squad Berdekatan</Text>
            </View>

            <FlatList
                data={lobbies}
                keyExtractor={(l) => l.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
                ListEmptyComponent={<Text style={s.empty}>Belum ada squad aktif. Jadilah yang pertama!</Text>}
                renderItem={({ item }) => (
                    <View style={s.card}>
                        <Text style={s.activity}>{item.activity_type} · {item.skill_level}</Text>
                        <Text style={s.location}>{item.location_name}</Text>
                        <Text style={s.players}>{item.current_players}/{item.max_players} pemain</Text>
                        <TouchableOpacity
                            style={[s.joinBtn, item.status === 'full' && s.joinBtnDisabled]}
                            disabled={item.status === 'full'}
                            onPress={() => onJoin(item.id)}
                        >
                            <Text style={s.joinText}>{item.status === 'full' ? 'Penuh' : 'Join'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <TouchableOpacity style={s.fab} onPress={onHost}>
                <Text style={s.fabText}>+ Host</Text>
            </TouchableOpacity>

            <Sidebar visible={menuOpen} onClose={() => setMenuOpen(false)} onHost={onHost} />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
    menuBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
    title: { fontSize: 24, fontWeight: '800' },
    empty: { textAlign: 'center', color: '#6b7280', marginTop: 40 },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, elevation: 2 },
    activity: { fontWeight: '700', fontSize: 16 },
    location: { color: '#374151', marginTop: 2 },
    players: { color: '#6b7280', marginTop: 6 },
    joinBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
    joinBtnDisabled: { backgroundColor: '#9ca3af' },
    joinText: { color: '#fff', fontWeight: '700' },
    fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: '#16a34a', borderRadius: 28, paddingVertical: 14, paddingHorizontal: 22, elevation: 4 },
    fabText: { color: '#fff', fontWeight: '800' },
});