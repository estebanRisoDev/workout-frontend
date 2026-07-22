/**
 * Selector de ubicación reutilizable: campo de dirección con autocompletado
 * (OpenStreetMap, sin key) + mapa con pin arrastrable, sincronizados en ambos
 * sentidos (elegir dirección mueve el pin; mover el pin rellena la dirección).
 *
 * Es controlado: el estado vive en el padre (`value` + `onChange`). Avisa cuando
 * el dedo está sobre el mapa (`onInteractingChange`) para congelar el scroll.
 */

import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { geocode, reverseGeocode, type GeoResult } from '@/api/geocode';
import { MapPreview } from '@/components/map-preview';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// Encuadre inicial cuando aún no hay coordenada (región de Concepción, Chile).
const DEFAULT_CENTER = { lat: -36.827, lng: -73.05 };

export type LocationValue = { addressText: string; lat: number | null; lng: number | null };

export function LocationPicker({
  value,
  onChange,
  onInteractingChange,
  mapHeight = 220,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  onInteractingChange?: (active: boolean) => void;
  mapHeight?: number;
}) {
  const theme = useTheme();
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  // El centro solo salta al elegir dirección; NO al arrastrar el pin (así el
  // mapa no se recarga en cada movimiento).
  const [mapCenter, setMapCenter] = useState(() =>
    value.lat != null && value.lng != null ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER
  );
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fijada = value.lat != null && value.lng != null;

  function onAddressChange(text: string) {
    onChange({ addressText: text, lat: null, lng: null });
    if (geoTimer.current) clearTimeout(geoTimer.current);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    geoTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSuggestions(await geocode(text.trim()));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  }

  function elegir(r: GeoResult) {
    onChange({ addressText: r.displayName, lat: r.lat, lng: r.lng });
    setMapCenter({ lat: r.lat, lng: r.lng });
    setSuggestions([]);
  }

  async function onMapPick(la: number, ln: number) {
    setSuggestions([]);
    onChange({ addressText: 'Buscando dirección…', lat: la, lng: ln });
    try {
      const r = await reverseGeocode(la, ln);
      onChange({ addressText: r.displayName, lat: la, lng: ln });
    } catch {
      onChange({ addressText: `${la.toFixed(5)}, ${ln.toFixed(5)}`, lat: la, lng: ln });
    }
  }

  return (
    <View>
      <View style={styles.addressRow}>
        <TextInput
          value={value.addressText}
          onChangeText={onAddressChange}
          placeholder="Dirección / lugar (busca en el mapa)"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            styles.addressInput,
            { color: theme.text, backgroundColor: theme.backgroundElement },
          ]}
        />
        <View style={styles.addressIcon}>
          {searching ? (
            <ActivityIndicator size="small" />
          ) : (
            <Feather
              name={fijada ? 'check-circle' : 'map-pin'}
              size={18}
              color={fijada ? Accent : theme.textSecondary}
            />
          )}
        </View>
      </View>

      {suggestions.length > 0 && (
        <ThemedView type="backgroundElement" style={styles.suggestions}>
          {suggestions.map((r, i) => (
            <Pressable
              key={`${r.lat},${r.lng},${i}`}
              onPress={() => elegir(r)}
              style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText type="small" numberOfLines={2} style={styles.suggestionText}>
                {r.displayName}
              </ThemedText>
            </Pressable>
          ))}
        </ThemedView>
      )}

      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        {fijada
          ? 'Ubicación fijada ✓ — arrastra el pin o toca el mapa para ajustar.'
          : 'Busca una dirección arriba, o arrastra/toca el mapa para marcar el punto.'}
      </ThemedText>

      <View style={styles.mapWrap}>
        <MapPreview
          lat={mapCenter.lat}
          lng={mapCenter.lng}
          height={mapHeight}
          onPick={onMapPick}
          onInteractingChange={onInteractingChange}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  addressRow: { position: 'relative', justifyContent: 'center' },
  addressInput: { paddingRight: 44 },
  addressIcon: { position: 'absolute', right: Spacing.three },
  suggestions: { borderRadius: Spacing.two, marginTop: Spacing.one, overflow: 'hidden' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  suggestionText: { flex: 1 },
  hint: { marginTop: Spacing.one },
  mapWrap: { marginTop: Spacing.two },
  pressed: { opacity: 0.7 },
});
