import { router } from 'expo-router';
import ProfileScreen from '../../../mobile/screens/ProfileScreen';
export default function Profile() { return <ProfileScreen onBack={() => router.dismissTo('/(player)')} />; }
