import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Avatar from '../components/Avatar';
import { changePassword, fetchMyProfile, removeAvatar, updateName, uploadAvatar } from '../services/profileService';
import type { Profile } from '../types';
import { useLanguage } from '../context/LanguageContext';
import LanguageSelector from '../components/LanguageSelector';
import { palette, cardShadow } from '../theme';

export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [savingPw, setSavingPw] = useState(false);

  const load = useCallback(async () => {
    const p = await fetchMyProfile();
    setProfile(p);
    if (p) setName(p.name);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert(t('error'), t('cannotReadImage'));
      return;
    }

    setUploading(true);
    const err = await uploadAvatar(asset.base64, asset.mimeType ?? 'image/jpeg');
    setUploading(false);
    if (err) Alert.alert(t('uploadFailed'), err);
    else load();
  }

  function confirmRemove() {
    Alert.alert(t('removeImageTitle'), t('removeImageMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('remove'),
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          const err = await removeAvatar();
          setUploading(false);
          if (err) Alert.alert(t('error'), err);
          else load();
        },
      },
    ]);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert(t('shortNameTitle'), t('shortNameMessage'));
      return;
    }
    setSavingName(true);
    const err = await updateName(trimmed);
    setSavingName(false);
    if (err) Alert.alert(t('error'), err);
    else {
      Alert.alert(t('saved'), t('nameUpdated'));
      load();
    }
  }

  async function savePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert(t('complete'), t('fillPasswords'));
      return;
    }
    if (newPw.length < 6) {
      Alert.alert(t('shortPasswordTitle'), t('shortPasswordMessage'));
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert(t('passwordMismatchTitle'), t('passwordMismatch'));
      return;
    }
    if (newPw === currentPw) {
      Alert.alert(t('samePasswordTitle'), t('samePasswordMessage'));
      return;
    }
    setSavingPw(true);
    const err = await changePassword(currentPw, newPw);
    setSavingPw(false);
    if (err) Alert.alert(t('failed'), err);
    else {
      Alert.alert(t('success'), t('passwordChanged'));
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  }

  const Header = (
    <View style={s.topRow}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>
      <Text style={s.title}>{language === 'ms' ? 'Tetapan Akaun' : 'Account Settings'}</Text>
    </View>
  );

  if (loading || !profile) {
    return (
      <View style={s.container}>
        {Header}
        <ActivityIndicator size="large" style={{ marginTop: 40 }} />
      </View>
    );
  }

  const nameChanged = name.trim() !== profile.name;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={s.container}
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {Header}

        <View style={s.avatarWrap}>
          <View style={s.profileAccent} />
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} disabled={uploading}>
            <Avatar uri={profile.avatar_url} name={profile.name} size={110} />
            <View style={s.camBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={18} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={s.email}>{profile.email}</Text>
          <View style={s.avatarActions}>
            <TouchableOpacity onPress={pickImage} disabled={uploading}>
              <Text style={s.link}>{t('changeImage')}</Text>
            </TouchableOpacity>
            {profile.avatar_url && (
              <TouchableOpacity onPress={confirmRemove} disabled={uploading}>
                <Text style={s.linkDanger}>{t('removeImage')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('name')}</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder={t('nickname')}
            maxLength={40}
          />
          <TouchableOpacity
            style={[s.primaryBtn, (!nameChanged || savingName) && s.btnDisabled]}
            onPress={saveName}
            disabled={!nameChanged || savingName}
            activeOpacity={0.8}
          >
            <Text style={s.primaryText}>{savingName ? t('saving') : t('saveName')}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('languagePreferences')}</Text>
          <Text style={s.languageHint}>{t('chooseLanguage')}</Text>
          <LanguageSelector expanded />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>{t('changePassword')}</Text>
          <TextInput
            style={s.input}
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder={t('currentPassword')}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            value={newPw}
            onChangeText={setNewPw}
            placeholder={t('newPasswordHint')}
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder={t('confirmPassword')}
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[s.primaryBtn, savingPw && s.btnDisabled]}
            onPress={savePassword}
            disabled={savingPw}
            activeOpacity={0.8}
          >
            <Text style={s.primaryText}>{savingPw ? t('changing') : t('changePassword')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, paddingTop: 56 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 14 },
  backBtn: { width: 43, height: 43, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 23, fontWeight: '900', color: palette.navy },
  avatarWrap: { alignItems: 'center', paddingTop: 27, paddingBottom: 24, marginHorizontal: 16, borderRadius: 23, overflow: 'hidden', backgroundColor: '#DAEAFF', marginBottom: 4 },
  profileAccent: { position: 'absolute', width: 300, height: 300, backgroundColor: '#BBD9FF', borderRadius: 150, top: -220, right: -110 },
  camBadge: { position: 'absolute', right: 0, bottom: 0, width: 35, height: 35, borderRadius: 18, backgroundColor: palette.blue, borderWidth: 3, borderColor: '#DAEAFF', alignItems: 'center', justifyContent: 'center' },
  email: { color: '#526D91', marginTop: 12, fontWeight: '600' },
  avatarActions: { flexDirection: 'row', gap: 19, marginTop: 9 }, link: { color: palette.blue, fontWeight: '800' }, linkDanger: { color: palette.danger, fontWeight: '800' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 13, padding: 17, borderRadius: 20, borderWidth: 1, borderColor: palette.border, ...cardShadow },
  languageHint: { color: palette.muted, marginBottom: 12, fontSize: 13 },
  cardTitle: { fontWeight: '900', color: palette.navy, marginBottom: 12, fontSize: 16 },
  input: { borderWidth: 1, borderColor: palette.border, borderRadius: 13, padding: 13, marginBottom: 11, backgroundColor: '#FBFDFF', color: palette.navy },
  primaryBtn: { backgroundColor: palette.blue, borderRadius: 13, padding: 14, alignItems: 'center', marginTop: 3 },
  primaryText: { color: '#fff', fontWeight: '900' }, btnDisabled: { backgroundColor: '#98A9C2' },
});
