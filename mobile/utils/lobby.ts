import type { Lobby } from '../types';
import { translate, type Language } from '../localization/translations';

const pad = (n: number) => String(n).padStart(2, '0');
const DAY = 24 * 60 * 60 * 1000;

export function formatClock(d: Date): string {
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatTime(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} ${formatClock(d)}`;
}

// Lobby sudah tutup: 15 minit selepas aktiviti tamat (atau dibatalkan)
export function isEnded(l: Lobby): boolean {
    if (l.status === 'ended' || l.status === 'cancelled') return true;
    return new Date(l.expires_at).getTime() <= Date.now();
}

// Aktiviti sudah tamat (dalam tempoh 15 minit sebelum lobby ditutup)
export function isOver(l: Lobby): boolean {
    return new Date(l.ends_at).getTime() <= Date.now();
}

function isOngoing(l: Lobby): boolean {
    const now = Date.now();
    return new Date(l.starts_at).getTime() <= now && now < new Date(l.ends_at).getTime();
}

function dayLabel(d: Date, language: Language = 'ms'): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(d);
    day.setHours(0, 0, 0, 0);
    const diff = Math.round((day.getTime() - today.getTime()) / DAY);
    if (diff === 0) return translate(language, 'today');
    if (diff === 1) return translate(language, 'tomorrow');
    if (diff === -1) return translate(language, 'yesterday');
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

// cth: "Hari ini · 20:00 – 22:00"
export function formatSchedule(startIso: string, endIso: string, language: Language = 'ms'): string {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (s.toDateString() === e.toDateString()) {
        return `${dayLabel(s, language)} · ${formatClock(s)} – ${formatClock(e)}`;
    }
    return `${dayLabel(s, language)} ${formatClock(s)} – ${dayLabel(e, language)} ${formatClock(e)}`;
}

export function statusLabel(l: Lobby, language: Language = 'ms'): { text: string; bg: string; fg: string } {
    if (isEnded(l)) return { text: translate(language, 'statusEnded'), bg: '#f3f4f6', fg: '#6b7280' };
    if (isOver(l)) return { text: translate(language, 'statusCompleted'), bg: '#f3f4f6', fg: '#6b7280' };
    if (l.status === 'full') return { text: translate(language, 'statusFull'), bg: '#fef3c7', fg: '#92400e' };
    if (isOngoing(l)) return { text: translate(language, 'statusOngoing'), bg: '#dbeafe', fg: '#1d4ed8' };
    return { text: translate(language, 'statusUpcoming'), bg: '#dcfce7', fg: '#166534' };
}