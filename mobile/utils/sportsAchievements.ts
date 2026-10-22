import type { SportsProfile } from '../services/sportsIdentityService';
// Local UI-only achievements derived from EXISTING lobby memberships, not verified attendance.
export const ACHIEVEMENTS = [
  { id: 'first', icon: 'footsteps' as const, name: 'First Squad', ms: 'Squad Pertama', description: 'Join 1 squad', descMs: 'Sertai 1 squad', tone: '#2979F2', pale: '#E7F0FF', threshold: 1 },
  { id: 'regular', icon: 'shield-checkmark' as const, name: 'Squad Regular', ms: 'Ahli Aktif', description: 'Join 5 squads', descMs: 'Sertai 5 squad', tone: '#0FA66A', pale: '#DDF9ED', threshold: 5 },
  { id: 'host', icon: 'trophy' as const, name: 'Host Hero', ms: 'Host Hebat', description: 'Host 5 squads', descMs: 'Host 5 squad', tone: '#F59E0B', pale: '#FFF1CF', threshold: 5 },
  { id: 'explorer', icon: 'star' as const, name: 'Sport Explorer', ms: 'Penjelajah Sukan', description: 'Join 3 sports types', descMs: 'Sertai 3 jenis sukan', tone: '#8759E8', pale: '#F0EAFF', threshold: 3 },
];
export function activityStats(p: SportsProfile | null) {
  const joined = Math.max(0, Number(p?.joined ?? 0));
  const hosted = Math.max(0, Number(p?.hosted ?? 0));
  const sports = Math.max(0, Number(p?.sports_tried ?? 0));
  const xp = joined * 75 + hosted * 50 + sports * 25;
  return { joined, hosted, sports, xp, level: Math.floor(xp / 500) + 1, levelProgress: xp % 500 };
}
export function achievementCount(p: SportsProfile | null, id: string) {
  const s = activityStats(p);
  if (id === 'first' || id === 'regular') return s.joined;
  if (id === 'host') return s.hosted;
  return s.sports;
}
