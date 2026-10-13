import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { resolveAccountRole } from '../../shared/accountRole';
import type { AccountRole } from '../../shared/accountRole';

type AccessState = { userId: string | null; role: AccountRole | null; checking: boolean; error: string | null };
type AuthValue = { session: Session | null; role: AccountRole | null; loading: boolean; error: string | null; retry: () => void; logout: () => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
const message = (error: unknown) => error instanceof Error ? error.message : 'Tak dapat semak akaun. Cuba semula.';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [roleAttempt, setRoleAttempt] = useState(0);
  const [access, setAccess] = useState<AccessState>({ userId: null, role: null, checking: true, error: null });
  const retry = useCallback(() => {
    setAccess(previous => ({ ...previous, checking: true, error: null }));
    setAttempt(value => value + 1);
  }, []);

  useEffect(() => {
    let active = true; let eventReceived = false;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      // Do not await Supabase calls inside its auth listener (auth lock).
      eventReceived = true;
      if (active) {
        setSession(next); setReady(true); setRestoreError(null);
        if (!next || _event === 'SIGNED_IN') setAccess({ userId: null, role: null, checking: true, error: null });
        if (_event === 'SIGNED_IN') setRoleAttempt(value => value + 1);
      }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || eventReceived) return;
      setSession(data.session); setReady(true);
      if (error) setRestoreError(error.message);
    }).catch(error => { if (active) { setRestoreError(message(error)); setReady(true); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [attempt]);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    resolveAccountRole(() => supabase.rpc('squadup_admin_access'))
      .then(role => { if (active) setAccess({ userId, role, checking: false, error: null }); })
      .catch(error => { if (active) setAccess({ userId, role: null, checking: false, error: message(error) }); });
    return () => { active = false; };
  }, [userId, attempt, roleAttempt]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') { supabase.auth.startAutoRefresh(); if (userId) retry(); }
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const timer = setInterval(() => { if (userId && AppState.currentState === 'active') retry(); }, 30000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [retry, userId]);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);
  const current = Boolean(userId && access.userId === userId);
  return <AuthContext.Provider value={{ session, role: current ? access.role : null,
    loading: !ready || Boolean(userId && (!current || (access.checking && !access.role))),
    error: restoreError ?? (current ? access.error : null), retry, logout
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth requires AuthProvider');
  return value;
}
