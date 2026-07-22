import { Feather } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutsSegmented } from '@/components/workouts-segmented';
import { formatWorkoutDate, totalSets, type Workout } from '@/data/workouts';
import { formatKcal, workoutCalories } from '@/data/stats';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkouts } from '@/store/workouts-store';

export default function WorkoutsListScreen() {
  const { workouts, status, error, reload, removeWorkout } = useWorkouts();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Confirmación antes de borrar: la eliminación no se puede deshacer.
  function confirmarEliminar(workout: Workout) {
    Alert.alert(
      'Eliminar rutina',
      `¿Eliminar «${workout.title}»? Esto no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => void removeWorkout(workout.id) },
      ]
    );
  }

  return (
    <ScreenFade>
    <ThemedView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={status === 'loading'} onRefresh={reload} />}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}>
        <ThemedText type="title">Rutinas</ThemedText>
        <WorkoutsSegmented />

        {/* Acceso a las estadísticas de rutinas (kcal/semana, progresión).
            Misma card que "Progreso físico" en Dieta, para que se lea igual. */}
        <Pressable
          onPress={() => router.push('/workouts/estadisticas')}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundElement" style={styles.statsCard}>
            <View style={styles.statsIcon}>
              <Feather name="bar-chart-2" size={18} color={Accent} />
            </View>
            <View style={styles.statsInfo}>
              <ThemedText type="smallBold">Estadísticas</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Calorías por semana y progresión
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={20} color="#8a8a8a" />
          </ThemedView>
        </Pressable>

        {error ? (
          <ThemedView style={styles.notice}>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
            <Pressable onPress={reload} hitSlop={8}>
              <ThemedText type="linkPrimary">Reintentar</ThemedText>
            </Pressable>
          </ThemedView>
        ) : null}

        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} onDelete={() => confirmarEliminar(w)} />
        ))}

        {/* El spinner ocupa solo el área de la lista, no toda la sección. */}
        {status === 'loading' && workouts.length === 0 && (
          <ActivityIndicator style={styles.listLoader} />
        )}

        {/* Sin botón propio de "crear": la entrada al constructor es la pestaña
            de arriba. Un segundo botón acá competía con ella y hacía parecer
            que había dos formas distintas de armar una rutina. */}
        {status === 'ready' && workouts.length === 0 && (
          <ThemedView style={styles.emptyBox}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Aún no tienes rutinas guardadas.
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
              Crea una desde la pestaña «Armar workout».
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </ThemedView>
    </ScreenFade>
  );
}

function WorkoutCard({ workout, onDelete }: { workout: Workout; onDelete: () => void }) {
  return (
    <Link href={`/workouts/${workout.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              {workout.title}
            </ThemedText>
            {/* Basurero: el toque lo captura este Pressable, no navega a la rutina. */}
            <Pressable onPress={onDelete} hitSlop={10} style={styles.deleteBtn}>
              <Feather name="trash-2" size={18} color="#8a8a8a" />
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {workout.day ? `${workout.day} · ` : ''}
            {formatWorkoutDate(workout)}
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.metaRow}>
            <Stat label="Ejercicios" value={workout.exercises.length} />
            <Stat label="Series" value={totalSets(workout)} />
            {/* Calorías quemadas acumuladas de la rutina (series ya marcadas). */}
            <Stat label="kcal" value={`🔥 ${formatKcal(workoutCalories(workout))}`} />
          </ThemedView>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <ThemedView type="backgroundElement" style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    // Sin `alignItems: 'center'`: eso encogía el ScrollView y dejaba el
    // segmented más angosto que en la pantalla "Armar workout" (que solo usa
    // flex: 1). El centrado en pantallas anchas ya lo resuelve `content` con
    // `alignSelf: 'center'` + `maxWidth`. Así ambas pantallas quedan idénticas.
    flex: 1,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  statsIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#16294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsInfo: { flex: 1, gap: Spacing.half },
  notice: {
    gap: Spacing.one,
  },
  listLoader: {
    marginTop: Spacing.five,
  },
  emptyBox: {
    gap: Spacing.three,
    marginTop: Spacing.four,
  },
  card: {
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardTitle: { flex: 1 },
  deleteBtn: {
    padding: Spacing.one,
    marginTop: Spacing.half,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  stat: {
    gap: Spacing.half,
  },
  empty: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  pressed: {
    opacity: 0.7,
  },
});
