import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Share,
  useWindowDimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import Avatar from '../components/Avatar';
import { getCurrentUserId } from '../services/authService';
import {
  deleteLobby,
  fetchLobbyById,
  fetchLobbyMembers,
  isMemberOf,
  kickMember,
  leaveLobby,
  subscribeToLobbyDetail,
} from '../services/lobbyService';
import { formatClock, formatSchedule, formatTime, isEnded, statusLabel } from '../utils/lobby';
import type { Lobby, LobbyMember } from '../types';
import { useLanguage } from '../context/LanguageContext';
import SportVisual from '../components/ui/SportVisual';
import { palette, cardShadow } from '../theme';

type Props = {
  lobbyId: string;
  onBack: () => void;
  onOpenChat: (title: string) => void;
};

export default function LobbyDetailScreen({
  lobbyId,
  onBack,
  onOpenChat,
}: Props) {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [members, setMembers] = useState<LobbyMember[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const wasMemberRef = useRef(false);
  const leavingRef = useRef(false);
  const kickedShownRef = useRef(false);

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

  // Kalau saya pernah ahli squad ini tetapi tiba-tiba tiada dalam senarai, mungkin host
  // mengeluarkan saya. Sahkan terus dengan pangkalan data dahulu supaya ralat rangkaian
  // sementara (senarai kosong) tak disalah anggap sebagai dikeluarkan.
  useEffect(() => {
    if (!myId || !lobby || loading) return;
    if (members.some((m) => m.user_id === myId)) {
      wasMemberRef.current = true;
      return;
    }
    if (!wasMemberRef.current || leavingRef.current || kickedShownRef.current || isEnded(lobby)) return;

    let active = true;
    isMemberOf(lobbyId).then((still) => {
      if (!active || still !== false || kickedShownRef.current) return;
      kickedShownRef.current = true;
      Alert.alert(t('kickedTitle'), t('kickedNotice'), [{ text: 'OK', onPress: onBack }], { cancelable: false });
    });
    return () => {
      active = false;
    };
  }, [members, myId, lobby, loading]);

  async function copyCoords(lat: number, lng: number) {
    const text = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // sandaran: buka helaian kongsi supaya pengguna boleh salin dari situ
      try {
        await Share.share({ message: text });
      } catch {
        Alert.alert(t('cantCopy'), `${t('coordinates')}: ${text}`);
      }
    }
  }

  async function openInMaps(lat: number, lng: number) {
    const web = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      await Linking.openURL(web);
    } catch {
      try {
        if (Platform.OS === 'android') {
          await Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}`);
        } else {
          throw new Error('fallback');
        }
      } catch {
        Alert.alert(t('cantOpenMaps'), t('copyLink', { url: web }));
      }
    }
  }

  function confirmLeave() {
    Alert.alert(t('leaveTitle'), t('leaveMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('leave'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          leavingRef.current = true; // elak mesej "dikeluarkan" apabila saya sendiri yang keluar
          const err = await leaveLobby(lobbyId);
          setBusy(false);
          if (err) {
            leavingRef.current = false;
            Alert.alert(t('error'), err);
          } else onBack();
        },
      },
    ]);
  }

  function confirmKick(member: LobbyMember) {
    Alert.alert(t('kickTitle', { name: member.name }), t('kickMessage', { name: member.name }), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('kick'),
        style: 'destructive',
        onPress: async () => {
          setKickingId(member.user_id);
          const err = await kickMember(lobbyId, member.user_id);
          setKickingId(null);
          if (err) Alert.alert(t('error'), err);
          else load();
        },
      },
    ]);
  }

  function confirmDelete() {
    Alert.alert(t('deleteTitle'), t('deleteMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const err = await deleteLobby(lobbyId);
          setBusy(false);
          if (err) Alert.alert(t('error'), err);
          else onBack();
        },
      },
    ]);
  }

  const Header = (
    <View style={s.fallbackHeader}>
      <TouchableOpacity style={s.fallbackBack} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={22} color={palette.navy} />
      </TouchableOpacity>
      <Text style={s.fallbackTitle} numberOfLines={1}>{lobby ? lobby.activity_type : t('lobbyDetails')}</Text>
    </View>
  );

  if (loading) {
    return <View style={s.fallbackScreen}>{Header}<ActivityIndicator size="large" color={palette.blue} style={{ marginTop: 40 }} /></View>;
  }
  if (!lobby) {
    return <View style={s.fallbackScreen}>{Header}
      <Text style={s.empty}>{t('missingLobby')}</Text>
      <TouchableOpacity style={s.fallbackPrimary} onPress={onBack}><Text style={s.fallbackPrimaryText}>{t('back')}</Text></TouchableOpacity>
    </View>;
  }

  const st = statusLabel(lobby, language);
  const ended = isEnded(lobby);
  const isHost = lobby.host_id === myId;
  const isMember = members.some((m) => m.user_id === myId);
  const pct = Math.min(100, Math.round((lobby.current_players / lobby.max_players) * 100));
  const lat = lobby.latitude;
  const lng = lobby.longitude;
  const hasCoords = lat != null && lng != null;
  const showChat = isHost || isMember;
  const showDelete = !ended && isHost;
  const showLeave = !ended && !isHost && isMember;
  const showActions = showChat || showLeave || showDelete;
  const stackActions = width < 420;
  const previewCount = width < 400 ? 5 : 7;

  return (
    <View style={s.screen}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Image-first event hero. Existing activity, location and status values are unchanged. */}
        <View style={s.hero}>
          <SportVisual activity={lobby.activity_type} style={s.heroImage}/>
          <View style={s.heroShade}/>
          <TouchableOpacity style={s.heroBack} onPress={onBack} accessibilityLabel={t('back')}>
            <Ionicons name="arrow-back" size={22} color={palette.navy}/>
          </TouchableOpacity>
          <View style={[s.heroBadge, { backgroundColor: st.bg }]}>
            <View style={[s.liveDot, { backgroundColor: st.fg }]}/>
            <Text style={[s.heroBadgeText, { color: st.fg }]}>{st.text}</Text>
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroEyebrow}>{language === 'ms' ? 'MAKLUMAT SQUAD' : 'SQUAD DETAILS'}</Text>
            <Text style={s.heroTitle} numberOfLines={2}>{lobby.activity_type}</Text>
            <View style={s.heroLocation}>
              <Ionicons name="location" size={16} color="#fff"/>
              <Text style={s.heroLocationText} numberOfLines={1}>{lobby.location_name}</Text>
            </View>
          </View>
        </View>

        {/* One compact overview replaces multiple detached cards. */}
        <View style={s.overview}>
          <View style={s.stat}>
            <View style={s.statIcon}><Ionicons name="calendar-outline" size={18} color={palette.blue}/></View>
            <Text style={s.statNumber} numberOfLines={1}>{formatClock(new Date(lobby.starts_at))}</Text>
            <Text style={s.statCaption}>{language === 'ms' ? 'Mula' : 'Start'}</Text>
          </View>
          <View style={s.statDivider}/>
          <View style={s.stat}>
            <View style={s.statIcon}><Ionicons name="flash-outline" size={18} color={palette.blue}/></View>
            <Text style={s.statNumber} numberOfLines={1}>{lobby.skill_level}</Text>
            <Text style={s.statCaption}>{language === 'ms' ? 'Tahap' : 'Level'}</Text>
          </View>
          <View style={s.statDivider}/>
          <View style={s.stat}>
            <View style={s.statIcon}><Ionicons name="people-outline" size={18} color={palette.blue}/></View>
            <Text style={s.statNumber}>{lobby.current_players}/{lobby.max_players}</Text>
            <Text style={s.statCaption}>{t('players')}</Text>
          </View>
        </View>

        <View style={s.detailsCard}>
          <Text style={s.sectionHeader}>{language === 'ms' ? 'Maklumat Aktiviti' : 'Activity Information'}</Text>
          <View style={s.detailLine}>
            <View style={s.detailIcon}><Ionicons name="time-outline" size={19} color={palette.blue}/></View>
            <View style={s.detailText}>
              <Text style={s.detailLabel}>{t('time')}</Text>
              <Text style={s.detailValue}>{formatSchedule(lobby.starts_at, lobby.ends_at, language)}</Text>
              <Text style={s.detailHint}>{t('lobbyCloses', { time: formatTime(lobby.expires_at) })}</Text>
            </View>
          </View>
          <View style={s.lineDivider}/>
          <View style={s.detailLine}>
            <View style={s.detailIcon}><Ionicons name="location-outline" size={19} color={palette.blue}/></View>
            <View style={s.detailText}>
              <Text style={s.detailLabel}>{t('location')}</Text>
              <Text style={s.detailValue}>{lobby.location_name}</Text>
              {hasCoords && <Text style={s.detailHint}>{(lat as number).toFixed(6)}, {(lng as number).toFixed(6)}</Text>}
            </View>
          </View>
          {hasCoords ? (
            <View style={s.locationActions}>
              <TouchableOpacity style={s.mapAction} onPress={() => openInMaps(lat as number, lng as number)} activeOpacity={0.8}>
                <Ionicons name="map-outline" size={19} color={palette.blue}/>
                <Text style={s.mapActionText} numberOfLines={1}>{t('openMaps')}</Text>
                <Ionicons name="arrow-forward" size={16} color={palette.blue}/>
              </TouchableOpacity>
              <TouchableOpacity style={s.copyAction} onPress={() => copyCoords(lat as number, lng as number)} accessibilityLabel={t('copy')}>
                <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={19} color={copied ? palette.green : palette.blue}/>
                <Text style={s.copyText}>{copied ? t('copied') : t('copy')}</Text>
              </TouchableOpacity>
            </View>
          ) : <Text style={s.noCoords}>{t('noCoordinates')}</Text>}
        </View>

        <View style={s.detailsCard}>
          <View style={s.participantsHeader}>
            <View>
              <Text style={s.sectionHeader}>{t('players')}</Text>
              <Text style={s.sectionSubtitle}>{language === 'ms' ? 'Kenali rakan sepasukan anda' : 'Meet your teammates'}</Text>
            </View>
            <View style={s.capacityPill}><Text style={s.capacityText}>{lobby.current_players}/{lobby.max_players}</Text></View>
          </View>
          <View style={s.barBg}><View style={[s.barFill, { width: `${pct}%` as `${number}%` }]}/></View>
          <View style={s.memberStrip}>
            {members.slice(0, previewCount).map(m => (
              <View key={m.user_id} style={s.stripAvatar}>
                <Avatar uri={m.avatar_url} name={m.name} size={40}/>
                {m.is_host && <View style={s.crown}><Ionicons name="star" size={10} color="#fff"/></View>}
              </View>
            ))}
            {members.length > previewCount && <View style={s.extraMembers}><Text style={s.extraText}>+{members.length - previewCount}</Text></View>}
          </View>
          {members.map((m, idx) => (
            <View key={m.user_id} style={[s.memberRow, idx === members.length - 1 && s.lastMember]}>
              <Avatar uri={m.avatar_url} name={m.name} size={42}/>
              <View style={s.memberText}>
                <Text style={s.memberName} numberOfLines={1}>{m.name}{m.user_id === myId ? t('you') : ''}</Text>
                <Text style={s.memberMeta}>{t('joinedAt', { time: formatTime(m.joined_at) })}</Text>
              </View>
              {m.is_host && <Text style={s.hostTag}>Host</Text>}
              {isHost && !ended && !m.is_host && (
                <TouchableOpacity style={s.kickBtn} onPress={() => confirmKick(m)} disabled={kickingId !== null} activeOpacity={0.7}>
                  {kickingId === m.user_id ? <ActivityIndicator size="small" color={palette.danger}/> : <Text style={s.kickText}>{t('kick')}</Text>}
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        {ended && <Text style={s.endedNote}>{t('endedHistory')}</Text>}
      </ScrollView>
      {/* Fixed actions respect device safe area; they never disappear below a long member list. */}
      {showActions && (
        <View style={[s.actionDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={[s.actionRow, stackActions && s.actionStack]}>
            {showChat && (
              <TouchableOpacity style={s.chatBtn} onPress={() => onOpenChat(lobby.activity_type)} activeOpacity={0.8}>
                <Ionicons name="chatbubbles-outline" size={19} color="#fff"/>
                <Text style={s.chatText} numberOfLines={1}>{language === 'ms' ? 'Buka Chat Squad' : 'Open Squad Chat'}</Text>
              </TouchableOpacity>
            )}
            {showLeave && (
              <TouchableOpacity style={s.dangerBtn} onPress={confirmLeave} disabled={busy} activeOpacity={0.8}>
                <Ionicons name="exit-outline" size={18} color={palette.danger}/>
                <Text style={s.dangerText} numberOfLines={1}>{busy ? t('processing') : t('leaveSquad')}</Text>
              </TouchableOpacity>
            )}
            {showDelete && (
              <TouchableOpacity style={s.dangerBtn} onPress={confirmDelete} disabled={busy} activeOpacity={0.8}>
                <Ionicons name="trash-outline" size={18} color={palette.danger}/>
                <Text style={s.dangerText} numberOfLines={1}>{busy ? t('processing') : t('deleteSquad')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 55, paddingBottom: 24 },
  fallbackScreen: { flex: 1, backgroundColor: palette.canvas, paddingTop: 56 },
  fallbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 18 },
  fallbackBack: { backgroundColor: '#fff', width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  fallbackTitle: { fontSize: 22, fontWeight: '900', color: palette.navy, flex: 1 },
  empty: { color: palette.muted, margin: 22, textAlign: 'center' },
  fallbackPrimary: { backgroundColor: palette.blue, borderRadius: 16, padding: 15, marginHorizontal: 24, alignItems: 'center' },
  fallbackPrimaryText: { color: '#fff', fontWeight: '800' },
  hero: { height: 238, overflow: 'hidden', borderRadius: 24, backgroundColor: '#B4CEE9', marginBottom: 12 },
  heroImage: { width: '100%', height: '100%' },
  heroShade: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(6,29,62,0.35)' },
  heroBack: { position: 'absolute', top: 15, left: 15, width: 42, height: 42, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)', alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: 17, right: 14, borderRadius: 20, flexDirection: 'row',
    alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 11 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  heroBadgeText: { fontSize: 12, fontWeight: '900' },
  heroContent: { position: 'absolute', left: 15, right: 15, bottom: 14, padding: 13,
    borderRadius: 16, backgroundColor: 'rgba(7,26,58,0.70)' },
  heroEyebrow: { color: '#ACD6FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 5 },
  heroTitle: { fontSize: 25, lineHeight: 29, fontWeight: '900', color: '#fff' },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  heroLocationText: { flex: 1, color: '#F1F7FF', fontWeight: '600', fontSize: 13 },
  overview: { backgroundColor: '#fff', borderRadius: 20, flexDirection: 'row', paddingVertical: 15,
    paddingHorizontal: 7, borderColor: palette.border, borderWidth: 1, marginBottom: 12 },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 3 },
  statIcon: { backgroundColor: palette.blueSoft, borderRadius: 30, width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statNumber: { color: palette.navy, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  statCaption: { color: palette.muted, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: palette.border, marginVertical: 8 },
  detailsCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: palette.border,
    padding: 16, marginBottom: 12 },
  sectionHeader: { fontSize: 17, fontWeight: '900', color: palette.navy },
  sectionSubtitle: { fontSize: 12, color: palette.muted, marginTop: 3 },
  detailLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 13 },
  detailIcon: { width: 39, height: 39, backgroundColor: palette.blueSoft, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  detailText: { flex: 1, justifyContent: 'center', minHeight: 39 },
  detailLabel: { fontSize: 12, color: palette.muted, fontWeight: '700' },
  detailValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: palette.navy, marginTop: 2 },
  detailHint: { color: palette.muted, fontSize: 11, marginTop: 4 },
  lineDivider: { height: 1, backgroundColor: '#E9F0F8' },
  locationActions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  mapAction: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 13, backgroundColor: '#E9F3FF' },
  mapActionText: { flex: 1, fontSize: 13, fontWeight: '800', color: palette.blue },
  copyAction: { alignItems: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 11,
    borderRadius: 12, borderWidth: 1, borderColor: palette.border },
  copyText: { fontSize: 12, fontWeight: '700', color: palette.blue },
  noCoords: { color: '#A65A17', padding: 12, backgroundColor: '#FFF7E9', borderRadius: 12 },
  participantsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  capacityPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11, backgroundColor: palette.blueSoft },
  capacityText: { color: palette.blue, fontWeight: '900', fontSize: 14 },
  barBg: { backgroundColor: '#E4EDF8', height: 7, borderRadius: 6, overflow: 'hidden' },
  barFill: { backgroundColor: palette.blue, height: 7, borderRadius: 6 },
  memberStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 13, marginBottom: 7, paddingLeft: 4, minHeight: 46 },
  stripAvatar: { marginLeft: -5, padding: 2, borderRadius: 30, backgroundColor: '#fff' },
  crown: { position: 'absolute', right: -2, bottom: 0, backgroundColor: palette.blue, padding: 3, borderRadius: 20 },
  extraMembers: { backgroundColor: palette.blueSoft, width: 40, height: 40, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center', marginLeft: 3 },
  extraText: { color: palette.blue, fontWeight: '800', fontSize: 11 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10,
    borderBottomColor: '#EAF0F7', borderBottomWidth: 1 },
  lastMember: { borderBottomWidth: 0 },
  memberText: { flex: 1 },
  memberName: { color: palette.navy, fontSize: 14, fontWeight: '800' },
  memberMeta: { color: palette.muted, fontSize: 11, marginTop: 4 },
  hostTag: { backgroundColor: palette.blueSoft, color: palette.blue, fontSize: 11, fontWeight: '800',
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, overflow: 'hidden' },
  kickBtn: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: palette.dangerSoft,
    borderRadius: 10, borderWidth: 1, borderColor: '#F9CED5' },
  kickText: { fontSize: 12, fontWeight: '800', color: palette.danger },
  endedNote: { color: palette.muted, textAlign: 'center', marginBottom: 12 },
  actionDock: { backgroundColor: '#fff', borderTopColor: palette.border, borderTopWidth: 1,
    paddingHorizontal: 16, paddingTop: 12, shadowColor: '#16386D', shadowOpacity: 0.08,
    shadowRadius: 8, shadowOffset: { height: -3, width: 0 }, elevation: 5 },
  actionRow: { flexDirection: 'row', gap: 9, alignItems: 'stretch' },
  actionStack: { flexDirection: 'column' },
  chatBtn: { backgroundColor: palette.blue, flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7, minHeight: 49, paddingHorizontal: 10, borderRadius: 14 },
  chatText: { fontWeight: '900', fontSize: 13, color: '#fff', flexShrink: 1 },
  dangerBtn: { borderWidth: 1, borderColor: '#FFCFD7', backgroundColor: palette.dangerSoft,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 49,
    paddingHorizontal: 10, borderRadius: 14, maxWidth: '100%' },
  dangerText: { color: palette.danger, fontWeight: '900', fontSize: 12, flexShrink: 1 },
});
