import type { Lobby } from '../types';
import { isEnded, isOver } from './lobby';

export function isJoinableLobby(lobby: Lobby): boolean {
  return lobby.status === 'open' && lobby.current_players < lobby.max_players && !isOver(lobby) && !isEnded(lobby);
}

/** Stable, UI-only sorting: joinable first, then upcoming start time. */
export function sortSquadsForDiscovery(lobbies: Lobby[]): Lobby[] {
  return [...lobbies].sort((a, b) => {
    const aOpen = isJoinableLobby(a);
    const bOpen = isJoinableLobby(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    const aTime = new Date(a.starts_at).getTime();
    const bTime = new Date(b.starts_at).getTime();
    const diff = (Number.isFinite(aTime) ? aTime : Infinity) - (Number.isFinite(bTime) ? bTime : Infinity);
    return Number.isNaN(diff) ? 0 : diff;
  });
}
