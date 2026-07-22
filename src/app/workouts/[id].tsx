import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

import { CaloriesBurnedModal } from '@/components/calories-burned-modal';
import { ExercisePickerModal } from '@/components/exercise-picker-modal';
import { RestTimerBar } from '@/components/rest-timer-bar';
import { ExerciseThumb } from '@/components/exercise-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { caloriesForSet } from '@/data/nutrition';
import { esDeHoy, workoutCalories, formatKcal } from '@/data/stats';
import { type Exercise, type SetPatch, type WorkoutExercise, type WorkoutSet } from '@/data/workouts';
import { BottomTabInset, FontFamily, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';
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
    removeExercise,
    addSet,
    updateSet,
    removeSet,
  } = useWorkouts();

  const { user } = useAuth();
  const [picking, setPicking] = useState(false);
  // Calorías del último "done": no null ⇒ el pop-up está visible.
  const [burnedKcal, setBurnedKcal] = useState<number | null>(null);
  // Descanso en curso: segundos + un nonce que reinicia el conteo en cada serie.
  const [restSecs, setRestSecs] = useState<number | null>(null);
  const [restNonce, setRestNonce] = useState(0);

  // Peso corporal para el cálculo de calorías (la fórmula MET escala con él).
  // Si el perfil aún no tiene peso, se usa un valor neutro para no romper el cálculo.
  const bodyWeightKg = user?.weightKg ?? 70;

  // Identidades estables: evitan que el pop-up y la barra reinicien su animación
  // o su conteo en cada render del padre.
  const closeBurned = useCallback(() => setBurnedKcal(null), []);
  const closeRest = useCallback(() => setRestSecs(null), []);
  const startRest = useCallback((seconds: number) => {
    setRestSecs(seconds);
    setRestNonce((n) => n + 1);
  }, []);

  const workout = getWorkout(id);

  // Ids del catálogo ya presentes: el selector los marca como añadidos.
  const existingExerciseIds = useMemo(
    () => new Set(workout?.exercises.map((we) => we.exerciseId) ?? []),
    [workout]
  );

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

  // Calorías acumuladas de la rutina: suma de las series ya marcadas como hechas.
  const kcalRutina = workoutCalories(workout);

  // Solo se puede REGISTRAR (marcar series hechas) el día que toca la rutina:
  // marcar un "viernes" en otro día ensuciaría la racha y las calorías. Una rutina
  // sin día asignado (libre) se puede registrar cuando sea.
  const puedeRegistrar = !workout.day || esDeHoy(workout);

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

        {/* Aviso cuando no es el día de la rutina: se puede ver/ajustar, pero no
            marcar series como hechas (eso cuenta para racha y calorías). */}
        {!puedeRegistrar ? (
          <ThemedView type="backgroundElement" style={styles.avisoDia}>
            <ThemedText style={styles.avisoIcon}>📅</ThemedText>
            <ThemedView type="backgroundElement" style={styles.avisoTextCol}>
              <ThemedText type="smallBold">Hoy no toca esta rutina</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Es de «{workout.day}». Puedes verla y ajustarla; regístrala el día
                que corresponde.
              </ThemedText>
            </ThemedView>
          </ThemedView>
        ) : null}

        {/* Total de calorías de la rutina: aparece al marcar la primera serie. */}
        {kcalRutina > 0 ? (
          <ThemedView type="backgroundElement" style={styles.kcalCard}>
            <ThemedText style={styles.kcalFire}>🔥</ThemedText>
            <ThemedView type="backgroundElement" style={styles.kcalTextCol}>
              <ThemedText type="subtitle">
                {formatKcal(kcalRutina)}
                <ThemedText type="small" themeColor="textSecondary"> kcal</ThemedText>
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                quemadas en esta rutina
              </ThemedText>
            </ThemedView>
          </ThemedView>
        ) : null}

        {workout.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            bodyWeightKg={bodyWeightKg}
            canLog={puedeRegistrar}
            onRemove={() => void removeExercise(workout.id, ex.id)}
            onAddSet={() => void addSet(workout.id, ex.id)}
            onUpdateSet={(setId, patch) => updateSet(workout.id, ex.id, setId, patch)}
            onRemoveSet={(setId) => void removeSet(workout.id, ex.id, setId)}
            onBurned={setBurnedKcal}
            onRest={startRest}
          />
        ))}

        <Pressable
          onPress={() => setPicking(true)}
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

      <ExercisePickerModal
        visible={picking}
        existingExerciseIds={existingExerciseIds}
        onPick={(ex: Exercise) => void addExercise(workout.id, ex.name, ex.muscleGroup)}
        onClose={() => setPicking(false)}
      />

      <CaloriesBurnedModal
        visible={burnedKcal !== null}
        kcal={burnedKcal ?? 0}
        onClose={closeBurned}
      />

      <RestTimerBar
        visible={restSecs !== null}
        durationSeconds={restSecs ?? 0}
        restKey={restNonce}
        onFinish={closeRest}
      />
    </ThemedView>
  );
}

function ExerciseCard({
  exercise,
  bodyWeightKg,
  canLog,
  onRemove,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onBurned,
  onRest,
}: {
  exercise: WorkoutExercise;
  bodyWeightKg: number;
  canLog: boolean;
  onRemove: () => void;
  onAddSet: () => void;
  onUpdateSet: (setId: string, patch: SetPatch) => void;
  onRemoveSet: (setId: string) => void;
  onBurned: (kcal: number) => void;
  onRest: (seconds: number) => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedView type="backgroundElement" style={styles.cardHeader}>
        <ExerciseThumb url={exercise.exercise.imageUrl} size={48} />
        {/* Nombre y grupo salen del catálogo: solo lectura y envuelven hacia
            abajo (antes eran inputs de una línea que recortaban el título). */}
        <ThemedView type="backgroundElement" style={styles.cardHeaderText}>
          <ThemedText type="subtitle" style={styles.exerciseTitle}>
            {exercise.exercise.name}
          </ThemedText>
          {exercise.exercise.muscleGroup ? (
            <ThemedText type="small" themeColor="textSecondary">
              {exercise.exercise.muscleGroup}
            </ThemedText>
          ) : null}
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
        <ColHead label="✓" flex={0.6} />
        <ColHead label="" flex={0.5} />
      </ThemedView>

      {exercise.sets.map((set, i) => (
        <SetRow
          key={set.id}
          index={i + 1}
          set={set}
          met={exercise.exercise.met}
          muscleGroup={exercise.exercise.muscleGroup}
          bodyWeightKg={bodyWeightKg}
          canLog={canLog}
          onUpdate={(patch) => onUpdateSet(set.id, patch)}
          onRemove={() => onRemoveSet(set.id)}
          onBurned={onBurned}
          onRest={onRest}
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
  met,
  muscleGroup,
  bodyWeightKg,
  canLog,
  onUpdate,
  onRemove,
  onBurned,
  onRest,
}: {
  index: number;
  set: WorkoutSet;
  met: number | null;
  muscleGroup: string | null;
  bodyWeightKg: number;
  canLog: boolean;
  onUpdate: (patch: SetPatch) => void;
  onRemove: () => void;
  onBurned: (kcal: number) => void;
  onRest: (seconds: number) => void;
}) {
  // Alternar "done": al PASAR a hecho se calculan las calorías de la serie (para
  // el pop-up, el total en vivo y persistir en el backend) y arranca el descanso;
  // al desmarcar, las calorías vuelven a null. Sin descanso definido se usan 90 s.
  function toggleDone() {
    // No se puede registrar si no es el día de la rutina (el checkbox va deshabilitado,
    // pero se re-chequea acá por si acaso).
    if (!canLog) return;
    const nowDone = !set.done;
    const kcal = nowDone
      ? caloriesForSet({
          met,
          bodyWeightKg,
          reps: set.reps,
          restSeconds: set.restSeconds,
          liftedWeightKg: set.weightKg,
          muscleGroup,
        })
      : 0;

    // `caloriesBurned` va en el patch para que el total reaccione al instante; el
    // backend lo recalcula igual (misma fórmula) al persistir el `done`.
    onUpdate({ done: nowDone, caloriesBurned: nowDone ? kcal : null });

    if (nowDone) {
      if (kcal > 0) onBurned(kcal);
      const rest = set.restSeconds ?? 90;
      if (rest > 0) onRest(rest);
    }
  }

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
      <Pressable
        onPress={toggleDone}
        disabled={!canLog}
        style={[styles.cell, { flex: 0.6 }]}
        hitSlop={6}>
        <ThemedView
          type={set.done ? 'backgroundSelected' : 'backgroundElement'}
          style={[styles.checkbox, !canLog && styles.checkboxDisabled]}>
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
    fontFamily: FontFamily.displayBold,
    fontSize: 40,
    lineHeight: 46,
  },
  inputSubtitle: {
    fontFamily: FontFamily.displaySemiBold,
    fontSize: 24,
    lineHeight: 30,
  },
  inputDefault: {
    fontFamily: FontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
  },
  kcalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,140,0,0.35)',
  },
  kcalFire: { fontSize: 32, lineHeight: 38 },
  kcalTextCol: { gap: Spacing.half },
  avisoDia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,147,201,0.4)',
  },
  avisoIcon: { fontSize: 26, lineHeight: 32 },
  avisoTextCol: { flex: 1, gap: Spacing.half },
  checkboxDisabled: { opacity: 0.35 },
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
    // flexShrink evita que un título largo empuje la ✕ fuera del margen; el
    // texto envuelve hacia abajo en vez de recortarse.
    flexShrink: 1,
  },
  exerciseTitle: { flexShrink: 1 },
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
