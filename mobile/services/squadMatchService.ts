/** SquadMatch — Gemini ranking via authenticated Supabase Edge Function.
 * No SQL migrations. All existing lobby reads continue through lobbyService.
 * If the AI function is not configured or available, clearly labelled
 * preference-based recommendations remain usable.
 */
import type { Lobby } from '../types';
import type { SportsPreferences } from './sportsIdentityService';
import { sportKind } from '../components/ui/SportVisual';
import { supabase } from './supabaseClient';

export type Match = { lobby: Lobby; score: number; reasons: string[]; ai: boolean };
export type MatchResult = { matches: Match[]; source: 'gemini' | 'preferences' };
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CACHE_MS = 90_000;
const cache = new Map<string, { expires: number; result: MatchResult }>();
/** Hard constraints (open, capacity, future) are NEVER overridden by Gemini. */
export function deterministicMatches(lobbies: Lobby[], p: SportsPreferences): Match[] {
  const now=Date.now();
  const wants=new Set(p.favourite_sports.map(sportKind));
  return lobbies.filter(l=>
    l.status==='open' && l.current_players<l.max_players &&
    Number.isFinite(new Date(l.ends_at).getTime()) &&
    new Date(l.ends_at).getTime()>now &&
    Number.isFinite(new Date(l.starts_at).getTime())
  ).map(l=>{
    const sport=wants.has(sportKind(l.activity_type));
    // Existing lobbies only expose Friendly/Competitive skill_level.
    const style=p.play_style==='Both'||p.play_style===l.skill_level;
    const day=p.preferred_days.length===0||p.preferred_days.includes(DAYS[new Date(l.starts_at).getDay()]);
    // Distance and GPS are intentionally excluded from preference matching V2.
    // Empty preferred_days means the explicitly-selected All Days option.
    const reasons=[sport?'Favourite sport':null,style?'Preferred play style':null,day?'Preferred day':null].filter((v):v is string=>Boolean(v));
    const score=(sport?55:0)+(style?25:0)+(day?20:0);
    return {lobby:l,score:Math.round(score),reasons,ai:false};
  }).filter((m):m is Match=>m!==null).sort((a,b)=>b.score-a.score).slice(0,10);
}

// Avoid sending exact GPS, account email/name, or chat messages to Gemini.
function compactCandidate(l: Lobby) {
  return {
    id:l.id, activity_type:l.activity_type, skill_level:l.skill_level,
    location_name:l.location_name, starts_at:l.starts_at,
    current_players:l.current_players, max_players:l.max_players,
  };
}

export async function getRecommendedLobbies(
  lobbies: Lobby[], prefs: SportsPreferences, language: 'ms'|'en'='en'
): Promise<MatchResult> {
  const fallback: MatchResult = { matches: deterministicMatches(lobbies,prefs).slice(0,3), source:'preferences' };
  const candidates=deterministicMatches(lobbies,prefs);
  if (!candidates.length) return fallback;
  try {
    const { data: auth } = await supabase.auth.getSession();
    const uid=auth?.session?.user?.id;
    if (!uid) return fallback;
    const body={
      language,
      preferences:{
        favourite_sports:prefs.favourite_sports.slice(0,12), play_style:prefs.play_style,
        preferred_days:prefs.preferred_days,
      },
      lobbies:candidates.map(m=>compactCandidate(m.lobby)),
    };
    const key=`${uid}:${JSON.stringify(body)}`;
    const cached=cache.get(key);
    if(cached && cached.expires>Date.now()) return cached.result;
    // There are no API keys or calls to Google's API directly in Expo.
    const { data, error } = await supabase.functions.invoke('squadmatch-ai', { body });
    if(error || data?.source!=='gemini' || !Array.isArray(data.recommendations)) return fallback;
    const byId=new Map(candidates.map(m=>[m.lobby.id,m]));
    const seen=new Set<string>();
    const matches:Match[]=[];
    for(const item of data.recommendations) {
      if(!item || typeof item.id!=='string' || typeof item.reason!=='string' ||
         seen.has(item.id) || item.reason.trim().length<1) continue;
      const candidate=byId.get(item.id);
      if(!candidate) continue; // whitelist existing, eligible lobbies only
      seen.add(item.id);
      matches.push({...candidate,ai:true,reasons:[item.reason.trim().slice(0,150)]});
      if(matches.length===3)break;
    }
    if(!matches.length) return fallback;
    const result:MatchResult={matches,source:'gemini'};
    if(cache.size>=20)cache.clear();
    cache.set(key,{expires:Date.now()+CACHE_MS,result});
    return result;
  } catch {
    return fallback;
  }
}
