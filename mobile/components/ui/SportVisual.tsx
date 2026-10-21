import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, type ImageStyle, type ImageSourcePropType, type StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme';

/** Display-only sport presets. The activity field remains a free-text string. */
export const SPORT_PRESETS = [
  'Running', 'Jogging', 'Walking', 'Badminton', 'Futsal', 'Football', 'Basketball',
  'Pickleball', 'Tennis', 'Table Tennis', 'Squash', 'Volleyball', 'Netball',
  'Sepak Takraw', 'Cycling', 'Hiking', 'Swimming', 'Gym / Workout', 'Yoga',
  'Pilates', 'Zumba', 'Dance', 'Chess', 'Bowling', 'Golf', 'Cricket', 'Rugby',
  'Dodgeball', 'Handball', 'Frisbee', 'Archery', 'Boxing', 'Muay Thai', 'Silat',
  'Taekwondo', 'Karate', 'Skateboarding', 'Roller Skating', 'Billiards / Pool',
  'Darts', 'Fishing', 'Rowing / Kayaking', 'Water Polo', 'E-Sports',
] as const;

export type SportKind =
  | 'running' | 'walking' | 'badminton' | 'futsal' | 'football' | 'basketball'
  | 'pickleball' | 'tennis' | 'table-tennis' | 'squash' | 'volleyball' | 'netball'
  | 'takraw' | 'cycling' | 'hiking' | 'swimming' | 'workout' | 'yoga' | 'pilates'
  | 'zumba' | 'dance' | 'chess' | 'bowling' | 'golf' | 'cricket' | 'rugby'
  | 'dodgeball' | 'handball' | 'frisbee' | 'archery' | 'boxing' | 'muaythai'
  | 'silat' | 'taekwondo' | 'karate' | 'skateboarding' | 'skating' | 'billiards'
  | 'darts' | 'fishing' | 'rowing' | 'water-polo' | 'esports' | 'other';

const rules: { kind: SportKind; test: RegExp }[] = [
  { kind: 'table-tennis', test: /table\s*tennis|ping\s*pong|pingpong|tenis\s*meja/i },
  { kind: 'pickleball', test: /pickle\s*ball/i },
  { kind: 'takraw', test: /sepak\s*takraw|takraw/i },
  { kind: 'futsal', test: /futsal/i },
  { kind: 'netball', test: /netball|bola\s*jaring/i },
  { kind: 'volleyball', test: /volley|bola\s*tampar/i },
  { kind: 'water-polo', test: /water\s*polo|polo\s*air/i },
  { kind: 'dodgeball', test: /dodge\s*ball/i },
  { kind: 'handball', test: /hand\s*ball|bola\s*baling/i },
  { kind: 'muaythai', test: /muay\s*thai|kickbox/i },
  { kind: 'taekwondo', test: /tae\s*kwon\s*do/i },
  { kind: 'skateboarding', test: /skateboard/i },
  { kind: 'skating', test: /roller\s*skat|inline\s*skat|skating/i },
  { kind: 'billiards', test: /billiard|snooker|pool(?!\s*ball)/i },
  { kind: 'esports', test: /e-?sports?|gaming|mobile\s*legends|pubg|valorant/i },
  { kind: 'rowing', test: /row|kayak|canoe|berkayak/i },
  { kind: 'running', test: /lari|running|jog|marathon|trail\s*run|\brun\b/i },
  { kind: 'walking', test: /walk|jalan\s*kaki|brisk\s*walk/i },
  { kind: 'badminton', test: /badminton|shuttle|bulu\s*tangkis/i },
  { kind: 'football', test: /football|bola\s*sepak|soccer/i },
  { kind: 'basketball', test: /basket|bola\s*keranjang/i },
  { kind: 'tennis', test: /tennis|tenis/i },
  { kind: 'squash', test: /squash/i },
  { kind: 'cycling', test: /cycl|basikal|bike|berbasikal/i },
  { kind: 'hiking', test: /hik|mendaki|trek|hutan/i },
  { kind: 'swimming', test: /swim|renang/i },
  { kind: 'workout', test: /gym|workout|fitness|weightlift|angkat\s*berat|training/i },
  { kind: 'yoga', test: /yoga/i },
  { kind: 'pilates', test: /pilates/i },
  { kind: 'zumba', test: /zumba/i },
  { kind: 'dance', test: /dance|menari|tarian/i },
  { kind: 'chess', test: /chess|catur/i },
  { kind: 'bowling', test: /bowling/i },
  { kind: 'golf', test: /golf/i },
  { kind: 'cricket', test: /cricket|kriket/i },
  { kind: 'rugby', test: /rugby|ragbi/i },
  { kind: 'frisbee', test: /frisbee|ultimate\s*disc/i },
  { kind: 'archery', test: /archery|memanah/i },
  { kind: 'boxing', test: /boxing|tinju/i },
  { kind: 'silat', test: /silat/i },
  { kind: 'karate', test: /karate/i },
  { kind: 'darts', test: /darts|dart/i },
  { kind: 'fishing', test: /fish|memancing|pancing/i },
];
export function sportKind(activity: string): SportKind {
  return rules.find(rule => rule.test.test(activity))?.kind ?? 'other';
}

const icons: Record<SportKind, keyof typeof Ionicons.glyphMap> = {
  running: 'walk-outline', walking: 'walk-outline', badminton: 'fitness-outline',
  futsal: 'football-outline', football: 'football-outline', basketball: 'basketball-outline',
  pickleball: 'tennisball-outline', tennis: 'tennisball-outline', 'table-tennis': 'tennisball-outline',
  squash: 'tennisball-outline', volleyball: 'basketball-outline', netball: 'basketball-outline',
  takraw: 'football-outline', cycling: 'bicycle-outline', hiking: 'trail-sign-outline',
  swimming: 'water-outline', workout: 'barbell-outline', yoga: 'body-outline',
  pilates: 'body-outline', zumba: 'musical-notes-outline', dance: 'musical-notes-outline',
  chess: 'grid-outline', bowling: 'ellipse-outline', golf: 'flag-outline',
  cricket: 'baseball-outline', rugby: 'football-outline', dodgeball: 'baseball-outline',
  handball: 'hand-left-outline', frisbee: 'disc-outline', archery: 'radio-button-on-outline',
  boxing: 'fitness-outline', muaythai: 'fitness-outline', silat: 'ribbon-outline',
  taekwondo: 'ribbon-outline', karate: 'ribbon-outline', skateboarding: 'speedometer-outline',
  skating: 'speedometer-outline', billiards: 'ellipse-outline', darts: 'locate-outline',
  fishing: 'fish-outline', rowing: 'boat-outline', 'water-polo': 'water-outline',
  esports: 'game-controller-outline', other: 'people-outline',
};
export function sportIcon(activity: string): keyof typeof Ionicons.glyphMap {
  return icons[sportKind(activity)];
}

// Static literal requires are necessary for Expo/Metro to bundle all 44 assets offline.
// No API calls, schema changes, or new dependencies are needed.
export const LOCAL_SPORT_IMAGES: Record<(typeof SPORT_PRESETS)[number], ImageSourcePropType> = {
  'Running': require('../../assets/sports/running.jpg'),
  'Jogging': require('../../assets/sports/jogging.jpg'),
  'Walking': require('../../assets/sports/walking.jpg'),
  'Badminton': require('../../assets/sports/badminton.jpg'),
  'Futsal': require('../../assets/sports/futsal.jpg'),
  'Football': require('../../assets/sports/football.jpg'),
  'Basketball': require('../../assets/sports/basketball.jpg'),
  'Pickleball': require('../../assets/sports/pickleball.jpg'),
  'Tennis': require('../../assets/sports/tennis.jpg'),
  'Table Tennis': require('../../assets/sports/table-tennis.jpg'),
  'Squash': require('../../assets/sports/squash.jpg'),
  'Volleyball': require('../../assets/sports/volleyball.jpg'),
  'Netball': require('../../assets/sports/netball.jpg'),
  'Sepak Takraw': require('../../assets/sports/sepak-takraw.jpg'),
  'Cycling': require('../../assets/sports/cycling.jpg'),
  'Hiking': require('../../assets/sports/hiking.jpg'),
  'Swimming': require('../../assets/sports/swimming.jpg'),
  'Gym / Workout': require('../../assets/sports/gym-workout.jpg'),
  'Yoga': require('../../assets/sports/yoga.jpg'),
  'Pilates': require('../../assets/sports/pilates.jpg'),
  'Zumba': require('../../assets/sports/zumba.jpg'),
  'Dance': require('../../assets/sports/dance.jpg'),
  'Chess': require('../../assets/sports/chess.jpg'),
  'Bowling': require('../../assets/sports/bowling.jpg'),
  'Golf': require('../../assets/sports/golf.jpg'),
  'Cricket': require('../../assets/sports/cricket.jpg'),
  'Rugby': require('../../assets/sports/rugby.jpg'),
  'Dodgeball': require('../../assets/sports/dodgeball.jpg'),
  'Handball': require('../../assets/sports/handball.jpg'),
  'Frisbee': require('../../assets/sports/frisbee.jpg'),
  'Archery': require('../../assets/sports/archery.jpg'),
  'Boxing': require('../../assets/sports/boxing.jpg'),
  'Muay Thai': require('../../assets/sports/muay-thai.jpg'),
  'Silat': require('../../assets/sports/silat.jpg'),
  'Taekwondo': require('../../assets/sports/taekwondo.jpg'),
  'Karate': require('../../assets/sports/karate.jpg'),
  'Skateboarding': require('../../assets/sports/skateboarding.jpg'),
  'Roller Skating': require('../../assets/sports/roller-skating.jpg'),
  'Billiards / Pool': require('../../assets/sports/billiards-pool.jpg'),
  'Darts': require('../../assets/sports/darts.jpg'),
  'Fishing': require('../../assets/sports/fishing.jpg'),
  'Rowing / Kayaking': require('../../assets/sports/rowing-kayaking.jpg'),
  'Water Polo': require('../../assets/sports/water-polo.jpg'),
  'E-Sports': require('../../assets/sports/e-sports.jpg'),
};

/** Higher-resolution editorial sport photos. Licensed under the Unsplash License.
 * Uses existing locally bundled preset when network is unavailable. */
const HD_SPORT_PHOTOS: Partial<Record<SportKind, string>> = {
  running: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1100&q=85',
  badminton: 'https://images.unsplash.com/photo-1718452739586-5b467f1f109b?auto=format&fit=crop&w=1100&q=85',
  football: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1100&q=85',
  basketball: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1100&q=85',
  tennis: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1100&q=85',
  cycling: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1100&q=85',
  hiking: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1100&q=85',
  workout: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1100&q=85',
};

const canonicalPreset: Partial<Record<SportKind, keyof typeof LOCAL_SPORT_IMAGES>> = {
  running: 'Running', walking: 'Walking', badminton: 'Badminton', futsal: 'Futsal',
  football: 'Football', basketball: 'Basketball', pickleball: 'Pickleball', tennis: 'Tennis',
  'table-tennis': 'Table Tennis', squash: 'Squash', volleyball: 'Volleyball', netball: 'Netball',
  takraw: 'Sepak Takraw', cycling: 'Cycling', hiking: 'Hiking', swimming: 'Swimming',
  workout: 'Gym / Workout', yoga: 'Yoga', pilates: 'Pilates', zumba: 'Zumba', dance: 'Dance',
  chess: 'Chess', bowling: 'Bowling', golf: 'Golf', cricket: 'Cricket', rugby: 'Rugby',
  dodgeball: 'Dodgeball', handball: 'Handball', frisbee: 'Frisbee', archery: 'Archery',
  boxing: 'Boxing', muaythai: 'Muay Thai', silat: 'Silat', taekwondo: 'Taekwondo',
  karate: 'Karate', skateboarding: 'Skateboarding', skating: 'Roller Skating',
  billiards: 'Billiards / Pool', darts: 'Darts', fishing: 'Fishing', rowing: 'Rowing / Kayaking',
  'water-polo': 'Water Polo', esports: 'E-Sports',
};

export function imageForSport(activity: string): ImageSourcePropType | null {
  const exact = SPORT_PRESETS.find(sport => sport.toLowerCase() === activity.trim().toLowerCase());
  if (exact) return LOCAL_SPORT_IMAGES[exact];
  const normalized = canonicalPreset[sportKind(activity)];
  return normalized ? LOCAL_SPORT_IMAGES[normalized] : null;
}

export default function SportVisual({ activity, style, tint }: { activity: string; style?: StyleProp<ImageStyle>; tint?: string }) {
  const photo = imageForSport(activity);
  const [failed, setFailed] = useState(false);
  const [hdReady, setHdReady] = useState(false);
  const hdPhoto = HD_SPORT_PHOTOS[sportKind(activity)];
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    setFailed(false);
    setHdReady(false);
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration: 240, useNativeDriver: true }).start();
  }, [photo, opacity]);
  if (!photo || failed) return <View style={[s.placeholder, style, tint ? { backgroundColor: tint } : null]}>
    <Ionicons name={sportIcon(activity)} color={palette.blue} size={32}/>
  </View>;
  return <View style={[s.frame, style]}>
    <Animated.Image source={photo} style={[StyleSheet.absoluteFill, { opacity }]} resizeMode="cover"
      onError={() => setFailed(true)} accessibilityLabel={`${activity} sport image`}/>
    {hdPhoto && <Animated.Image key={hdPhoto} source={{ uri: hdPhoto, cache: 'force-cache' }}
      style={[StyleSheet.absoluteFill, { opacity: hdReady ? 1 : 0 }]} resizeMode="cover"
      onLoad={() => setHdReady(true)} onError={() => setHdReady(false)}
      accessibilityLabel={`${activity} high resolution sports photo`}/>}
  </View>;
}
const s = StyleSheet.create({
  placeholder: { backgroundColor: palette.blueSoft, justifyContent: 'center', alignItems: 'center' },
  image: { backgroundColor: palette.blueSoft },
  frame: { backgroundColor: palette.blueSoft, overflow: 'hidden' },
});
