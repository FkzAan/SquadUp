import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AdminSnapshot } from '../services/adminDashboardService';
import { buildCommunityInsights } from '../utils/communityInsights';
import type { InsightCount } from '../utils/communityInsights';

const number = (value: number) => value.toLocaleString();
const shortDate = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? day : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

function Panel({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <View style={s.panel}>
    <Text accessibilityRole="header" style={s.panelTitle}>{title}</Text>
    <Text style={s.description}>{description}</Text>
    {children}
  </View>;
}

function Metric({ label, value, detail, icon }: {
  label: string; value: string; detail: string; icon: keyof typeof Ionicons.glyphMap;
}) {
  return <View accessible accessibilityLabel={`${label}: ${value}. ${detail}`} style={s.metric}>
    <Ionicons name={icon} size={20} color="#6f8975" />
    <Text style={s.metricValue}>{value}</Text>
    <Text style={s.metricLabel}>{label}</Text>
    <Text style={s.metricDetail}>{detail}</Text>
  </View>;
}

function RankedChart({ title, description, items, unit, empty }: {
  title: string; description: string; items: InsightCount[]; unit: 'squads' | 'players'; empty: string;
}) {
  const maximum = Math.max(1, ...items.map(item => item.count));
  return <Panel title={title} description={description}>
    {items.length === 0 || items.every(item => item.count === 0) ? <Text style={s.empty}>{empty}</Text> :
      <View style={s.ranking}>{items.slice(0, 5).map((item, index) =>
        <View key={item.key} accessible accessibilityLabel={`${item.label}: ${number(item.count)} ${unit}`} style={s.rankItem}>
          <View style={s.rankHeading}><Text style={s.rankLabel}>{item.label}</Text><Text style={s.rankCount}>{number(item.count)}</Text></View>
          <View style={s.barTrack} accessible={false}>
            <View style={[s.horizontalBar, index === 0 && s.leadingBar, { width: `${100 * item.count / maximum}%` }]} />
          </View>
        </View>)}
        {items.length > 5 && <Text style={s.caption}>Top 5 of {number(items.length)} categories. Export CSV for the full list.</Text>}
      </View>}
  </Panel>;
}

export default function CommunityInsights({ snapshot, asOf }: { snapshot: AdminSnapshot; asOf: number }) {
  const insights = useMemo(() => buildCommunityInsights(snapshot, asOf), [snapshot, asOf]);
  const maximumDaily = Math.max(1, ...insights.daily.map(day => day.count));
  const hasPlayers = insights.coverage.players.loaded > 0;

  return <View style={s.content}>
    <Text style={s.intro}>See which activities bring people together and where squads need support.</Text>
    <View style={[s.scope, insights.coverage.partial && s.partialScope]}>
      <Text style={s.scopeTitle}>{insights.coverage.partial ? 'Partial record coverage' : 'Your community data'}</Text>
      <Text style={s.scopeText}>
        List-based insights use {number(insights.coverage.squads.loaded)} of {number(insights.coverage.squads.total)} saved squads and {number(insights.coverage.players.loaded)} of {number(insights.coverage.players.total)} player profiles. The 7-day chart covers all squads.
      </Text>
      {insights.coverage.partial && <Text style={s.scopeText}>Some lists are capped at 2,000 records. Rankings and player metrics may not represent the whole community.</Text>}
    </View>

    <View style={s.metrics}>
      <Metric label="Profiles in squads" value={number(insights.playersInSquads)} detail="With at least 1 membership" icon="people-outline" />
      <Metric label="Multi-squad players" value={number(insights.multiSquadPlayers)} detail="With memberships in 2+ squads" icon="git-network-outline" />
      <Metric label="Active squad fill" value={insights.fillPercent === null ? '—' : `${insights.fillPercent}%`} detail={`${number(insights.occupiedPlaces)} of ${number(insights.capacity)} places filled`} icon="pie-chart-outline" />
      <Metric label="Places available" value={number(insights.availablePlaces)} detail={`Across ${number(insights.activeSquads)} active squads`} icon="person-add-outline" />
    </View>

    <Panel title="Activity over the last 7 days" description="Squads created on the last 7 UTC dates, including today. Includes ended and cancelled squads.">
      {insights.daily.length === 0 ? <Text style={s.empty}>Daily activity totals are unavailable. Pull down to refresh.</Text> : <>
        <View style={s.trendSummary}><Text style={s.trendTotal}>{number(insights.weeklySquads)}</Text><Text style={s.trendUnit}>squads created</Text></View>
        <View style={s.dailyChart}>
          {insights.daily.map((day, index) => <View key={day.day} style={s.dailyColumn} accessible accessibilityLabel={`${shortDate(day.day)} UTC: ${number(day.count)} squads created`}>
            <Text style={s.dailyCount}>{number(day.count)}</Text>
            <View style={s.dailyTrack} accessible={false}><View style={[s.dailyBar, index === insights.daily.length - 1 && s.todayBar, { height: 116 * day.count / maximumDaily }]} /></View>
            <Text style={s.dailyDate}>{shortDate(day.day)}</Text>
          </View>)}
        </View>
        <Text style={s.caption}>{insights.weeklySquads === 0 ? 'No squads created in this period. ' : ''}Bar heights show squads created, not attendance.</Text>
      </>}
    </Panel>

    <RankedChart title="Popular activities" description="Saved squads per activity. Includes ended and cancelled squads; similar names with different capitalisation are grouped together."
      items={insights.activities} unit="squads" empty="No activities to compare yet. Squads created in the player app will appear here." />

    <Panel title="Player participation" description="Memberships held by the loaded player profiles, including hosted squads.">
      {!hasPlayers ? <Text style={s.empty}>No player profiles to compare yet.</Text> : <View style={s.ranking}>
        {insights.participation.map((item, index) => <View key={item.key} style={s.rankItem} accessible accessibilityLabel={`${item.label}: ${number(item.count)} players`}>
          <View style={s.rankHeading}><Text style={s.rankLabel}>{item.label}</Text><Text style={s.rankCount}>{number(item.count)}</Text></View>
          <View style={s.barTrack} accessible={false}><View style={[s.horizontalBar, index === 2 && s.leadingBar, { width: `${100 * item.count / insights.coverage.players.loaded}%` }]} /></View>
        </View>)}
      </View>}
      <Text style={s.caption}>Joining is not confirmed attendance. These counts can fall when people leave or squads are deleted, so they do not measure retention.</Text>
    </Panel>

    <Panel title="Room for more teammates" description="Open/full squads that have not expired at the last refresh.">
      {insights.capacity === 0 ? <Text style={s.empty}>No active squad capacity right now. New active squads will appear after refresh.</Text> : <>
        <View style={s.fillSummary} accessible accessibilityLabel={`${number(insights.occupiedPlaces)} occupied places out of ${number(insights.capacity)}. ${number(insights.availablePlaces)} available places.`}>
          <Text style={s.fillValue}>{insights.fillPercent}%</Text><Text style={s.fillLabel}>of player places filled</Text>
        </View>
        <View style={s.capacityTrack} accessible={false}><View style={[s.capacityBar, { width: `${100 * insights.occupiedPlaces / insights.capacity}%` }]} /></View>
        <View style={s.legend}><Text style={s.legendText}>{number(insights.occupiedPlaces)} filled</Text><Text style={s.legendText}>{number(insights.availablePlaces)} available</Text></View>
        <Text style={s.caption}>A capacity-weighted total across loaded active squads. Membership counts include hosts.</Text>
      </>}
    </Panel>

    <RankedChart title="Popular activity locations" description="Saved squads per location, including ended and cancelled squads. This is activity interest, not facility bookings or verified usage."
      items={insights.locations} unit="squads" empty="No activity locations yet. They will appear when residents create squads." />
    <Text style={s.footnote}>Charts use your existing admin data. Refresh to update; no attendance, check-in or feedback data is collected here.</Text>
  </View>;
}

const s = StyleSheet.create({
  content: { gap: 14 }, intro: { color: '#6c7a6e', fontSize: 13, lineHeight: 21 },
  scope: { padding: 14, backgroundColor: '#edf2e5', borderRadius: 12, gap: 6 }, partialScope: { backgroundColor: '#fff6d9' },
  scopeTitle: { color: '#3c563b', fontWeight: '600', fontSize: 12 }, scopeText: { color: '#62715c', fontSize: 11, lineHeight: 18 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  metric: { width: '48%', backgroundColor: '#fff', borderRadius: 15, padding: 15, borderWidth: 1, borderColor: '#e7eadf' },
  metricValue: { fontSize: 28, color: '#203c2b', fontWeight: '700', marginTop: 12 }, metricLabel: { fontSize: 12, fontWeight: '600', color: '#49624c', marginTop: 4, lineHeight: 18 },
  metricDetail: { fontSize: 10, color: '#758178', lineHeight: 16, marginTop: 4 },
  panel: { borderRadius: 16, backgroundColor: '#fff', padding: 18, borderWidth: 1, borderColor: '#e7eadf' },
  panelTitle: { fontSize: 17, fontWeight: '600', color: '#203c2b', lineHeight: 23 }, description: { fontSize: 11, color: '#758178', lineHeight: 18, marginTop: 6 },
  trendSummary: { flexDirection: 'row', gap: 9, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 16 }, trendTotal: { fontSize: 34, fontWeight: '700', color: '#28553f' }, trendUnit: { fontSize: 12, color: '#758178' },
  dailyChart: { flexDirection: 'row', gap: 5, marginTop: 16 }, dailyColumn: { flex: 1, minWidth: 0, alignItems: 'center', gap: 8 }, dailyCount: { fontSize: 10, color: '#49624c', textAlign: 'center' },
  dailyTrack: { width: '80%', maxWidth: 46, height: 116, justifyContent: 'flex-end' }, dailyBar: { backgroundColor: '#a4bb79', borderTopLeftRadius: 5, borderTopRightRadius: 5 }, todayBar: { backgroundColor: '#28553f' }, dailyDate: { fontSize: 9, color: '#758178', textAlign: 'center' },
  ranking: { gap: 17, marginTop: 20 }, rankItem: { gap: 8 }, rankHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, rankLabel: { flex: 1, minWidth: 0, color: '#49624c', fontSize: 12, lineHeight: 19 }, rankCount: { fontSize: 13, fontWeight: '600', color: '#28553f', lineHeight: 19 },
  barTrack: { height: 9, backgroundColor: '#edf1e6', borderRadius: 5, overflow: 'hidden' }, horizontalBar: { height: '100%', borderRadius: 5, backgroundColor: '#a4bb79' }, leadingBar: { backgroundColor: '#28553f' },
  fillSummary: { flexDirection: 'row', gap: 10, alignItems: 'baseline', flexWrap: 'wrap', marginTop: 17 }, fillValue: { fontSize: 36, color: '#28553f', fontWeight: '700' }, fillLabel: { color: '#758178', fontSize: 12 },
  capacityTrack: { height: 16, borderRadius: 8, overflow: 'hidden', backgroundColor: '#edf1e6', marginTop: 16 }, capacityBar: { height: '100%', backgroundColor: '#28553f', borderRadius: 8 }, legend: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 9 }, legendText: { fontSize: 11, color: '#62715c' },
  caption: { color: '#758178', fontSize: 10, lineHeight: 17, marginTop: 15 }, empty: { color: '#758178', fontSize: 12, lineHeight: 20, paddingVertical: 19 }, footnote: { fontSize: 10, lineHeight: 17, color: '#758178', paddingHorizontal: 3, paddingBottom: 3 },
});
