const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadModule(relativePath, mocks) {
  const code = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const javascript = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, require: id => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency ${id}`);
    return mocks[id];
  }, Date, Math, Number, Set, Map, console };
  vm.runInNewContext(javascript, context);
  return module.exports;
}

function lobby(id, status, count, max, starts, ends) {
  return { id, status, current_players: count, max_players: max, starts_at: starts, ends_at: ends,
    expires_at: '2099-01-01T00:00:00Z', activity_type: 'Running', skill_level: 'Friendly', latitude: 3.1, longitude: 101.6 };
}
const now = Date.now();
const inHours = hrs => new Date(now + hrs * 3600000).toISOString();
const sorting = loadModule('mobile/utils/squadSort.ts', {
  './lobby': { isOver: l => new Date(l.ends_at).getTime() <= Date.now(), isEnded: l => l.status === 'ended' || l.status === 'cancelled' || new Date(l.expires_at).getTime() <= Date.now() },
});

test('Nearby discovery lists joinable first and full lobbies last, ordered by start time', () => {
  const full = lobby('full', 'full', 4, 4, inHours(2), inHours(3));
  const later = lobby('later', 'open', 2, 4, inHours(5), inHours(6));
  const soon = lobby('soon', 'open', 2, 4, inHours(1), inHours(2));
  const input = [full, later, soon];
  const sorted = sorting.sortSquadsForDiscovery(input);
  assert.deepEqual(Array.from(sorted, l => l.id), ['soon', 'later', 'full']);
  assert.deepEqual(Array.from(input, l => l.id), ['full', 'later', 'soon'], 'original Supabase array must not be mutated');
});

test('Cannot join full, expired or finished lobbies', () => {
  assert.equal(sorting.isJoinableLobby(lobby('x','full',4,4,inHours(1),inHours(2))), false);
  assert.equal(sorting.isJoinableLobby(lobby('x','open',2,4,inHours(-2),inHours(-1))), false);
  assert.equal(sorting.isJoinableLobby(lobby('x','open',2,4,inHours(1),inHours(2))), true);
});

const matching = loadModule('mobile/services/squadMatchService.ts', {
  '../components/ui/SportVisual': { sportKind: sport => sport.toLowerCase() },
  './supabaseClient': { supabase: {} },
});
const prefs = { favourite_sports:['Running'], play_style:'Both', preferred_days:[],
  home_latitude:3.0,home_longitude:101.5,max_distance_km:1 };

test('Explicit All Days (empty encoded days) matches every weekday and ignores saved legacy radius', () => {
  const event = lobby('far','open',1,4,inHours(25),inHours(26));
  event.latitude = 9.0;
  event.longitude = 110.0;
  const matches = matching.deterministicMatches([event], prefs);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].lobby.id, 'far');
  assert.ok(matches[0].reasons.includes('Preferred day'));
  assert.ok(!matches[0].reasons.some(reason => reason.includes('km')));
});

test('Specific day still impacts match score without hiding other eligible open lobbies', () => {
  const event = lobby('day','open',1,4,inHours(25),inHours(26));
  const eventDay = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(event.starts_at).getDay()];
  const otherDay = eventDay === 'Mon' ? 'Tue' : 'Mon';
  const preferred = matching.deterministicMatches([event], {...prefs,preferred_days:[eventDay]})[0];
  const nonPreferred = matching.deterministicMatches([event], {...prefs,preferred_days:[otherDay]})[0];
  assert.ok(preferred.score > nonPreferred.score);
});

test('UI has a Join CTA wired to existing service and the recommendations use a horizontal carousel', () => {
  const detail = fs.readFileSync(path.join(__dirname,'../mobile/screens/LobbyDetailScreen.tsx'),'utf8');
  const carousel = fs.readFileSync(path.join(__dirname,'../mobile/components/SquadMatchSection.tsx'),'utf8');
  const prefsScreen = fs.readFileSync(path.join(__dirname,'../mobile/screens/SportsPreferencesScreen.tsx'),'utf8');
  assert.match(detail, /import\s*\{[\s\S]*?joinLobby[\s\S]*?\}\s*from '\.\.\/services\/lobbyService'/);
  assert.match(detail, /onPress=\{handleJoin\}/);
  assert.match(carousel, /horizontal[\s\S]*?snapToInterval=/);
  assert.match(carousel, /View & Join/);
  assert.match(prefsScreen, /All Days/);
  assert.doesNotMatch(prefsScreen, /requestForegroundPermissionsAsync|Preferred distance|Use current location/);
});
