import { router, useLocalSearchParams } from 'expo-router';
import LobbyChatScreen from '../../../../mobile/screens/LobbyChatScreen';
import AccessState from '../../../../mobile/components/AccessState';

export default function LobbyChat() {
  const { id, title, from } = useLocalSearchParams<{ id: string; title?: string; from?: string }>();
  if (!id || Array.isArray(id)) {
    return <AccessState title="Squad tidak ditemui" error="ID squad tidak sah." retry={() => router.replace('/(player)')} />;
  }
  const fromPage = from === 'my-lobbies' ? 'my-lobbies' : 'feed';
  return (
    <LobbyChatScreen
      lobbyId={id}
      title={typeof title === 'string' ? title : 'Chat Squad'}
      onBack={() => router.dismissTo({
        pathname: '/(player)/lobby/[id]',
        params: { id, from: fromPage }
      })}
    />
  );
}
