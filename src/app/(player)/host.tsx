import { router } from 'expo-router';
import HostLobbyScreen from '../../../mobile/screens/HostLobbyScreen';
export default function Host() { return <HostLobbyScreen onDone={() => router.dismissTo('/(player)')} />; }
