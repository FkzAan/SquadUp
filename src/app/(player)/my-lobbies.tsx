import { router } from 'expo-router';
import MyLobbiesScreen from '../../../mobile/screens/MyLobbiesScreen';
export default function MyLobbies() {
  return <MyLobbiesScreen onBack={() => router.dismissTo('/(player)')}
    onOpen={id => router.push({ pathname: '/(player)/lobby/[id]', params: { id, from: 'my-lobbies' } })} />;
}
