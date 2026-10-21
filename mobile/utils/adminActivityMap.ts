import type { AdminLobby } from '../services/adminDashboardService';

export type MapPeriod = 'today' | 'next7' | 'past7' | 'custom';
export type MapStatus = AdminLobby['status'] | 'expired';
export type MapStatusFilter = 'live' | 'all' | MapStatus;
export type ActivityMapFilters = { period: MapPeriod; status: MapStatusFilter; from: string; to: string };
export type ActivityMapGroup = { key: string; latitude: number; longitude: number; lobbies: AdminLobby[]; status: MapStatus | 'mixed' };
export type ActivityMapData = { activities: AdminLobby[]; groups: ActivityMapGroup[]; unmapped: number; rangeError: string | null };

export const MAP_PERIODS: { key: MapPeriod; label: string }[] = [
  { key: 'next7', label: 'Next 7 days' }, { key: 'today', label: 'Today' },
  { key: 'past7', label: 'Past 7 days' }, { key: 'custom', label: 'Custom dates' },
];
export const MAP_STATUSES: { key: MapStatusFilter; label: string }[] = [
  { key: 'live', label: 'Open / full' }, { key: 'all', label: 'All statuses' },
  { key: 'open', label: 'Open' }, { key: 'full', label: 'Full' },
  { key: 'ended', label: 'Ended' }, { key: 'cancelled', label: 'Cancelled' }, { key: 'expired', label: 'Expired' },
];
export const MAP_COLOURS: Record<MapStatus | 'mixed', string> = {
  open: '#28553f', full: '#9c6b18', ended: '#657386', cancelled: '#b53a34', expired: '#757575', mixed: '#3b5683',
};

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseMapDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return localDateKey(date) === value ? date : null;
}

export function defaultMapFilters(now: number): ActivityMapFilters {
  const start = new Date(now); const end = new Date(now);
  end.setDate(end.getDate() + 6);
  return { period: 'next7', status: 'live', from: localDateKey(start), to: localDateKey(end) };
}

export function activityMapStatus(lobby: AdminLobby, now: number): MapStatus {
  return (lobby.status === 'open' || lobby.status === 'full') && !(Date.parse(lobby.expires_at) > now) ? 'expired' : lobby.status;
}

export function hasMapCoordinates(lobby: AdminLobby): lobby is AdminLobby & { latitude: number; longitude: number } {
  return typeof lobby.latitude === 'number' && Number.isFinite(lobby.latitude) && Math.abs(lobby.latitude) <= 90 &&
    typeof lobby.longitude === 'number' && Number.isFinite(lobby.longitude) && Math.abs(lobby.longitude) <= 180;
}

function bounds(filters: ActivityMapFilters, now: number): { from: number; to: number } | null {
  if (filters.period === 'custom') {
    const from = parseMapDate(filters.from); const to = parseMapDate(filters.to);
    if (!from || !to || to.getTime() < from.getTime()) return null;
    to.setDate(to.getDate() + 1);
    return { from: from.getTime(), to: to.getTime() };
  }
  const from = new Date(now); const to = new Date(now);
  if (filters.period === 'today') {
    from.setHours(0, 0, 0, 0); to.setHours(0, 0, 0, 0); to.setDate(to.getDate() + 1);
  } else if (filters.period === 'past7') from.setDate(from.getDate() - 7);
  else to.setDate(to.getDate() + 7);
  return { from: from.getTime(), to: to.getTime() };
}

/** Calendar filters use device-local dates; activities overlap a half-open [from, to) range. */
export function buildActivityMap(lobbies: AdminLobby[], filters: ActivityMapFilters, query: string, now: number): ActivityMapData {
  const range = bounds(filters, now);
  if (!range) return { activities: [], groups: [], unmapped: 0, rangeError: 'Choose valid dates with the end date on or after the start date.' };
  const search = query.trim().toLowerCase();
  const activities = lobbies.filter(lobby => {
    const start = Date.parse(lobby.starts_at); const end = Date.parse(lobby.ends_at);
    if (!(end > start && start < range.to && end > range.from)) return false;
    const status = activityMapStatus(lobby, now);
    if (filters.status === 'live' ? status !== 'open' && status !== 'full' : filters.status !== 'all' && status !== filters.status) return false;
    return `${lobby.activity_type} ${lobby.location_name} ${lobby.host_name}`.toLowerCase().includes(search);
  }).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  const grouped = new Map<string, ActivityMapGroup>();
  let unmapped = 0;
  for (const lobby of activities) {
    if (!hasMapCoordinates(lobby)) { unmapped += 1; continue; }
    // Near-identical pins (about one metre) share a numbered marker, without moving the real coordinates.
    const key = `${lobby.latitude.toFixed(5)},${lobby.longitude.toFixed(5)}`;
    const status = activityMapStatus(lobby, now); const group = grouped.get(key);
    if (group) { group.lobbies.push(lobby); if (group.status !== status) group.status = 'mixed'; }
    else grouped.set(key, { key, latitude: lobby.latitude, longitude: lobby.longitude, lobbies: [lobby], status });
  }
  return { activities, groups: [...grouped.values()], unmapped, rangeError: null };
}

export function activityMapRows(data: ActivityMapData, filters: ActivityMapFilters, query: string, now: number): (string | number)[][] {
  return [
    ['Activity Map', 'Filtered saved activities'],
    ['Date filter', MAP_PERIODS.find(item => item.key === filters.period)?.label ?? filters.period],
    ['Status filter', MAP_STATUSES.find(item => item.key === filters.status)?.label ?? filters.status],
    ['Search', query], ['Filter evaluated at (UTC)', new Date(now).toISOString()],
    ['Filter timezone', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ...(filters.period === 'custom' ? [['From (inclusive local date)', filters.from], ['To (inclusive local date)', filters.to]] : []),
    ['Scope', 'Loaded admin records only; missing map coordinates remain in this export.'],
    ['Activity', 'Location', 'Host', 'Status', 'Players', 'Capacity', 'Starts', 'Ends', 'Latitude', 'Longitude', 'Map pin'],
    ...data.activities.map(lobby => [lobby.activity_type, lobby.location_name, lobby.host_name, activityMapStatus(lobby, now),
      lobby.current_players, lobby.max_players, lobby.starts_at, lobby.ends_at, lobby.latitude ?? '', lobby.longitude ?? '', hasMapCoordinates(lobby) ? 'Available' : 'Missing']),
  ];
}
