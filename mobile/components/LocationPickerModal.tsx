import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

type Props = {
    visible: boolean;
    initial: Coords | null;
    onConfirm: (c: Coords) => void;
    onClose: () => void;
};

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<style>html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"></script>
<script>
  function post(o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
  window.onerror = function (msg) { post({ type: 'error', msg: String(msg) }); };

  function init() {
    var map = L.map('map').setView([3.14, 101.55], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    var marker = null;

    function sendPick(lat, lng) { post({ type: 'pick', lat: lat, lng: lng }); }

    function place(lat, lng, notify) {
      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { draggable: true }).addTo(map);
        marker.on('dragend', function () {
          var p = marker.getLatLng();
          sendPick(p.lat, p.lng);
        });
      }
      if (notify) sendPick(lat, lng);
    }

    map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng, true); });

    window.setPin = function (lat, lng) {
      place(lat, lng, false);
      map.setView([lat, lng], 17);
    };

    window.centerOn = function (lat, lng) { map.setView([lat, lng], 16); };

    post({ type: 'ready' });
  }

  if (typeof L === 'undefined') {
    post({ type: 'error', msg: 'Leaflet gagal dimuatkan. Semak sambungan internet.' });
  } else {
    init();
  }
</script>
</body>
</html>`;

export default function LocationPickerModal({ visible, initial, onConfirm, onClose }: Props) {
    const { t } = useLanguage();
    const ref = useRef<WebView>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [picked, setPicked] = useState<Coords | null>(initial);

    // setiap kali dibuka: reset keadaan
    useEffect(() => {
        if (visible) {
            setReady(false);
            setError(null);
            setPicked(initial);
        }
    }, [visible]);

    useEffect(() => {
        if (!visible || ready) return;
        const t = setTimeout(() => {
            setError((prev) => prev ?? t('mapSlow'));
        }, 12000);
        return () => clearTimeout(t);
    }, [visible, ready]);

    // peta dah sedia: letak pin sedia ada, atau pusatkan pada pengguna
    useEffect(() => {
        if (!visible || !ready) return;
        if (initial) {
            ref.current?.injectJavaScript(`window.setPin(${initial.latitude}, ${initial.longitude}); true;`);
            return;
        }
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const pos = await Location.getCurrentPositionAsync({});
                ref.current?.injectJavaScript(
                    `window.centerOn(${pos.coords.latitude}, ${pos.coords.longitude}); true;`
                );
            } catch {
                // peta tetap boleh digunakan tanpa GPS
            }
        })();
    }, [visible, ready]);

    function onMessage(e: WebViewMessageEvent) {
        try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') {
                setReady(true);
                setError(null);
            } else if (msg.type === 'pick') {
                setPicked({ latitude: msg.lat, longitude: msg.lng });
            } else if (msg.type === 'error') {
                setError(msg.msg.includes('Leaflet') ? t('mapLibraryError') : msg.msg);
            }
        } catch {
            // abaikan
        }
    }

    async function useMyLocation() {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('locationPermissionTitle'), t('locationPermissionMessage'));
                return;
            }
            const pos = await Location.getCurrentPositionAsync({});
            const c = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            setPicked(c);
            ref.current?.injectJavaScript(`window.setPin(${c.latitude}, ${c.longitude}); true;`);
        } catch {
            Alert.alert(t('error'), t('locationFailed'));
        }
    }

    function confirm() {
        if (!picked) {
            Alert.alert(t('noPinTitle'), t('noPinMessage'));
            return;
        }
        onConfirm(picked);
    }

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                <View style={s.header}>
                    <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.7}>
                        <Ionicons name="close" size={24} color="#111827" />
                    </TouchableOpacity>
                    <Text style={s.title}>{t('pinSelectTitle')}</Text>
                </View>

                <View style={s.mapWrap}>
                    <WebView
                        ref={ref}
                        style={s.web}
                        originWhitelist={['*']}
                        source={{ html: HTML, baseUrl: 'https://squadup.app' }}
                        javaScriptEnabled
                        domStorageEnabled
                        mixedContentMode="always"
                        androidLayerType="hardware"
                        onMessage={onMessage}
                        onError={() => setError(t('mapUnavailable'))}
                    />
                    {!ready && !error && (
                        <View style={s.overlay} pointerEvents="none">
                            <ActivityIndicator size="large" color="#2563eb" />
                            <Text style={s.overlayText}>{t('mapLoading')}</Text>
                        </View>
                    )}
                    {!ready && error && (
                        <View style={s.overlay}>
                            <Text style={s.errorText}>{error}</Text>
                        </View>
                    )}
                </View>

                <View style={s.footer}>
                    <Text style={s.coords}>
                        {picked
                            ? `${picked.latitude.toFixed(5)}, ${picked.longitude.toFixed(5)}`
                            : t('tapToPin')}
                    </Text>
                    <View style={s.row}>
                        <TouchableOpacity style={s.gpsBtn} onPress={useMyLocation} activeOpacity={0.7}>
                            <Ionicons name="locate" size={18} color="#2563eb" />
                            <Text style={s.gpsText}>{t('myLocation')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.confirmBtn, !picked && s.confirmDisabled]}
                            onPress={confirm}
                            activeOpacity={0.8}
                        >
                            <Text style={s.confirmText}>{t('confirmLocation')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 12 },
    closeBtn: { padding: 6, borderRadius: 10, backgroundColor: '#f3f4f6' },
    title: { fontSize: 20, fontWeight: '800' },
    mapWrap: { flex: 1, backgroundColor: '#e5e7eb' },
    web: { flex: 1, backgroundColor: 'transparent' },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
    },
    overlayText: { marginTop: 10, color: '#374151' },
    errorText: { color: '#b91c1c', textAlign: 'center', fontWeight: '600' },
    footer: { padding: 16, paddingBottom: 28, backgroundColor: '#fff' },
    coords: { textAlign: 'center', color: '#374151', fontWeight: '600', marginBottom: 12 },
    row: { flexDirection: 'row', gap: 10 },
    gpsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#2563eb',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    gpsText: { color: '#2563eb', fontWeight: '700' },
    confirmBtn: { flex: 1, backgroundColor: '#16a34a', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    confirmDisabled: { backgroundColor: '#9ca3af' },
    confirmText: { color: '#fff', fontWeight: '800' },
});