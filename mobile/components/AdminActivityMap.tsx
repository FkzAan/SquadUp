import { useState } from 'react';
import type { ReactNode } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { AdminLobby } from '../services/adminDashboardService';
import { activityMapStatus, hasMapCoordinates, localDateKey, MAP_COLOURS, MAP_PERIODS, MAP_STATUSES, parseMapDate } from '../utils/adminActivityMap';
import type { ActivityMapData, ActivityMapFilters, MapPeriod, MapStatus } from '../utils/adminActivityMap';
import AdminMapCanvas from './AdminMapCanvas';
import DateTimeField from './DateTimeField';

type Props = {
  data: ActivityMapData; filters: ActivityMapFilters; onFiltersChange: (filters: ActivityMapFilters) => void;
  query: string; onQueryChange: (query: string) => void; now: number; loaded: number; total: number;
  header: ReactNode; busy: boolean; refreshing: boolean; onRefresh: () => void;
  onModerate: (lobby: AdminLobby, status: 'ended' | 'cancelled') => void;
};
const formatTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};
function Status({ value }: { value: MapStatus }) {
  return <Text style={[s.status, { color: MAP_COLOURS[value] }]}>{value}</Text>;
}
function Action({ title, onPress, disabled, danger = false }: { title: string; onPress: () => void; disabled: boolean; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.action, danger && s.dangerAction, disabled && s.faded]}>
    <Text style={[s.actionText, danger && s.dangerText]}>{title}</Text>
  </Pressable>;
}

export default function AdminActivityMap({ data, filters, onFiltersChange, query, onQueryChange, now, loaded, total, header, busy, refreshing, onRefresh, onModerate }: Props) {
  const [selection, setSelection] = useState<{ group: string | null; id: string | null } | null>(null);
  const [interacting, setInteracting] = useState(false);
  const group = selection?.group ? data.groups.find(item => item.key === selection.group) : undefined;
  const activity = selection?.id ? data.activities.find(item => item.id === selection.id) : undefined;
  const showingGroup = Boolean(group && !selection?.id);
  const visible = Boolean(activity || showingGroup);
  const status = activity ? activityMapStatus(activity, now) : null;
  const canModerate = status === 'open' || status === 'full';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function close() { setSelection(null); setInteracting(false); }
  function update(next: ActivityMapFilters) { close(); onFiltersChange(next); }
  function period(next: MapPeriod) {
    update({ ...filters, period: next, status: next === 'past7' && filters.status === 'live' ? 'all' : filters.status });
  }
  function selectGroup(key: string) {
    const target = data.groups.find(item => item.key === key);
    if (target) { setInteracting(false); setSelection({ group: key, id: target.lobbies.length === 1 ? target.lobbies[0].id : null }); }
  }
  function row(lobby: AdminLobby) {
    const state = activityMapStatus(lobby, now);
    return <Pressable accessibilityRole="button" accessibilityLabel={`View ${lobby.activity_type} at ${lobby.location_name}. ${state}. Starts ${formatTime(lobby.starts_at)}. ${lobby.current_players} of ${lobby.max_players} players.`}
      onPress={() => { setInteracting(false); setSelection({ group: group?.key ?? null, id: lobby.id }); }} style={({ pressed }) => [s.activity, pressed && s.faded]}>
      <View style={s.row}><Text style={s.activityTitle}>{lobby.activity_type}</Text><Status value={state} /></View>
      <Text style={s.location}>{lobby.location_name}</Text><Text style={s.detail}>{formatTime(lobby.starts_at)}</Text>
      <View style={s.row}><Text style={s.detail}>{lobby.current_players}/{lobby.max_players} players · {lobby.skill_level}</Text><Ionicons name={hasMapCoordinates(lobby) ? 'location-outline' : 'alert-circle-outline'} size={16} color="#758178" /></View>
      {!hasMapCoordinates(lobby) && <Text style={s.missing}>No valid map coordinates</Text>}
    </Pressable>;
  }

  const listHeader = <View style={s.headerContent}>
    {header}
    <Text style={s.intro}>Find activities by location. Tap a numbered pin or an activity below to open its details.</Text>
    <View style={s.search}><Ionicons name="search-outline" size={18} color="#849187" /><TextInput accessibilityLabel="Search mapped activities by activity, location or host" style={s.searchInput} placeholder="Search activity, location or host…" placeholderTextColor="#849187" autoCorrect={false} value={query} onChangeText={text => { close(); onQueryChange(text); }} />
      {query !== '' && <Pressable accessibilityRole="button" accessibilityLabel="Clear activity map search" onPress={() => { close(); onQueryChange(''); }}><Ionicons name="close-circle" size={19} color="#849187" /></Pressable>}
    </View>
    <View style={s.filterSection}><Text style={s.filterLabel}>Date range</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {MAP_PERIODS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: filters.period === item.key }} onPress={() => period(item.key)} style={[s.chip, filters.period === item.key && s.selectedChip]}><Text style={[s.chipText, filters.period === item.key && s.selectedText]}>{item.label}</Text></Pressable>)}
    </ScrollView></View>
    {filters.period === 'custom' && <View style={s.dates}>
      <DateTimeField label="From date" mode="date" value={parseMapDate(filters.from) ?? new Date(now)} onChange={date => { const from = localDateKey(date); update({ ...filters, from, to: from > filters.to ? from : filters.to }); }} />
      <DateTimeField label="Through date" mode="date" minimumDate={parseMapDate(filters.from) ?? undefined} value={parseMapDate(filters.to) ?? new Date(now)} onChange={date => update({ ...filters, to: localDateKey(date) })} />
    </View>}
    <View style={s.filterSection}><Text style={s.filterLabel}>Status</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
      {MAP_STATUSES.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: filters.status === item.key }} onPress={() => update({ ...filters, status: item.key })} style={[s.chip, filters.status === item.key && s.selectedChip]}><Text style={[s.chipText, filters.status === item.key && s.selectedText]}>{item.label}</Text></Pressable>)}
    </ScrollView></View>
    <Text style={s.caption}>{filters.period === 'next7' ? 'Ongoing activities and the next 7 days.' : filters.period === 'past7' ? 'Activities overlapping the past 7 days, including ongoing games.' : 'Activities overlapping the selected calendar dates.'} Dates and times use {timezone}.</Text>
    {data.rangeError && <Text accessibilityRole="alert" style={s.error}>{data.rangeError}</Text>}
    <View style={s.summary}><Text style={s.summaryTitle}>{data.activities.length.toLocaleString()} matching activities</Text><Text style={s.caption}>{data.activities.length - data.unmapped} with map pins · {data.unmapped} without coordinates</Text>
      <Text style={s.caption}>Filtering {loaded.toLocaleString()} of {total.toLocaleString()} saved squads.{loaded < total ? ' Some activities may be outside the loaded records.' : ''}</Text>
    </View>
    {data.groups.length > 0 ? <AdminMapCanvas groups={data.groups} onSelect={selectGroup} onInteracting={setInteracting} /> : <View style={s.mapEmpty}><Ionicons name="map-outline" size={35} color="#87917e" /><Text style={s.emptyTitle}>No map pins in this view</Text><Text style={s.emptyText}>{data.unmapped > 0 ? 'Activities without coordinates are still available in the list below.' : 'Try another date range, status or search.'}</Text></View>}
    <View style={s.legend}>{(Object.entries(MAP_COLOURS) as [MapStatus | 'mixed', string][]).map(([name, colour]) => <View key={name} style={s.legendItem}><View style={[s.dot, { backgroundColor: colour }]} /><Text style={s.legendText}>{name === 'mixed' ? 'Mixed statuses' : name}</Text></View>)}</View>
    <Text style={s.caption}>Numbers show activities at the same map location. Choose a numbered group to see each activity.</Text>
    <Text accessibilityRole="header" style={s.listTitle}>Activities in this view</Text>
  </View>;

  return <>
    <FlatList data={data.activities} keyExtractor={item => item.id} renderItem={({ item }) => row(item)} ListHeaderComponent={listHeader}
      ListEmptyComponent={<View style={s.empty}><Text style={s.emptyTitle}>No matching activities</Text><Text style={s.emptyText}>Change the date range or choose All statuses to review more activities.</Text></View>}
      contentContainerStyle={s.listContent} scrollEnabled={!interacting || visible || data.groups.length === 0} keyboardShouldPersistTaps="handled" initialNumToRender={10} removeClippedSubviews={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#28553f" colors={['#28553f']} />} />
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={s.backdrop}><Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close activity details" onPress={close} />
        <SafeAreaView style={s.sheet} edges={['bottom']}>
          <View style={s.sheetHeader}><Text accessibilityRole="header" style={s.sheetTitle}>{activity ? 'Activity details' : `${group?.lobbies.length ?? 0} activities at this location`}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close activity details" onPress={close} style={s.close}><Ionicons name="close" size={24} color="#28553f" /></Pressable></View>
          {activity ? <>
            <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetContent}>
              {group && group.lobbies.length > 1 && <Pressable accessibilityRole="button" onPress={() => setSelection({ group: group.key, id: null })}><Text style={s.backLink}>‹ Back to activities at this location</Text></Pressable>}
              <View style={s.row}><Text style={s.detailTitle}>{activity.activity_type}</Text>{status && <Status value={status} />}</View>
              {([
                ['Location', activity.location_name], ['Host', activity.host_name],
                ['Starts', formatTime(activity.starts_at)], ['Ends', formatTime(activity.ends_at)],
                ['Players', `${activity.current_players} / ${activity.max_players}`], ['Activity intent', activity.skill_level],
                ['Coordinates', hasMapCoordinates(activity) ? `${activity.latitude}, ${activity.longitude}` : 'No valid map coordinates'],
              ] as [string, string][]).map(([label, value]) => <View key={label} style={s.detailField}><Text style={s.fieldLabel}>{label}</Text><Text selectable style={s.fieldValue}>{value}</Text></View>)}
              <Text style={s.caption}>Times use {timezone}. Player counts are squad memberships, including the host.</Text>
              {!canModerate && <Text style={s.caption}>Only open or full squads that have not expired can be moderated here.</Text>}
            </ScrollView>
            {canModerate && <View style={s.sheetActions}><Action title={busy ? 'Please wait…' : 'End activity'} disabled={busy} onPress={() => onModerate(activity, 'ended')} /><Action title="Cancel activity" danger disabled={busy} onPress={() => onModerate(activity, 'cancelled')} /></View>}
          </> : <FlatList style={s.sheetScroll} data={group?.lobbies ?? []} keyExtractor={item => item.id} renderItem={({ item }) => row(item)} contentContainerStyle={s.sheetContent} />}
        </SafeAreaView>
      </View>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  listContent: { padding: 18, paddingBottom: 24, gap: 12 }, headerContent: { gap: 13, marginBottom: 2 }, intro: { color: '#6c7a6e', fontSize: 13, lineHeight: 20 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#dce3d6', borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 12 }, searchInput: { flex: 1, minWidth: 0, color: '#203c2b', fontSize: 12, paddingVertical: 13 },
  filterSection: { gap: 8 }, filterLabel: { fontSize: 12, fontWeight: '600', color: '#49624c' }, chips: { gap: 7 }, chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 20, backgroundColor: '#eaece3' }, selectedChip: { backgroundColor: '#28553f' }, chipText: { fontSize: 11, color: '#62715c' }, selectedText: { color: '#fff' }, dates: { flexDirection: 'row', gap: 12 },
  caption: { fontSize: 10, color: '#758178', lineHeight: 17 }, summary: { padding: 14, borderRadius: 12, backgroundColor: '#edf2e5', gap: 5 }, summaryTitle: { fontSize: 15, fontWeight: '600', color: '#28553f' }, error: { fontSize: 12, lineHeight: 19, color: '#b53a34' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, dot: { width: 8, height: 8, borderRadius: 4 }, legendText: { fontSize: 10, color: '#62715c', textTransform: 'capitalize' },
  mapEmpty: { minHeight: 160, borderRadius: 16, padding: 20, backgroundColor: '#e8eee2', gap: 10, alignItems: 'center', justifyContent: 'center' }, listTitle: { fontSize: 17, color: '#203c2b', fontWeight: '600', marginTop: 4 },
  activity: { padding: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e7dc', borderRadius: 14, gap: 8 }, row: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, activityTitle: { fontSize: 15, fontWeight: '600', color: '#203c2b', flexShrink: 1 }, status: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize', paddingVertical: 3 }, location: { color: '#49624c', fontSize: 12, lineHeight: 19 }, detail: { color: '#758178', fontSize: 11, lineHeight: 18 }, missing: { fontSize: 10, color: '#856626' }, faded: { opacity: 0.55 },
  empty: { padding: 25, gap: 10, alignItems: 'center' }, emptyTitle: { fontSize: 16, color: '#49624c', fontWeight: '600', textAlign: 'center' }, emptyText: { fontSize: 12, color: '#758178', lineHeight: 20, textAlign: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,37,25,0.45)', justifyContent: 'flex-end' }, sheet: { maxHeight: '88%', backgroundColor: '#f8f9f4', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' }, sheetHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, gap: 12 }, sheetTitle: { flex: 1, fontSize: 19, fontWeight: '700', color: '#203c2b' }, close: { padding: 10 }, sheetScroll: { flexShrink: 1 }, sheetContent: { paddingHorizontal: 20, paddingTop: 5, paddingBottom: 20, gap: 13 }, backLink: { paddingVertical: 9, fontSize: 12, color: '#28553f', fontWeight: '600' }, detailTitle: { fontSize: 23, fontWeight: '700', color: '#203c2b', flexShrink: 1 }, detailField: { gap: 4 }, fieldLabel: { fontSize: 10, color: '#87917e', fontWeight: '600' }, fieldValue: { fontSize: 13, lineHeight: 20, color: '#49624c' },
  sheetActions: { paddingHorizontal: 20, paddingVertical: 15, flexDirection: 'row', gap: 10, borderTopWidth: 1, borderTopColor: '#e3e7df' }, action: { flex: 1, paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10, backgroundColor: '#eef2e7', alignItems: 'center' }, actionText: { color: '#28553f', fontSize: 12, fontWeight: '600' }, dangerAction: { backgroundColor: '#fbefea' }, dangerText: { color: '#b53a34' },
});
