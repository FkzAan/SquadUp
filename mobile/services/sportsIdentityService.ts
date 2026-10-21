/**
 * SquadUp sports add-on (no database migration).
 * Existing Supabase tables are READ ONLY here. Sport preferences and host notes
 * are stored on this device, scoped to the signed-in user.
 * They do not sync to teammates' phones and are not an authoritative attendance record.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserId } from './authService';
import { fetchMyJoinedLobbies, fetchLobbyById, fetchLobbyMembers } from './lobbyService';
import { fetchMyProfile } from './profileService';
import { supabase } from './supabaseClient';

export type SportsPreferences = {
  user_id: string;
  favourite_sports: string[];
  play_style: 'Friendly' | 'Competitive' | 'Both';
  preferred_days: string[];
  max_distance_km: number;
  home_latitude: number | null;
  home_longitude: number | null;
  is_public: boolean; // reserved for future server-side privacy controls; NOT published
  onboarding_completed: boolean;
};

export type SportsActivity = {
  id: string;
  activity_type: string;
  location_name: string;
  starts_at: string;
  status: 'joined' | 'hosted';
};
export type SportsProfile = {
  private: boolean;
  name?: string;
  avatar_url?: string | null;
  joined?: number;
  hosted?: number;
  sports_tried?: number;
  favourite_sports?: string[];
  play_style?: string;
  recent?: SportsActivity[];
  localOnly?: boolean;
};

function prefsKey(userId: string) { return `@squadup/sports-preferences/v1/${userId}`; }
function attendanceKey(hostId: string, squadId: string) { return `@squadup/host-attendance-notes/v1/${hostId}/${squadId}`; }

export async function getMySportsPreferences(): Promise<{ data: SportsPreferences | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) return { data: null, error: 'Sign in required' };
  try {
    const raw = await AsyncStorage.getItem(prefsKey(userId));
    if (!raw) return { data: null, error: null };
    const value = JSON.parse(raw) as SportsPreferences;
    if (!Array.isArray(value.favourite_sports) || !Array.isArray(value.preferred_days)) throw new Error('Invalid preferences');
    return { data: { ...value, user_id: userId, is_public: false }, error: null };
  } catch {
    return { data: null, error: 'Could not read preferences stored on this device.' };
  }
}

export async function saveSportsPreferences(values: Omit<SportsPreferences, 'user_id'>): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return 'Sign in required';
  try {
    await AsyncStorage.setItem(prefsKey(userId), JSON.stringify({ ...values, user_id: userId, is_public: false }));
    return null;
  } catch {
    return 'Could not save preferences on this device.';
  }
}

/** For the owner: existing lobby history + local preferences. For others: basic public name/avatar only. */
export async function fetchSportsProfile(userId: string): Promise<{ data: SportsProfile | null; error: string | null }> {
  const currentId = await getCurrentUserId();
  if (!currentId) return { data: null, error: 'Sign in required' };
  if (userId !== currentId) {
    // Only use the same public fields that already appear in lobby member lists.
    const { data, error } = await supabase.from('users').select('name,avatar_url').eq('id', userId).maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: { private: true, name: data?.name ?? 'SquadUp Player', avatar_url: data?.avatar_url ?? null }, error: null };
  }

  try {
    const [user, joined, { data: prefs }] = await Promise.all([
      fetchMyProfile(), fetchMyJoinedLobbies(), getMySportsPreferences(),
    ]);
    // Joined history is fetched from the existing squad_members + squad_lobbies relationship.
    // Counts prove membership/hosting, NOT actual physical attendance.
    const hosted = joined.filter(l => l.host_id === currentId);
    const sports = new Set(joined.map(l => l.activity_type.toLowerCase().trim()));
    return {
      data: {
        private: false,
        name: user?.name ?? 'SquadUp Player',
        avatar_url: user?.avatar_url ?? null,
        joined: joined.length,
        hosted: hosted.length,
        sports_tried: sports.size, // categories joined, not verified attendance
        favourite_sports: prefs?.favourite_sports ?? [],
        play_style: prefs?.play_style ?? 'Friendly',
        recent: joined.slice(0, 6).map(l => ({
          id: l.id,
          activity_type: l.activity_type,
          location_name: l.location_name,
          starts_at: l.starts_at,
          status: l.host_id === currentId ? 'hosted' : 'joined',
        })),
        localOnly: true,
      },
      error: null,
    };
  } catch {
    return { data: null, error: 'Could not load your sports profile.' };
  }
}

export type AttendanceStatus = 'attended' | 'absent';

/** These are host's LOCAL notes only and are not shared/verified. */
export async function fetchSquadAttendance(squadId: string): Promise<Record<string, AttendanceStatus>> {
  const hostId = await getCurrentUserId();
  if (!hostId) return {};
  try {
    const raw = await AsyncStorage.getItem(attendanceKey(hostId, squadId));
    return raw ? JSON.parse(raw) as Record<string, AttendanceStatus> : {};
  } catch { return {}; }
}

export async function setSquadAttendance(squadId: string, userId: string, attended: boolean): Promise<string | null> {
  const hostId = await getCurrentUserId();
  if (!hostId) return 'Sign in required';
  // Validate against existing real lobby data, even though the note stays local.
  const lobby = await fetchLobbyById(squadId);
  if (!lobby || lobby.host_id !== hostId) return 'Only the squad host can save local attendance notes.';
  const members = await fetchLobbyMembers(lobby);
  if (!members.some(m => m.user_id === userId)) return 'This player is not in the squad.';
  try {
    const old = await fetchSquadAttendance(squadId);
    await AsyncStorage.setItem(attendanceKey(hostId, squadId), JSON.stringify({ ...old, [userId]: attended ? 'attended' : 'absent' }));
    return null;
  } catch { return 'Unable to save local attendance notes.'; }
}
