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

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
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
      Alert.alert('Ralat', 'Tak dapat membaca gambar. Cuba gambar lain.');
      return;
    }

    setUploading(true);
    const err = await uploadAvatar(asset.base64, asset.mimeType ?? 'image/jpeg');
    setUploading(false);
    if (err) Alert.alert('Gagal muat naik', err);
    else load();
  }

  function confirmRemove() {
    Alert.alert('Buang gambar profil?', 'Inisial nama kamu akan dipaparkan sebagai ganti.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Buang',
        style: 'destructive',
        onPress: async () => {
          setUploading(true);
          const err = await removeAvatar();
          setUploading(false);
          if (err) Alert.alert('Ralat', err);
          else load();
        },
      },
    ]);
  }

  async function saveName() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert('Nama terlalu pendek', 'Nama mesti sekurang-kurangnya 2 aksara.');
      return;
    }
    setSavingName(true);
    const err = await updateName(trimmed);
    setSavingName(false);
    if (err) Alert.alert('Ralat', err);
    else {
      Alert.alert('Disimpan', 'Nama kamu sudah dikemas kini.');
      load();
    }
  }

  async function savePassword() {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert('Lengkapkan', 'Sila isi ketiga-tiga ruangan password.');
      return;
    }
    if (newPw.length < 6) {
      Alert.alert('Password terlalu pendek', 'Password baharu mesti sekurang-kurangnya 6 aksara.');
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Tak sepadan', 'Password baharu dan pengesahan mesti sama.');
      return;
    }
    if (newPw === currentPw) {
      Alert.alert('Sama dengan password lama', 'Pilih password yang berbeza.');
      return;
    }
    setSavingPw(true);
    const err = await changePassword(currentPw, newPw);
    setSavingPw(false);
    if (err) Alert.alert('Gagal', err);
    else {
      Alert.alert('Berjaya', 'Password kamu sudah ditukar.');
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
      <Text style={s.title}>Profil Saya</Text>
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
              <Text style={s.link}>Tukar gambar</Text>
            </TouchableOpacity>
            {profile.avatar_url && (
              <TouchableOpacity onPress={confirmRemove} disabled={uploading}>
                <Text style={s.linkDanger}>Buang gambar</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Nama</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Nama panggilan"
            maxLength={40}
          />
          <TouchableOpacity
            style={[s.primaryBtn, (!nameChanged || savingName) && s.btnDisabled]}
            onPress={saveName}
            disabled={!nameChanged || savingName}
            activeOpacity={0.8}
          >
            <Text style={s.primaryText}>{savingName ? 'Menyimpan...' : 'Simpan nama'}</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Tukar password</Text>
          <TextInput
            style={s.input}
            value={currentPw}
            onChangeText={setCurrentPw}
            placeholder="Password semasa"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            value={newPw}
            onChangeText={setNewPw}
            placeholder="Password baharu (min 6 aksara)"
            secureTextEntry
            autoCapitalize="none"
          />
          <TextInput
            style={s.input}
            value={confirmPw}
            onChangeText={setConfirmPw}
            placeholder="Sahkan password baharu"
            secureTextEntry
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[s.primaryBtn, savingPw && s.btnDisabled]}
            onPress={savePassword}
            disabled={savingPw}
            activeOpacity={0.8}
          >
            <Text style={s.primaryText}>{savingPw ? 'Menukar...' : 'Tukar password'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', paddingTop: 60 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
  backBtn: { padding: 6, borderRadius: 10, backgroundColor: '#fff', elevation: 1 },
  title: { fontSize: 24, fontWeight: '800' },
  avatarWrap: { alignItems: 'center', marginVertical: 12 },
  camBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: { color: '#6b7280', marginTop: 10 },
  avatarActions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  link: { color: '#2563eb', fontWeight: '700' },
  linkDanger: { color: '#dc2626', fontWeight: '700' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, padding: 16, borderRadius: 14, elevation: 2 },
  cardTitle: { fontWeight: '800', color: '#374151', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, padding: 12, marginBottom: 10 },
  primaryBtn: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 2 },
  primaryText: { color: '#fff', fontWeight: '800' },
  btnDisabled: { backgroundColor: '#9ca3af' },
});