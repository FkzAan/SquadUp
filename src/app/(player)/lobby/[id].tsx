import { router, useLocalSearchParams } from 'expo-router';
import LobbyDetailScreen from '../../../../mobile/screens/LobbyDetailScreen';
import AccessState from '../../../../mobile/components/AccessState';

export default function LobbyDetail() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  if (!id || Array.isArray(id)) {
    return <AccessState title="Squad tidak ditemui" error="ID squad tidak sah." retry={() => router.replace('/(player)')} />;
  }
  const fromPage = from === 'my-lobbies' ? 'my-lobbies' : 'feed';
  return (
    <LobbyDetailScreen
      lobbyId={id}
      onBack={() => router.dismissTo(fromPage === 'my-lobbies' ? '/(player)/my-lobbies' : '/(player)')}
      onOpenChat={title => router.push({
        pathname: '/(player)/chat/[id]',
        params: { id, title, from: fromPage }
      })}
    />
  );
}
