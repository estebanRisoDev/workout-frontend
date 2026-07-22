import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { listFeed, type FeedItem } from '@/api/feed';
import { getSessions } from '@/api/sessions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { WorkoutSession } from '@/data/history';
import { isTeacher } from '@/data/workouts';
import {
  findTodaysWorkout,
  firstName,
  initials,
  monthlyGoal,
  streakDays,
  todayLabel,
  trainingDaysPerWeek,
  weekCount,
  weekStatuses,
  workoutsDoneThisMonth,
  workoutSummary,
  type DayStatus,
} from '@/data/stats';
import { useTheme } from '@/hooks/use-theme';
import { useWorkouts } from '@/store/workouts-store';

/** Objetivo semanal por defecto. Aún no es configurable (no hay campo en la base). */
const OBJETIVO_SEMANAL = 5;

/** Color de cada barrita de la racha según su estado. */
const COLOR_DIA: Record<DayStatus, string> = {
  done: Accent, // completado
  missed: '#d9d9d9', // el día tenía rutina y pasó sin completar
  future: '#3a3a3a', // día con rutina que aún no llega
  rest: '#232323', // sin rutina ese día (descanso): apenas visible
};

/**
 * Barra de progreso circular dibujada con SVG.
 * @param progress valor de 0 a 1 (ej: 4/5 = 0.8)
 * @param children contenido que se muestra centrado dentro del aro
 */
function CircularProgress({
  size = 90,
  stroke = 10,
  progress = 0,
  color = Accent,
  children,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - stroke) / 2; // radio del aro
  const circumference = 2 * Math.PI * radius; // largo total de la vuelta
  const offset = circumference * (1 - progress); // cuánto se "recorta"

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {/* aro de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={stroke}
          fill="none"
        />
        {/* aro de progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {/* contenido centrado */}
      <View style={styles.circleCenter}>{children}</View>
    </View>
  );
}

/**
 * Fondo de franjas diagonales (placeholder de "foto"). Se estira al contenedor.
 */
function StripesBackground({ color = '#e2e2e2' }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern
          id="stripes"
          width={16}
          height={16}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={16} stroke={color} strokeWidth={9} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { workouts, user, status } = useWorkouts();

  // Historial de sesiones para el objetivo mensual (los alumnos; el profesor no).
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  useEffect(() => {
    if (isTeacher(user)) return;
    const ac = new AbortController();
    getSessions(ac.signal)
      .then(setSessions)
      .catch(() => {});
    return () => ac.abort();
  }, [user]);

  // El profesor no entrena: su Inicio es el feed de mensajes de la comunidad.
  if (isTeacher(user)) return <ProfesorInicio />;

  // Meta semanal = días con rutina registrada (Lun/Mié/Vie = 3), no un fijo.
  const done = weekCount(workouts);
  const goal = trainingDaysPerWeek(workouts) || OBJETIVO_SEMANAL;

  // Mes: objetivo = días de rutina × semanas del mes; hechos = historial + semana.
  const objetivoMes = monthlyGoal(workouts);
  const hechosMes = workoutsDoneThisMonth(sessions, workouts);

  // 7 barritas (lunes→domingo) derivadas de los `done` de cada workout.
  const week = weekStatuses(workouts);

  const hoy = findTodaysWorkout(workouts);
  const resumen = hoy ? workoutSummary(hoy) : null;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

        {/* HEADER: fila → texto a la izq, botón a la der */}
        <View style={styles.topSection}>
          <View style={styles.topSubSection}>
            <ThemedText type="small" themeColor="textSecondary">
              {todayLabel()}
            </ThemedText>
            <ThemedText type="subtitle">
              Buenas, {firstName(user?.name ?? null, user?.email)}
            </ThemedText>
          </View>

          <Pressable
            onPress={() => router.push('/perfil')}
            hitSlop={8}
            style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
            <ThemedText style={{ color: 'white' }}>
              {initials(user?.name ?? null, user?.email)}
            </ThemedText>
          </Pressable>
        </View>

        {/* RACHA: dos tarjetas lado a lado */}
        <View style={styles.streakSection}>
          <View style={styles.streakSubSection1}>
            <ThemedText type="small" themeColor="textSecondary">
              RACHA
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: 'white' }}>
              {streakDays(workouts)} {streakDays(workouts) === 1 ? 'día' : 'días'}
            </ThemedText>

            {/* fila de 7 días: una barrita por día */}
            <View style={styles.weekRow}>
              {week.map((estado, i) => (
                <View
                  key={i}
                  style={[styles.dayBar, { backgroundColor: COLOR_DIA[estado] }]}
                />
              ))}
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.streakSubSection2}>
            <CircularProgress progress={done / goal}>
              <ThemedText type="smallBold">
                {done}/{goal}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Semana
              </ThemedText>
            </CircularProgress>
          </ThemedView>
        </View>

        {/* ACCESOS: rutinas, dieta y comunidad (antes eran pestañas) */}
        <View style={styles.accessRow}>
          <AccessCard icon="file-text" label="Rutinas" onPress={() => router.push('/workouts')} />
          <AccessCard icon="coffee" label="Dieta" onPress={() => router.push('/dieta')} />
          <AccessCard icon="globe" label="Comunidad" onPress={() => router.push('/comunidad')} />
        </View>

        {/* ENTRENAMIENTO DE HOY.
            - Sin rutinas todavía → onboarding "Armar workout".
            - Hoy toca una rutina → la tarjeta de esa rutina.
            - Tiene rutinas pero hoy no toca → NO se muestra nada (ni el título). */}
        {workouts.length === 0 ? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              ENTRENAMIENTO DE HOY
            </ThemedText>
            {status === 'loading' ? (
              <ActivityIndicator style={styles.todayLoader} />
            ) : (
              <View style={styles.todayCard}>
                <View style={styles.todayInfo}>
                  <ThemedText type="subtitle" style={styles.todayTitle}>
                    Sin workouts todavía
                  </ThemedText>
                  <ThemedText type="small" style={styles.metaText}>
                    Arma tu primera rutina y aparecerá acá.
                  </ThemedText>
                  <Pressable
                    onPress={() => router.push('/workouts/armar')}
                    style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.startButtonText}>
                      Armar workout
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        ) : hoy && resumen ? (
          <>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              ENTRENAMIENTO DE HOY
            </ThemedText>
            <View style={styles.todayCard}>
            {/* parte superior: imagen del primer ejercicio (preview de lo que
                viene); si ese ejercicio no tiene imagen, caen las franjas. */}
            <View style={styles.todayPhoto}>
              {hoy.exercises[0]?.exercise.imageUrl ? (
                <Image
                  source={hoy.exercises[0].exercise.imageUrl}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <StripesBackground />
              )}

              {/* La píldora sale de `Workout.day`; si no coincide con hoy, se avisa. */}
              <View style={styles.dayPill}>
                <ThemedText type="smallBold" style={styles.dayPillText}>
                  {(hoy.day || 'Sin día asignado').toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.photoTag}>
                <ThemedText type="small" style={styles.photoTagText}>
                  programado para hoy
                </ThemedText>
              </View>
            </View>

            {/* parte inferior: info + acciones */}
            <View style={styles.todayInfo}>
              <ThemedText type="subtitle" style={styles.todayTitle}>
                {hoy.title}
              </ThemedText>

              <View style={styles.metaRow}>
                <ThemedText type="small" style={styles.metaText}>
                  {resumen.exercises} {resumen.exercises === 1 ? 'ejercicio' : 'ejercicios'}
                </ThemedText>
                <ThemedText type="small" style={styles.metaDot}>·</ThemedText>
                <ThemedText type="small" style={styles.metaText}>~{resumen.minutes} min</ThemedText>
                <ThemedText type="small" style={styles.metaDot}>·</ThemedText>
                <ThemedText type="small" style={styles.metaText}>{resumen.sets} series</ThemedText>
              </View>

              <View style={styles.todayActions}>
                <Pressable
                  onPress={() => router.push(`/workouts/${hoy.id}`)}
                  style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.startButtonText}>
                    ▶  Empezar
                  </ThemedText>
                </Pressable>

                <Pressable
                  onPress={() => router.push(`/workouts/${hoy.id}`)}
                  style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
                  <ThemedText style={styles.iconButtonText}>›</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
          </>
        ) : null}

        {/* ESTADÍSTICAS: dos tarjetas */}
        <View style={styles.statsRow}>
          {[
            { value: `${hechosMes}/${objetivoMes}`, label: 'Entrenos / mes' },
            { value: String(streakDays(workouts)), label: 'Racha (días)' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <ThemedText type="title" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText type="small" style={styles.statLabel}>
                {stat.label}
              </ThemedText>
            </View>
          ))}
        </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

// =====================================================================
// Inicio del PROFESOR: feed de mensajes recientes de la comunidad.
// =====================================================================

function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function ProfesorInicio() {
  const router = useRouter();
  const { user } = useWorkouts();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    async function cargar() {
      try {
        const list = await listFeed();
        if (vivo) setItems(list);
      } catch (e) {
        if (vivo) setError(e instanceof Error ? e.message : 'No se pudo cargar el feed');
      } finally {
        if (vivo) setLoading(false);
      }
    }
    cargar();
    const t = setInterval(cargar, 8000); // refresco para mensajes nuevos
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  function abrir(item: FeedItem) {
    if (item.source.type === 'discussion') {
      router.push({
        pathname: '/comunidad/discusiones/[id]',
        params: { id: item.source.id, title: item.source.title },
      });
    } else {
      router.push({
        pathname: '/comunidad/actividades/[id]',
        params: { id: item.source.id, title: item.source.title },
      });
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.feedHead}>
            <ThemedText type="subtitle">Hola, {firstName(user?.name ?? null, user?.email)}</ThemedText>
            <Pressable
              onPress={() => router.push('/perfil')}
              hitSlop={8}
              style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}>
              <ThemedText style={{ color: 'white' }}>
                {initials(user?.name ?? null, user?.email)}
              </ThemedText>
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Mensajes recientes de tus discusiones y actividades.
          </ThemedText>

          <Pressable
            onPress={() => router.push('/comunidad')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.accessWide}>
              <Feather name="globe" size={20} color={Accent} />
              <ThemedText type="smallBold" style={styles.accessWideLabel}>
                Ir a Comunidad
              </ThemedText>
              <Feather name="chevron-right" size={20} color="#8a8a8a" />
            </ThemedView>
          </Pressable>

          {loading && <ActivityIndicator style={styles.todayLoader} />}

          {error && !loading && (
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
          )}

          {!loading && !error && items.length === 0 && (
            <ThemedView type="backgroundElement" style={styles.feedEmpty}>
              <Feather name="message-circle" size={22} color="#9a9a9a" />
              <ThemedText type="small" themeColor="textSecondary" style={styles.feedEmptyText}>
                Todavía no hay mensajes. Cuando alguien escriba en una discusión o
                actividad, aparecerá acá.
              </ThemedText>
            </ThemedView>
          )}

          {items.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => abrir(it)}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.feedRow}>
                {it.user.avatarUrl ? (
                  <Image source={{ uri: it.user.avatarUrl }} style={styles.feedAvatar} />
                ) : (
                  <View style={styles.feedAvatarFallback}>
                    <ThemedText type="smallBold" style={styles.feedAvatarText}>
                      {initials(it.user.name, undefined)}
                    </ThemedText>
                  </View>
                )}
                <View style={styles.feedInfo}>
                  <View style={styles.feedTopline}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.feedAuthor}>
                      {it.user.name?.trim() || 'Alguien'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {haceCuanto(it.createdAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.feedSource}>
                    <Feather
                      name={it.source.type === 'discussion' ? 'message-circle' : 'map-pin'}
                      size={12}
                      color={Accent}
                    />
                    <ThemedText type="small" numberOfLines={1} style={{ color: Accent }}>
                      {it.source.title}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {it.body}
                  </ThemedText>
                </View>
              </ThemedView>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

/** Tarjeta de acceso rápido en el Inicio (ícono + etiqueta). */
function AccessCard({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.accessCardWrap}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.accessCard, pressed && styles.pressed]}>
          <Feather name={icon} size={22} color={Accent} />
          <ThemedText type="smallBold">{label}</ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedEmpty: {
    borderRadius: Spacing.four,
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  feedEmptyText: { textAlign: 'center' },
  feedRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    alignItems: 'flex-start',
  },
  feedAvatar: { width: 42, height: 42, borderRadius: 9999 },
  feedAvatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 9999,
    backgroundColor: '#3a3a35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: { color: 'white' },
  feedInfo: { flex: 1, gap: Spacing.half },
  feedTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  feedAuthor: { flex: 1 },
  feedSource: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },

  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topSubSection: {
    flexDirection: 'column',
    gap: Spacing.half,
  },

  streakSection: {
    flexDirection: 'row', // ← fila: las dos tarjetas lado a lado
    gap: Spacing.three,
    // sin flex:1: la altura la define el padding/contenido de las tarjetas
  },

  streakSubSection1: {
    flex: 0.7, // 70% del ancho
    padding: Spacing.four, // ← padding = altura (antes no tenían y desaparecían)
    borderRadius: 25,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'black',
  },

  weekRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },

  dayBar: {
    flex: 1, // cada barrita reparte el ancho por igual
    height: 8,
    borderRadius: 9999,
  },

  streakSubSection2: {
    flex: 0.3, // 30% del ancho
    padding: Spacing.three,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButton: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },

  // --- ACCESOS RÁPIDOS ---
  accessRow: { flexDirection: 'row', gap: Spacing.two },
  accessCardWrap: { flex: 1 },
  accessCard: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  accessWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  accessWideLabel: { flex: 1 },

  // --- ENTRENAMIENTO DE HOY ---
  sectionLabel: {
    marginTop: Spacing.two,
    letterSpacing: 1,
  },

  todayCard: {
    borderRadius: 24,
    overflow: 'hidden', // recorta las franjas y las esquinas
    backgroundColor: '#000000',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },

  todayPhoto: {
    height: 170,
    padding: Spacing.three,
    justifyContent: 'space-between', // pill arriba, tag abajo
    alignItems: 'flex-start',
    backgroundColor: '#16294A',
  },

  dayPill: {
    backgroundColor: Accent,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
  },
  dayPillText: {
    color: 'black',
    letterSpacing: 0.5,
  },

  photoTag: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  photoTagText: {
    color: '#8a8a8a',
  },

  todayInfo: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  todayTitle: {
    color: '#FFFFFF',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaText: {
    color: '#A7ABB3',
  },
  metaDot: {
    color: '#5a5e66',
  },

  todayActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  startButton: {
    flex: 1, // ocupa el ancho disponible
    height: 56,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'black',
    fontSize: 16,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 24,
  },

  // --- ESTADÍSTICAS ---
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1, // cada tarjeta ocupa la mitad
    backgroundColor: '#000000',
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 40,
  },
  statLabel: {
    color: '#A7ABB3',
  },

  todayLoader: {
    marginVertical: Spacing.five,
  },
  pressed: {
    opacity: 0.85,
  },
});
