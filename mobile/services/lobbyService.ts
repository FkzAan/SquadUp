import { supabase } from './supabaseClient';
import { getCurrentUserId } from './authService';
import type { JoinedLobby, Lobby, LobbyMember, NewLobbyInput } from '../types';

let channelCounter = 0;
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${channelCounter++}`;

// ---------- Baca ----------

export async function fetchActiveLobbies(): Promise<Lobby[]> {
    const { data, error } = await supabase
        .from('squad_lobbies')
        .select('*')
        .in('status', ['open', 'full'])
        .gt('expires_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
    if (error || !data) return [];
    return data as Lobby[];
}

// Squad yang saya host (untuk sidebar, boleh dipadam)
export async function fetchMyLobbies(): Promise<Lobby[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('squad_lobbies')
        .select('*')
        .eq('host_id', userId)
        .in('status', ['open', 'full'])
        .gt('expires_at', new Date().toISOString())
        .order('starts_at', { ascending: true });
    if (error || !data) return [];
    return data as Lobby[];
}

// Semua squad yang saya join (termasuk yang saya host) + sejarah
export async function fetchMyJoinedLobbies(): Promise<JoinedLobby[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { data, error } = await supabase
        .from('squad_members')
        .select('joined_at, squad_lobbies(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: false });
    if (error || !data) return [];

    const result: JoinedLobby[] = [];
    (data as any[]).forEach((row) => {
        const lobby = Array.isArray(row.squad_lobbies) ? row.squad_lobbies[0] : row.squad_lobbies;
        if (lobby) result.push({ ...(lobby as Lobby), joined_at: row.joined_at });
    });
    return result;
}

export async function fetchLobbyById(id: string): Promise<Lobby | null> {
    const { data, error } = await supabase.from('squad_lobbies').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return data as Lobby;
}

export async function fetchLobbyMembers(lobby: Lobby): Promise<LobbyMember[]> {
  const { data, error } = await supabase
    .from('squad_members')
    .select('user_id, joined_at, users(name, avatar_url)')
    .eq('squad_id', lobby.id)
    .order('joined_at', { ascending: true });
  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const u = Array.isArray(row.users) ? row.users[0] : row.users;
    return {
      user_id: row.user_id as string,
      name: (u?.name as string) ?? 'Pemain',
      avatar_url: (u?.avatar_url as string | null) ?? null,
      joined_at: row.joined_at as string,
      is_host: row.user_id === lobby.host_id,
    };
  });
}

// ---------- Tulis ----------

export async function createLobby(input: NewLobbyInput): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { error } = await supabase.from('squad_lobbies').insert({
        host_id: userId,
        facility_id: input.facility?.id ?? null,
        activity_type: input.activity_type,
        location_name: input.location_name,
        latitude: input.latitude,
        longitude: input.longitude,
        max_players: input.max_players,
        skill_level: input.skill_level,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
    });
    return error?.message ?? null;
}

export async function joinLobby(squadId: string): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { error } = await supabase.from('squad_members').insert({ squad_id: squadId, user_id: userId });
    if (error) {
        if (error.code === '23505') return 'Kamu sudah join squad ini.';
        return error.message;
    }
    return null;
}

export async function leaveLobby(squadId: string): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { data, error } = await supabase
        .from('squad_members')
        .delete()
        .eq('squad_id', squadId)
        .eq('user_id', userId)
        .select('squad_id');

    if (error) return error.message;
    if (!data || data.length === 0) return 'Tak dapat keluar dari squad ini.';
    return null;
}

export async function deleteLobby(id: string): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { data, error } = await supabase
        .from('squad_lobbies')
        .delete()
        .eq('id', id)
        .eq('host_id', userId)
        .select('id');

    if (error) return error.message;
    if (!data || data.length === 0) return 'Tak dapat padam. Hanya host boleh padam squad ini.';
    return null;
}

// ---------- Real-time ----------

export function subscribeToLobbies(onChange: () => void) {
    const channel = supabase
        .channel(uniqueName('lobbies'))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'squad_lobbies' }, () => onChange())
        .subscribe();
    return () => {
        supabase.removeChannel(channel);
    };
}

// Untuk skrin butiran: dengar perubahan ahli dan lobby tertentu
export function subscribeToLobbyDetail(squadId: string, onChange: () => void) {
    const channel = supabase
        .channel(uniqueName(`detail-${squadId}`))
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'squad_members', filter: `squad_id=eq.${squadId}` },
            () => onChange()
        )
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'squad_lobbies', filter: `id=eq.${squadId}` },
            () => onChange()
        )
        .subscribe();
    return () => {
        supabase.removeChannel(channel);
    };
}