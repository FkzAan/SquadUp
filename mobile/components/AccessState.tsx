import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AccessState({ title = 'Semak akses akaun…', error, retry, logout }: {
  title?: string; error?: string | null; retry?: () => void; logout?: () => Promise<void>
}) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function exit() {
    if (!logout || busy) return;
    setBusy(true);
    try { await logout(); } catch (error) { setLocalError(error instanceof Error ? error.message : 'Log keluar gagal.'); }
    finally { setBusy(false); }
  }
  return <View style={s.root}><Text style={s.logo}>SquadUp</Text><Text style={s.title}>{title}</Text>
    {error || localError ? <Text accessibilityRole="alert" style={s.error}>{localError ?? error}</Text> : <ActivityIndicator color="#2563eb" size="large" />}
    {retry && <TouchableOpacity style={s.button} onPress={retry} disabled={busy}><Text style={s.buttonText}>Cuba semula</Text></TouchableOpacity>}
    {logout && <TouchableOpacity style={s.link} onPress={() => void exit()} disabled={busy}><Text style={s.linkText}>{busy ? 'Log keluar…' : 'Log keluar'}</Text></TouchableOpacity>}
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 28 },
  logo: { color: '#2563eb', fontSize: 34, fontWeight: '800', marginBottom: 24 },
  title: { fontSize: 19, fontWeight: '600', textAlign: 'center', marginBottom: 20, color: '#1f2937' },
  error: { fontSize: 14, color: '#b45309', lineHeight: 23, textAlign: 'center', marginBottom: 18 },
  button: { backgroundColor: '#2563eb', borderRadius: 9, padding: 14, marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700' }, link: { padding: 16 }, linkText: { color: '#2563eb', fontWeight: '600' }
});
