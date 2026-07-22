/**
 * Actividades (solo profesor): crear salidas, verlas activas, cerrarlas y ver el
 * historial (Término). Cerrar es un fakedelete en el backend; las de un día se
 * auto-cierran solas cuando su día termina.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  closeActivity,
  createActivity,
  listActivities,
  listEndedActivities,
  type Activity,
} from '@/api/activities';
import { geocode, reverseGeocode, type GeoResult } from '@/api/geocode';
import { MapPreview } from '@/components/map-preview';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

// Centro por defecto del mapa hasta que se elige una dirección (región de
// Concepción, Chile; es solo el encuadre inicial, no una ubicación guardada).
const DEFAULT_CENTER = { lat: -36.827, lng: -73.05 };

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function ActividadesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const soyProfesor = isTeacher(user);

  const [activas, setActivas] = useState<Activity[]>([]);
  const [historial, setHistorial] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario de creación.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  // Coordenadas elegidas (para guardar) y el centro del mapa. Se separan a
  // propósito: al arrastrar el pin cambia `coords` pero NO el centro, así el
  // mapa (WebView) no se recarga en cada movimiento. El centro solo salta cuando
  // eliges una dirección del buscador.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [saving, setSaving] = useState(false);
  // Congela el scroll de la pantalla mientras se manipula el mapa.
  const [mapLocked, setMapLocked] = useState(false);
  // Modal del formulario (se abre con el botón "+").
  const [formOpen, setFormOpen] = useState(false);

  // Debounce del autocompletado: no consultamos el mapa en cada tecla.
  const geoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetForm() {
    setTitle('');
    setDescription('');
    setAddress('');
    setCoords(null);
    setMapCenter(DEFAULT_CENTER);
    setSuggestions([]);
    setAllDay(true);
  }

  function abrirCrear() {
    resetForm();
    setError(null);
    setFormOpen(true);
  }

  function onAddressChange(text: string) {
    setAddress(text);
    setCoords(null); // al editar el texto, la dirección deja de estar "fijada"
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

  // Dirección → pin: elegir una sugerencia mueve el pin a esa dirección.
  function elegirDireccion(r: GeoResult) {
    setAddress(r.displayName);
    setCoords({ lat: r.lat, lng: r.lng });
    setMapCenter({ lat: r.lat, lng: r.lng }); // recentra el mapa en la dirección
    setSuggestions([]);
  }

  // Pin → dirección: al arrastrar/tocar el mapa, guardamos la coordenada y
  // rellenamos el campo de dirección con la dirección real de ese punto.
  async function onMapPick(la: number, ln: number) {
    setCoords({ lat: la, lng: ln });
    setSuggestions([]);
    setAddress('Buscando dirección…');
    try {
      const r = await reverseGeocode(la, ln);
      setAddress(r.displayName);
    } catch {
      setAddress(`${la.toFixed(5)}, ${ln.toFixed(5)}`);
    }
  }

  useEffect(() => {
    if (user && !soyProfesor) router.replace('/comunidad');
  }, [user, soyProfesor, router]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, h] = await Promise.all([listActivities(), listEndedActivities()]);
      setActivas(a);
      setHistorial(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las actividades');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (soyProfesor) void cargar();
  }, [soyProfesor, cargar]);

  async function handleCrear() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createActivity({
        title: title.trim(),
        description: description.trim() || null,
        addressText: address.trim() || null,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        allDay,
      });
      resetForm();
      setFormOpen(false);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear la actividad');
    } finally {
      setSaving(false);
    }
  }

  async function handleCerrar(id: string) {
    try {
      await closeActivity(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la actividad');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="linkPrimary">‹ Panel</ThemedText>
          </Pressable>

          <View style={styles.titleRow}>
            <ThemedText
              type="title"
              style={styles.titleText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              Actividades
            </ThemedText>
            <Pressable
              onPress={abrirCrear}
              style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
              <Feather name="plus" size={26} color="black" />
            </Pressable>
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {/* Activas */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            ACTIVAS ({activas.length})
          </ThemedText>

          {loading && <ActivityIndicator style={styles.loader} />}

          {!loading && activas.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              No hay actividades activas. Toca “+” para crear una.
            </ThemedText>
          )}

          {activas.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              onOpen={() =>
                router.push({
                  pathname: '/comunidad/actividades/[id]',
                  params: { id: a.id, title: a.title },
                })
              }
              onClose={() => handleCerrar(a.id)}
            />
          ))}

          {/* Término / historial */}
          {historial.length > 0 && (
            <>
              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                TÉRMINO · HISTORIAL ({historial.length})
              </ThemedText>
              {historial.map((a) => (
                <ActivityRow
                  key={a.id}
                  activity={a}
                  ended
                  onOpen={() =>
                    router.push({
                      pathname: '/comunidad/actividades/[id]',
                      params: { id: a.id, title: a.title },
                    })
                  }
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal de nueva actividad (formulario + mapa) */}
      <Modal
        visible={formOpen}
        animationType="slide"
        onRequestClose={() => setFormOpen(false)}
        transparent={false}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">Nueva actividad</ThemedText>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={!mapLocked}
              showsVerticalScrollIndicator={false}>
              <Input value={title} onChangeText={setTitle} placeholder="Título (ej: Calistenia en Penco)" />
              <Input value={description} onChangeText={setDescription} placeholder="Descripción (opcional)" multiline />

              {/* Dirección con autocompletado de mapa (OpenStreetMap, sin key). */}
              <View>
                <View style={styles.addressRow}>
                  <TextInput
                    value={address}
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
                        name={coords ? 'check-circle' : 'map-pin'}
                        size={18}
                        color={coords ? Accent : theme.textSecondary}
                      />
                    )}
                  </View>
                </View>

                {suggestions.length > 0 && (
                  <ThemedView type="backgroundElement" style={styles.suggestions}>
                    {suggestions.map((r, i) => (
                      <Pressable
                        key={`${r.lat},${r.lng},${i}`}
                        onPress={() => elegirDireccion(r)}
                        style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}>
                        <Feather name="map-pin" size={14} color={theme.textSecondary} />
                        <ThemedText type="small" numberOfLines={2} style={styles.suggestionText}>
                          {r.displayName}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ThemedView>
                )}

                <ThemedText type="small" themeColor="textSecondary" style={styles.coordsHint}>
                  {coords
                    ? 'Ubicación fijada ✓ — arrastra el pin o toca el mapa para ajustar.'
                    : 'Busca una dirección arriba, o arrastra/toca el mapa para marcar el punto.'}
                </ThemedText>
                <View style={styles.mapWrap}>
                  <MapPreview
                    lat={mapCenter.lat}
                    lng={mapCenter.lng}
                    height={220}
                    onPick={onMapPick}
                    onInteractingChange={setMapLocked}
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchText}>
                  <ThemedText type="smallBold">Actividad de un día</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Se cierra sola cuando termina el día.
                  </ThemedText>
                </View>
                <Switch
                  value={allDay}
                  onValueChange={setAllDay}
                  trackColor={{ true: Accent, false: theme.backgroundSelected }}
                />
              </View>
            </ScrollView>

            <Pressable
              onPress={handleCrear}
              disabled={!title.trim() || saving}
              style={({ pressed }) => [
                styles.cta,
                styles.ctaModal,
                pressed && styles.pressed,
                (!title.trim() || saving) && styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.ctaText}>
                  Crear y publicar
                </ThemedText>
              )}
            </Pressable>
          </SafeAreaView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

function ActivityRow({
  activity,
  onOpen,
  onClose,
  ended,
}: {
  activity: Activity;
  onOpen?: () => void;
  onClose?: () => void;
  ended?: boolean;
}) {
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView type="backgroundElement" style={[styles.row, ended && styles.rowEnded]}>
        <View style={styles.rowInfo}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {activity.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {activity.addressText ? `${activity.addressText} · ` : ''}
            {formatFecha(activity.scheduledFor)}
            {activity.allDay ? ' · todo el día' : ''}
          </ThemedText>
        </View>

        {ended ? (
          <ThemedText type="small" themeColor="textSecondary">
            cerrada
          </ThemedText>
        ) : (
          <Pressable onPress={onClose} hitSlop={8} style={({ pressed }) => pressed && styles.pressed}>
            <ThemedText type="smallBold" style={styles.closeText}>
              Cerrar
            </ThemedText>
          </Pressable>
        )}
      </ThemedView>
    </Pressable>
  );
}

function Input({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      style={[
        styles.input,
        { color: theme.text, backgroundColor: theme.backgroundSelected },
        multiline && styles.inputMultiline,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleText: { flex: 1 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  addressRow: { position: 'relative', justifyContent: 'center' },
  addressInput: { paddingRight: 44 },
  addressIcon: { position: 'absolute', right: Spacing.three },
  suggestions: {
    borderRadius: Spacing.two,
    marginTop: Spacing.one,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  suggestionText: { flex: 1 },
  coordsHint: { marginTop: Spacing.one },
  mapWrap: { marginTop: Spacing.two },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  switchText: { flex: 1, gap: Spacing.half },
  cta: {
    height: 48,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  ctaText: { color: 'black', fontSize: 16 },
  ctaModal: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionLabel: { marginTop: Spacing.two, letterSpacing: 1 },
  loader: { marginVertical: Spacing.four },
  error: { color: '#d9534f' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowEnded: { opacity: 0.6 },
  rowInfo: { flex: 1, gap: Spacing.half },
  closeText: { color: '#d9534f' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
