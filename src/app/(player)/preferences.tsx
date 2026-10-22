import { router } from 'expo-router';
import SportsPreferencesScreen from '../../../mobile/screens/SportsPreferencesScreen';
export default function Preferences() {return <SportsPreferencesScreen onDone={() => router.replace('/(player)')} onBack={() => router.back()} />;}
