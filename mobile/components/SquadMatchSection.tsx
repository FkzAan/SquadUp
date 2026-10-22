import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SportVisual from './ui/SportVisual';
import type { Lobby } from '../types';
import type { SportsPreferences } from '../services/sportsIdentityService';
import { getRecommendedLobbies, type Match } from '../services/squadMatchService';
import { useLanguage } from '../context/LanguageContext';
import { formatSchedule } from '../utils/lobby';
import { palette } from '../theme';

type Props = {
  lobbies: Lobby[];
  preferences: SportsPreferences | null;
  joinedIds: Set<string>;
  onOpenLobby: (id: string) => void;
  onEdit: () => void;
};

/** A distinct, swipeable AI discovery area. Existing lobby Join happens in Lobby Details. */
export default function SquadMatchSection({ lobbies, preferences, joinedIds, onOpenLobby, onEdit }: Props) {
  const { language } = useLanguage();
  const ms = language === 'ms';
  const { width } = useWindowDimensions();
  const [matches, setMatches] = useState<Match[]>([]);
  const [source, setSource] = useState<'gemini' | 'preferences'>('preferences');
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // The vertical feed has 16px side padding, while this section has 16px inner padding.
  const cardWidth = Math.max(220, Math.min(width - 96, 325));
  const snapInterval = cardWidth + 12;

  useEffect(() => {
    if (!preferences || !preferences.favourite_sports.length) {
      setMatches([]);
      setActiveIndex(0);
      return;
    }
    let live = true;
    setLoading(true);
    getRecommendedLobbies(lobbies, preferences, language)
      .then(result => {
        if (!live) return;
        setMatches(result.matches);
        setSource(result.source);
        setActiveIndex(0);
      })
      .catch(() => {
        if (!live) return;
        setMatches([]);
        setSource('preferences');
      })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [lobbies, preferences, language]);

  if (!preferences || !preferences.favourite_sports.length) {
    return (
      <TouchableOpacity onPress={onEdit} style={s.intro} accessibilityRole="button">
        <View style={s.spark}><Ionicons name="sparkles" size={22} color="#FFFFFF"/></View>
        <View style={{ flex: 1 }}>
          <Text style={s.introTitle}>{ms ? 'Cari squad pilihan anda' : 'Find your kind of squad'}</Text>
          <Text style={s.introDesc}>{ms ? 'Pilih sukan untuk dapat cadangan AI khusus untuk anda.' : 'Choose your sports to get personalised AI picks.'}</Text>
        </View>
        <Ionicons name="chevron-forward" color="#FFFFFF" size={20}/>
      </TouchableOpacity>
    );
  }

  return (
    <View style={s.panel}>
      <View style={s.panelHeader}>
        <View style={s.spark}><Ionicons name="sparkles" color="#FFFFFF" size={22}/></View>
        <View style={{ flex: 1 }}>
          <Text style={s.panelEyebrow}>SQUADMATCH</Text>
          <Text style={s.panelHeading}>{ms ? 'Pilihan untuk anda' : 'Picked For You'}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} style={s.editBtn} accessibilityLabel={ms ? 'Ubah minat sukan' : 'Edit sports preferences'}>
          <Ionicons name="options-outline" color="#FFFFFF" size={20}/>
        </TouchableOpacity>
      </View>
      <View style={s.sourceRow}>
        <View style={s.aiLabel}>
          <Ionicons name={source === 'gemini' ? 'flash' : 'heart-outline'} size={12} color="#CDE5FF"/>
          <Text style={s.aiLabelText}>{source === 'gemini' ? 'Gemini AI' : (ms ? 'Padanan berdasarkan minat' : 'Preference matching · fallback')}</Text>
        </View>
        <Text style={s.swipeHint}>{ms ? 'Leret untuk lihat lagi' : 'Swipe to explore'} <Ionicons name="arrow-forward" size={12} color="#CDE5FF"/></Text>
      </View>

      {loading && <View style={s.message}><ActivityIndicator size="small" color="#FFFFFF"/><Text style={s.messageText}>{ms ? 'Mencari squad yang sesuai...' : 'Finding your squads...'}</Text></View>}
      {!loading && matches.length === 0 && <View style={s.message}><Ionicons name="search-outline" size={24} color="#BDD5FF"/><Text style={s.messageText}>{ms ? 'Belum ada squad terbuka yang sesuai buat masa ini.' : 'No matching open squads right now.'}</Text></View>}
      {!loading && matches.length > 0 && <>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          directionalLockEnabled
          decelerationRate="fast"
          snapToInterval={snapInterval}
          snapToAlignment="start"
          onMomentumScrollEnd={event => setActiveIndex(Math.min(matches.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / snapInterval))))}
          contentContainerStyle={s.carouselContent}
          accessibilityLabel={ms ? 'Cadangan squad, leret secara mendatar' : 'Squad recommendations, swipe horizontally'}
        >
          {matches.map((match, index) => {
            const joined = joinedIds.has(match.lobby.id);
            return (
              <TouchableOpacity
                key={match.lobby.id}
                style={[s.matchCard, { width: cardWidth }]}
                onPress={() => onOpenLobby(match.lobby.id)}
                activeOpacity={0.88}
                accessibilityRole="button"
                accessibilityLabel={`${match.lobby.activity_type}, ${joined ? (ms ? 'Lihat squad' : 'View squad') : (ms ? 'Lihat dan sertai' : 'View and join')}`}
              >
                <View style={s.photoArea}>
                  <SportVisual activity={match.lobby.activity_type} style={s.photo}/>
                  <View style={s.cardNumber}><Ionicons name="sparkles" size={12} color="#FFFFFF"/><Text style={s.cardNumberText}>{ms ? 'Cadangan' : 'Pick'} {index + 1}</Text></View>
                </View>
                <View style={s.cardInfo}>
                  <Text numberOfLines={1} style={s.cardTitle}>{match.lobby.activity_type} · {match.lobby.skill_level}</Text>
                  <Text numberOfLines={1} style={s.cardMeta}><Ionicons name="location-outline" size={13} color={palette.blue}/> {match.lobby.location_name}</Text>
                  <Text numberOfLines={1} style={s.cardMeta}><Ionicons name="calendar-outline" size={13} color={palette.blue}/> {formatSchedule(match.lobby.starts_at, match.lobby.ends_at, language)}</Text>
                  <View style={s.reasonBox}>
                    <Ionicons name="sparkles" size={14} color="#168360"/>
                    <Text numberOfLines={2} style={s.reason}>{match.reasons.slice(0, 2).join(' · ') || (ms ? 'Squad terbuka yang sesuai' : 'Available squad for you')}</Text>
                  </View>
                  <View style={s.cta}><Text style={s.ctaText}>{joined ? (ms ? 'Lihat Squad' : 'View Squad') : (ms ? 'Lihat & Sertai' : 'View & Join')}</Text><Ionicons name="arrow-forward" color="#FFFFFF" size={17}/></View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={s.footer}>
          <View style={s.dots}>{matches.map((match, i) => <View key={match.lobby.id} style={[s.dot, i === activeIndex && s.dotActive]}/>)}</View>
          <Text style={s.pageCount}>{activeIndex + 1} / {matches.length}</Text>
        </View>
      </>}
    </View>
  );
}

const s = StyleSheet.create({
  intro: { backgroundColor: '#122F68', borderRadius: 22, padding: 17, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 9, marginBottom: 7 },
  introTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  introDesc: { color: '#C9DBFF', fontSize: 12, lineHeight: 17, marginTop: 4 },
  spark: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#347CF6', alignItems: 'center', justifyContent: 'center' },
  panel: { backgroundColor: '#132E61', borderRadius: 25, marginTop: 10, paddingTop: 17, paddingBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#264B85' },
  panelHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 11 },
  panelEyebrow: { fontSize: 10, fontWeight: '900', color: '#9CC6FF', letterSpacing: 1.5, marginBottom: 3 },
  panelHeading: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', letterSpacing: -0.3 },
  editBtn: { width: 39, height: 39, borderRadius: 13, borderWidth: 1, borderColor: '#4A6699', backgroundColor: '#274577', alignItems: 'center', justifyContent: 'center' },
  sourceRow: { marginTop: 13, marginBottom: 13, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  aiLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  aiLabelText: { fontSize: 10, fontWeight: '700', color: '#D2E2FB', flexShrink: 1 },
  swipeHint: { color: '#A8C6EF', fontSize: 10 },
  message: { paddingHorizontal: 20, paddingVertical: 22, alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 80 },
  messageText: { color: '#D1E4FF', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  carouselContent: { paddingHorizontal: 16, gap: 12, paddingBottom: 5 },
  matchCard: { backgroundColor: '#FFFFFF', borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: '#D9E7FA' },
  photoArea: { height: 96, position: 'relative', backgroundColor: '#D7E8FF' },
  photo: { width: '100%', height: '100%' },
  cardNumber: { position: 'absolute', top: 10, left: 11, backgroundColor: '#2265D8', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardNumberText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11 },
  cardInfo: { padding: 13 },
  cardTitle: { color: '#173052', fontSize: 15, fontWeight: '900', marginBottom: 5 },
  cardMeta: { color: '#627B99', fontSize: 11, lineHeight: 18, marginTop: 2 },
  reasonBox: { backgroundColor: '#EAF8F1', borderRadius: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingVertical: 9, paddingHorizontal: 10, marginTop: 9, minHeight: 48 },
  reason: { color: '#166647', fontSize: 10, fontWeight: '700', flex: 1, lineHeight: 15 },
  cta: { backgroundColor: '#2169E6', marginTop: 10, paddingVertical: 11, paddingHorizontal: 13, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  ctaText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 12, paddingHorizontal: 16 },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 4, backgroundColor: '#5C79A9' },
  dotActive: { width: 21, backgroundColor: '#D0E5FF' },
  pageCount: { color: '#CBDCFA', fontSize: 10, fontWeight: '700' },
});
