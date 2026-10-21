// Run with: node mobile/utils/adminActivityMap.test.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import process from 'node:process';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
async function load(file, imports = {}) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(name => imports[name] ?? require(name), mod, mod.exports);
  return mod.exports;
}
const utility = await load('./adminActivityMap.ts');
const { buildActivityMap, defaultMapFilters, parseMapDate, localDateKey, activityMapStatus, activityMapRows } = utility;
const { ADMIN_MAP_HTML } = await load('./adminMapDocument.ts', { './adminActivityMap': utility });
const now = new Date(2026, 9, 21, 12).getTime();
const hour = 60 * 60 * 1000;
const iso = milliseconds => new Date(milliseconds).toISOString();
function squad(id, changes = {}) {
  return { id, host_id: 'host', host_name: 'Aiman', activity_type: 'Badminton', location_name: 'Community court',
    facility_id: null, latitude: 3.1, longitude: 101.2, starts_at: iso(now + hour), ends_at: iso(now + 2 * hour),
    expires_at: iso(now + 2.25 * hour), status: 'open', current_players: 2, max_players: 4, skill_level: 'Friendly', created_at: iso(now), ...changes };
}
const ids = result => result.activities.map(item => item.id);

test('default view includes ongoing and next-seven-day open/full activities, with exact boundaries', () => {
  const upper = new Date(now); upper.setDate(upper.getDate() + 7);
  const result = buildActivityMap([
    squad('upcoming'), squad('ongoing', { starts_at: iso(now - hour), ends_at: iso(now + hour) }),
    squad('full', { status: 'full' }), squad('ends-now', { starts_at: iso(now - hour), ends_at: iso(now) }),
    squad('upper-boundary', { starts_at: upper.toISOString(), ends_at: iso(upper.getTime() + hour) }),
    squad('cancelled', { status: 'cancelled' }), squad('ended', { status: 'ended' }),
    squad('expired', { expires_at: iso(now) }),
  ], defaultMapFilters(now), '', now);
  assert.deepEqual(ids(result), ['ongoing', 'full', 'upcoming']);
});

test('Today includes overnight activities and excludes midnight boundary neighbours', () => {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const result = buildActivityMap([
    squad('overnight', { starts_at: iso(start.getTime() - hour), ends_at: iso(start.getTime() + hour), status: 'ended' }),
    squad('ends-at-start', { starts_at: iso(start.getTime() - hour), ends_at: start.toISOString(), status: 'ended' }),
    squad('starts-next-day', { starts_at: end.toISOString(), ends_at: iso(end.getTime() + hour) }),
  ], { ...defaultMapFilters(now), period: 'today', status: 'all' }, '', now);
  assert.deepEqual(ids(result), ['overnight']);
});

test('Past 7 days and custom inclusive calendar dates support historical review', () => {
  const old = squad('yesterday', { starts_at: iso(now - 24 * hour), ends_at: iso(now - 23 * hour), status: 'ended' });
  const upcoming = squad('tomorrow', { starts_at: iso(now + 24 * hour), ends_at: iso(now + 25 * hour) });
  assert.deepEqual(ids(buildActivityMap([old, upcoming], { ...defaultMapFilters(now), period: 'past7', status: 'all' }, '', now)), ['yesterday']);
  assert.deepEqual(ids(buildActivityMap([old, upcoming], { period: 'custom', status: 'all', from: localDateKey(new Date(now + 24 * hour)), to: localDateKey(new Date(now + 24 * hour)) }, '', now)), ['tomorrow']);
});

test('invalid and reversed custom dates fail clearly rather than silently broadening the filter', () => {
  assert.equal(parseMapDate('2026-02-30'), null);
  assert.equal(parseMapDate('21/10/2026'), null);
  const result = buildActivityMap([squad('one')], { period: 'custom', status: 'all', from: '2026-10-22', to: '2026-10-21' }, '', now);
  assert.match(result.rangeError, /end date/);
  assert.deepEqual(result.activities, []);
});

test('custom dates include a full 25-hour daylight-saving calendar day', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const result = buildActivityMap([
      squad('late-local-day', { starts_at: '2026-11-02T04:30:00Z', ends_at: '2026-11-02T04:50:00Z', status: 'ended' }),
      squad('next-day', { starts_at: '2026-11-02T05:00:00Z', ends_at: '2026-11-02T06:00:00Z', status: 'ended' }),
    ], { period: 'custom', status: 'all', from: '2026-11-01', to: '2026-11-01' }, '', now);
    assert.deepEqual(ids(result), ['late-local-day']);
  } finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test('status filters distinguish full, ended, cancelled and expired squads', () => {
  const rows = [squad('open'), squad('full', { status: 'full' }), squad('ended', { status: 'ended' }), squad('cancelled', { status: 'cancelled' }), squad('expired', { expires_at: iso(now) })];
  for (const value of ['open', 'full', 'ended', 'cancelled', 'expired']) {
    assert.deepEqual(ids(buildActivityMap(rows, { ...defaultMapFilters(now), status: value }, '', now)), [value]);
  }
  assert.equal(activityMapStatus(squad('ended', { status: 'ended', expires_at: iso(now - hour) }), now), 'ended');
});

test('missing, non-finite and out-of-range coordinates stay in the activity list but not on the map', () => {
  const result = buildActivityMap([
    squad('zero', { latitude: 0, longitude: 0 }), squad('null', { latitude: null }),
    squad('nan', { longitude: NaN }), squad('infinite', { latitude: Infinity }), squad('out-of-range', { longitude: 181 }),
  ], defaultMapFilters(now), '', now);
  assert.equal(result.activities.length, 5);
  assert.equal(result.unmapped, 4);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].latitude, 0);
});

test('shared pins form numbered groups without mutating activity locations', () => {
  const rows = [squad('one'), squad('two', { status: 'full' }), squad('elsewhere', { latitude: 3.2 })];
  const before = structuredClone(rows);
  const result = buildActivityMap(rows, defaultMapFilters(now), '', now);
  const shared = result.groups.find(group => group.lobbies.length === 2);
  assert.equal(result.groups.length, 2);
  assert.equal(shared.status, 'mixed');
  assert.equal(shared.latitude, 3.1);
  assert.deepEqual(rows, before);
});

test('search matches activity, venue or host and invalid schedules are excluded', () => {
  const rows = [squad('badminton'), squad('jogging', { activity_type: 'Jogging', host_name: 'Siti', location_name: 'Park' }), squad('invalid', { starts_at: 'invalid' })];
  for (const search of ['  SITI ', 'park', 'jogging']) assert.deepEqual(ids(buildActivityMap(rows, defaultMapFilters(now), search, now)), ['jogging']);
  assert.equal(buildActivityMap(rows, defaultMapFilters(now), '', now).activities.length, 2);
});

test('CSV matches the filtered view and retains activities without map pins', () => {
  const filters = defaultMapFilters(now);
  const data = buildActivityMap([squad('one', { latitude: null }), squad('other', { activity_type: 'Jogging' })], filters, 'Badminton', now);
  const rows = activityMapRows(data, filters, 'Badminton', now);
  assert.equal(rows.find(row => row[0] === 'Date filter')[1], 'Next 7 days');
  assert.equal(rows.find(row => row[0] === 'Search')[1], 'Badminton');
  assert.equal(rows.find(row => row[0] === 'Badminton').at(-1), 'Missing');
  assert.equal(rows.some(row => row[0] === 'Jogging'), false);
});

function mapHarness(hasLibrary = true) {
  const messages = []; const circles = []; const fits = []; let tileError;
  const map = { setView() { return this; }, fitBounds(points) { fits.push(points); } };
  const layer = { addTo() { return this; }, clearLayers() { circles.length = 0; } };
  const L = {
    map: () => map, layerGroup: () => layer,
    tileLayer: () => ({ on(_event, callback) { tileError = callback; return this; }, addTo() { return this; } }),
    circleMarker: (position, options) => {
      const item = { position, options }; circles.push(item);
      return { addTo() { return this; }, bindTooltip(text) { item.tooltip = text; return this; }, on(_event, callback) { item.click = callback; return this; } };
    },
  };
  const window = { ReactNativeWebView: { postMessage: value => messages.push(JSON.parse(value)) } };
  const context = vm.createContext(hasLibrary ? { window, L } : { window });
  const script = ADMIN_MAP_HTML.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
  vm.runInContext(script, context);
  return { window, messages, circles, fits, tilesFail: () => tileError() };
}

test('map bridge reports readiness, renders counts, clears stale markers and selects marker groups', () => {
  const h = mapHarness();
  assert.deepEqual(h.messages, [{ type: 'ready' }]);
  const marker = { key: '3.1,101.2', latitude: 3.1, longitude: 101.2, count: 2, status: 'mixed' };
  h.window.setActivityMarkers([marker]);
  assert.equal(h.circles.length, 1);
  assert.equal(h.circles[0].tooltip, '2');
  assert.equal(h.fits.length, 1);
  h.circles[0].click();
  assert.deepEqual(h.messages.at(-1), { type: 'select', key: marker.key });
  h.window.setActivityMarkers([{ ...marker, count: 1, status: 'open' }]);
  assert.equal(h.circles.length, 1);
  assert.equal(h.fits.length, 1, 'refreshing counts must preserve the admin map zoom');
  h.window.setActivityMarkers([]);
  assert.equal(h.circles.length, 0);
  h.window.fitActivityBounds();
  h.tilesFail();
  assert.equal(h.messages.at(-1).type, 'tiles-error');
});

test('an unavailable map library reports a recoverable error', () => {
  assert.deepEqual(mapHarness(false).messages, [{ type: 'error' }]);
});

test('native group selection opens details and delegates moderation through the existing callback', async () => {
  const hooks = []; let cursor = 0;
  const react = { useState(initial) { const index = cursor++; if (!(index in hooks)) hooks[index] = typeof initial === 'function' ? initial() : initial; return [hooks[index], value => { hooks[index] = typeof value === 'function' ? value(hooks[index]) : value; }]; } };
  const native = Object.fromEntries(['FlatList','Modal','Pressable','RefreshControl','ScrollView','Text','TextInput','View'].map(name => [name, name]));
  native.StyleSheet = { create: value => value, absoluteFill: {} };
  const { default: Component } = await load('../components/AdminActivityMap.tsx', {
    react, 'react-native': native, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '@expo/vector-icons': { Ionicons: 'Ionicons' }, '../utils/adminActivityMap': utility,
    './AdminMapCanvas': { default: 'AdminMapCanvas', __esModule: true }, './DateTimeField': { default: 'DateTimeField', __esModule: true },
  });
  const data = buildActivityMap([squad('one'), squad('two', { status: 'full' })], defaultMapFilters(now), '', now);
  const calls = [];
  const props = { data, filters: defaultMapFilters(now), onFiltersChange: () => {}, query: '', onQueryChange: () => {}, now, loaded: 2, total: 2, header: null, busy: false, refreshing: false, onRefresh: () => {}, onModerate: (...args) => calls.push(args) };
  const render = () => { cursor = 0; return Component(props); };
  function find(node, type, predicate = () => true) {
    if (Array.isArray(node)) { for (const child of node) { const found = find(child, type, predicate); if (found) return found; } return null; }
    if (!node || typeof node !== 'object') return null;
    if (node.type === type && predicate(node.props)) return node;
    return find(node.props?.children, type, predicate);
  }
  let tree = render();
  const main = find(tree, 'FlatList');
  const canvas = find(main.props.ListHeaderComponent, 'AdminMapCanvas');
  canvas.props.onSelect(data.groups[0].key);
  tree = render();
  assert.equal(find(tree, 'Modal').props.visible, true);
  const choices = find(find(tree, 'Modal'), 'FlatList');
  assert.equal(choices.props.data.length, 2);
  choices.props.renderItem({ item: choices.props.data[0] }).props.onPress();
  tree = render();
  // Action is a local component function, so locate it by its props instead of relying on its function name.
  function findAction(node) {
    if (Array.isArray(node)) return node.map(findAction).find(Boolean);
    if (!node || typeof node !== 'object') return null;
    return node.props?.title === 'End activity' ? node : findAction(node.props?.children);
  }
  const end = findAction(find(tree, 'Modal'));
  assert.ok(end);
  end.props.onPress();
  assert.equal(calls[0][0].id, 'one');
  assert.equal(calls[0][1], 'ended');
  props.data = buildActivityMap([squad('one', { status: 'ended' }), squad('two', { status: 'full' })], props.filters, '', now);
  assert.equal(find(render(), 'Modal').props.visible, false, 'a moderated activity must disappear from the live detail view after refresh');
});
