import { router } from 'expo-router';
import SettingsScreen from '../../../mobile/screens/SettingsScreen';
export default function Settings() {return <SettingsScreen onBack={() => router.back()} />;}
