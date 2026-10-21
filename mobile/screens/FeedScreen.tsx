import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, FlatList, TouchableOpacity, Alert, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLobbies } from '../hooks/useLobbies';
import { fetchMyJoinedLobbies, joinLobby } from '../services/lobbyService';
import Sidebar from '../components/Sidebar';
import LobbyMap from '../components/LobbyMap';
import BottomNavigation from '../components/ui/BottomNavigation';
import SportVisual, { sportIcon, sportKind } from '../components/ui/SportVisual';
import SportPickerModal from '../components/ui/SportPickerModal';
import Avatar from '../components/Avatar';
import { fetchMyProfile } from '../services/profileService';
import type { Profile } from '../types';
import type { Lobby } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { formatSchedule, isOver } from '../utils/lobby';
import { palette, radius, cardShadow } from '../theme';

type Props = { onHost: () => void; onMyLobbies: () => void; onOpenLobby: (id: string) => void; onProfile: () => void };
const SPORTS = ['All', 'Running', 'Badminton', 'Futsal', 'Pickleball', 'Chess'];
export default function FeedScreen({ onHost, onMyLobbies, onOpenLobby, onProfile }: Props) {
  const { t, language } = useLanguage();
  const { lobbies, loading, refresh } = useLobbies();
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sportFilter, setSportFilter] = useState('All');
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const [headerProfile, setHeaderProfile] = useState<Profile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const selected = lobbies.find(l => l.id === selectedId) ?? null;
  const unmapped = lobbies.filter(l => l.latitude == null || l.longitude == null).length;
  const filtered = sportFilter === 'All' ? lobbies : lobbies.filter(l => sportKind(l.activity_type) === sportKind(sportFilter));

  useFocusEffect(useCallback(() => {
    // Refetch when returning from Profile after changing the avatar.
    let active = true;
    fetchMyProfile().then(p => { if (active) setHeaderProfile(p); });
    return () => { active = false; };
  }, []));

  useEffect(() => {
    fetchMyJoinedLobbies().then(rows => setJoinedIds(new Set(rows.map(r => r.id))));
  }, [lobbies]);

  async function onJoin(id: string) {
    const err = await joinLobby(id);
    if (err) Alert.alert(t('cannotJoin'), err);
    else onOpenLobby(id);
  }

  function renderCard(item: Lobby, compact = false) {
    const joined = joinedIds.has(item.id);
    const over = isOver(item);
    const unavailable = item.status === 'full' || over;
    return <View style={[s.card, compact && s.cardCompact]}>
      <SportVisual activity={item.activity_type} style={compact ? s.photoCompact : s.photo} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text numberOfLines={1} style={s.activity}>{item.activity_type} · {item.skill_level}</Text>
          <View style={[s.status, unavailable ? s.statusClosed : s.statusOpen]}>
            <Text style={[s.statusText, unavailable ? s.statusTextClosed : s.statusTextOpen]}>{over ? t('alreadyEnded') : item.status === 'full' ? t('full') : language === 'ms' ? 'Terbuka' : 'Open'}</Text>
          </View>
        </View>
        <Text numberOfLines={1} style={s.location}><Ionicons name="location-outline" color={palette.blue} /> {item.location_name}</Text>
        <Text numberOfLines={2} style={s.meta}><Ionicons name="calendar-outline" color={palette.blue} /> {formatSchedule(item.starts_at, item.ends_at, language)}</Text>
        <Text style={s.meta}><Ionicons name="people-outline" color={palette.blue} /> {item.current_players}/{item.max_players} {t('players')}</Text>
        <TouchableOpacity onPress={() => joined ? onOpenLobby(item.id) : onJoin(item.id)}
          disabled={!joined && unavailable} style={[s.cta, !joined && unavailable && s.ctaDisabled]} activeOpacity={0.8}>
          <Text style={s.ctaText}>{joined ? t('alreadyJoined') : over ? t('alreadyEnded') : unavailable ? t('full') : t('join')}</Text>
          {(joined || !unavailable) && <Ionicons name="arrow-forward" color="#fff" size={15} />}
        </TouchableOpacity>
      </View>
    </View>;
  }

  return <View style={s.root}>
    <View style={s.header}>
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={s.menuBtn} accessibilityLabel="Open sidebar">
        <Ionicons name="menu" size={24} color={palette.navy} />
      </TouchableOpacity>
      <View style={s.heading}>
        <Text style={s.brand}>Squad<Text style={{ color: palette.blue }}>Up</Text></Text>
        <Text style={s.subheading}>{t('nearbySquads')}</Text>
      </View>
      <TouchableOpacity onPress={onProfile} style={s.profileBtn} accessibilityLabel={t('myProfile')}>
        <Avatar uri={headerProfile?.avatar_url} name={headerProfile?.name ?? 'Player'} size={42} />
      </TouchableOpacity>
    </View>
    <View style={s.tabs}>
      <TouchableOpacity style={[s.tab, view === 'list' && s.tabActive]} onPress={() => setView('list')}>
        <Ionicons name="list-outline" size={17} color={view === 'list' ? palette.blue : palette.muted}/>
        <Text style={[s.tabText, view === 'list' && s.tabTextActive]}>{t('list')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.tab, view === 'map' && s.tabActive]} onPress={() => setView('map')}>
        <Ionicons name="map-outline" size={17} color={view === 'map' ? palette.blue : palette.muted}/>
        <Text style={[s.tabText, view === 'map' && s.tabTextActive]}>{t('map')}</Text>
      </TouchableOpacity>
    </View>
    <View style={s.filtersWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} keyboardShouldPersistTaps="handled">
        {SPORTS.map(sp => <TouchableOpacity key={sp} onPress={() => setSportFilter(sp)} style={[s.filter, sportFilter === sp && s.filterActive]}>
          {sp !== 'All' && <Ionicons name={sportIcon(sp)} size={15} color={sportFilter === sp ? '#fff' : palette.blue} />}
          <Text style={[s.filterText, sportFilter === sp && s.filterTextActive]}>{sp === 'All' ? (language === 'ms' ? 'Semua' : 'All') : sp}</Text>
        </TouchableOpacity>)}
        <TouchableOpacity onPress={() => setSportPickerOpen(true)}
          style={[s.filter, sportFilter !== 'All' && !SPORTS.includes(sportFilter) && s.filterActive]}
          accessibilityLabel={language === 'ms' ? 'Lihat semua sukan' : 'All sports'}>
          <Ionicons name="grid-outline" size={15} color={sportFilter !== 'All' && !SPORTS.includes(sportFilter) ? '#fff' : palette.blue} />
          <Text style={[s.filterText, sportFilter !== 'All' && !SPORTS.includes(sportFilter) && s.filterTextActive]} numberOfLines={1}>
            {sportFilter !== 'All' && !SPORTS.includes(sportFilter) ? sportFilter : (language === 'ms' ? 'Lagi sukan' : 'More sports')}
          </Text>
          <Ionicons name="chevron-down" size={13} color={sportFilter !== 'All' && !SPORTS.includes(sportFilter) ? '#fff' : palette.muted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
    {view === 'list' ? <FlatList
      data={filtered}
      keyExtractor={item => item.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={palette.blue} />}
      contentContainerStyle={s.listContent}
      ListHeaderComponent={<View style={s.listHead}><Text style={s.sectionTitle}>{t('nearbySquads')}</Text><Text style={s.counter}>{filtered.length}</Text></View>}
      ListEmptyComponent={<Text style={s.empty}>{t('noActiveSquads')}</Text>}
      renderItem={({ item }) => renderCard(item)}
    /> : <View style={s.mapArea}>
      {unmapped > 0 && <Text style={s.note}>{t('noMapLocation', { count: unmapped })}</Text>}
      <View style={s.mapBox}><LobbyMap lobbies={filtered} onSelect={setSelectedId}/></View>
      {selected && <View style={s.sheet}>
        <TouchableOpacity style={s.sheetClose} onPress={() => setSelectedId(null)} accessibilityLabel="Close map selection"><Ionicons name="close-circle" size={23} color={palette.muted}/></TouchableOpacity>
        {renderCard(selected, true)}
      </View>}
    </View>}
    <BottomNavigation active={view === 'list' ? 'home' : 'map'} onHome={() => setView('list')} onMap={() => setView('map')}
      onHost={onHost} onMyLobbies={onMyLobbies} onProfile={onProfile} />
    <SportPickerModal visible={sportPickerOpen} selected={sportFilter} onSelect={setSportFilter} onClose={() => setSportPickerOpen(false)} language={language} />
    <Sidebar visible={menuOpen} onClose={() => setMenuOpen(false)} onHost={onHost} onMyLobbies={onMyLobbies} onProfile={onProfile}/>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas, paddingTop: 53 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 17, paddingVertical: 10, gap: 12 },
  menuBtn: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border },
  heading: { flex: 1 }, brand: { color: palette.navy, fontSize: 26, fontWeight: '900', letterSpacing: -0.7 },
  subheading: { color: palette.muted, fontSize: 11, fontWeight: '600', marginTop: 1 },
  profileBtn: { width: 44, height: 44, borderRadius: 24, backgroundColor: '#E5F0FF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border, overflow: 'hidden' },
  tabs: { flexDirection: 'row', gap: 5, padding: 4, marginHorizontal: 17, marginTop: 7, backgroundColor: '#DFEAF7', borderRadius: 15 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 10 },
  tabActive: { backgroundColor: '#fff', ...cardShadow }, tabText: { color: palette.muted, fontWeight: '700' }, tabTextActive: { color: palette.blue },
  filtersWrap: { height: 63 }, filters: { paddingHorizontal: 17, paddingVertical: 11, gap: 8, alignItems: 'center' },
  filter: { backgroundColor: '#fff', flexDirection: 'row', paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.pill, gap: 5, alignItems: 'center', borderWidth: 1, borderColor: palette.border },
  filterActive: { backgroundColor: palette.blue, borderColor: palette.blue }, filterText: { color: palette.navy, fontSize: 12, fontWeight: '700' }, filterTextActive: { color: '#fff' },
  listContent: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1 },
  listHead: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 13 }, sectionTitle: { fontSize: 19, fontWeight: '800', color: palette.navy }, counter: { color: palette.blue, fontWeight: '800' },
  card: { backgroundColor: '#fff', borderRadius: radius.card, marginBottom: 13, borderWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden', ...cardShadow },
  cardCompact: { marginBottom: 0, elevation: 0, shadowOpacity: 0, borderWidth: 0 },
  photo: { width: 108, height: 176 }, photoCompact: { width: 96, height: 148 },
  cardBody: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'space-between', gap: 3 }, cardTop: { flexDirection: 'row', gap: 5, alignItems: 'flex-start' },
  activity: { flexShrink: 1, color: palette.navy, fontSize: 14, fontWeight: '800' },
  status: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 }, statusOpen: { backgroundColor: palette.greenSoft }, statusClosed: { backgroundColor: '#F0F1F5' },
  statusText: { fontSize: 10, fontWeight: '800' }, statusTextOpen: { color: '#12804E' }, statusTextClosed: { color: palette.muted },
  location: { color: palette.muted, fontSize: 12 }, meta: { color: '#476080', fontSize: 11, lineHeight: 15 },
  cta: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 35, borderRadius: 10, gap: 6, backgroundColor: palette.blue, marginTop: 4, paddingHorizontal: 5 },
  ctaDisabled: { backgroundColor: '#9CAAC0' }, ctaText: { fontWeight: '800', fontSize: 11, color: '#fff', textAlign: 'center', flexShrink: 1 },
  empty: { color: palette.muted, textAlign: 'center', paddingHorizontal: 22, marginTop: 50 },
  mapArea: { flex: 1, position: 'relative', marginHorizontal: 12, marginBottom: 8 }, mapBox: { flex: 1, borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: palette.border },
  note: { color: palette.muted, textAlign: 'center', fontSize: 11, marginBottom: 5 },
  sheet: { position: 'absolute', bottom: 12, left: 10, right: 10, padding: 5, backgroundColor: '#fff', borderRadius: 19, ...cardShadow },
  sheetClose: { position: 'absolute', zIndex: 2, top: -18, right: 0, backgroundColor: '#fff', borderRadius: 18 },
});
