/**
 * Estadísticas de RUTINAS (sub-pantalla de la sección Rutinas).
 *
 * Resumen (entrenos/racha/ejercicios/kcal) + progresión: calorías por semana
 * (desde el historial `/sessions`) y peso/reps tope de un ejercicio elegido.
 *
 * El progreso de cambio físico (peso, altura, composición corporal) vive aparte,
 * dentro de Dieta (`/dieta/fisico`).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { getSessions } from '@/api/sessions';
import { BarChart } from '@/components/bar-chart';
import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { WorkoutSession } from '@/data/history';
import {
  caloriesByWeek,
  exerciseProgression,
  formatKcal,
  progressionUnit,
  streakDays,
  totalCalories,
  type ChartPoint,
} from '@/data/stats';
import { useWorkouts } from '@/store/workouts-store';

export default function EstadisticasRutinasScreen() {
  const router = useRouter();
  const { workouts } = useWorkouts();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setSessions(await getSessions(signal));
    } catch {
      // Silencioso: las secciones muestran su propio vacío.
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar]);

  const ejerciciosDistintos = useMemo(
    () => new Set(workouts.flatMap((w) => w.exercises.map((we) => we.exerciseId))).size,
    [workouts]
  );

  const stats = [
    { value: String(workouts.length), label: 'Entrenos' },
    { value: String(streakDays(workouts)), label: 'Racha' },
    { value: String(ejerciciosDistintos), label: 'Ejercicios' },
    { value: formatKcal(totalCalories(workouts)), label: 'kcal' },
  ];

  return (
    <ScreenFade>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={loading && sessions.length > 0}
                onRefresh={() => cargar()}
              />
            }>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="linkPrimary">‹ Rutinas</ThemedText>
            </Pressable>

            <ThemedText type="title">Estadísticas</ThemedText>

            <View style={styles.statsRow}>
              {stats.map((s) => (
                <View key={s.label} style={styles.statCard}>
                  <ThemedText type="title" style={styles.statValue}>
                    {s.value}
                  </ThemedText>
                  <ThemedText type="small" style={styles.statLabel}>
                    {s.label}
                  </ThemedText>
                </View>
              ))}
            </View>

            <SeccionRutinas sessions={sessions} loading={loading} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </ScreenFade>
  );
}

/** kcal por semana + progresión de un ejercicio elegido. */
function SeccionRutinas({ sessions, loading }: { sessions: WorkoutSession[]; loading: boolean }) {
  const { workouts } = useWorkouts();
  const [rutinaId, setRutinaId] = useState<string | null>(null);
  const [exerciseId, setExerciseId] = useState<string | null>(null);

  const rutina = workouts.find((w) => w.id === rutinaId) ?? workouts[0] ?? null;
  const ejercicios = rutina?.exercises ?? [];
  const exSel = ejercicios.find((e) => e.exerciseId === exerciseId) ?? ejercicios[0] ?? null;

  const kcalSemana = useMemo(() => caloriesByWeek(sessions), [sessions]);
  const progresion: ChartPoint[] = useMemo(
    () => (exSel ? exerciseProgression(sessions, exSel.exerciseId) : []),
    [sessions, exSel]
  );
  const unidad = exSel ? progressionUnit(sessions, exSel.exerciseId) : 'kg';

  if (loading && sessions.length === 0) {
    return <ActivityIndicator style={{ marginVertical: Spacing.four }} />;
  }

  return (
    <View style={styles.seccion}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Calorías por semana</ThemedText>
        <BarChart data={kcalSemana} unit="kcal" emptyText="Aún no cierras una semana." />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Progresión por ejercicio</ThemedText>

        {/* Selector de rutina */}
        <Pills
          items={workouts.map((w) => ({ id: w.id, label: w.title }))}
          selectedId={rutina?.id ?? null}
          onSelect={(id) => {
            setRutinaId(id);
            setExerciseId(null);
          }}
        />
        {/* Selector de ejercicio dentro de la rutina */}
        <Pills
          items={ejercicios.map((e) => ({ id: e.exerciseId, label: e.exercise.name }))}
          selectedId={exSel?.exerciseId ?? null}
          onSelect={setExerciseId}
        />

        <BarChart
          data={progresion}
          unit={unidad === 'kg' ? 'kg (peso tope)' : 'reps'}
          decimals={unidad === 'kg' ? 1 : 0}
          emptyText="Sin historial de este ejercicio todavía."
        />
      </ThemedView>
    </View>
  );
}

/** Fila de pills seleccionables (rutina/ejercicio). Scrollea horizontal. */
function Pills({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
      {items.map((it) => {
        const activa = it.id === selectedId;
        return (
          <Pressable key={it.id} onPress={() => onSelect(it.id)}>
            <ThemedView type="backgroundSelected" style={[styles.pill, activa && styles.pillActive]}>
              <ThemedText type="small" themeColor={activa ? 'text' : 'textSecondary'} numberOfLines={1}>
                {it.label}
              </ThemedText>
            </ThemedView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },

  statsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  statCard: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 20,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.half,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statValue: { color: '#FFFFFF', fontSize: 26, lineHeight: 32 },
  statLabel: { color: '#A7ABB3' },

  seccion: { gap: Spacing.two },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },

  pills: { gap: Spacing.two, paddingVertical: Spacing.half },
  pill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: 180,
  },
  pillActive: { borderColor: Accent },
});
