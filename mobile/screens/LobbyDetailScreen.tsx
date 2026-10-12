import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserId } from '../services/authService';
import {
    deleteLobby,
    fetchLobbyById,
    fetchLobbyMembers,
    leaveLobby,
    subscribeToLobbyDetail,
} from '../services/lobbyService';
import { formatTime, isEnded, statusLabel } from '../utils/lobby';
import type { Lobby, LobbyMember } from '../types';

type Props = {
    lobbyId: string;
    onBack: () => void;
};

export default function LobbyDetailScreen({ lobbyId, onBack }: Props) {
    const [lobby, setLobby] = useState<Lobby | null>(null);
    const [members, setMembers] = useState<LobbyMember[]>([]);
    const [myId, setMyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        const l = await fetchLobbyById(lobbyId);
        setLobby(l);
        setMembers(l ? await fetchLobbyMembers(l) : []);
        setLoading(false);
    }, [lobbyId]);

    useEffect(() => {
        getCurrentUserId().then(setMyId);
        load();
        return subscribeToLobbyDetail(lobbyId, load);
    }, [load, lobbyId]);

    function confirmLeave() {
        Alert.alert('Keluar dari squad?', 'Kamu tak lagi akan menyertai aktiviti ini.', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Keluar',
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    const err = await leaveLobby(lobbyId);
                    setBusy(false);
                    if (err) Alert.alert('Ralat', err);
                    else onBack();
                },
            },
        ]);
    }

    function confirmDelete() {
        Alert.alert('Padam squad?', 'Squad ini akan dipadam untuk semua pemain.', [
            { text: 'Batal', style: 'cancel' },
            {
                text: 'Padam',
                style: 'destructive',
                onPress: async () => {
                    setBusy(true);
                    const err = await deleteLobby(lobbyId);
                    setBusy(false);
                    if (err) Alert.alert('Ralat', err);
                    else onBack();
                },
            },
        ]);
    }

    const Header = (
        <View style={s.topRow}>
            <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={s.title} numberOfLines={1}>{lobby ? lobby.activity_type : 'Butiran Squad'}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={s.container}>
                {Header}
                <ActivityIndicator size="large" style={{ marginTop: 40 }} />
            </View>
        );
    }

    if (!lobby) {
        return (
            <View style={s.container}>
                {Header}
                <Text style={s.empty}>Squad ini sudah dipadam atau tidak lagi wujud.</Text>
                <TouchableOpacity style={s.primaryBtn} onPress={onBack}>
                    <Text style={s.primaryText}>Kembali</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const st = statusLabel(lobby);
    const ended = isEnded(lobby);
    const isHost = lobby.host_id === myId;
    const isMember = members.some((m) => m.user_id === myId);
    const pct = Math.min(100, Math.round((lobby.current_players / lobby.max_players) * 100));

    return (
        <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 40 }}>
            {Header}

            <View style={s.card}>
                <View style={s.rowBetween}>
                    <Text style={s.activity}>{lobby.activity_type}</Text>
                    <View style={[s.badge, { backgroundColor: st.bg }]}>
                        <Text style={[s.badgeText, { color: st.fg }]}>{st.text}</Text>
                    </View>
                </View>
                <Text style={s.sub}>Aras: {lobby.skill_level}</Text>
            </View>

            <View style={s.card}>
                <Text style={s.cardTitle}>Lokasi</Text>
                <View style={s.iconRow}>
                    <Ionicons name="location" size={18} color="#2563eb" />
                    <Text style={s.value}>{lobby.location_name}</Text>
                </View>
                {lobby.latitude != null && lobby.longitude != null && (
                    <Text style={s.coords}>{lobby.latitude.toFixed(5)}, {lobby.longitude.toFixed(5)}</Text>
                )}
                <Text style={s.sub}>Dicipta: {formatTime(lobby.created_at)}</Text>
                <Text style={s.sub}>Tamat: {formatTime(lobby.ends_at)}</Text>
            </View>

            <View style={s.card}>
                <View style={s.rowBetween}>
                    <Text style={s.cardTitle}>Pemain</Text>
                    <Text style={s.count}>{lobby.current_players}/{lobby.max_players}</Text>
                </View>
                <View style={s.barBg}>
                    <View style={[s.barFill, { width: `${pct}%` as `${number}%` }]} />
                </View>

                {members.map((m) => (
                    <View key={m.user_id} style={s.member}>
                        <View style={s.avatar}>
                            <Text style={s.avatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.memberName}>
                                {m.name}
                                {m.user_id === myId ? ' (kamu)' : ''}
                            </Text>
                            <Text style={s.sub}>Join: {formatTime(m.joined_at)}</Text>
                        </View>
                        {m.is_host && <Text style={s.hostTag}>Host</Text>}
                    </View>
                ))}
            </View>

            {!ended && isHost && (
                <TouchableOpacity style={s.dangerBtn} onPress={confirmDelete} disabled={busy} activeOpacity={0.8}>
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={s.dangerText}>{busy ? 'Memproses...' : 'Padam squad'}</Text>
                </TouchableOpacity>
            )}

            {!ended && !isHost && isMember && (
                <TouchableOpacity style={s.dangerBtn} onPress={confirmLeave} disabled={busy} activeOpacity={0.8}>
                    <Ionicons name="exit-outline" size={18} color="#dc2626" />
                    <Text style={s.dangerText}>{busy ? 'Memproses...' : 'Keluar dari squad'}</Text>
                </TouchableOpacity>
            )}

            {ended && <Text style={s.endedNote}>Aktiviti ini sudah tamat. Ia disimpan dalam sejarah kamu.</Text>}
        </ScrollView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
    backBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
    title: { fontSize: 22, fontWeight: '800', flex: 1 },
    empty: { textAlign: 'center', color: '#6b7280', marginTop: 40, paddingHorizontal: 24 },
    primaryBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center', margin: 24 },
    primaryText: { color: '#fff', fontWeight: '800' },
    card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14, elevation: 2 },
    cardTitle: { fontWeight: '800', color: '#374151', marginBottom: 8 },
    rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    activity: { fontSize: 20, fontWeight: '800', flex: 1 },
    badge: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    sub: { color: '#6b7280', fontSize: 12, marginTop: 4 },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    value: { color: '#111827', fontWeight: '600', fontSize: 15, flex: 1 },
    coords: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
    count: { fontWeight: '800', color: '#2563eb', fontSize: 16 },
    barBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 12, overflow: 'hidden' },
    barFill: { height: 8, backgroundColor: '#2563eb', borderRadius: 4 },
    member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#1d4ed8', fontWeight: '800', fontSize: 16 },
    memberName: { fontWeight: '700', color: '#111827' },
    hostTag: { backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: 11, fontWeight: '700', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, overflow: 'hidden' },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 16,
        marginTop: 8,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 12,
        paddingVertical: 14,
    },
    dangerText: { color: '#dc2626', fontWeight: '800' },
    endedNote: { textAlign: 'center', color: '#6b7280', marginTop: 8, paddingHorizontal: 24 },
});