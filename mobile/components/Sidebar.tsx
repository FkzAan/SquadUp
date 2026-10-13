import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { deleteLobby, fetchMyLobbies } from '../services/lobbyService';
import { fetchMyProfile } from '../services/profileService';
import { signOut } from '../services/authService';
import type { Lobby, Profile } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  onHost: () => void;
  onMyLobbies: () => void;
  onProfile: () => void;
};

export default function Sidebar({ visible, onClose, onHost, onMyLobbies, onProfile }: Props) {
  const width = Math.min(Dimensions.get('window').width * 0.8, 320);
  const slide = useRef(new Animated.Value(-width)).current;
  const [mounted, setMounted] = useState(visible);
  const [mine, setMine] = useState<Lobby[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [lobbies, p] = await Promise.all([fetchMyLobbies(), fetchMyProfile()]);
    setMine(lobbies);
    setProfile(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      load();
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: false }).start();
    } else {
      Animated.timing(slide, { toValue: -width, duration: 180, useNativeDriver: false }).start(() =>
        setMounted(false)
      );
    }
  }, [visible]);

  function confirmDelete(lobby: Lobby) {
    Alert.alert('Padam squad?', `${lobby.activity_type} di ${lobby.location_name} akan dipadam untuk semua pemain.`, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Padam',
        style: 'destructive',
        onPress: async () => {
          const err = await deleteLobby(lobby.id);
          if (err) Alert.alert('Ralat', err);
          else load();
        },
      },
    ]);
  }

  function confirmLogout() {
    Alert.alert('Log keluar', 'Anda pasti mahu log keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Log keluar', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  if (!mounted) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <Animated.View style={[s.panel, { width, transform: [{ translateX: slide }] }]}>
          <TouchableOpacity
            style={s.profileCard}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              onProfile();
            }}
          >
            <Avatar uri={profile?.avatar_url} name={profile?.name ?? '?'} size={52} />
            <View style={{ flex: 1 }}>
              <Text style={s.profileName} numberOfLines={1}>{profile?.name ?? 'Memuatkan...'}</Text>
              <Text style={s.profileEmail} numberOfLines={1}>{profile?.email ?? ''}</Text>
              <Text style={s.profileEdit}>Edit profil</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={s.createBtn}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              onHost();
            }}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={s.createText}>Cipta Squad</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.navBtn}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              onMyLobbies();
            }}
          >
            <Ionicons name="people-outline" size={20} color="#2563eb" />
            <Text style={s.navText}>Lobby Saya</Text>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <Text style={s.section}>Dihost oleh saya</Text>

          <ScrollView style={{ flex: 1 }}>
            {loading && mine.length === 0 && <Text style={s.empty}>Memuatkan...</Text>}
            {!loading && mine.length === 0 && (
              <Text style={s.empty}>Kamu belum cipta sebarang squad aktif.</Text>
            )}
            {mine.map((l) => (
              <View key={l.id} style={s.item}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{l.activity_type} · {l.skill_level}</Text>
                  <Text style={s.itemSub}>{l.location_name}</Text>
                  <Text style={s.itemSub}>{l.current_players}/{l.max_players} pemain</Text>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(l)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={s.logoutText}>Log keluar</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#fff',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  profileName: { fontWeight: '800', fontSize: 16, color: '#111827' },
  profileEmail: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  profileEdit: { color: '#2563eb', fontSize: 12, fontWeight: '700', marginTop: 3 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 12,
  },
  createText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  navText: { color: '#1d4ed8', fontWeight: '700', fontSize: 15 },
  section: { marginTop: 24, marginBottom: 8, fontWeight: '700', color: '#374151' },
  empty: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemTitle: { fontWeight: '700', color: '#111827' },
  itemSub: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 8, backgroundColor: '#fef2f2', borderRadius: 10 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 20,
    paddingVertical: 10,
    marginTop: 10,
  },
  logoutText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
});