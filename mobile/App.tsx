import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthChange } from './services/authService';
import LoginScreen from './screens/LoginScreen';
import FeedScreen from './screens/FeedScreen';
import HostLobbyScreen from './screens/HostLobbyScreen';
import MyLobbiesScreen from './screens/MyLobbiesScreen';
import LobbyDetailScreen from './screens/LobbyDetailScreen';

type Screen =
  | { name: 'feed' }
  | { name: 'host' }
  | { name: 'myLobbies' }
  | { name: 'detail'; lobbyId: string; from: 'feed' | 'myLobbies' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setReady(true);
    });
    return onAuthChange(setSession);
  }, []);

  // log keluar: kembali ke Feed untuk sesi seterusnya
  useEffect(() => {
    if (!session) setScreen({ name: 'feed' });
  }, [session]);

  // butang back Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'feed') return false; // biar app keluar
      if (screen.name === 'detail') {
        setScreen({ name: screen.from === 'myLobbies' ? 'myLobbies' : 'feed' });
      } else {
        setScreen({ name: 'feed' });
      }
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  switch (screen.name) {
    case 'host':
      return <HostLobbyScreen onDone={() => setScreen({ name: 'feed' })} />;
    case 'myLobbies':
      return (
        <MyLobbiesScreen
          onBack={() => setScreen({ name: 'feed' })}
          onOpen={(id) => setScreen({ name: 'detail', lobbyId: id, from: 'myLobbies' })}
        />
      );
    case 'detail':
      return (
        <LobbyDetailScreen
          lobbyId={screen.lobbyId}
          onBack={() => setScreen({ name: screen.from === 'myLobbies' ? 'myLobbies' : 'feed' })}
        />
      );
    default:
      return (
        <FeedScreen
          onHost={() => setScreen({ name: 'host' })}
          onMyLobbies={() => setScreen({ name: 'myLobbies' })}
          onOpenLobby={(id) => setScreen({ name: 'detail', lobbyId: id, from: 'feed' })}
        />
      );
  }
}