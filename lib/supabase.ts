import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rddkubczojoxdszzinyh.supabase.co';
const supabaseKey = 'sb_publishable_tcsZJNyti-qMyGSiHbBhpw_Eu7FpuFP';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

export type Facility = {
    id: string;
    name: string;
    facility_type: string;
    township: string;
    latitude: number;
    longitude: number;
};

export type Lobby = {
    id: string;
    host_id: string;
    facility_id: string | null;
    activity_type: string;
    location_name: string;
    latitude: number | null;
    longitude: number | null;
    max_players: number;
    current_players: number;
    skill_level: string;
    status: 'open' | 'full' | 'ended' | 'cancelled';
    created_at: string;
    ends_at: string;
};