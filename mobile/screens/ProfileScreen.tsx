import { useCallback, useState } from 'react';
import { ActivityIndicator, ImageBackground, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';
import { useLanguage } from '../context/LanguageContext';
import { getCurrentUserId } from '../services/authService';
import { fetchSportsProfile, type SportsProfile } from '../services/sportsIdentityService';
import { ACHIEVEMENTS, achievementCount, activityStats } from '../utils/sportsAchievements';
import { sportIcon } from '../components/ui/SportVisual';
import { palette } from '../theme';

type Props = {
  onBack: () => void;
  onSettings?: () => void;
  onPreferences?: () => void;
  userId?: string;
};

export default function ProfileScreen({ onBack, onSettings, onPreferences, userId }: Props) {
  const { language } = useLanguage();
  const ms = language === 'ms';
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<SportsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMine, setIsMine] = useState(false);

  const load = useCallback(async (spinner = true) => {
    if (spinner) setLoading(true);
    const me = await getCurrentUserId();
    const target = userId ?? me;
    setIsMine(Boolean(me && target === me));
    if (!target) { setError('Sign in required'); setLoading(false); return; }
    const result = await fetchSportsProfile(target);
    setProfile(result.data);
    setError(result.error);
    setLoading(false); setRefreshing(false);
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const stats = activityStats(profile);
  const achievements = ACHIEVEMENTS.map(a => ({ ...a, progress: achievementCount(profile, a.id), unlocked: achievementCount(profile, a.id) >= a.threshold }));
  const unlocked = achievements.filter(a => a.unlocked).length;
  const rank = stats.level >= 10 ? 'Elite' : stats.level >= 5 ? 'Gold' : stats.level >= 3 ? 'Silver' : 'Rising';
  const title = ms ? 'Profil Sukan' : 'Sports Profile';
  const noData = !profile || Boolean(error);

  if (loading) return <View style={s.loader}><ActivityIndicator size="large" color={palette.blue}/></View>;
  return <View style={s.root}>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(false); }}/>} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 34 }} showsVerticalScrollIndicator={false}>
      <ImageBackground source={require('../assets/sports/badminton.jpg')} style={[s.hero, { paddingTop: Math.max(50, insets.top + 10) }]} imageStyle={s.heroImage}>
        <View style={s.heroOverlay}/>
        <View style={s.heroToolbar}>
          <TouchableOpacity onPress={onBack} style={s.circleBtn} accessibilityLabel="Back"><Ionicons name="arrow-back" size={21} color="#FFFFFF"/></TouchableOpacity>
          <Text style={s.heroHeading}>{title}</Text>
          {isMine && onSettings ? <TouchableOpacity onPress={onSettings} style={s.settingsBtn} accessibilityLabel="Settings"><Ionicons name="settings-outline" size={21} color={palette.blue}/></TouchableOpacity> : <View style={s.circleSpacer}/>}
        </View>
        <View style={s.identity}>
          <View style={s.avatarRing}><Avatar uri={profile?.avatar_url} name={profile?.name ?? 'Player'} size={92}/></View>
          <Text numberOfLines={1} style={s.displayName}>{profile?.name ?? (ms ? 'Pemain SquadUp' : 'SquadUp Player')}</Text>
          <Text style={s.tagline}>{ms ? 'Game hebat. Kawan terbaik.' : 'Good games. Better people.'}</Text>
          {!noData && !profile.private && <View style={s.heroPills}>
            <View style={s.heroPill}><Ionicons name="ribbon" color="#FFD66E" size={17}/><Text style={s.heroPillText}>{stats.joined >= 5 ? (ms ? 'Ahli Aktif' : 'Squad Regular') : (ms ? 'Pengembara Sukan' : 'Sports Explorer')}</Text></View>
            <View style={s.heroPill}><Ionicons name="flash" color="#C5A4FF" size={16}/><Text style={s.heroPillText}>Lv. {stats.level}</Text></View>
          </View>}
        </View>
        {!profile?.private && !noData && <View style={s.statsBar}>
          <View style={s.stat}><Ionicons name="people" color="#8AD5FF" size={19}/><Text style={s.statValue}>{profile.joined ?? 0}</Text><Text style={s.statLabel}>{ms ? 'Disertai' : 'Joined'}</Text></View>
          <View style={s.statsDivider}/>
          <View style={s.stat}><Ionicons name="checkmark-circle" color="#79F0C9" size={19}/><Text style={s.statValue}>{stats.hosted}</Text><Text style={s.statLabel}>{ms ? 'Dihost' : 'Hosted'}</Text></View>
          <View style={s.statsDivider}/>
          <View style={s.stat}><Ionicons name="stats-chart" color="#FFE28C" size={19}/><Text style={s.statValue}>{stats.sports}</Text><Text style={s.statLabel}>{ms ? 'Jenis Sukan' : 'Sport Types'}</Text></View>
        </View>}
      </ImageBackground>

      {isMine && !noData && <View style={s.localNotice}><Ionicons name="phone-portrait-outline" size={16} color="#365DA3"/><Text style={s.localNoticeText}>{ms ? 'Minat disimpan di telefon ini. Statistik Join/Host daripada rekod lobby sedia ada; bukan rekod kehadiran sebenar.' : 'Interests are stored on this device. Join/Host stats use existing lobby records, not verified attendance.'}</Text></View>}
      {error && <View style={s.warning}><Ionicons name="alert-circle-outline" color="#B45309" size={19}/><Text style={s.warningText}>{error}</Text></View>}
      {profile?.private && !isMine ? <View style={s.privatePanel}><Ionicons name="person-circle-outline" color={palette.blue} size={32}/><Text style={s.sectionTitle}>{ms ? 'Profil Pemain' : 'Player Profile'}</Text><Text style={s.muted}>{ms ? 'Nama dan avatar adalah maklumat yang sudah dipaparkan kepada ahli lobby. Minat, XP dan pencapaian pemain lain tidak dikongsi tanpa database privacy controls.' : 'Name and avatar are already shown to lobby members. Other players’ interests, XP and achievements are not shared without server-side privacy controls.'}</Text></View> : !noData && <>
        <View style={s.card}>
          <View style={s.rowBetween}><Text style={s.sectionTitle}>{ms ? 'Sukan Kegemaran' : 'Favourite Sports'}</Text>{isMine && onPreferences && <TouchableOpacity onPress={onPreferences} accessibilityRole="button"><Text style={s.action}>{ms ? 'Ubah' : 'Edit'}  <Ionicons name="create-outline" size={14} color={palette.blue}/></Text></TouchableOpacity>}</View>
          {(profile?.favourite_sports ?? []).length > 0 ? <View style={s.sportWrap}>{profile!.favourite_sports!.map((sport,i) => <View key={`${sport}-${i}`} style={[s.sportChip, { backgroundColor: sportColors[i%4].light, borderColor: sportColors[i%4].border }]}><Ionicons name={sportIcon(sport)} size={19} color={sportColors[i%4].dark}/><Text style={[s.sportText, { color: sportColors[i%4].dark }]}>{sport}</Text></View>)}</View> : <Text style={s.muted}>{ms ? 'Belum pilih sukan. Tambah melalui Edit.' : 'No favourite sports yet. Tap Edit to add some.'}</Text>}
        </View>
        <View style={s.card}>
          <Text style={s.sectionTitle}>{ms ? 'Gaya Permainan' : 'Play Style'}</Text>
          <View style={s.playStyle}><View style={s.styleTile}><Ionicons name="game-controller" size={21} color="#7255DA"/><Text style={s.styleTitle}>{profile?.play_style ?? 'Friendly'}</Text><Text style={s.styleDesc}>{ms ? 'Pilihan anda' : 'Preferred style'}</Text></View><View style={s.styleTile}><Ionicons name="football" size={21} color="#287AF0"/><Text style={s.styleTitle}>{stats.sports}</Text><Text style={s.styleDesc}>{ms ? 'Jenis sukan disertai' : 'Sports joined'}</Text></View><View style={s.styleTile}><Ionicons name="trophy" size={21} color="#DF9B20"/><Text style={s.styleTitle}>{stats.hosted}</Text><Text style={s.styleDesc}>{ms ? 'Squad dihost' : 'Squads hosted'}</Text></View></View>
        </View>
        <View style={[s.rankCard, { backgroundColor: '#342718' }]}>
          <View style={s.rankIcon}><Ionicons name="shield" size={42} color="#FFCF5B"/><Ionicons name="star" size={16} color="#FFFFFF" style={s.rankStar}/></View>
          <View style={s.rankBody}><Text style={s.rankOverline}>{ms ? 'Level Penyertaan' : 'Participation Level'}</Text><Text style={s.rankName}>{rank} Player</Text><View style={s.progressTrack}><View style={[s.progressFill, { width: `${Math.round(stats.levelProgress / 500 * 100)}%` as `${number}%` }]}/></View><Text style={s.rankXP}>{stats.levelProgress} / 500 XP · {stats.xp} XP total</Text></View>
        </View>
        <View style={s.sectionStandalone}>
          <View style={s.rowBetween}><Text style={s.sectionTitle}>{ms ? 'Pencapaian' : 'Achievements'}</Text><Text style={s.action}>{unlocked}/{achievements.length} unlocked</Text></View>
          <View style={s.badgeGrid}>{achievements.map(a => <View key={a.id} style={s.badgeItem}>
            <View style={[s.badgeOuter, { backgroundColor: a.unlocked ? a.pale : '#E9EDF4', borderColor: a.unlocked ? a.tone : '#BCC7D6' }]}>
              <View style={[s.badgeInner, { backgroundColor: a.unlocked ? a.tone : '#A4AEC1' }]}><Ionicons name={a.icon} color="#FFFFFF" size={27}/></View>
              {a.unlocked && <View style={s.badgeShine}><Ionicons name="checkmark" color="#FFFFFF" size={11}/></View>}
            </View><Text style={s.badgeName} numberOfLines={2}>{ms ? a.ms : a.name}</Text><Text style={s.badgeDesc} numberOfLines={2}>{ms ? a.descMs : a.description}</Text><Text style={s.badgeProgress}>{Math.min(a.progress,a.threshold)}/{a.threshold}</Text>
          </View>)}</View>
        </View>
        <View style={s.card}>
          <View style={s.rowBetween}><Text style={s.sectionTitle}>{ms ? 'Aktiviti Terkini' : 'Recent Activity'}</Text><Ionicons name="time-outline" color={palette.blue} size={19}/></View>
          {(profile?.recent ?? []).length ? profile!.recent!.map(a => <View key={a.id} style={s.activityRow}><View style={s.activityIcon}><Ionicons name={sportIcon(a.activity_type)} size={20} color={palette.blue}/></View><View style={{ flex: 1 }}><Text style={s.activityName} numberOfLines={1}>{a.activity_type}</Text><Text style={s.activityMeta} numberOfLines={1}>{a.location_name}</Text><Text style={s.activityMeta}>{new Date(a.starts_at).toLocaleDateString()}</Text></View><View style={[s.activityStatus, { backgroundColor: a.status === 'hosted' ? '#DCF8ED' : '#F2F4F8' }]}><Text style={{ color: a.status === 'hosted' ? '#078455' : '#53647A', fontWeight: '700', fontSize: 10 }}>{a.status === 'hosted' ? (ms ? 'Host' : 'Hosted') : (ms ? 'Disertai' : 'Joined')}</Text></View></View>) : <Text style={s.muted}>{ms ? 'Belum ada squad yang disertai.' : 'No joined squads yet.'}</Text>}
        </View>
      </>}
    </ScrollView>
  </View>;
}
const sportColors = [{light:'#E7F2FF',border:'#BDD7FF',dark:'#155BBB'},{light:'#FFF1DB',border:'#F7CE8A',dark:'#9E5A0B'},{light:'#DDF9EC',border:'#A6E8C9',dark:'#08764E'},{light:'#EEE6FF',border:'#CFB4FF',dark:'#6135B5'}];
const s = StyleSheet.create({
  localNotice:{flexDirection:'row',alignItems:'center',gap:9,marginHorizontal:15,marginTop:13,padding:12,borderRadius:13,backgroundColor:'#E9F1FF'},localNoticeText:{flex:1,fontSize:11,lineHeight:17,color:'#365DA3'},
  root:{flex:1,backgroundColor:'#F2F6FE'},loader:{flex:1,justifyContent:'center',backgroundColor:'#F2F6FE'},
  hero:{paddingHorizontal:18,paddingBottom:18,minHeight:355,justifyContent:'flex-start'},heroImage:{resizeMode:'cover'},heroOverlay:{...StyleSheet.absoluteFill,backgroundColor:'rgba(9,24,53,0.77)'},
  heroToolbar:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:15},circleBtn:{backgroundColor:'rgba(3,14,33,0.53)',width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center'},settingsBtn:{backgroundColor:'#FFFFFF',width:44,height:44,borderRadius:22,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E8F0FF',shadowColor:'#000',shadowOpacity:0.12,shadowRadius:6,elevation:3},circleSpacer:{width:44},heroHeading:{fontSize:22,fontWeight:'900',color:'#FFFFFF'},
  identity:{alignItems:'center',gap:7,marginBottom:17},avatarRing:{padding:4,borderWidth:2,borderColor:'#D3E4FF',borderRadius:60,backgroundColor:'rgba(255,255,255,0.12)'},displayName:{color:'#FFFFFF',fontSize:25,fontWeight:'900',maxWidth:'90%'},tagline:{color:'#CCDDF8',fontSize:12},heroPills:{flexDirection:'row',gap:8,marginTop:4},heroPill:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:'rgba(66,89,160,0.55)',paddingHorizontal:12,paddingVertical:7,borderRadius:20},heroPillText:{color:'#FFFFFF',fontWeight:'700',fontSize:11},
  statsBar:{backgroundColor:'rgba(219,235,255,0.14)',borderColor:'rgba(230,244,255,0.28)',borderWidth:1,borderRadius:20,paddingVertical:14,flexDirection:'row',alignItems:'center',justifyContent:'space-around'},stat:{alignItems:'center',gap:4,flex:1},statValue:{color:'#FFFFFF',fontSize:20,fontWeight:'900'},statLabel:{color:'#D7E5F9',fontSize:11},statsDivider:{height:50,width:1,backgroundColor:'rgba(225,237,255,0.25)'},
  card:{backgroundColor:'#FFFFFF',borderRadius:22,padding:18,marginHorizontal:15,marginTop:15,borderWidth:1,borderColor:'#E5ECF8',shadowColor:'#1C3567',shadowOpacity:0.05,shadowRadius:12,elevation:2},rowBetween:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10,marginBottom:13},sectionTitle:{fontSize:17,fontWeight:'900',color:'#102448',flexShrink:1},action:{color:palette.blue,fontWeight:'800',fontSize:12},sportWrap:{flexDirection:'row',flexWrap:'wrap',gap:9},sportChip:{flexDirection:'row',alignItems:'center',gap:8,paddingHorizontal:12,paddingVertical:11,borderRadius:13,borderWidth:1},sportText:{fontSize:12,fontWeight:'800'},muted:{color:'#7888A0',fontSize:13,lineHeight:20},
  playStyle:{flexDirection:'row',gap:9,marginTop:12},styleTile:{flex:1,minWidth:0,minHeight:114,backgroundColor:'#F1F5FF',paddingVertical:15,paddingHorizontal:8,alignItems:'center',justifyContent:'center',borderRadius:16,gap:6,borderWidth:1,borderColor:'#E6EDFB'},styleTitle:{color:'#15274B',fontWeight:'900',fontSize:12,textAlign:'center',lineHeight:17},styleDesc:{color:'#7083A0',fontSize:10,textAlign:'center',lineHeight:14},
  rankCard:{marginHorizontal:15,marginTop:16,borderRadius:23,padding:18,flexDirection:'row',alignItems:'center',gap:15,borderWidth:1,borderColor:'#D8A743',shadowColor:'#986D21',shadowOpacity:0.18,shadowRadius:11,elevation:4},rankIcon:{width:65,height:65,backgroundColor:'#604923',borderRadius:20,justifyContent:'center',alignItems:'center'},rankStar:{position:'absolute',top:26},rankBody:{flex:1},rankOverline:{color:'#F3E0BD',fontSize:11},rankName:{fontSize:21,fontWeight:'900',color:'#FFE083',marginBottom:9},progressTrack:{height:9,backgroundColor:'#77654A',borderRadius:10,overflow:'hidden'},progressFill:{height:'100%',backgroundColor:'#FFD85C',borderRadius:10},rankXP:{fontSize:10,color:'#F8E8CE',marginTop:6},
  sectionStandalone:{marginHorizontal:16,marginTop:20},badgeGrid:{flexDirection:'row',justifyContent:'space-between',marginTop:10},badgeItem:{width:'24%',alignItems:'center',gap:5},badgeOuter:{height:66,width:66,borderWidth:2,borderRadius:20,alignItems:'center',justifyContent:'center',transform:[{rotate:'-5deg'}]},badgeInner:{height:49,width:49,borderRadius:14,alignItems:'center',justifyContent:'center',shadowColor:'#0F172A',shadowOpacity:0.25,shadowRadius:5,elevation:4},badgeShine:{position:'absolute',top:-5,right:-5,backgroundColor:'#16A34A',borderRadius:12,width:20,height:20,justifyContent:'center',alignItems:'center'},badgeName:{fontWeight:'900',color:'#253A5B',fontSize:10,textAlign:'center',minHeight:27},badgeDesc:{fontSize:9,color:'#7E90AA',textAlign:'center',minHeight:26},badgeProgress:{fontSize:10,color:'#52719C',fontWeight:'800'},
  activityRow:{flexDirection:'row',alignItems:'center',gap:10,paddingVertical:11,borderTopWidth:1,borderTopColor:'#EDF1F7'},activityIcon:{height:50,width:50,borderRadius:14,backgroundColor:'#E9F2FF',alignItems:'center',justifyContent:'center'},activityName:{fontWeight:'900',color:'#1A3052'},activityMeta:{fontSize:11,color:'#71819A',marginTop:2},activityStatus:{paddingHorizontal:9,paddingVertical:7,borderRadius:10},warning:{flexDirection:'row',gap:10,margin:16,padding:15,backgroundColor:'#FEF3C7',borderRadius:15},warningText:{flex:1,color:'#92400E',fontSize:12},privatePanel:{backgroundColor:'#FFFFFF',padding:36,margin:16,borderRadius:22,alignItems:'center',gap:14},
});
