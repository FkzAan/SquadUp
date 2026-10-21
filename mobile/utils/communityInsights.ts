import type { AdminSnapshot } from '../services/adminDashboardService';

export type InsightCount = { key: string; label: string; count: number };
export type CommunityInsightsData = {
  daily: { day: string; count: number }[];
  weeklySquads: number;
  activities: InsightCount[];
  locations: InsightCount[];
  participation: InsightCount[];
  playersInSquads: number;
  multiSquadPlayers: number;
  activeSquads: number;
  occupiedPlaces: number;
  capacity: number;
  availablePlaces: number;
  fillPercent: number | null;
  coverage: {
    squads: { loaded: number; total: number };
    players: { loaded: number; total: number };
    partial: boolean;
  };
};

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
const count = (value: number) => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

function ranked(items: { key: string; label: string }[]): InsightCount[] {
  const groups = new Map<string, InsightCount>();
  for (const item of items) {
    const previous = groups.get(item.key);
    if (previous) previous.count += 1;
    else groups.set(item.key, { ...item, count: 1 });
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
}

/** Uses only the existing admin snapshot. Memberships are not attendance or retention. */
export function buildCommunityInsights(snapshot: AdminSnapshot, now = Date.now()): CommunityInsightsData {
  const daily = snapshot.daily.map(item => ({ day: item.day, count: count(item.count) })).sort((a, b) => a.day.localeCompare(b.day));
  const facilities = new Map(snapshot.facilities.map(facility => [facility.id, facility]));
  const activities = ranked(snapshot.lobbies.map(lobby => {
    const label = clean(lobby.activity_type) || 'Unspecified activity';
    return { key: label.toLowerCase(), label };
  }));
  const locations = ranked(snapshot.lobbies.map(lobby => {
    const facility = lobby.facility_id ? facilities.get(lobby.facility_id) : undefined;
    const name = clean(facility?.name || lobby.location_name) || 'Unspecified location';
    const town = facility ? clean(facility.township) : '';
    return {
      key: lobby.facility_id ? `facility:${lobby.facility_id}` : `custom:${name.toLowerCase()}:${lobby.latitude ?? ''}:${lobby.longitude ?? ''}`,
      label: town ? `${name} · ${town}` : name,
    };
  }));
  const participation = [
    { key: 'none', label: 'No squad memberships', count: 0 },
    { key: 'one', label: 'In 1 squad', count: 0 },
    { key: 'multiple', label: 'In 2+ squads', count: 0 },
  ];
  for (const player of snapshot.users) {
    const joined = count(player.joined);
    participation[joined === 0 ? 0 : joined === 1 ? 1 : 2].count += 1;
  }
  const active = snapshot.lobbies.filter(lobby =>
    (lobby.status === 'open' || lobby.status === 'full') && new Date(lobby.expires_at).getTime() > now);
  const capacity = active.reduce((total, lobby) => total + count(lobby.max_players), 0);
  const occupiedPlaces = active.reduce((total, lobby) => total + Math.min(count(lobby.current_players), count(lobby.max_players)), 0);
  return {
    daily,
    weeklySquads: daily.reduce((total, day) => total + day.count, 0),
    activities,
    locations,
    participation,
    playersInSquads: participation[1].count + participation[2].count,
    multiSquadPlayers: participation[2].count,
    activeSquads: active.length,
    occupiedPlaces,
    capacity,
    availablePlaces: capacity - occupiedPlaces,
    fillPercent: capacity === 0 ? null : Math.round(100 * occupiedPlaces / capacity),
    coverage: {
      squads: { loaded: snapshot.lobbies.length, total: snapshot.totals.lobbies },
      players: { loaded: snapshot.users.length, total: snapshot.totals.users },
      partial: snapshot.limited || snapshot.lobbies.length < snapshot.totals.lobbies || snapshot.users.length < snapshot.totals.users,
    },
  };
}

export function communityInsightsRows(insights: CommunityInsightsData, asOf: string): (string | number)[][] {
  return [
    ['Community Insights', 'Value'],
    ['Snapshot updated (UTC)', asOf],
    ['List-based insights', insights.coverage.partial ? 'Loaded records only; some lists may be incomplete' : 'All saved records'],
    ['Loaded squads', insights.coverage.squads.loaded], ['Total saved squads', insights.coverage.squads.total],
    ['Loaded player profiles', insights.coverage.players.loaded], ['Total player profiles', insights.coverage.players.total],
    ['Squads created in last 7 UTC dates (all records)', insights.weeklySquads],
    ['Players with squad memberships (loaded profiles)', insights.playersInSquads],
    ['Players in 2+ squads (loaded profiles)', insights.multiSquadPlayers],
    ['Active squads (loaded squads)', insights.activeSquads],
    ['Occupied places in active squads', insights.occupiedPlaces], ['Capacity in active squads', insights.capacity],
    ['Available places in active squads', insights.availablePlaces],
    ['Active squad fill (%)', insights.fillPercent ?? 'Not available: no active capacity'],
    ['Definition', 'Active squads are open/full and not expired at the snapshot update time.'],
    ['Definition', 'Memberships include hosted squads and can disappear when members leave or squads are deleted. They do not prove attendance or retention.'],
    ['Date (UTC)', 'Squads created'], ...insights.daily.map(day => [day.day, day.count]),
    ['Activity (all loaded squads, including ended/cancelled)', 'Squad count'], ...insights.activities.map(item => [item.label, item.count]),
    ['Location (all loaded squads, including ended/cancelled)', 'Squad count'], ...insights.locations.map(item => [item.label, item.count]),
    ['Membership distribution (loaded player profiles)', 'Player count'], ...insights.participation.map(item => [item.label, item.count]),
  ];
}
