import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import type { ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../context/AuthContext';
import AccessState from '../components/AccessState';
import { supabase } from '../services/supabaseClient';
import { createAdminDashboardService } from '../services/adminDashboardService';
import type { AdminActivity, AdminLobby, AdminPlayer, AdminSnapshot, FacilityInput } from '../services/adminDashboardService';
import type { Facility } from '../types';
import { adminCsv } from '../utils/adminCsv';

const api = createAdminDashboardService(supabase);
type Page = 'overview' | 'lobbies' | 'players' | 'facilities' | 'activity';
type Filter = 'all' | 'open' | 'full' | 'ended' | 'cancelled' | 'expired';
type IconName = keyof typeof Ionicons.glyphMap;
const pages: { key: Page; label: string; icon: IconName }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'lobbies', label: 'Squads', icon: 'basketball-outline' },
  { key: 'players', label: 'Players', icon: 'people-outline' },
  { key: 'facilities', label: 'Facilities', icon: 'location-outline' },
  { key: 'activity', label: 'Activity', icon: 'time-outline' }
];
const errors = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';
const dateText = (date: string) => {
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? 'Not available' : value.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};
const visibleStatus = (lobby: AdminLobby) =>
  ['open', 'full'].includes(lobby.status) && new Date(lobby.expires_at).getTime() <= Date.now() ? 'expired' : lobby.status;
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || '?';

function Button({ title, onPress, disabled = false, quiet = false, danger = false, icon }: {
  title: string; onPress: () => void; disabled?: boolean; quiet?: boolean; danger?: boolean; icon?: IconName;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.button, quiet && s.quietButton, danger && s.dangerButton, (disabled || pressed) && s.faded]}>
    {icon && <Ionicons name={icon} size={16} color={danger ? '#b53a34' : quiet ? '#28553f' : '#fff'} />}
    <Text style={[s.buttonText, quiet && s.quietText, danger && s.dangerText]}>{title}</Text>
  </Pressable>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <View style={s.empty}><Ionicons name="search-outline" size={30} color="#8b978c" /><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyText}>{children}</Text></View>;
}
function Badge({ status }: { status: string }) {
  const active = status === 'open' || status === 'full';
  return <View style={[s.badge, active && s.activeBadge]}><View style={[s.dot, active && s.activeDot]} /><Text style={[s.badgeText, active && s.activeBadgeText]}>{status}</Text></View>;
}
function LobbyCard({ lobby, working, moderate }: { lobby: AdminLobby; working: boolean; moderate: (lobby: AdminLobby, status: 'ended' | 'cancelled') => void }) {
  const status = visibleStatus(lobby); const canModerate = status === 'open' || status === 'full';
  return <View style={s.card}>
    <View style={s.rowBetween}><Text style={s.itemTitle}>{lobby.activity_type}</Text><Badge status={status} /></View>
    <Text style={s.itemSubtitle}>{lobby.location_name}</Text>
    <View style={s.detailLine}><Ionicons name="person-outline" size={14} color="#758178" /><Text style={s.detail}>{lobby.host_name}</Text></View>
    <View style={s.detailLine}><Ionicons name="calendar-outline" size={14} color="#758178" /><Text style={s.detail}>{dateText(lobby.starts_at)}</Text></View>
    <View style={s.rowBetween}><Text style={s.small}>{lobby.current_players}/{lobby.max_players} players · {lobby.skill_level}</Text>
      {canModerate && <View style={s.actions}><Button title="End" quiet disabled={working} onPress={() => moderate(lobby, 'ended')} /><Button title="Cancel" danger disabled={working} onPress={() => moderate(lobby, 'cancelled')} /></View>}
    </View>
  </View>;
}
function PlayerCard({ player }: { player: AdminPlayer }) {
  return <View style={[s.card, s.playerRow]}><View style={s.avatar}><Text style={s.avatarText}>{initials(player.name)}</Text></View><View style={s.grow}>
    <Text style={s.itemTitle}>{player.name}</Text><Text style={s.detail}>{player.email || 'No email available'}</Text>
    <Text style={s.small}>{player.hosted} hosted · {player.joined} joined</Text><Text style={s.small}>Joined {dateText(player.joined_at)}</Text>
  </View></View>;
}
function FacilityCard({ facility, working, edit }: { facility: Facility; working: boolean; edit: (facility: Facility) => void }) {
  return <View style={s.card}><View style={s.rowBetween}><View style={s.grow}><Text style={s.itemTitle}>{facility.name}</Text><Text style={s.itemSubtitle}>{facility.facility_type} · {facility.township}</Text></View><Button title="Edit" quiet disabled={working} onPress={() => edit(facility)} /></View>
    <Text style={s.small}>{facility.latitude}, {facility.longitude}</Text>
  </View>;
}
function ActivityCard({ activity }: { activity: AdminActivity }) {
  const labels: Record<string, string> = { 'lobby.ended': 'Ended a squad', 'lobby.cancelled': 'Cancelled a squad', 'facility.created': 'Added a facility', 'facility.updated': 'Updated a facility' };
  return <View style={[s.card, s.playerRow]}><View style={s.activityIcon}><Ionicons name={activity.action.startsWith('facility.') ? 'location-outline' : 'basketball-outline'} size={20} color="#28553f" /></View><View style={s.grow}>
    <Text style={s.itemTitle}>{labels[activity.action] || activity.action}</Text><Text style={s.detail}>{activity.actor_email}</Text>
    {typeof activity.details.name === 'string' && <Text style={s.detail}>{activity.details.name}</Text>}
    <Text style={s.small}>{dateText(activity.created_at)}</Text>
  </View></View>;
}

export default function AdminDashboardScreen() {
  const { session } = useAuth();
  if (!session) return <AccessState />;
  return <NativeDashboard key={session.user.id} userId={session.user.id} email={session.user.email ?? 'Administrator'} />;
}

function NativeDashboard({ userId, email }: { userId: string; email: string }) {
  const { logout } = useAuth();
  const [page, setPage] = useState<Page>('overview');
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(true);
  const [working, setWorking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editor, setEditor] = useState<FacilityInput | null>(null);
  const alive = useRef(false); const request = useRef(0); const fetching = useRef(false); const mutation = useRef(false); const sharing = useRef(false);

  const reload = useCallback(async (afterMutation = false) => {
    if (!userId || fetching.current || (mutation.current && !afterMutation)) return;
    fetching.current = true;
    const current = ++request.current;
    setRefreshing(true); setError('');
    try {
      const next = await api.snapshot();
      if (alive.current && request.current === current) { setSnapshot(next); setUpdated(new Date()); }
    } catch (error) {
      if (alive.current && request.current === current) { setSnapshot(null); setError(errors(error)); }
    } finally {
      if (request.current === current) { fetching.current = false; if (alive.current) setRefreshing(false); }
    }
  }, [userId]);
  useEffect(() => {
    alive.current = true; fetching.current = true;
    const current = ++request.current;
    api.snapshot().then(next => {
      if (alive.current && request.current === current) { setSnapshot(next); setUpdated(new Date()); }
    }).catch(error => {
      if (alive.current && request.current === current) setError(errors(error));
    }).finally(() => {
      if (request.current === current) { fetching.current = false; if (alive.current) setRefreshing(false); }
    });
    return () => { alive.current = false; request.current += 1; };
  }, [userId]);

  async function change(operation: () => Promise<void>, done?: () => void) {
    if (mutation.current || fetching.current || !userId) return;
    mutation.current = true; setWorking(true);
    try {
      await operation();
      if (alive.current) { done?.(); await reload(true); }
    } catch (error) { if (alive.current) Alert.alert('Could not save', errors(error)); }
    finally { mutation.current = false; if (alive.current) setWorking(false); }
  }
  function moderate(lobby: AdminLobby, status: 'ended' | 'cancelled') {
    Alert.alert(status === 'ended' ? 'End this squad?' : 'Cancel this squad?', `${lobby.activity_type} at ${lobby.location_name}. This changes the squad for every player.`, [
      { text: 'Keep squad', style: 'cancel' },
      { text: status === 'ended' ? 'End squad' : 'Cancel squad', style: 'destructive', onPress: () => { void change(() => api.moderateLobby(lobby.id, status)); } }
    ]);
  }
  async function exit() {
    if (leaving || mutation.current) return;
    setLeaving(true);
    try { await logout(); }
    catch (error) { if (alive.current) Alert.alert('Could not sign out', errors(error)); }
    finally { if (alive.current) setLeaving(false); }
  }
  function navigate(next: Page) { setPage(next); setSearch(''); setFilter('all'); }
  const results = useMemo(() => {
    const query = search.toLowerCase().trim();
    const match = (...values: string[]) => values.join(' ').toLowerCase().includes(query);
    return {
      lobbies: (snapshot?.lobbies ?? []).filter(lobby => (filter === 'all' || visibleStatus(lobby) === filter) && match(lobby.activity_type, lobby.location_name, lobby.host_name)),
      players: (snapshot?.users ?? []).filter(player => match(player.name, player.email)),
      facilities: (snapshot?.facilities ?? []).filter(facility => match(facility.name, facility.facility_type, facility.township))
    };
  }, [snapshot, search, filter]);

  async function exportData() {
    if (!snapshot || sharing.current) return;
    sharing.current = true; setExporting(true);
    let file: File | null = null;
    try {
      if (Platform.OS === 'web' || !await Sharing.isAvailableAsync()) throw new Error('CSV sharing is available in the Android or iOS app.');
      let rows: (string | number)[][];
      if (page === 'overview') rows = [['Metric','Value'], ['Players',snapshot.totals.users], ['Total squads',snapshot.totals.lobbies], ['Active squads',snapshot.totals.active], ['Facilities',snapshot.totals.facilities], ['Squad joins',snapshot.totals.memberships], ['Day (UTC)','Squads created'], ...snapshot.daily.map(day => [day.day,day.count])];
      else if (page === 'players') rows = [['Name','Email','Joined','Hosted','Joined squads'], ...results.players.map(player => [player.name,player.email,player.joined_at,player.hosted,player.joined])];
      else if (page === 'facilities') rows = [['Name','Type','Township','Latitude','Longitude'], ...results.facilities.map(facility => [facility.name,facility.facility_type,facility.township,facility.latitude,facility.longitude])];
      else if (page === 'activity') rows = [['Action','Administrator','Target ID','Date'], ...snapshot.audit.map(activity => [activity.action,activity.actor_email,activity.target_id,activity.created_at])];
      else rows = [['Sport','Location','Host','Status','Players','Capacity','Starts'], ...results.lobbies.map(lobby => [lobby.activity_type,lobby.location_name,lobby.host_name,visibleStatus(lobby),lobby.current_players,lobby.max_players,lobby.starts_at])];
      file = new File(Paths.cache, `squadup-${page}-${Date.now()}.csv`); file.create(); file.write(`\ufeff${adminCsv(rows)}`);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Save or share SquadUp data' });
    } catch (error) { if (alive.current) Alert.alert('Export CSV', errors(error)); }
    finally { if (file?.exists) file.delete(); sharing.current = false; if (alive.current) setExporting(false); }
  }

  const busy = working || refreshing;
  const sectionHeader = <View style={s.sectionHeader}>
    <View style={s.rowBetween}><View style={s.grow}><Text style={s.eyebrow}>YOUR COMMUNITY</Text><Text style={s.sectionTitle}>{pages.find(item => item.key === page)?.label}</Text></View>
      {page === 'facilities' && <Button title="Add" icon="add" disabled={busy} onPress={() => setEditor({ id: null, name: '', facility_type: '', township: '', latitude: NaN, longitude: NaN })} />}
    </View>
    {snapshot?.limited && <Text style={s.notice}>Showing up to 2,000 records per list. Totals include all records.</Text>}
    {page !== 'activity' && page !== 'overview' && <View style={s.searchBox}><Ionicons name="search-outline" size={19} color="#849187" /><TextInput style={s.searchInput} value={search} onChangeText={setSearch} placeholder={`Search ${page === 'lobbies' ? 'squads' : page}…`} placeholderTextColor="#849187" autoCorrect={false} accessibilityLabel={`Search ${page}`} />{search !== '' && <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search"><Ionicons name="close-circle" size={18} color="#849187" /></Pressable>}</View>}
    {page === 'lobbies' && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>{(['all','open','full','ended','cancelled','expired'] as Filter[]).map(value => <Pressable key={value} onPress={() => setFilter(value)} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[s.filter, filter === value && s.selectedFilter]}><Text style={[s.filterText, filter === value && s.selectedFilterText]}>{value}</Text></Pressable>)}</ScrollView>}
    {page === 'activity' && <Text style={s.sectionDescription}>The 50 most recent administrator actions.</Text>}
  </View>;
  const refresh = <RefreshControl refreshing={refreshing} onRefresh={() => { void reload(); }} tintColor="#28553f" colors={['#28553f']} />;

  return <SafeAreaView style={s.root} edges={['top','bottom']}>
    <View style={s.header}><View style={s.brandRow}><View style={s.brandIcon}><Ionicons name="basketball" color="#fff" size={24} /></View><View style={s.grow}><Text style={s.brand}>SquadUp<Text style={s.brandDot}>.</Text></Text><Text style={s.accountEmail} numberOfLines={1}>{email}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Sign out" disabled={working || leaving} onPress={() => { void exit(); }} style={s.iconButton}>{leaving ? <ActivityIndicator size="small" color="#28553f" /> : <Ionicons name="log-out-outline" size={23} color="#28553f" />}</Pressable></View>
      <View style={s.headerMeta}><View style={s.adminLabel}><Ionicons name="shield-checkmark-outline" size={12} color="#28553f" /><Text style={s.adminLabelText}>ADMIN WORKSPACE</Text></View><Text style={s.updated}>{updated ? `Updated ${updated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : 'Connecting…'}</Text></View>
    </View>
    <View style={s.navigation}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.navigationContent}>{pages.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: page === item.key }} onPress={() => navigate(item.key)} style={[s.tab, page === item.key && s.selectedTab]}><Ionicons name={item.icon} size={17} color={page === item.key ? '#28553f' : '#849187'} /><Text style={[s.tabText, page === item.key && s.selectedTabText]}>{item.label}</Text></Pressable>)}</ScrollView></View>
    {!snapshot ? <View style={s.loading}>{error ? <><Ionicons name="cloud-offline-outline" size={40} color="#758178" /><Text style={s.emptyTitle}>Dashboard unavailable</Text><Text style={s.emptyText}>{error}</Text><Button title="Try again" onPress={() => { void reload(); }} disabled={refreshing} /></> : <><ActivityIndicator color="#28553f" size="large" /><Text style={s.emptyText}>Loading your community…</Text></>}</View> : <>
      {page === 'overview' ? <ScrollView contentContainerStyle={s.listContent} refreshControl={refresh}>
        {sectionHeader}<View style={s.hero}><View style={s.heroLabel}><View style={s.liveDot} /><Text style={s.heroEyebrow}>COMMUNITY PULSE</Text></View><Text style={s.heroTitle}>More games.{ '\n' }Better together.</Text><Text style={s.heroDescription}>Keep every squad moving in the right direction.</Text><View style={s.heroBottom}><Text style={s.heroCount}>{snapshot.totals.active}</Text><Text style={s.heroCountLabel}>active squads</Text><View style={s.heroBall}><Ionicons name="basketball-outline" size={62} color="#abc6ae" /></View></View></View>
        <View style={s.metrics}>{([{ label: 'Players', value: snapshot.totals.users, icon: 'people-outline', target: 'players' }, { label: 'Total squads', value: snapshot.totals.lobbies, icon: 'basketball-outline', target: 'lobbies' }, { label: 'Facilities', value: snapshot.totals.facilities, icon: 'location-outline', target: 'facilities' }, { label: 'Squad joins', value: snapshot.totals.memberships, icon: 'person-add-outline', target: 'players' }] as { label: string; value: number; icon: IconName; target: Page }[]).map(metric => <Pressable key={metric.label} accessibilityRole="button" onPress={() => navigate(metric.target)} style={s.metric}><Ionicons name={metric.icon} size={21} color="#6f8975" /><Text style={s.metricValue}>{metric.value.toLocaleString()}</Text><Text style={s.metricLabel}>{metric.label}</Text></Pressable>)}</View>
        <View style={s.chartCard}><View style={s.rowBetween}><Text style={s.itemTitle}>Last 7 days</Text><Text style={s.small}>Squads created · UTC</Text></View><View style={s.chart}>{snapshot.daily.map(day => <View key={day.day} style={s.chartColumn}><Text style={s.chartCount}>{day.count}</Text><View style={s.barTrack}><View style={[s.bar, { height: Math.max(3, 90 * day.count / Math.max(1, ...snapshot.daily.map(item => item.count))) }]} /></View><Text style={s.chartDay}>{new Date(`${day.day}T12:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}</Text></View>)}</View></View>
        <View style={s.rowBetween}><Text style={s.blockTitle}>Latest squads</Text><Pressable onPress={() => navigate('lobbies')} accessibilityRole="button"><Text style={s.textLink}>View all →</Text></Pressable></View>
        {snapshot.lobbies.length === 0 ? <Empty title="No squads yet">New squads from the player app will appear here.</Empty> : snapshot.lobbies.slice(0, 5).map(lobby => <LobbyCard key={lobby.id} lobby={lobby} working={busy} moderate={moderate} />)}
      </ScrollView> : page === 'lobbies' ? <FlatList key={page} data={results.lobbies} keyExtractor={item => item.id} contentContainerStyle={s.listContent} refreshControl={refresh} ListHeaderComponent={sectionHeader} ListEmptyComponent={<Empty title="No matching squads">Try a different search or status.</Empty>} renderItem={({ item }) => <LobbyCard lobby={item} working={busy} moderate={moderate} />} />
        : page === 'players' ? <FlatList key={page} data={results.players} keyExtractor={item => item.id} contentContainerStyle={s.listContent} refreshControl={refresh} ListHeaderComponent={sectionHeader} ListEmptyComponent={<Empty title="No matching players">Players with a SquadUp profile will appear here.</Empty>} renderItem={({ item }) => <PlayerCard player={item} />} />
        : page === 'facilities' ? <FlatList key={page} data={results.facilities} keyExtractor={item => item.id} contentContainerStyle={s.listContent} refreshControl={refresh} ListHeaderComponent={sectionHeader} ListEmptyComponent={<Empty title="No matching facilities">Add a facility or change your search.</Empty>} renderItem={({ item }) => <FacilityCard facility={item} working={busy} edit={facility => setEditor(facility)} />} />
        : <FlatList key={page} data={snapshot.audit} keyExtractor={item => item.id} contentContainerStyle={s.listContent} refreshControl={refresh} ListHeaderComponent={sectionHeader} ListEmptyComponent={<Empty title="No admin actions yet">Saved changes will be recorded here.</Empty>} renderItem={({ item }) => <ActivityCard activity={item} />} />}
      <View style={s.footer}><Text style={s.footerText}>{working ? 'Saving changes…' : 'Pull down to refresh'}</Text><Button title={exporting ? 'Exporting…' : 'Export CSV'} icon="download-outline" quiet disabled={busy || exporting} onPress={() => { void exportData(); }} /></View>
    </>}
    {editor && <FacilityEditor value={editor} working={working} close={() => { if (!mutation.current) setEditor(null); }} save={input => { void change(() => api.saveFacility(input), () => setEditor(null)); }} />}
  </SafeAreaView>;
}

function FacilityEditor({ value, working, close, save }: { value: FacilityInput; working: boolean; close: () => void; save: (input: FacilityInput) => void }) {
  const [name, setName] = useState(value.name); const [kind, setKind] = useState(value.facility_type); const [town, setTown] = useState(value.township);
  const [lat, setLat] = useState(Number.isFinite(value.latitude) ? String(value.latitude) : ''); const [lng, setLng] = useState(Number.isFinite(value.longitude) ? String(value.longitude) : ''); const [error, setError] = useState('');
  function submit() {
    if (!value) return;
    const latitude = Number(lat.trim()); const longitude = Number(lng.trim());
    if (!name.trim() || !kind.trim() || !town.trim() || !lat.trim() || !lng.trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) { setError('Complete all fields with valid latitude and longitude.'); return; }
    setError(''); save({ id: value.id, name, facility_type: kind, township: town, latitude, longitude });
  }
  return <Modal visible transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView style={s.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><SafeAreaView style={s.modalCard} edges={['bottom']}>
      <View style={s.modalHeading}><View style={s.grow}><Text style={s.eyebrow}>COMMUNITY SPACES</Text><Text style={s.sectionTitle}>{value?.id ? 'Edit facility' : 'Add facility'}</Text></View><Pressable accessibilityLabel="Close facility editor" accessibilityRole="button" onPress={close} disabled={working} style={s.iconButton}><Ionicons name="close" size={23} color="#28553f" /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.formContent}>
        {([{ label: 'Facility name', value: name, set: setName, limit: 120, placeholder: 'Community sports court' }, { label: 'Sport / facility type', value: kind, set: setKind, limit: 80, placeholder: 'Badminton' }, { label: 'Township', value: town, set: setTown, limit: 120, placeholder: 'Town or neighbourhood' }]).map(field => <View key={field.label} style={s.field}><Text style={s.fieldLabel}>{field.label}</Text><TextInput accessibilityLabel={field.label} editable={!working} style={s.input} value={field.value} onChangeText={field.set} maxLength={field.limit} placeholder={field.placeholder} placeholderTextColor="#94a095" /></View>)}
        <View style={s.coordinateRow}><View style={[s.field, s.grow]}><Text style={s.fieldLabel}>Latitude</Text><TextInput accessibilityLabel="Latitude" editable={!working} style={s.input} value={lat} onChangeText={setLat} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'} placeholder="3.1390" placeholderTextColor="#94a095" /></View><View style={[s.field, s.grow]}><Text style={s.fieldLabel}>Longitude</Text><TextInput accessibilityLabel="Longitude" editable={!working} style={s.input} value={lng} onChangeText={setLng} keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'} placeholder="101.6869" placeholderTextColor="#94a095" /></View></View>
        <Text style={s.small}>Saving updates the facilities used by your SquadUp players.</Text>{error !== '' && <Text accessibilityRole="alert" style={s.formError}>{error}</Text>}
      </ScrollView><View style={s.modalButtons}><Button title="Close" quiet disabled={working} onPress={close} /><Button title={working ? 'Saving…' : 'Save facility'} disabled={working} icon="checkmark" onPress={submit} /></View>
    </SafeAreaView></KeyboardAvoidingView>
  </Modal>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f6f0' }, grow: { flex: 1, minWidth: 0 },
  header: { paddingHorizontal: 20, paddingTop: 15, paddingBottom: 13, backgroundColor: '#fff' }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#28553f', alignItems: 'center', justifyContent: 'center' }, brand: { fontSize: 24, letterSpacing: -1, fontWeight: '800', color: '#203c2b' }, brandDot: { color: '#a0b967' }, accountEmail: { fontSize: 11, color: '#758178', marginTop: 2 }, iconButton: { padding: 10 },
  headerMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }, adminLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 }, adminLabelText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2, color: '#28553f' }, updated: { fontSize: 10, color: '#849187' },
  navigation: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e3e7df' }, navigationContent: { paddingHorizontal: 10, gap: 2 }, tab: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 15, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' }, selectedTab: { borderBottomColor: '#28553f' }, tabText: { fontSize: 12, fontWeight: '500', color: '#849187' }, selectedTabText: { color: '#28553f', fontWeight: '700' },
  listContent: { padding: 18, paddingBottom: 24, gap: 12 }, sectionHeader: { gap: 14, marginBottom: 2 }, eyebrow: { color: '#87917e', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 }, sectionTitle: { fontSize: 26, fontWeight: '700', color: '#203c2b', letterSpacing: -0.7, marginTop: 4 }, sectionDescription: { color: '#758178', fontSize: 12, lineHeight: 18 }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  hero: { backgroundColor: '#28553f', borderRadius: 20, padding: 22, overflow: 'hidden' }, heroLabel: { flexDirection: 'row', gap: 7, alignItems: 'center' }, liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#c7da89' }, heroEyebrow: { color: '#c4d6bc', fontSize: 9, letterSpacing: 1.6, fontWeight: '600' }, heroTitle: { fontSize: 31, lineHeight: 37, fontWeight: '700', letterSpacing: -0.8, color: '#fff', marginTop: 15 }, heroDescription: { color: '#c0d2c2', fontSize: 12, lineHeight: 19, maxWidth: 220, marginTop: 8 }, heroBottom: { flexDirection: 'row', alignItems: 'baseline', gap: 9, marginTop: 25 }, heroCount: { color: '#d1e796', fontSize: 37, fontWeight: '600' }, heroCountLabel: { color: '#d8e4d5', fontSize: 12 }, heroBall: { position: 'absolute', right: 0, bottom: 0, opacity: 0.55 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 }, metric: { width: '48%', backgroundColor: '#fff', borderRadius: 15, padding: 17, borderWidth: 1, borderColor: '#e7eadf' }, metricValue: { fontSize: 28, color: '#203c2b', fontWeight: '600', marginTop: 12 }, metricLabel: { color: '#87917e', fontSize: 11, marginTop: 3 },
  chartCard: { borderRadius: 16, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#e7eadf' }, chart: { flexDirection: 'row', justifyContent: 'space-between', gap: 7, marginTop: 22 }, chartColumn: { flex: 1, alignItems: 'center', gap: 6 }, chartCount: { fontSize: 10, color: '#6c7a6e' }, barTrack: { height: 90, width: '80%', justifyContent: 'flex-end' }, bar: { backgroundColor: '#a4bb79', borderTopLeftRadius: 5, borderTopRightRadius: 5 }, chartDay: { fontSize: 9, color: '#87917e' }, blockTitle: { fontSize: 17, fontWeight: '600', color: '#203c2b', marginVertical: 5 }, textLink: { fontSize: 11, fontWeight: '600', color: '#28553f', paddingVertical: 10 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 17, gap: 9, borderWidth: 1, borderColor: '#e7eadf' }, itemTitle: { fontSize: 15, fontWeight: '600', color: '#203c2b', flexShrink: 1 }, itemSubtitle: { fontSize: 12, color: '#6c7a6e', lineHeight: 18 }, detailLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, detail: { fontSize: 12, color: '#758178', lineHeight: 19 }, small: { fontSize: 10, color: '#87917e', lineHeight: 17 }, actions: { flexDirection: 'row', gap: 6 },
  badge: { backgroundColor: '#f0f1ed', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }, activeBadge: { backgroundColor: '#eef5e7' }, badgeText: { color: '#849187', fontSize: 9, fontWeight: '600', textTransform: 'capitalize' }, activeBadgeText: { color: '#467048' }, dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#9ca599' }, activeDot: { backgroundColor: '#6b9c5d' },
  playerRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' }, avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f3e8', justifyContent: 'center', alignItems: 'center' }, avatarText: { fontSize: 12, fontWeight: '700', color: '#6f8975' }, activityIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#f0f3e8', alignItems: 'center', justifyContent: 'center' },
  searchBox: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e1e6db', flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 13, minHeight: 44 }, searchInput: { flex: 1, paddingVertical: 11, color: '#203c2b', fontSize: 13 }, filters: { gap: 7, paddingBottom: 2 }, filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, backgroundColor: '#eaece3' }, selectedFilter: { backgroundColor: '#28553f' }, filterText: { fontSize: 11, color: '#758178', textTransform: 'capitalize' }, selectedFilterText: { color: '#fff' }, notice: { color: '#856626', backgroundColor: '#fff6d9', padding: 10, fontSize: 11, lineHeight: 17, borderRadius: 9 },
  button: { paddingHorizontal: 13, minHeight: 36, paddingVertical: 9, borderRadius: 9, backgroundColor: '#28553f', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }, buttonText: { color: '#fff', fontSize: 11, fontWeight: '600' }, quietButton: { backgroundColor: '#eef2e7' }, quietText: { color: '#28553f' }, dangerButton: { backgroundColor: '#fbefea' }, dangerText: { color: '#b53a34' }, faded: { opacity: 0.5 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e3e7df' }, footerText: { fontSize: 10, color: '#849187' }, loading: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28, gap: 16 }, empty: { alignItems: 'center', paddingVertical: 35, paddingHorizontal: 16, gap: 9 }, emptyTitle: { fontSize: 17, fontWeight: '600', color: '#203c2b', textAlign: 'center' }, emptyText: { fontSize: 12, color: '#758178', lineHeight: 20, textAlign: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,37,25,0.45)', justifyContent: 'flex-end' }, modalCard: { maxHeight: '90%', backgroundColor: '#f8f9f4', borderTopLeftRadius: 25, borderTopRightRadius: 25, overflow: 'hidden' }, modalHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 17 }, formContent: { paddingHorizontal: 22, paddingBottom: 20 }, field: { marginBottom: 15 }, fieldLabel: { fontSize: 12, fontWeight: '600', color: '#49624c', marginBottom: 7 }, input: { borderWidth: 1, borderColor: '#dce3d6', borderRadius: 10, backgroundColor: '#fff', paddingHorizontal: 13, paddingVertical: 13, color: '#203c2b', fontSize: 14 }, coordinateRow: { flexDirection: 'row', gap: 12 }, formError: { color: '#b53a34', fontSize: 12, marginTop: 12, lineHeight: 19 }, modalButtons: { paddingHorizontal: 22, paddingVertical: 17, borderTopWidth: 1, borderTopColor: '#e3e7df', flexDirection: 'row', justifyContent: 'flex-end', gap: 9 }
});
