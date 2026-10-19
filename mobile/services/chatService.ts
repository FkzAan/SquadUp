import { supabase } from './supabaseClient';
import type { ChatMessage } from '../types';

// Table: squad_messages (id, squad_id, sender_id, sender_name, message, created_at)

let channelCounter = 0;
const uniqueName = (prefix: string) => `${prefix}-${Date.now()}-${channelCounter++}`;

// cache avatar supaya tak query berulang kali
const avatarCache = new Map<string, string | null>();

async function loadAvatars(ids: string[]) {
    const missing = [...new Set(ids)].filter((id) => id && !avatarCache.has(id));
    if (missing.length === 0) return;
    const { data } = await supabase.from('users').select('id, avatar_url').in('id', missing);
    missing.forEach((id) => avatarCache.set(id, null));
    (data as any[] | null)?.forEach((u) => avatarCache.set(u.id, u.avatar_url ?? null));
}

function toMessage(row: any): ChatMessage {
    return {
        id: row.id,
        squad_id: row.squad_id,
        user_id: row.sender_id,
        content: row.message,
        created_at: row.created_at,
        name: (row.sender_name as string) || 'Pemain',
        avatar_url: avatarCache.get(row.sender_id) ?? null,
    };
}

// ---------- Baca ----------

export async function fetchMessages(squadId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
        .from('squad_messages')
        .select('id, squad_id, sender_id, sender_name, message, created_at')
        .eq('squad_id', squadId)
        .order('created_at', { ascending: true })
        .limit(200);
    if (error || !data) return [];
    await loadAvatars((data as any[]).map((r) => r.sender_id));
    return (data as any[]).map(toMessage);
}

// ---------- Tulis ----------

export type SendResult =
    | { ok: true }
    | { ok: false; blocked: true; reason: string }
    | { ok: false; blocked: false; error: string };

// Mesej dihantar melalui Edge Function `moderate-message`:
// AI Chat Safety Guard semak dulu, kalau selamat baru disimpan.
export async function sendMessage(squadId: string, content: string): Promise<SendResult> {
    const text = content.trim();
    if (!text) return { ok: true };
    if (text.length > 500) return { ok: false, blocked: false, error: 'Mesej terlalu panjang (maks 500 aksara).' };

    const { data, error } = await supabase.functions.invoke('moderate-message', {
        body: { squad_id: squadId, message: text },
    });

    if (error || !data) {
        return { ok: false, blocked: false, error: 'Tak dapat hantar mesej. Cuba lagi.' };
    }
    if (data.ok) return { ok: true };
    if (data.blocked) return { ok: false, blocked: true, reason: data.reason_ms as string };
    return { ok: false, blocked: false, error: (data.error as string) ?? 'Tak dapat hantar mesej.' };
}

// ---------- Real-time ----------

// Dengar mesej baru dalam squad tertentu
export function subscribeToMessages(squadId: string, onNew: (msg: ChatMessage) => void) {
    const channel = supabase
        .channel(uniqueName(`chat-${squadId}`))
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'squad_messages', filter: `squad_id=eq.${squadId}` },
            async (payload) => {
                const row = payload.new as any;
                if (!row?.id) return;
                await loadAvatars([row.sender_id]);
                onNew(toMessage(row));
            }
        )
        .subscribe();
    return () => {
        supabase.removeChannel(channel);
    };
}