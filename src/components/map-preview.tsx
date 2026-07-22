/**
 * Mapa interactivo embebido, SIN API key: Leaflet + tiles de OpenStreetMap
 * dentro de un WebView. Se puede navegar (arrastrar/zoom) y muestra un pin en la
 * coordenada dada.
 *
 * Si se pasa `onPick`, el mapa es editable: tocar el mapa (o arrastrar el pin)
 * reubica el marcador y reporta la nueva coordenada hacia arriba. Sin `onPick`,
 * es solo de lectura (pero igual navegable).
 */

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { Spacing } from '@/constants/theme';

function buildHtml(lat: number, lng: number, editable: boolean): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#e8e8e8;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var lat = ${lat}, lng = ${lng}, editable = ${editable};
    var map = L.map('map', { zoomControl: true, attributionControl: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    var marker = L.marker([lat, lng], { draggable: editable }).addTo(map);

    function post(obj) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    // Mientras el dedo toca el mapa avisamos a la app para que congele el scroll
    // de la pantalla; al soltar (o cancelar) lo liberamos.
    document.addEventListener('touchstart', function () { post({ type: 'touch', active: true }); }, { passive: true });
    document.addEventListener('touchend', function () { post({ type: 'touch', active: false }); }, { passive: true });
    document.addEventListener('touchcancel', function () { post({ type: 'touch', active: false }); }, { passive: true });

    if (editable) {
      map.on('click', function (e) { marker.setLatLng(e.latlng); post({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng }); });
      marker.on('dragend', function () { var ll = marker.getLatLng(); post({ type: 'pick', lat: ll.lat, lng: ll.lng }); });
    }
  </script>
</body>
</html>`;
}

export function MapPreview({
  lat,
  lng,
  height = 200,
  onPick,
  onInteractingChange,
}: {
  lat: number;
  lng: number;
  height?: number;
  /** Si se pasa, el mapa es editable y reporta la coordenada elegida. */
  onPick?: (lat: number, lng: number) => void;
  /** Avisa cuando el dedo entra/sale del mapa, para congelar el scroll padre. */
  onInteractingChange?: (active: boolean) => void;
}) {
  const editable = !!onPick;
  // Solo se re-renderiza el HTML si cambian las coordenadas de origen o el modo.
  const html = useMemo(() => buildHtml(lat, lng, editable), [lat, lng, editable]);

  return (
    <View style={[styles.wrap, { height }]}>
      <WebView
        originWhitelist={['*']}
        // baseUrl https: da a la página un origen seguro, así los tiles y Leaflet
        // (que vienen por https) no se bloquean por "mixed content" en Android.
        source={{ html, baseUrl: 'https://appassets.local/' }}
        style={styles.web}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        androidLayerType="hardware"
        nestedScrollEnabled
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg.type === 'touch') {
              onInteractingChange?.(msg.active);
            } else if (msg.type === 'pick' && onPick) {
              onPick(msg.lat, msg.lng);
            }
          } catch {
            // Mensaje no esperado: se ignora.
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: Spacing.three,
    overflow: 'hidden',
    backgroundColor: '#e8e8e8',
  },
  web: { flex: 1, backgroundColor: 'transparent' },
});
