import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Avatar from './Avatar';
import { useLanguage } from '../context/LanguageContext';
import { fetchSquadAttendance, setSquadAttendance, type AttendanceStatus } from '../services/sportsIdentityService';
import type { Lobby, LobbyMember } from '../types';
import { palette } from '../theme';

export default function SquadAttendanceCard({ lobby, members, isHost, myId }: {
  lobby: Lobby; members: LobbyMember[]; isHost: boolean; myId: string | null;
}) {
  const {language}=useLanguage(); const ms=language==='ms';
  const [statuses,setStatuses]=useState<Record<string,AttendanceStatus>>({});
  const [busyId,setBusyId]=useState<string|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const available=Date.now()>=new Date(lobby.starts_at).getTime() && Date.now()<=new Date(lobby.ends_at).getTime()+14*86400000 && lobby.status!=='cancelled';
  const load=useCallback(async()=>{ const rows=await fetchSquadAttendance(lobby.id);setStatuses(rows);setLoaded(true);},[lobby.id]);
  useEffect(()=>{void load();},[load]);
  async function mark(id:string,attended:boolean) {
    setBusyId(id);
    const err=await setSquadAttendance(lobby.id,id,attended);
    setBusyId(null);
    if(err) { setError(err);Alert.alert(ms?'Tidak berjaya':'Could not update',err);return; }
    setError(null);
    setStatuses(old=>({...old,[id]:attended?'attended':'absent'}));
  }
  // Notes are local to the host's phone. Never display them as shared verified attendance.
  if (!isHost) return null;
  if(!available && isHost) return <View style={s.card}><Text style={s.title}><Ionicons name="clipboard-outline" color={palette.blue} size={19}/> {ms?'Nota Kehadiran Host':'Host Attendance Notes'}</Text><Text style={s.hint}>{ms?'Nota kehadiran lokal akan tersedia apabila sesi bermula.':'Local attendance notes become available when the game starts.'}</Text></View>;
  if(!available && !isHost) return null;
  return <View style={s.card}>
    <View style={s.top}><Text style={s.title}><Ionicons name="checkmark-done-outline" color={palette.blue} size={19}/> {ms?'Nota Kehadiran Host':'Host Attendance Notes'}</Text><TouchableOpacity onPress={load}><Ionicons name="refresh" color={palette.blue} size={19}/></TouchableOpacity></View>
    <Text style={s.hint}>{isHost ? (ms?'Disimpan di telefon ini sahaja. Tidak sync dengan Supabase atau telefon pemain lain. Ini bukan pengesahan rasmi.':'Saved on this phone only. Not synced to Supabase or other players. Not an official verification record.') : (ms?'Hanya host boleh mengesahkan kehadiran.':'Only the host can verify attendance.')}</Text>
    {!loaded&&<ActivityIndicator color={palette.blue}/>}
    {error&&<Text style={s.error}>{error}</Text>}
    {members.map(m=><View key={m.user_id} style={s.member}>
      <Avatar uri={m.avatar_url} name={m.name} size={36}/>
      <View style={{flex:1}}><Text style={s.name} numberOfLines={1}>{m.name}{m.is_host?' · Host':''}</Text><Text style={s.status}>{statuses[m.user_id]==='attended'?(ms?'✓ Hadir':'✓ Attended'):statuses[m.user_id]==='absent'?(ms?'Tidak hadir':'Absent'):(ms?'Belum disahkan':'Unverified')}</Text></View>
      <View style={s.actions}>
        <TouchableOpacity disabled={!!busyId} onPress={()=>mark(m.user_id,true)} style={[s.action,statuses[m.user_id]==='attended'&&s.present]} accessibilityLabel={`Mark ${m.name} attended`}>
          {busyId===m.user_id?<ActivityIndicator size="small" color={palette.green}/>:<Ionicons name="checkmark" size={17} color={statuses[m.user_id]==='attended'?'#FFFFFF':palette.green}/>}</TouchableOpacity>
        <TouchableOpacity disabled={!!busyId} onPress={()=>Alert.alert(ms?'Tandakan tidak hadir?':'Mark absent?',ms?`Sahkan ${m.name} tidak hadir?`:`Confirm ${m.name} did not attend?`,[{text:ms?'Batal':'Cancel',style:'cancel'},{text:ms?'Sahkan':'Confirm',onPress:()=>mark(m.user_id,false)}])} style={[s.action,statuses[m.user_id]==='absent'&&s.absent]} accessibilityLabel={`Mark ${m.name} absent`}><Ionicons name="close" size={17} color={statuses[m.user_id]==='absent'?'#FFFFFF':'#D64C55'}/></TouchableOpacity>
      </View>
    </View>)}
    {members.length===0 && <Text style={s.hint}>{ms?'Tiada peserta untuk disahkan.':'No players to mark.'}</Text>}
  </View>;
}
const s=StyleSheet.create({
  card:{backgroundColor:'#FFFFFF',marginHorizontal:16,marginBottom:15,padding:16,borderRadius:20,borderWidth:1,borderColor:'#E0EAF8'},top:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},title:{fontSize:16,fontWeight:'900',color:palette.navy},hint:{color:'#71829A',fontSize:12,marginTop:8,marginBottom:8,lineHeight:18},member:{borderTopWidth:1,borderTopColor:'#EDF1F8',flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10},name:{fontSize:13,fontWeight:'900',color:palette.navy},status:{fontSize:11,color:'#72829B',marginTop:3},actions:{flexDirection:'row',gap:8},action:{width:34,height:34,borderRadius:11,borderWidth:1,borderColor:'#D8E5F4',backgroundColor:'#F3F7FC',alignItems:'center',justifyContent:'center'},present:{backgroundColor:palette.green,borderColor:palette.green},absent:{backgroundColor:'#DB535E',borderColor:'#DB535E'},error:{color:'#B45433',fontSize:12,marginVertical:8}
});
