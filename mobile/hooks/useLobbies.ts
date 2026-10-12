import { useEffect, useState, useCallback } from 'react';
import { fetchActiveLobbies, subscribeToLobbies } from '../services/lobbyService';
import type { Lobby } from '../types';

export function useLobbies() {
    const [lobbies, setLobbies] = useState<Lobby[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLobbies(await fetchActiveLobbies());
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        return subscribeToLobbies(refresh);
    }, [refresh]);

    return { lobbies, loading, refresh };
}