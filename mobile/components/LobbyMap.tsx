import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import type { Lobby } from '../types';

type Props = {
    lobbies: Lobby[];
    onSelect: (id: string) => void;
};

const HTML = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css" />
<style>
  html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
  .cnt { background: transparent; border: none; box-shadow: none; color: #fff; font-weight: 700; font-size: 11px; padding: 0; }
</style>
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

    var layer = L.layerGroup().addTo(map);
    var userMarker = null;
    var didFit = false;

    window.setLobbies = function (list) {
      layer.clearLayers();
      var pts = [];
      var seen = {};
      list.forEach(function (l) {
        var key = l.latitude + ',' + l.longitude;
        var n = seen[key] || 0;
        seen[key] = n + 1;
        var lat = l.latitude;
        var lng = l.longitude;
        if (n > 0) {
          // koordinat sama persis: anjak sangat sedikit (~9m) supaya semua boleh ditekan
          var angle = n * 1.2566;
          lat += 0.00008 * Math.cos(angle);
          lng += 0.00008 * Math.sin(angle);
        }
        var color = l.status === 'full' ? '#9ca3af' : '#2563eb';
        var m = L.circleMarker([lat, lng], {
          radius: 13, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 1
        }).addTo(layer);
        m.bindTooltip(l.current_players + '/' + l.max_players, {
          permanent: true, direction: 'center', className: 'cnt'
        });
        m.on('click', function () { post({ type: 'select', id: l.id }); });
        pts.push([lat, lng]);
      });
      if (!didFit && pts.length) {
        map.fitBounds(pts, { padding: [60, 60], maxZoom: 16 });
        didFit = true;
      }
    };

    window.setUser = function (lat, lng) {
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.circleMarker([lat, lng], {
        radius: 8, color: '#ffffff', weight: 3, fillColor: '#16a34a', fillOpacity: 1
      }).addTo(map);
      if (!didFit) {
        map.setView([lat, lng], 15);
        didFit = true;
      }
    };

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

export default function LobbyMap({ lobbies, onSelect }: Props) {
    const ref = useRef<WebView>(null);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // kalau peta tak siap dalam 12 saat, tunjuk mesej
    useEffect(() => {
        if (ready) return;
        const t = setTimeout(() => {
            setError((prev) => prev ?? 'Peta lambat dimuatkan. Semak sambungan internet anda.');
        }, 12000);
        return () => clearTimeout(t);
    }, [ready]);

    // hantar lobby (yang ada koordinat) ke peta
    useEffect(() => {
        if (!ready) return;
        const mappable = lobbies.filter((l) => l.latitude != null && l.longitude != null);
        ref.current?.injectJavaScript(`window.setLobbies(${JSON.stringify(mappable)}); true;`);
    }, [ready, lobbies]);

    // lokasi pengguna (pilihan)
    useEffect(() => {
        if (!ready) return;
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;
                const pos = await Location.getCurrentPositionAsync({});
                ref.current?.injectJavaScript(
                    `window.setUser(${pos.coords.latitude}, ${pos.coords.longitude}); true;`
                );
            } catch {
                // peta tetap berfungsi tanpa lokasi pengguna
            }
        })();
    }, [ready]);

    function onMessage(e: WebViewMessageEvent) {
        try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'ready') {
                setReady(true);
                setError(null);
            } else if (msg.type === 'select') {
                onSelect(msg.id);
            } else if (msg.type === 'error') {
                setError(msg.msg);
            }
        } catch {
            // abaikan
        }
    }

    return (
        <View style={s.container}>
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
                onError={() => setError('Peta tak dapat dimuatkan. Semak sambungan internet anda.')}
            />
            {!ready && !error && (
                <View style={s.overlay} pointerEvents="none">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={s.overlayText}>Memuatkan peta...</Text>
                </View>
            )}
            {!ready && error && (
                <View style={s.overlay}>
                    <Text style={s.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#e5e7eb' },
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
});