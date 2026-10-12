import type { Lobby } from '../types';

export function isEnded(l: Lobby): boolean {
    return l.status === 'ended' || l.status === 'cancelled' || new Date(l.ends_at).getTime() < Date.now();
}

export function statusLabel(l: Lobby): { text: string; bg: string; fg: string } {
    if (isEnded(l)) return { text: 'Tamat', bg: '#f3f4f6', fg: '#6b7280' };
    if (l.status === 'full') return { text: 'Penuh', bg: '#fef3c7', fg: '#92400e' };
    return { text: 'Dibuka', bg: '#dcfce7', fg: '#166534' };
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}