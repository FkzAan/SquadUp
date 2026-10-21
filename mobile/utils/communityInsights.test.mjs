// Run with: node mobile/utils/communityInsights.test.mjs
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('./communityInsights.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { buildCommunityInsights, communityInsightsRows } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const now = Date.parse('2026-10-21T12:00:00Z');
function squad(id, changes = {}) {
  return {
    id, host_id: 'host', host_name: 'Host', facility_id: 'court-a',
    activity_type: 'Badminton', location_name: 'Original court name',
    latitude: 3.1, longitude: 101.2, max_players: 4, current_players: 4,
    status: 'open', skill_level: 'Friendly', starts_at: '2026-10-21T12:00:00Z',
    ends_at: '2026-10-21T14:00:00Z', expires_at: '2026-10-21T14:15:00Z',
    created_at: '2026-10-20T10:00:00Z', ...changes,
  };
}
function snapshot(lobbies = [], joined = [], changes = {}) {
  return {
    lobbies,
    users: joined.map((memberships, index) => ({
      id: `player-${index}`, name: 'Player', email: '', avatar_url: null,
      joined_at: '2026-10-01T00:00:00Z', hosted: 0, joined: memberships,
    })),
    facilities: [
      { id: 'court-a', name: 'Community court', facility_type: 'Court', township: 'Town A', latitude: 3.1, longitude: 101.2 },
      { id: 'court-b', name: 'Community court', facility_type: 'Court', township: 'Town B', latitude: 4, longitude: 102 },
    ],
    audit: [], limited: false,
    totals: { lobbies: lobbies.length, users: joined.length, active: 0, facilities: 2, memberships: joined.reduce((total, value) => total + value, 0) },
    daily: [
      { day: '2026-10-21', count: 12 }, { day: '2026-10-20', count: 0 },
      { day: '2026-10-19', count: 8 }, { day: '2026-10-18', count: 0 },
      { day: '2026-10-17', count: 0 }, { day: '2026-10-16', count: 0 },
      { day: '2026-10-15', count: 0 },
    ],
    ...changes,
  };
}

test('empty communities have no fabricated activity, percentage or rankings', () => {
  const result = buildCommunityInsights(snapshot([], [], { daily: [] }), now);
  assert.equal(result.weeklySquads, 0);
  assert.equal(result.fillPercent, null);
  assert.equal(result.capacity, 0);
  assert.equal(result.availablePlaces, 0);
  assert.equal(result.multiSquadPlayers, 0);
  assert.deepEqual(result.activities, []);
  assert.deepEqual(result.locations, []);
  assert.equal(result.participation.every(item => item.count === 0), true);
  assert.equal(JSON.stringify(result).includes('NaN'), false);
});

test('squad fill is weighted by capacity and excludes ended, cancelled and expired squads', () => {
  const result = buildCommunityInsights(snapshot([
    squad('small-full'),
    squad('large-open', { max_players: 16, current_players: 1 }),
    squad('ended', { status: 'ended', max_players: 20, current_players: 20 }),
    squad('cancelled', { status: 'cancelled', max_players: 20, current_players: 20 }),
    squad('expiry-boundary', { expires_at: new Date(now).toISOString() }),
    squad('expired-full', { status: 'full', expires_at: '2026-10-21T11:00:00Z' }),
  ]), now);
  assert.equal(result.activeSquads, 2);
  assert.equal(result.occupiedPlaces, 5);
  assert.equal(result.capacity, 20);
  assert.equal(result.availablePlaces, 15);
  assert.equal(result.fillPercent, 25);
});

test('popular activities group case and whitespace variants without guessing sport synonyms', () => {
  const result = buildCommunityInsights(snapshot([
    squad('one'), squad('two', { activity_type: '  badminton  ' }),
    squad('three', { activity_type: 'BADMINTON', status: 'cancelled' }),
    squad('four', { activity_type: 'Table   Tennis' }),
    squad('five', { activity_type: 'Table Tennis' }),
    squad('six', { activity_type: 'Ping pong' }),
  ]), now);
  assert.deepEqual(result.activities.map(({ key, count }) => [key, count]), [
    ['badminton', 3], ['table tennis', 2], ['ping pong', 1],
  ]);
  assert.equal(result.activities.reduce((total, item) => total + item.count, 0), 6);
});

test('locations keep facilities and custom map pins distinct and survive missing facility records', () => {
  const result = buildCommunityInsights(snapshot([
    squad('a'), squad('a2', { location_name: 'An old name' }),
    squad('b', { facility_id: 'court-b' }),
    squad('pin-a', { facility_id: null, location_name: 'Park' }),
    squad('pin-b', { facility_id: null, location_name: 'Park', latitude: 4 }),
    squad('missing', { facility_id: 'missing', location_name: 'Unlisted court' }),
  ]), now);
  assert.equal(result.locations.length, 5);
  assert.equal(result.locations[0].label, 'Community court · Town A');
  assert.equal(result.locations[0].count, 2);
  assert.equal(result.locations.find(item => item.key === 'facility:court-b').label, 'Community court · Town B');
  assert.equal(result.locations.find(item => item.key === 'facility:missing').label, 'Unlisted court');
});

test('player metrics describe retained memberships, not logins or attendance', () => {
  const result = buildCommunityInsights(snapshot([], [0, 1, 2, 5]), now);
  assert.deepEqual(result.participation.map(item => item.count), [1, 1, 2]);
  assert.equal(result.playersInSquads, 3);
  assert.equal(result.multiSquadPlayers, 2);
  assert.equal(result.participation.reduce((total, item) => total + item.count, 0), 4);
});

test('partial lists are identified and do not replace the all-record daily aggregates', () => {
  const data = snapshot([squad('one')], [2], {
    limited: true,
    totals: { lobbies: 2500, users: 3000, active: 20, facilities: 2, memberships: 4000 },
  });
  const before = structuredClone(data);
  const result = buildCommunityInsights(data, now);
  assert.equal(result.coverage.partial, true);
  assert.deepEqual(result.coverage.squads, { loaded: 1, total: 2500 });
  assert.deepEqual(result.coverage.players, { loaded: 1, total: 3000 });
  assert.equal(result.weeklySquads, 20);
  assert.equal(result.activities[0].count, 1);
  assert.equal(result.multiSquadPlayers, 1);
  assert.deepEqual(result.daily.map(item => item.day), [
    '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21',
  ]);
  assert.deepEqual(data, before, 'insights must not mutate the shared snapshot');
});

test('a count mismatch is labelled partial even if the server flag is missing or false', () => {
  const data = snapshot([squad('one')], [1]);
  data.totals.lobbies = 2;
  assert.equal(buildCommunityInsights(data, now).coverage.partial, true);
});

test('invalid legacy counts do not create negative places, NaN or overfull charts', () => {
  const result = buildCommunityInsights(snapshot([
    squad('overfilled', { current_players: 99 }),
    squad('negative', { current_players: -2 }),
    squad('invalid-expiry', { expires_at: 'not a date' }),
  ], [NaN, -1, 2]), now);
  assert.equal(result.activeSquads, 2);
  assert.equal(result.capacity, 8);
  assert.equal(result.occupiedPlaces, 4);
  assert.equal(result.availablePlaces, 4);
  assert.equal(result.fillPercent, 50);
  assert.deepEqual(result.participation.map(item => item.count), [2, 0, 1]);
});

test('CSV includes all ranking categories, coverage, refresh time and metric definitions', () => {
  const data = snapshot(Array.from({ length: 7 }, (_, index) => squad(`squad-${index}`, { activity_type: `Activity ${index}` })), [0, 2]);
  data.totals.lobbies = 10;
  const result = buildCommunityInsights(data, now);
  const rows = communityInsightsRows(result, new Date(now).toISOString());
  assert.equal(rows.find(row => row[0] === 'Snapshot updated (UTC)')[1], '2026-10-21T12:00:00.000Z');
  assert.match(rows.find(row => row[0] === 'List-based insights')[1], /Loaded records only/);
  assert.equal(rows.filter(row => /^Activity \d$/.test(String(row[0]))).length, 7);
  assert.equal(rows.find(row => row[0] === 'Players in 2+ squads (loaded profiles)')[1], 1);
  assert.match(rows.filter(row => row[0] === 'Definition').flat().join(' '), /do not prove attendance or retention/);
  const emptyRows = communityInsightsRows(buildCommunityInsights(snapshot([], [], { daily: [] }), now), new Date(now).toISOString());
  assert.match(emptyRows.find(row => row[0] === 'Active squad fill (%)')[1], /Not available/);
});
