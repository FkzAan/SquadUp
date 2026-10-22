import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { SPORT_PRESETS, sportIcon } from '../components/ui/SportVisual';
import { useLanguage } from '../context/LanguageContext';
import { getMySportsPreferences, saveSportsPreferences, type SportsPreferences } from '../services/sportsIdentityService';
import { palette } from '../theme';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
type Props = { onDone: () => void; onBack?: () => void };
export default function SportsPreferencesScreen({ onDone, onBack }: Props) {
  const { language } = useLanguage(); const ms = language === 'ms';
  const [sports,setSports] = useState<string[]>([]);
  const [style,setStyle] = useState<SportsPreferences['play_style']>('Friendly');
  const [days,setDays] = useState<string[]>([]);
  const [loaded,setLoaded] = useState(false);
  const [saving,setSaving] = useState(false);
  const [hasRecord,setHasRecord] = useState(false);
  const [error,setError] = useState<string|null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    getMySportsPreferences().then(({data,error}) => {
      if (!active) return;
      if (data) { setSports(data.favourite_sports);setStyle(data.play_style);setDays(data.preferred_days.filter(day => DAYS.includes(day)));setHasRecord(true); }
      setError(error);setLoaded(true);
    });
    return () => {active=false;};
  }, []));
  const toggle=(value:string,current:string[],set:(v:string[])=>void)=>set(current.includes(value)?current.filter(x=>x!==value):[...current,value]);
  // No selected specific days means explicit 'All Days'. Keep [] on disk/API for
  // compatibility with the already-deployed Gemini Edge Function (max 3 chars/day).
  function toggleDay(day: string) {
    if (day === 'All') { setDays([]); return; }
    setDays(current => current.includes(day) ? current.filter(d => d !== day) : [...current, day]);
  }
  async function save(skip=false) {
    if (!skip && sports.length===0) { Alert.alert(ms ? 'Pilih sukan' : 'Choose a sport',ms ? 'Pilih sekurang-kurangnya satu sukan.' : 'Choose at least one sport.');return; }
    setSaving(true);
    const err = await saveSportsPreferences({
      favourite_sports: skip ? [] : sports, play_style:style, preferred_days:days,
      max_distance_km:20, home_latitude:null,home_longitude:null,
      is_public:false,onboarding_completed:true,
    });
    setSaving(false);
    if (err) {Alert.alert(ms ? 'Tidak berjaya simpan' : 'Could not save',err); return;}
    onDone();
  }
  if(!loaded) return <View style={s.loading}><ActivityIndicator size="large" color={palette.blue}/></View>;
  return <View style={s.root}><ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
    <View style={s.top}><TouchableOpacity onPress={onBack ?? onDone} style={s.back}><Ionicons name="arrow-back" size={22} color={palette.navy}/></TouchableOpacity><Text style={s.topText}>{hasRecord ? (ms?'Ubah Minat Sukan':'Edit Sports Interests') : (ms?'Selamat datang!':'Welcome to SquadUp!')}</Text></View>
    <View style={s.hero}><View style={s.spark}><Ionicons name="sparkles" size={25} color="#FFFFFF"/></View><Text style={s.heading}>{ms ? 'Cari squad yang ngam dengan anda.' : 'Find your kind of squad.'}</Text><Text style={s.subtitle}>{ms ? 'Beritahu apa yang anda suka. Kami cadangkan game yang sesuai.' : 'Tell us how you play. We will match you with the right games.'}</Text></View>
    {error && <Text style={s.error}>{ms ? 'Gagal baca simpanan telefon: ' : 'Device storage unavailable: '}{error}</Text>}
    <View style={s.card}><Text style={s.sectionTitle}>01  {ms ? 'Sukan kegemaran' : 'Favourite sports'}</Text><Text style={s.help}>{ms ? 'Pilih satu atau lebih.' : 'Choose one or more.'}</Text><View style={s.sports}>{SPORT_PRESETS.map(name=><TouchableOpacity key={name} style={[s.sport,sports.includes(name)&&s.sportSelected]} onPress={()=>toggle(name,sports,setSports)}><Ionicons name={sportIcon(name)} size={17} color={sports.includes(name)?'#FFFFFF':palette.blue}/><Text style={[s.sportLabel,sports.includes(name)&&s.selectedLabel]}>{name}</Text>{sports.includes(name)&&<Ionicons name="checkmark-circle" size={14} color="#FFFFFF"/>}</TouchableOpacity>)}</View></View>
    <View style={s.card}><Text style={s.sectionTitle}>02  {ms?'Gaya permainan':'Play style'}</Text><View style={s.options}>{(['Friendly','Competitive','Both'] as const).map(v=><TouchableOpacity key={v} onPress={()=>setStyle(v)} style={[s.option,style===v&&s.optionActive]}><Text style={[s.optionText,style===v&&s.optionTextActive]}>{v}</Text></TouchableOpacity>)}</View></View>
    <View style={s.card}>
      <Text style={s.sectionTitle}>03  {ms?'Hari sesuai':'Preferred days'}</Text>
      <Text style={s.helpTop}>{ms?'Pilih semua hari atau hari yang anda biasanya lapang.':'Choose all days or the days you are usually free.'}</Text>
      <View style={s.options}>
        <TouchableOpacity accessibilityRole="button" accessibilityState={{selected:days.length===0}} onPress={()=>toggleDay('All')} style={[s.allDays,days.length===0&&s.optionActive]}>
          <Ionicons name="calendar-outline" size={16} color={days.length===0?'#FFFFFF':palette.blue}/>
          <Text style={[s.optionText,days.length===0&&s.optionTextActive]}>{ms?'Semua Hari':'All Days'}</Text>
          {days.length===0 && <Ionicons name="checkmark-circle" size={16} color="#FFFFFF"/>}
        </TouchableOpacity>
      </View>
      <View style={[s.options,{marginTop:10}]}>
        {DAYS.map(v=><TouchableOpacity key={v} accessibilityRole="button" accessibilityState={{selected:days.includes(v)}} onPress={()=>toggleDay(v)} style={[s.day,days.includes(v)&&s.optionActive]}><Text style={[s.optionText,days.includes(v)&&s.optionTextActive]}>{v}</Text></TouchableOpacity>)}
      </View>
    </View>
    <View style={s.card}><Text style={s.sectionTitle}>{ms?'Privasi & Simpanan':'Privacy & Storage'}</Text><View style={s.privacy}><Ionicons name="phone-portrait-outline" size={24} color={palette.blue}/><View style={{flex:1}}><Text style={s.optionText}>{ms?'Minat sukan disimpan di telefon ini sahaja':'Sports preferences stay on this device'}</Text><Text style={s.help}>{ms?'Tiada data baharu disimpan dalam database. Jika Gemini diaktifkan, sukan, gaya dan hari pilihan dihantar melalui Edge Function untuk cadangan AI. Pengguna lain hanya nampak nama dan avatar sedia ada.':'No new database data is saved. Your selected sports, play style and days are sent to Gemini via a secure Edge Function when AI matching is enabled. Other players see only your existing lobby name and avatar.'}</Text></View></View></View>
    <TouchableOpacity onPress={()=>save(false)} disabled={saving} style={s.save}><Text style={s.saveText}>{saving?'Saving...':(ms?'Simpan & Teruskan':'Save & Continue')}  <Ionicons name="arrow-forward" size={18} color="#FFFFFF"/></Text></TouchableOpacity>
    {!hasRecord && <TouchableOpacity onPress={()=>save(true)} disabled={saving} style={s.skip}><Text style={s.skipText}>{ms?'Langkau buat masa ini':'Skip for now'}</Text></TouchableOpacity>}
  </ScrollView></View>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'#F1F6FF'},loading:{flex:1,justifyContent:'center'},container:{paddingTop:55,paddingHorizontal:17,paddingBottom:55},top:{flexDirection:'row',alignItems:'center',gap:13,marginBottom:16},back:{backgroundColor:'#FFFFFF',width:42,height:42,borderRadius:15,alignItems:'center',justifyContent:'center'},topText:{fontSize:17,fontWeight:'900',color:palette.navy},hero:{backgroundColor:'#132C5D',borderRadius:25,padding:23,marginBottom:17},spark:{backgroundColor:'#326EEE',alignItems:'center',justifyContent:'center',width:51,height:51,borderRadius:17,marginBottom:15},heading:{color:'#FFFFFF',fontWeight:'900',fontSize:26,lineHeight:31},subtitle:{color:'#C8DAF9',fontSize:13,lineHeight:20,marginTop:9},card:{backgroundColor:'#FFFFFF',borderRadius:21,padding:17,marginBottom:14,borderColor:'#E0E9F8',borderWidth:1},sectionTitle:{fontWeight:'900',color:'#11284E',fontSize:16,marginBottom:9},help:{color:'#7788A1',fontSize:12,marginTop:8,lineHeight:18},sports:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12},sport:{flexDirection:'row',alignItems:'center',gap:6,borderRadius:12,backgroundColor:'#F2F6FF',borderWidth:1,borderColor:'#DFE9F8',paddingVertical:9,paddingHorizontal:11},sportSelected:{backgroundColor:'#2368DF',borderColor:'#2368DF'},sportLabel:{fontSize:12,color:'#25436F',fontWeight:'700'},selectedLabel:{color:'#FFFFFF'},options:{flexDirection:'row',gap:7,flexWrap:'wrap'},option:{borderRadius:12,paddingVertical:11,paddingHorizontal:13,backgroundColor:'#F2F6FF',borderWidth:1,borderColor:'#DDE6F5'},optionActive:{backgroundColor:'#2368DF',borderColor:'#2368DF'},optionText:{fontSize:12,fontWeight:'800',color:'#31527E'},optionTextActive:{color:'#FFFFFF'},day:{borderRadius:11,minWidth:42,alignItems:'center',paddingVertical:11,paddingHorizontal:11,backgroundColor:'#F2F6FF',borderWidth:1,borderColor:'#DDE6F5'},allDays:{flexDirection:'row',alignItems:'center',gap:9,borderRadius:13,paddingVertical:12,paddingHorizontal:15,backgroundColor:'#F2F6FF',borderWidth:1,borderColor:'#DDE6F5'},helpTop:{color:'#7788A1',fontSize:12,lineHeight:18,marginBottom:13},privacy:{flexDirection:'row',gap:10,alignItems:'center'},save:{backgroundColor:palette.blue,borderRadius:17,padding:17,alignItems:'center',marginTop:7},saveText:{color:'#FFFFFF',fontWeight:'900',fontSize:15},skip:{alignItems:'center',padding:15},skipText:{color:'#7788A1',fontWeight:'700'},error:{color:'#8C3B21',backgroundColor:'#FFEDD5',padding:12,borderRadius:12,marginBottom:12,fontSize:12}
});
