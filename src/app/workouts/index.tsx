import { Link } from 'expo-router';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutsSegmented } from '@/components/workouts-segmented';
import { formatWorkoutDate, totalSets, totalVolume, type Workout } from '@/data/workouts';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkouts } from '@/store/workouts-store';

export default function WorkoutsListScreen() {
  const { workouts, status, error, reload } = useWorkouts();
  const insets = useSafeAreaInsets();

  return (
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
          <WorkoutCard key={w.id} workout={w} />
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
  );
}

function WorkoutCard({ workout }: { workout: Workout }) {
  return (
    <Link href={`/workouts/${workout.id}`} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="subtitle">{workout.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {workout.day ? `${workout.day} · ` : ''}
            {formatWorkoutDate(workout)}
          </ThemedText>

          <ThemedView type="backgroundElement" style={styles.metaRow}>
            <Stat label="Ejercicios" value={workout.exercises.length} />
            <Stat label="Series" value={totalSets(workout)} />
            <Stat label="Volumen" value={`${totalVolume(workout)} kg`} />
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
    flex: 1,
    alignItems: 'center',
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
