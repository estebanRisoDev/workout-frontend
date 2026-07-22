/**
 * Detalle de una actividad. Arriba, su info + temporizador (si es de un día,
 * cuánto falta para que se cierre sola). Debajo, dos botones — "Ver dirección"
 * (mapa) y "Chat" — que alternan el panel.
 *
 * El chat muere con la actividad: si está cerrada, se ven los mensajes pero no
 * se puede escribir. Se refresca por polling.
 */

import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getActivity,
  listActivityMessages,
  postActivityMessage,
  updateActivity,
  type Activity,
} from '@/api/activities';
import { deleteMessage, type ChatMessage } from '@/api/discussions';
import { reportMessage } from '@/api/moderation';
import { LocationPicker, type LocationValue } from '@/components/location-picker';
import { MapPreview } from '@/components/map-preview';
import {
  DateDivider,
  MessageBubble,
  RemovedTombstone,
  buildChatItems,
} from '@/components/message-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

const POLL_MS = 4000;
type Vista = 'mapa' | 'chat';

/** Medianoche siguiente al día de la actividad: cuándo se auto-cierra. */
function closesAt(activity: Activity): Date | null {
  if (!activity.allDay) return null;
  const d = new Date(activity.scheduledFor);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function formatRestante(ms: number): string {
  if (ms <= 0) return 'Cerrando…';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function ActividadDetalleScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mapLocked, setMapLocked] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [vista, setVista] = useState<Vista>('mapa');

  // Edición de ubicación (solo profesor).
  const soyProfesor = isTeacher(user);
  const [editando, setEditando] = useState(false);
  const [editLoc, setEditLoc] = useState<LocationValue>({ addressText: '', lat: null, lng: null });
  const [guardando, setGuardando] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const cerrada = !!activity?.deletedAt;

  function abrirEdicion() {
    if (!activity) return;
    setEditLoc({
      addressText: activity.addressText ?? '',
      lat: activity.lat,
      lng: activity.lng,
    });
    setEditando(true);
  }

  async function guardarUbicacion() {
    if (!id || guardando) return;
    setGuardando(true);
    setError(null);
    try {
      const fresh = await updateActivity(id, {
        addressText: editLoc.addressText || null,
        lat: editLoc.lat,
        lng: editLoc.lng,
      });
      setActivity(fresh);
      setEditando(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la ubicación');
    } finally {
      setGuardando(false);
    }
  }

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const cargarMensajes = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      try {
        const list = await listActivityMessages(id, signal);
        if (!signal?.aborted) setMessages(list);
      } catch {
        // Silencioso en el polling.
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    (async () => {
      try {
        const [a] = await Promise.all([
          getActivity(id, controller.signal),
          cargarMensajes(controller.signal),
        ]);
        if (!controller.signal.aborted) setActivity(a);
      } catch (e) {
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : 'No se pudo cargar la actividad');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    const timer = setInterval(() => cargarMensajes(), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [id, cargarMensajes]);

  async function enviar() {
    const body = text.trim();
    if (!body || sending || !id) return;
    setSending(true);
    setError(null);
    try {
      const nuevo = await postActivityMessage(id, body);
      setText('');
      setMessages((prev) => [...prev, nuevo]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  }

  async function borrar(messageId: string) {
    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar el mensaje');
    }
  }

  async function reportar(messageId: string) {
    try {
      await reportMessage(messageId);
      await cargarMensajes();
      Alert.alert('Gracias', 'El profesor revisará este mensaje.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reportar el mensaje');
    }
  }

  const cierre = activity ? closesAt(activity) : null;
  const tieneMapa = activity?.lat != null && activity?.lng != null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={insets.top}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="linkPrimary">‹</ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
              {activity?.title || title || 'Actividad'}
            </ThemedText>
            <View style={{ width: 16 }} />
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <View style={styles.flex}>
              {/* Info + temporizador (siempre visibles) */}
              {activity && (
                <View style={styles.info}>
                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={14} color={theme.textSecondary} />
                    <ThemedText type="small" themeColor="textSecondary" style={styles.flexShrink}>
                      {new Date(activity.scheduledFor).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                      })}
                      {activity.allDay ? ' · todo el día' : ''}
                    </ThemedText>
                  </View>

                  {cerrada ? (
                    <ThemedView type="backgroundElement" style={styles.timer}>
                      <Feather name="slash" size={16} color={theme.textSecondary} />
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        Actividad terminada · chat cerrado
                      </ThemedText>
                    </ThemedView>
                  ) : cierre ? (
                    <ThemedView type="backgroundElement" style={styles.timer}>
                      <Feather name="clock" size={16} color={Accent} />
                      <ThemedText type="smallBold">
                        Se cierra en {formatRestante(cierre.getTime() - now)}
                      </ThemedText>
                    </ThemedView>
                  ) : null}
                </View>
              )}

              {/* Dos botones: Ver dirección / Chat */}
              <View style={styles.tabs}>
                <TabButton
                  icon="map-pin"
                  label="Ver dirección"
                  active={vista === 'mapa'}
                  onPress={() => setVista('mapa')}
                />
                <TabButton
                  icon="message-circle"
                  label="Chat"
                  active={vista === 'chat'}
                  onPress={() => setVista('chat')}
                />
              </View>

              {vista === 'mapa' ? (
                <ScrollView
                  style={styles.flex}
                  contentContainerStyle={styles.panel}
                  scrollEnabled={!mapLocked}
                  keyboardShouldPersistTaps="handled">
                  {editando ? (
                    <>
                      <LocationPicker
                        value={editLoc}
                        onChange={setEditLoc}
                        onInteractingChange={setMapLocked}
                        mapHeight={280}
                      />
                      <View style={styles.editActions}>
                        <Pressable onPress={() => setEditando(false)} hitSlop={8}>
                          <ThemedText type="smallBold" themeColor="textSecondary">
                            Cancelar
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={guardarUbicacion}
                          disabled={guardando}
                          style={({ pressed }) => [
                            styles.saveBtn,
                            pressed && styles.pressed,
                            guardando && styles.disabled,
                          ]}>
                          {guardando ? (
                            <ActivityIndicator color="#000" />
                          ) : (
                            <ThemedText type="smallBold" style={styles.geoText}>
                              Guardar ubicación
                            </ThemedText>
                          )}
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      {activity?.addressText ? (
                        <View style={styles.metaRow}>
                          <Feather name="map-pin" size={14} color={theme.textSecondary} />
                          <ThemedText type="small" themeColor="textSecondary" style={styles.flexShrink}>
                            {activity.addressText}
                          </ThemedText>
                        </View>
                      ) : null}

                      {tieneMapa ? (
                        <>
                          <View style={styles.mapWrap}>
                            <MapPreview
                              lat={activity!.lat!}
                              lng={activity!.lng!}
                              height={300}
                              onInteractingChange={setMapLocked}
                            />
                          </View>
                          <Pressable
                            onPress={() => {
                              const label = encodeURIComponent(activity!.title);
                              Linking.openURL(
                                `geo:${activity!.lat},${activity!.lng}?q=${activity!.lat},${activity!.lng}(${label})`
                              );
                            }}
                            style={({ pressed }) => [styles.geoBtn, pressed && styles.pressed]}>
                            <Feather name="navigation" size={16} color="black" />
                            <ThemedText type="smallBold" style={styles.geoText}>
                              Cómo llegar
                            </ThemedText>
                          </Pressable>
                        </>
                      ) : (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                          Esta actividad no tiene ubicación en el mapa.
                        </ThemedText>
                      )}

                      {/* Editar ubicación: solo el profesor y solo si sigue activa. */}
                      {soyProfesor && !cerrada && (
                        <Pressable
                          onPress={abrirEdicion}
                          style={({ pressed }) => [styles.editBtn, pressed && styles.pressed]}>
                          <Feather name="edit-2" size={16} color={Accent} />
                          <ThemedText type="smallBold" style={{ color: Accent }}>
                            Editar ubicación
                          </ThemedText>
                        </Pressable>
                      )}

                      {activity?.description ? (
                        <ThemedText type="small" themeColor="textSecondary" style={styles.desc}>
                          {activity.description}
                        </ThemedText>
                      ) : null}
                    </>
                  )}
                </ScrollView>
              ) : (
                <>
                  <ScrollView
                    ref={scrollRef}
                    style={styles.flex}
                    contentContainerStyle={styles.panel}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
                    {messages.length === 0 && (
                      <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                        {cerrada ? 'Sin mensajes.' : 'Todavía no hay mensajes. Escribe el primero.'}
                      </ThemedText>
                    )}
                    {buildChatItems(messages).map((item) =>
                      item.kind === 'day' ? (
                        <DateDivider key={item.key} label={item.label} />
                      ) : item.kind === 'gap' ? (
                        <RemovedTombstone key={item.key} count={item.count} />
                      ) : (
                        <MessageBubble
                          key={item.key}
                          message={item.message}
                          mine={item.message.userId === user?.id}
                          canDelete={item.message.userId === user?.id || soyProfesor}
                          canReport={item.message.userId !== user?.id}
                          deleteAsButton={soyProfesor}
                          onDelete={() => borrar(item.message.id)}
                          onReport={() => reportar(item.message.id)}
                        />
                      )
                    )}
                  </ScrollView>

                  {error && (
                    <ThemedText type="small" style={styles.error}>
                      {error}
                    </ThemedText>
                  )}

                  {!cerrada && (
                    <View style={[styles.inputBar, { borderTopColor: theme.backgroundSelected }]}>
                      <TextInput
                        value={text}
                        onChangeText={setText}
                        placeholder="Escribe un mensaje…"
                        placeholderTextColor={theme.textSecondary}
                        multiline
                        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                      />
                      <Pressable
                        onPress={enviar}
                        disabled={!text.trim() || sending}
                        style={({ pressed }) => [
                          styles.sendBtn,
                          pressed && styles.pressed,
                          (!text.trim() || sending) && styles.disabled,
                        ]}>
                        {sending ? (
                          <ActivityIndicator color="#000" />
                        ) : (
                          <ThemedText type="smallBold" style={styles.sendText}>
                            Enviar
                          </ThemedText>
                        )}
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function TabButton({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tabPress, pressed && styles.pressed]}>
      <ThemedView
        type={active ? 'backgroundSelected' : 'backgroundElement'}
        style={[styles.tab, active && { borderColor: Accent }]}>
        <Feather name={icon} size={18} color={active ? Accent : theme.textSecondary} />
        <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
          {label}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerTitle: { flex: 1, flexShrink: 1 },
  loader: { marginTop: Spacing.five },
  info: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    alignSelf: 'flex-start',
  },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  tabPress: { flex: 1 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  mapWrap: { marginTop: Spacing.one },
  geoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: 14,
    backgroundColor: Accent,
    marginTop: Spacing.two,
  },
  geoText: { color: 'black' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    marginTop: Spacing.three,
  },
  saveBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  desc: { marginTop: Spacing.two },
  empty: { textAlign: 'center', marginTop: Spacing.four },
  bubbleWrap: { maxWidth: '85%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapOther: { alignSelf: 'flex-start' },
  bubble: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  author: { color: '#8a8a8a', fontSize: 12 },
  authorMine: { color: 'rgba(0,0,0,0.55)' },
  bodyMine: { color: 'black' },
  hora: { fontSize: 10, alignSelf: 'flex-end' },
  horaMine: { color: 'rgba(0,0,0,0.55)' },
  error: { color: '#d9534f', textAlign: 'center', paddingHorizontal: Spacing.four },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    maxHeight: 120,
  },
  sendBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sendText: { color: 'black' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
