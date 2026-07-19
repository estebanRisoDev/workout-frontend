import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  esDeHoy,
  findTodaysWorkout,
  firstName,
  formatTotalVolume,
  initials,
  monthCount,
  streakDays,
  todayLabel,
  weekCount,
  weekStatuses,
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
  missed: '#d9d9d9', // el día pasó sin completar
  future: '#3a3a3a', // todavía no llega
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

  const done = weekCount(workouts);
  const goal = OBJETIVO_SEMANAL;

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

        {/* ENTRENAMIENTO DE HOY */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          ENTRENAMIENTO DE HOY
        </ThemedText>

        {status === 'loading' && !hoy && <ActivityIndicator style={styles.todayLoader} />}

        {status !== 'loading' && !hoy && (
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

        {hoy && resumen && (
          <View style={styles.todayCard}>
            {/* parte superior: "foto" con franjas */}
            <View style={styles.todayPhoto}>
              <StripesBackground />

              {/* La píldora sale de `Workout.day`; si no coincide con hoy, se avisa. */}
              <View style={styles.dayPill}>
                <ThemedText type="smallBold" style={styles.dayPillText}>
                  {(hoy.day || 'Sin día asignado').toUpperCase()}
                </ThemedText>
              </View>

              <View style={styles.photoTag}>
                <ThemedText type="small" style={styles.photoTagText}>
                  {esDeHoy(hoy) ? 'programado para hoy' : 'tu rutina más reciente'}
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
        )}

        {/* ESTADÍSTICAS: dos tarjetas */}
        <View style={styles.statsRow}>
          {[
            { value: String(monthCount(workouts)), label: 'Entrenos / mes' },
            { value: formatTotalVolume(workouts), label: 'Volumen total' },
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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

  // --- ENTRENAMIENTO DE HOY ---
  sectionLabel: {
    marginTop: Spacing.two,
    letterSpacing: 1,
  },

  todayCard: {
    borderRadius: 24,
    overflow: 'hidden', // recorta las franjas y las esquinas
    backgroundColor: 'white',
    // sombra suave para que "flote"
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3, // sombra en Android
  },

  todayPhoto: {
    height: 170,
    padding: Spacing.three,
    justifyContent: 'space-between', // pill arriba, tag abajo
    alignItems: 'flex-start',
    backgroundColor: '#ededed',
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
    color: 'black',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaText: {
    color: '#6b6b6b',
  },
  metaDot: {
    color: '#c4c4c4',
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
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: 'black',
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
    backgroundColor: 'white',
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.one,
    // misma sombra suave que la tarjeta de hoy
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statValue: {
    color: 'black',
    fontSize: 34,
    lineHeight: 40,
  },
  statLabel: {
    color: '#6b6b6b',
  },

  todayLoader: {
    marginVertical: Spacing.five,
  },
  pressed: {
    opacity: 0.85,
  },
});
