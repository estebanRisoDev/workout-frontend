import { Link, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { totalSets, totalVolume, type Workout } from '@/data/workouts';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useWorkouts } from '@/store/workouts-store';

export default function WorkoutsListScreen() {
  const { workouts, addWorkout } = useWorkouts();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  function handleAdd() {
    const w = addWorkout();
    router.push(`/workouts/${w.id}`);
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Rutinas</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {workouts.length} {workouts.length === 1 ? 'rutina' : 'rutinas'}
          </ThemedText>
        </ThemedView>

        <Pressable onPress={handleAdd} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.addButton}>
            <ThemedText type="smallBold">+ Nueva rutina</ThemedText>
          </ThemedView>
        </Pressable>

        {workouts.map((w) => (
          <WorkoutCard key={w.id} workout={w} />
        ))}

        {workouts.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            No hay rutinas todavía. Crea la primera para empezar a programar.
          </ThemedText>
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
          {workout.day ? (
            <ThemedText type="small" themeColor="textSecondary">
              {workout.day}
            </ThemedText>
          ) : null}

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
  header: {
    gap: Spacing.one,
  },
  addButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
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
