import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { type WorkoutExercise, type WorkoutSet, type WorkoutSetInput } from '@/data/workouts';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useWorkouts } from '@/store/workouts-store';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    status,
    error,
    getWorkout,
    updateWorkout,
    removeWorkout,
    addExercise,
    updateExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
  } = useWorkouts();

  const workout = getWorkout(id);

  // Entrar por deep link antes de que termine la carga inicial no es "no existe".
  if (!workout && status === 'loading') {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!workout) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText type="subtitle">Rutina no encontrada</ThemedText>
        <Pressable onPress={() => router.replace('/workouts')}>
          <ThemedText type="linkPrimary">Volver a Rutinas</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  /**
   * Tras borrar se va SIEMPRE a la lista, no `router.back()`.
   *
   * Si la rutina se creó desde el constructor, la pantalla anterior del stack
   * es "Armar workout": con `back()` terminabas en el constructor después de
   * eliminar, que no es donde nadie espera aterrizar.
   *
   * Se espera al servidor antes de navegar: si el borrado falla, el store
   * revierte y conviene seguir viendo la rutina en vez de haberse ido ya.
   */
  async function handleDelete() {
    await removeWorkout(workout!.id);
    router.replace('/workouts');
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
          },
        ]}>
        {/* Va explícitamente a la lista: el botón dice "Rutinas" y `back()` no
            garantizaba llegar ahí (podía devolver al constructor). */}
        <Pressable onPress={() => router.replace('/workouts')} hitSlop={8}>
          <ThemedText type="linkPrimary">‹ Rutinas</ThemedText>
        </Pressable>

        {/* Cabecera editable */}
        <Field
          value={workout.title}
          onChangeText={(t) => updateWorkout(workout.id, { title: t })}
          placeholder="Título de la rutina"
          textType="title"
        />
        <Field
          value={workout.day ?? ''}
          onChangeText={(t) => updateWorkout(workout.id, { day: t })}
          placeholder="Día / etiqueta (ej: Lunes - Empuje)"
        />
        <Field
          value={workout.notes ?? ''}
          onChangeText={(t) => updateWorkout(workout.id, { notes: t })}
          placeholder="Notas de la sesión"
          multiline
        />

        {error ? (
          <ThemedText type="small" themeColor="textSecondary">
            ⚠︎ {error}
          </ThemedText>
        ) : null}

        {workout.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            onRename={(name) => updateExercise(workout.id, ex.id, { name })}
            onEditMuscle={(muscleGroup) => updateExercise(workout.id, ex.id, { muscleGroup })}
            onRemove={() => void removeExercise(workout.id, ex.id)}
            onAddSet={() => void addSet(workout.id, ex.id)}
            onUpdateSet={(setId, patch) => updateSet(workout.id, ex.id, setId, patch)}
            onRemoveSet={(setId) => void removeSet(workout.id, ex.id, setId)}
          />
        ))}

        <Pressable
          onPress={() => void addExercise(workout.id)}
          style={({ pressed }) => pressed && styles.pressed}>
          <ThemedView type="backgroundSelected" style={styles.bigButton}>
            <ThemedText type="smallBold">+ Añadir ejercicio</ThemedText>
          </ThemedView>
        </Pressable>

        <Pressable onPress={handleDelete} style={({ pressed }) => pressed && styles.pressed}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.deleteText}>
            Eliminar rutina
          </ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

function ExerciseCard({
  exercise,
  onRename,
  onEditMuscle,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
}: {
  exercise: WorkoutExercise;
  onRename: (name: string) => void;
  onEditMuscle: (muscleGroup: string) => void;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: WorkoutSetInput) => void;
  onRemoveSet: (setId: string) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView type="backgroundElement" style={styles.cardHeader}>
        <ThemedView type="backgroundElement" style={styles.cardHeaderText}>
          <Field
            value={exercise.exercise.name}
            onChangeText={onRename}
            placeholder="Nombre del ejercicio"
            textType="subtitle"
          />
          <Field
            value={exercise.exercise.muscleGroup ?? ''}
            onChangeText={onEditMuscle}
            placeholder="Grupo muscular"
          />
        </ThemedView>
        <Pressable onPress={onRemove} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            ✕
          </ThemedText>
        </Pressable>
      </ThemedView>

      {/* Encabezado de columnas */}
      <ThemedView type="backgroundElement" style={styles.setRow}>
        <ColHead label="#" flex={0.5} />
        <ColHead label="Reps" />
        <ColHead label="Kg" />
        <ColHead label="RPE" />
        <ColHead label="✓" flex={0.6} />
        <ColHead label="" flex={0.5} />
      </ThemedView>

      {exercise.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i + 1}
          set={set}
          onUpdate={(patch) => onUpdateSet(set.id, patch)}
          onRemove={() => onRemoveSet(set.id)}
        />
      ))}

      <Pressable onPress={onAddSet} style={({ pressed }) => pressed && styles.pressed}>
        <ThemedView type="backgroundSelected" style={styles.smallButton}>
          <ThemedText type="small">+ Serie</ThemedText>
        </ThemedView>
      </Pressable>
    </ThemedView>
  );
}

function SetRow({
  index,
  set,
  onUpdate,
  onRemove,
}: {
  index: number;
  set: WorkoutSet;
  onUpdate: (patch: WorkoutSetInput) => void;
  onRemove: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.setRow}>
      <ThemedText type="small" themeColor="textSecondary" style={[styles.cell, { flex: 0.5 }]}>
        {index}
      </ThemedText>
      {/* `reps` es obligatorio en el backend: vaciar el campo cuenta como 0. */}
      <NumberCell value={set.reps} onChangeNumber={(reps) => onUpdate({ reps: reps ?? 0 })} />
      <NumberCell
        value={set.weightKg}
        onChangeNumber={(weightKg) => onUpdate({ weightKg })}
        placeholder="-"
      />
      <NumberCell value={set.rpe} onChangeNumber={(rpe) => onUpdate({ rpe })} placeholder="-" />
      <Pressable
        onPress={() => onUpdate({ done: !set.done })}
        style={[styles.cell, { flex: 0.6 }]}
        hitSlop={6}>
        <ThemedView
          type={set.done ? 'backgroundSelected' : 'backgroundElement'}
          style={styles.checkbox}>
          <ThemedText type="small">{set.done ? '✓' : ''}</ThemedText>
        </ThemedView>
      </Pressable>
      <Pressable onPress={onRemove} style={[styles.cell, { flex: 0.5 }]} hitSlop={6}>
        <ThemedText type="small" themeColor="textSecondary">
          ✕
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function ColHead({ label, flex = 1 }: { label: string; flex?: number }) {
  return (
    <ThemedText type="small" themeColor="textSecondary" style={[styles.cell, { flex }]}>
      {label}
    </ThemedText>
  );
}

function NumberCell({
  value,
  onChangeNumber,
  placeholder,
}: {
  value: number | null;
  onChangeNumber: (n: number | null) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <TextInput
      value={value === null ? '' : String(value)}
      onChangeText={(t) => {
        if (t.trim() === '') return onChangeNumber(null);
        const n = Number(t.replace(',', '.'));
        if (!Number.isNaN(n)) onChangeNumber(n);
      }}
      keyboardType="numeric"
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      style={[styles.cell, styles.numberInput, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
    />
  );
}

/** Campo de texto themed reutilizable. */
function Field({
  value,
  onChangeText,
  placeholder,
  textType = 'default',
  multiline,
  keyboardType,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  textType?: 'title' | 'subtitle' | 'default';
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  const theme = useTheme();
  const sizeStyle =
    textType === 'title' ? styles.inputTitle : textType === 'subtitle' ? styles.inputSubtitle : styles.inputDefault;
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      multiline={multiline}
      keyboardType={keyboardType}
      style={[sizeStyle, { color: theme.text }]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  inputTitle: {
    fontSize: 40,
    fontWeight: '600',
    lineHeight: 46,
  },
  inputSubtitle: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  inputDefault: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  card: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  cardHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
  },
  numberInput: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    fontFamily: Fonts?.mono,
    fontSize: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  smallButton: {
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  bigButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  deleteText: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
