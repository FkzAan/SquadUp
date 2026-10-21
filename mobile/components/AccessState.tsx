import { colors, surface } from '../theme/pulse';
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
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.canvas, padding: 28 },
  logo: { color: colors.primary, fontSize: 38, fontWeight: '900', letterSpacing: -1.3, marginBottom: 22 },
  title: { fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 21, color: colors.ink, lineHeight: 26 },
  error: { fontSize: 14, color: colors.danger, lineHeight: 23, textAlign: 'center', marginBottom: 18 },
  button: { ...surface.primaryButton, paddingHorizontal: 24, marginTop: 12 },
  buttonText: { color: colors.surface, fontWeight: '900' },
  link: { padding: 16 }, linkText: { color: colors.primary, fontWeight: '800' },
});
