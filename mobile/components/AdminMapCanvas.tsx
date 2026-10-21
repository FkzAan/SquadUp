import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_MAP_HTML } from '../utils/adminMapDocument';
import type { ActivityMapGroup } from '../utils/adminActivityMap';

export default function AdminMapCanvas({ groups, onSelect, onInteracting }: {
  groups: ActivityMapGroup[]; onSelect: (key: string) => void; onInteracting: (active: boolean) => void;
}) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [tileError, setTileError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const markers = useMemo(() => groups.map(group => ({ key: group.key, latitude: group.latitude, longitude: group.longitude, count: group.lobbies.length, status: group.status })), [groups]);
  useEffect(() => {
    if (ready) web.current?.injectJavaScript(`window.setActivityMarkers && window.setActivityMarkers(${JSON.stringify(markers)}); true;`);
  }, [ready, markers]);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setError('The map is taking too long to load. Check your internet connection.'), 12000);
    return () => clearTimeout(timer);
  }, [ready, attempt]);

  function retry() { onInteracting(false); setReady(false); setError(''); setTileError(false); setAttempt(value => value + 1); }
  function receive(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!message || typeof message !== 'object' || !('type' in message)) return;
      if (message.type === 'ready') { setReady(true); setError(''); }
      else if (message.type === 'tiles-error') setTileError(true);
      else if (message.type === 'error') { setReady(false); setError('Map unavailable. Check your internet connection.'); }
      else if (message.type === 'select' && 'key' in message && typeof message.key === 'string' && groups.some(group => group.key === message.key)) onSelect(message.key);
    } catch { /* Ignore unrelated or malformed messages from the map document. */ }
  }

  return <View style={s.wrapper}>
    <View style={s.map} onTouchStart={() => onInteracting(true)} onTouchEnd={() => onInteracting(false)} onTouchCancel={() => onInteracting(false)}>
      <WebView key={attempt} ref={web} style={s.web} source={{ html: ADMIN_MAP_HTML, baseUrl: 'https://squadup.app/' }} originWhitelist={['*']}
        javaScriptEnabled scrollEnabled={false} nestedScrollEnabled mixedContentMode="never" setSupportMultipleWindows={false}
        onMessage={receive} onError={() => { onInteracting(false); setReady(false); setError('Map unavailable. Activity details are still available in the list below.'); }}
        onShouldStartLoadWithRequest={({ url }) => {
          if (url === 'about:blank' || url === 'https://squadup.app/' || url === 'https://squadup.app') return true;
          if (url === 'https://www.openstreetmap.org/copyright') void Linking.openURL(url).catch(() => {});
          return false;
        }}
      />
      {!ready && <View style={s.overlay}>
        {error ? <><Ionicons name="cloud-offline-outline" size={30} color="#758178" /><Text style={s.error}>{error}</Text><Text style={s.help}>You can still open activities from the list below.</Text><Pressable accessibilityRole="button" style={s.retry} onPress={retry}><Text style={s.retryText}>Retry map</Text></Pressable></> : <><ActivityIndicator color="#28553f" size="large" /><Text style={s.help}>Loading activity locations…</Text></>}
      </View>}
      {ready && groups.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Fit all activity locations on the map" onPress={() => web.current?.injectJavaScript('window.fitActivityBounds && window.fitActivityBounds(); true;')} style={s.fit}><Ionicons name="scan-outline" size={16} color="#28553f" /><Text style={s.fitText}>Fit pins</Text></Pressable>}
    </View>
    {tileError && <View style={s.warning}><Text style={s.help}>Some map tiles could not load. Activity details remain available below.</Text><Pressable accessibilityRole="button" onPress={retry}><Text style={s.fitText}>Retry</Text></Pressable></View>}
  </View>;
}

const s = StyleSheet.create({
  wrapper: { gap: 8 }, map: { height: 340, borderRadius: 16, overflow: 'hidden', backgroundColor: '#e8eee2', borderWidth: 1, borderColor: '#dce3d6' }, web: { flex: 1, backgroundColor: '#e8eee2' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: 22, gap: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#edf1e7' },
  error: { color: '#4d6552', fontSize: 13, lineHeight: 20, textAlign: 'center' }, help: { color: '#758178', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  retry: { backgroundColor: '#28553f', borderRadius: 9, paddingHorizontal: 17, paddingVertical: 12 }, retryText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  fit: { position: 'absolute', top: 12, right: 12, borderRadius: 9, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 2 }, fitText: { color: '#28553f', fontSize: 11, fontWeight: '600', paddingVertical: 3 }, warning: { padding: 12, borderRadius: 10, backgroundColor: '#fff6d9', gap: 4, alignItems: 'center' },
});
