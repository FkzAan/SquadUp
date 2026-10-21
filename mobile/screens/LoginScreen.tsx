import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Keyboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signIn, signUp } from '../services/authService';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { palette, radius, cardShadow } from '../theme';

export default function LoginScreen() {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const passwordFocused = useRef(false);

  // Keep natural scrolling on both Login and Sign Up. On Android,
  // let the keyboard resize the viewport rather than compressing the UI.
  useEffect(() => {
    const keyboardShow = Keyboard.addListener('keyboardDidShow', () => {
      if (passwordFocused.current) {
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    });
    return () => keyboardShow.remove();
  }, []);

  async function submit() {
    if (!email || !password || (mode === 'signup' && !name)) {
      Alert.alert(t('fillFields'));
      return;
    }
    setLoading(true);
    const err = mode === 'signup' ? await signUp(name, email, password) : await signIn(email, password);
    setLoading(false);
    if (err) Alert.alert(t('error'), err);
  }

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}>
      <View style={s.languageRow}><LanguageSelector /></View>
      <View style={s.brandArea}>
        <View style={s.brandGlow} />
        <View style={s.logoBox}><Ionicons name="people" color="#FFFFFF" size={35} /></View>
        <Text style={s.brand}>Squad<Text style={s.brandBlue}>Up</Text></Text>
        <Text style={s.tagline}>{t('loginTagline')}</Text>
      </View>
      <View style={s.formCard}>
        <View style={s.segment}>
          <TouchableOpacity style={[s.segmentOption, mode === 'login' && s.segmentActive]} onPress={() => setMode('login')}>
            <Text style={[s.segmentText, mode === 'login' && s.segmentTextActive]}>{t('login')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.segmentOption, mode === 'signup' && s.segmentActive]} onPress={() => setMode('signup')}>
            <Text style={[s.segmentText, mode === 'signup' && s.segmentTextActive]}>{t('signup')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.formTitle}>{mode === 'login' ? (language === 'ms' ? 'Selamat kembali!' : 'Welcome back!') : (language === 'ms' ? 'Jom sertai SquadUp' : 'Join SquadUp')}</Text>
        <Text style={s.formSub}>{mode === 'login' ? (language === 'ms' ? 'Log masuk untuk cari squad anda.' : 'Sign in to find your squad.') : (language === 'ms' ? 'Cari rakan sukan baru hari ini.' : 'Find new teammates today.')}</Text>
        {mode === 'signup' && <View style={s.field}>
          <Ionicons name="person-outline" size={19} color={palette.muted} />
          <TextInput style={s.input} placeholder={t('nickname')} placeholderTextColor={palette.muted} value={name} onChangeText={setName} returnKeyType="next" />
        </View>}
        <View style={s.field}>
          <Ionicons name="mail-outline" size={19} color={palette.muted} />
          <TextInput style={s.input} placeholder={t('email')} placeholderTextColor={palette.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" value={email} onChangeText={setEmail} returnKeyType="next" />
        </View>
        <View style={s.field}>
          <Ionicons name="lock-closed-outline" size={19} color={palette.muted} />
          <TextInput style={s.input} placeholder={t('passwordHint')} placeholderTextColor={palette.muted} secureTextEntry={!showPassword} value={password} onChangeText={setPassword} returnKeyType="done" onFocus={() => { passwordFocused.current = true; requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true })); }} onBlur={() => { passwordFocused.current = false; }} onSubmitEditing={submit} />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={21} color={palette.muted} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={[s.button, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <><Text style={s.buttonText}>{mode === 'login' ? t('login') : t('signup')}</Text><Ionicons name="arrow-forward" color="#FFFFFF" size={18}/></>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={s.switchRow}>
          <Text style={s.link}>{mode === 'login' ? t('switchSignup') : t('switchLogin')}</Text>
        </TouchableOpacity>
      </View>
      <Text style={s.bottomBrand}>SQUADUP  ·  PLAY TOGETHER</Text>
    </ScrollView>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 32, paddingBottom: 40 },
  languageRow: { alignSelf: 'flex-end', marginBottom: 16 },
  brandArea: { paddingTop: 20, paddingBottom: 30, alignItems: 'center', overflow: 'hidden', minHeight: 210, justifyContent: 'center' },
  brandGlow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#D7E9FF', top: -60, opacity: 0.65 },
  logoBox: { backgroundColor: palette.blue, width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 17, transform: [{ rotate: '-6deg' }], ...cardShadow },
  brand: { fontSize: 36, letterSpacing: -1.4, fontWeight: '900', color: palette.navy },
  brandBlue: { color: palette.blue },
  tagline: { color: palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 275 },
  formCard: { backgroundColor: palette.white, borderRadius: 28, padding: 20, borderWidth: 1, borderColor: palette.border, ...cardShadow },
  segment: { flexDirection: 'row', padding: 4, backgroundColor: '#EFF4FA', borderRadius: 15, gap: 4, marginBottom: 22 },
  segmentOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  segmentActive: { backgroundColor: palette.white, ...cardShadow },
  segmentText: { color: palette.muted, fontWeight: '700' },
  segmentTextActive: { color: palette.blue },
  formTitle: { fontSize: 22, color: palette.navy, fontWeight: '800', marginBottom: 4 },
  formSub: { fontSize: 13, color: palette.muted, marginBottom: 21 },
  field: { minHeight: 55, borderWidth: 1, borderColor: palette.border, borderRadius: radius.input, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FBFDFF', paddingHorizontal: 14, gap: 10, marginBottom: 12 },
  input: { flex: 1, color: palette.navy, minHeight: 50, fontSize: 15, paddingVertical: 8 },
  button: { backgroundColor: palette.blue, borderRadius: 15, minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 10, flexDirection: 'row', gap: 10 },
  buttonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '800' },
  switchRow: { paddingVertical: 19, alignItems: 'center' },
  link: { color: palette.blue, fontWeight: '700', textAlign: 'center' },
  bottomBrand: { color: '#9AB1CD', textAlign: 'center', fontSize: 10, letterSpacing: 2, marginTop: 28, fontWeight: '800' },
});
