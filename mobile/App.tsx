import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthChange } from './services/authService';
import LoginScreen from './screens/LoginScreen';
import FeedScreen from './screens/FeedScreen';
import HostLobbyScreen from './screens/HostLobbyScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [hosting, setHosting] = useState(false);

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setReady(true);
    });
    return onAuthChange(setSession);
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) return <LoginScreen />;
  if (hosting) return <HostLobbyScreen onDone={() => setHosting(false)} />;
  return <FeedScreen onHost={() => setHosting(true)} />;
}