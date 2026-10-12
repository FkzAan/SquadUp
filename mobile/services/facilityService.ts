import { supabase } from './supabaseClient';
import type { Facility } from '../types';

export async function fetchFacilities(): Promise<Facility[]> {
    const { data, error } = await supabase.from('facilities').select('*');
    if (error || !data) return [];
    return data as Facility[];
}