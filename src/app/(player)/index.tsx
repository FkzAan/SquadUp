import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { getMySportsPreferences } from '../../../mobile/services/sportsIdentityService';
import { router } from 'expo-router';
import FeedScreen from '../../../mobile/screens/FeedScreen';
export default function Feed() {
  const opened = useRef(false);
  useFocusEffect(useCallback(() => {
    let mounted=true;
    getMySportsPreferences().then(({data,error})=>{
      if(!mounted || opened.current || error || data?.onboarding_completed) return;
      opened.current=true;
      router.push('/(player)/preferences');
    });
    return ()=>{ mounted=false; };
  }, []));
  return <FeedScreen onHost={() => router.push('/(player)/host')} onMyLobbies={() => router.push('/(player)/my-lobbies')}
    onProfile={() => router.push('/(player)/profile')} onOpenLobby={id => router.push({ pathname: '/(player)/lobby/[id]', params: { id } })} />;
}
