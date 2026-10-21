import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthChange } from './services/authService';
import LoginScreen from './screens/LoginScreen';
import FeedScreen from './screens/FeedScreen';
import HostLobbyScreen from './screens/HostLobbyScreen';
import MyLobbiesScreen from './screens/MyLobbiesScreen';
import LobbyDetailScreen from './screens/LobbyDetailScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import SportsPreferencesScreen from './screens/SportsPreferencesScreen';
import { getMySportsPreferences } from './services/sportsIdentityService';
import { LanguageProvider } from './context/LanguageContext';
import LobbyChatScreen from './screens/LobbyChatScreen';

type Screen =
  | { name: 'feed' }
  | { name: 'host' }
  | { name: 'myLobbies' }
  | { name: 'profile' }
  | { name: 'settings' }
  | { name: 'preferences'; from: 'feed' | 'profile' }
  | { name: 'publicProfile'; userId: string; lobbyId: string; from: 'feed' | 'myLobbies' }
  | { name: 'detail'; lobbyId: string; from: 'feed' | 'myLobbies' }
  | { name: 'chat'; lobbyId: string; title: string; from: 'feed' | 'myLobbies' };

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>({ name: 'feed' });

  function backFromDetail(from: 'feed' | 'myLobbies') {
    if (from === 'myLobbies') setScreen({ name: 'myLobbies' });
    else setScreen({ name: 'feed' });
  }

  useEffect(() => {
    getSession().then((s) => {
      setSession(s);
      setReady(true);
    });
    return onAuthChange(setSession);
  }, []);

  // Onboarding stores preferences locally; it never changes Supabase database.
  useEffect(() => {
    if (!session) return;
    let active = true;
    getMySportsPreferences().then(({ data, error }) => {
      if (active && !error && !data?.onboarding_completed) setScreen({ name: 'preferences', from: 'feed' });
    });
    return () => { active = false; };
  }, [session?.user.id]);

  // log keluar: kembali ke Feed untuk sesi seterusnya
  useEffect(() => {
    if (!session) setScreen({ name: 'feed' });
  }, [session]);

  // butang back Android
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen.name === 'feed') return false;
      if (screen.name === 'settings') {
        setScreen({name:'profile'});
      } else if (screen.name === 'preferences') {
        setScreen(screen.from === 'feed' ? {name:'feed'} : {name:'profile'});
      } else if (screen.name === 'publicProfile') {
        setScreen({name:'detail', lobbyId:screen.lobbyId, from:screen.from});
      } else if (screen.name === 'detail') {
        backFromDetail(screen.from);
      } else if (screen.name === 'chat') {
        setScreen({ name: 'detail', lobbyId: screen.lobbyId, from: screen.from });
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
    case 'profile':
      return <ProfileScreen onBack={() => setScreen({ name: 'feed' })} onSettings={() => setScreen({name:'settings'})} onPreferences={() => setScreen({name:'preferences',from:'profile'})} />;
    case 'settings':
      return <SettingsScreen onBack={() => setScreen({name:'profile'})} />;
    case 'preferences':
      return <SportsPreferencesScreen onDone={() => setScreen(screen.from === 'feed' ? {name:'feed'} : {name:'profile'})} onBack={() => setScreen(screen.from === 'feed' ? {name:'feed'} : {name:'profile'})} />;
    case 'publicProfile':
      return <ProfileScreen userId={screen.userId} onBack={() => setScreen({name:'detail',lobbyId:screen.lobbyId,from:screen.from})} onSettings={() => setScreen({name:'settings'})} onPreferences={() => setScreen({name:'preferences',from:'profile'})}/>;
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
          onBack={() => backFromDetail(screen.from)}
          onOpenPlayer={(userId) => setScreen({ name: 'publicProfile', userId, lobbyId: screen.lobbyId, from: screen.from })}
          onOpenChat={(title) =>
            setScreen({ name: 'chat', lobbyId: screen.lobbyId, title, from: screen.from })
          }
        />
      );
    case 'chat':
      return (
        <LobbyChatScreen
          lobbyId={screen.lobbyId}
          title={screen.title}
          onBack={() => setScreen({ name: 'detail', lobbyId: screen.lobbyId, from: screen.from })}
        />
      );
    default:
      return (
        <FeedScreen
          onHost={() => setScreen({ name: 'host' })}
          onMyLobbies={() => setScreen({ name: 'myLobbies' })}
          onProfile={() => setScreen({ name: 'profile' })}
          onPreferences={() => setScreen({ name: 'preferences', from: 'feed' })}
          onOpenLobby={(id) => setScreen({ name: 'detail', lobbyId: id, from: 'feed' })}
        />
      );
  }
}

export default function App() {
  return <LanguageProvider><AppContent /></LanguageProvider>;
}
