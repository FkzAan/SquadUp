import { supabase } from './supabaseClient';
import { getCurrentUserId } from './authService';
import type { Lobby, NewLobbyInput } from '../types';

export async function fetchActiveLobbies(): Promise<Lobby[]> {
    const { data, error } = await supabase
        .from('squad_lobbies')
        .select('*')
        .in('status', ['open', 'full'])
        .gt('ends_at', new Date().toISOString())
        .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as Lobby[];
}

export async function createLobby(input: NewLobbyInput): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { error } = await supabase.from('squad_lobbies').insert({
        host_id: userId,
        facility_id: input.facility?.id ?? null,
        activity_type: input.activity_type,
        location_name: input.location_name,
        latitude: input.facility?.latitude ?? null,
        longitude: input.facility?.longitude ?? null,
        max_players: input.max_players,
        skill_level: input.skill_level,
    });
    return error?.message ?? null;
}

export async function joinLobby(squadId: string): Promise<string | null> {
    const userId = await getCurrentUserId();
    if (!userId) return 'Sila log masuk semula.';

    const { error } = await supabase.from('squad_members').insert({ squad_id: squadId, user_id: userId });
    return error?.message ?? null;
}

// Real-time: panggil callback bila ada perubahan. Pulangkan fungsi untuk berhenti melanggan.
export function subscribeToLobbies(onChange: () => void) {
    const channel = supabase
        .channel('lobbies-feed')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'squad_lobbies' }, onChange)
        .subscribe();
    return () => {
        supabase.removeChannel(channel);
    };
}