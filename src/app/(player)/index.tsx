import { router } from 'expo-router';
import FeedScreen from '../../../mobile/screens/FeedScreen';
export default function Feed() {
  return <FeedScreen onHost={() => router.push('/(player)/host')} onMyLobbies={() => router.push('/(player)/my-lobbies')}
    onProfile={() => router.push('/(player)/profile')} onOpenLobby={id => router.push({ pathname: '/(player)/lobby/[id]', params: { id } })} />;
}
