import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { deleteLobby, fetchMyLobbies } from '../services/lobbyService';
import { fetchMyProfile } from '../services/profileService';
import { signOut } from '../services/authService';
import type { Lobby, Profile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { palette } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onHost: () => void;
  onMyLobbies: () => void;
  onProfile: () => void;
};

export default function Sidebar({ visible, onClose, onHost, onMyLobbies, onProfile }: Props) {
  const { t } = useLanguage();
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
    Alert.alert(t('deleteTitle'), t('deleteHostedMessage', { activity: lobby.activity_type, location: lobby.location_name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          const err = await deleteLobby(lobby.id);
          if (err) Alert.alert(t('error'), err);
          else load();
        },
      },
    ]);
  }

  function confirmLogout() {
    Alert.alert(t('logout'), t('logoutMessage'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: () => signOut() },
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
              <Text style={s.profileName} numberOfLines={1}>{profile?.name ?? t('loading')}</Text>
              <Text style={s.profileEmail} numberOfLines={1}>{profile?.email ?? ''}</Text>
              <Text style={s.profileEdit}>{t('editProfile')}</Text>
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
            <Text style={s.createText}>{t('createSquad')}</Text>
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
            <Text style={s.navText}>{t('myLobbies')}</Text>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>

          <Text style={s.section}>{t('hostedByMe')}</Text>

          <ScrollView style={{ flex: 1 }}>
            {loading && mine.length === 0 && <Text style={s.empty}>{t('loading')}</Text>}
            {!loading && mine.length === 0 && (
              <Text style={s.empty}>{t('noHosted')}</Text>
            )}
            {mine.map((l) => (
              <View key={l.id} style={s.item}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemTitle}>{l.activity_type} · {l.skill_level}</Text>
                  <Text style={s.itemSub}>{l.location_name}</Text>
                  <Text style={s.itemSub}>{l.current_players}/{l.max_players} {t('players')}</Text>
                </View>
                <TouchableOpacity style={s.deleteBtn} onPress={() => confirmDelete(l)} activeOpacity={0.7}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={s.logoutBtn} onPress={confirmLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            <Text style={s.logoutText}>{t('logout')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 }, backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,27,54,0.5)' },
  panel: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: palette.canvas, paddingTop: 62, paddingHorizontal: 17, paddingBottom: 29, borderTopRightRadius: 25, borderBottomRightRadius: 25 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 19, padding: 14, marginBottom: 17, borderWidth: 1, borderColor: palette.border },
  profileName: { fontWeight: '900', fontSize: 16, color: palette.navy }, profileEmail: { color: palette.muted, fontSize: 11, marginTop: 2 },
  profileEdit: { color: palette.blue, fontSize: 12, fontWeight: '800', marginTop: 4 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: palette.blue, borderRadius: 14, paddingVertical: 15 },
  createText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  navBtn: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: palette.blueSoft, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 14, marginTop: 13 },
  navText: { color: palette.blueDark, fontWeight: '800', fontSize: 14 },
  section: { marginTop: 28, marginBottom: 12, fontWeight: '900', fontSize: 14, color: palette.navy },
  empty: { color: palette.muted, fontSize: 13, marginTop: 4 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: palette.border, padding: 13, marginBottom: 10 },
  itemTitle: { fontWeight: '800', color: palette.navy }, itemSub: { color: palette.muted, fontSize: 12, marginTop: 3 },
  deleteBtn: { padding: 9, backgroundColor: palette.dangerSoft, borderRadius: 10 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: palette.dangerSoft, borderWidth: 1, borderColor: '#FFD5DD', borderRadius: 15, paddingVertical: 13, marginTop: 12 },
  logoutText: { color: palette.danger, fontWeight: '800', fontSize: 13 },
});
