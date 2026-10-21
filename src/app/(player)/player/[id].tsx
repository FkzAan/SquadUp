import { router, useLocalSearchParams } from 'expo-router';
import ProfileScreen from '../../../../mobile/screens/ProfileScreen';
export default function PublicSportsProfile(){const {id}=useLocalSearchParams<{id:string}>();return <ProfileScreen userId={id} onBack={()=>router.back()} onSettings={()=>router.push('/(player)/settings')} onPreferences={()=>router.push('/(player)/preferences')} />;}
