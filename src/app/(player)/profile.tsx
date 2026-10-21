import { router } from 'expo-router';
import ProfileScreen from '../../../mobile/screens/ProfileScreen';
export default function Profile() {return <ProfileScreen onBack={()=>router.dismissTo('/(player)')} onSettings={()=>router.push('/(player)/settings')} onPreferences={()=>router.push('/(player)/preferences')} />;}
