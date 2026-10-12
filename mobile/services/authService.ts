import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export async function signUp(name: string, email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return error?.message ?? null;
}

export async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

export function onAuthChange(callback: (session: Session | null) => void) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
}

export async function getCurrentUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
}