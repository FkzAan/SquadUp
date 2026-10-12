import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
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

  // Butang back Android: dari skrin Host, kembali ke Feed (bukan keluar app)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hosting) {
        setHosting(false);
        return true; // kita uruskan, jangan keluar app
      }
      return false; // di Feed/Login: biar app keluar seperti biasa
    });
    return () => sub.remove();
  }, [hosting]);

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