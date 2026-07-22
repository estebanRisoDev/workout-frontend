/**
 * "Armar workout": eliges ejercicios del catálogo y esa colección, con su
 * prescripción (series × reps · peso), se guarda como una rutina nueva.
 *
 * Solo depende del catálogo (`useExercises`), no de las rutinas guardadas.
 */

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ExerciseThumb } from '@/components/exercise-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WorkoutsSegmented } from '@/components/workouts-segmented';
import { BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Exercise } from '@/data/workouts';
import { useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';
import { useWorkouts, type DraftItem } from '@/store/workouts-store';

/** Valores iniciales al agregar un ejercicio al borrador. */
const SERIES_INICIALES = 3;
const REPS_INICIALES = 10;
const DESCANSO_INICIAL = 90;

export default function ArmarWorkoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, loading, error, reload } = useExercises();
  const { createWorkoutFromDraft } = useWorkouts();

  const [title, setTitle] = useState('');
  const [day, setDay] = useState('');
  const [draft, setDraft] = useState<DraftItem[]>([]);
  const [saving, setSaving] = useState(false);

  const picked = useMemo(() => new Set(draft.map((d) => d.exerciseId)), [draft]);
  const totalSeries = draft.reduce((acc, d) => acc + d.sets, 0);

  function toggle(ex: Exercise) {
    setDraft((prev) => {
      if (prev.some((d) => d.exerciseId === ex.id)) {
        return prev.filter((d) => d.exerciseId !== ex.id);
      }
      return [
        ...prev,
        {
          exerciseId: ex.id,
          name: ex.name,
          muscleGroup: ex.muscleGroup,
          sets: SERIES_INICIALES,
          reps: REPS_INICIALES,
          weightKg: null,
          restSeconds: DESCANSO_INICIAL,
        },
      ];
    });
  }

  function removeItem(exerciseId: string) {
    setDraft((prev) => prev.filter((d) => d.exerciseId !== exerciseId));
  }

  function patchItem(exerciseId: string, patch: Partial<DraftItem>) {
    setDraft((prev) =>
      prev.map((d) => (d.exerciseId === exerciseId ? { ...d, ...patch } : d))
    );
  }

  async function handleSave() {
    if (draft.length === 0 || saving) return;
    setSaving(true);
    // Sin título, el nombre sale de los grupos musculares: "Pecho · Hombro".
    const grupos = [...new Set(draft.map((d) => d.muscleGroup).filter(Boolean))];
    const nombre = title.trim() || grupos.join(' · ') || 'Nuevo workout';

    const created = await createWorkoutFromDraft(
      { title: nombre, day: day.trim() || null },
      draft
    );
    setSaving(false);

    if (created) {
      setTitle('');
      setDay('');
      setDraft([]);
      router.push(`/workouts/${created.id}`);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.four,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.five,
          },
        ]}>
        <ThemedText type="title">Rutinas</ThemedText>
        <WorkoutsSegmented />

        {/* Cabecera del workout que se está armando */}
        <NamedField
          label="Nombre"
          value={title}
          onChangeText={setTitle}
          placeholder="Se genera solo si lo dejas vacío"
        />
        <NamedField
          label="Día"
          value={day}
          onChangeText={setDay}
          placeholder="Ej: Día de empuje"
        />

        {/* Borrador actual */}
        {draft.length > 0 && (
          <ThemedView type="backgroundElement" style={styles.draftBox}>
            <ThemedText type="smallBold">
              Tu workout · {draft.length} {draft.length === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
              {totalSeries} series
            </ThemedText>
            {draft.map((item, i) => (
              <DraftRow
                key={item.exerciseId}
                index={i + 1}
                item={item}
                onPatch={(patch) => patchItem(item.exerciseId, patch)}
                onRemove={() => removeItem(item.exerciseId)}
              />
            ))}

            <Pressable
              onPress={handleSave}
              disabled={saving}
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundSelected" style={styles.saveButton}>
                {saving ? (
                  <ActivityIndicator />
                ) : (
                  <ThemedText type="smallBold">Guardar rutina</ThemedText>
                )}
              </ThemedView>
            </Pressable>
          </ThemedView>
        )}

        {/* Catálogo */}
        <ThemedText type="subtitle">Ejercicios</ThemedText>

        {loading && (
          <ThemedView style={styles.centeredBlock}>
            <ActivityIndicator />
          </ThemedView>
        )}

        {error && !loading && (
          <ThemedView style={styles.centeredBlock}>
            <ThemedText type="small" themeColor="textSecondary">
              {error}
            </ThemedText>
            <Pressable onPress={reload} hitSlop={8}>
              <ThemedText type="linkPrimary">Reintentar</ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {groups.map((group) => (
          <ThemedView key={group.muscleGroup} style={styles.group}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {group.muscleGroup.toUpperCase()}
            </ThemedText>
            {group.exercises.map((ex) => (
              <Pressable
                key={ex.id}
                onPress={() => toggle(ex)}
                style={({ pressed }) => pressed && styles.pressed}>
                <ThemedView
                  type={picked.has(ex.id) ? 'backgroundSelected' : 'backgroundElement'}
                  style={styles.exerciseRow}>
                  <ExerciseThumb url={ex.imageUrl} size={40} />
                  <ThemedText type="default" style={styles.exerciseName} numberOfLines={2}>
                    {ex.name}
                  </ThemedText>
                  <ThemedText type="smallBold" themeColor="textSecondary" style={styles.pickMark}>
                    {picked.has(ex.id) ? '✓' : '+'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </ThemedView>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

/** Fila del borrador: series × reps · peso, todo editable. */
function DraftRow({
  index,
  item,
  onPatch,
  onRemove,
}: {
  index: number;
  item: DraftItem;
  onPatch: (patch: Partial<DraftItem>) => void;
  onRemove: () => void;
}) {
  return (
    <ThemedView type="backgroundElement" style={styles.draftRow}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.draftIndex}>
        {String(index).padStart(2, '0')}
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.draftMain}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.name}
        </ThemedText>
        <ThemedView type="backgroundElement" style={styles.draftInputs}>
          <MiniNumber
            label="series"
            value={item.sets}
            onChange={(n) => onPatch({ sets: Math.max(1, n ?? 1) })}
          />
          <MiniNumber
            label="reps"
            value={item.reps}
            onChange={(n) => onPatch({ reps: Math.max(1, n ?? 1) })}
          />
          <MiniNumber
            label="kg"
            value={item.weightKg}
            onChange={(n) => onPatch({ weightKg: n })}
            placeholder="corp."
          />
        </ThemedView>
      </ThemedView>

      <Pressable onPress={onRemove} hitSlop={8}>
        <ThemedText type="small" themeColor="textSecondary">
          ✕
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

function MiniNumber({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (n: number | null) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={styles.miniWrap}>
      <TextInput
        value={value === null ? '' : String(value)}
        onChangeText={(t) => {
          if (t.trim() === '') return onChange(null);
          const n = Number(t.replace(',', '.'));
          if (!Number.isNaN(n)) onChange(n);
        }}
        keyboardType="numeric"
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.miniInput,
          { color: theme.text, backgroundColor: theme.backgroundSelected },
        ]}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function NamedField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.namedField}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.namedInput,
          { color: theme.text, backgroundColor: theme.backgroundElement },
        ]}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  centeredBlock: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  namedField: { gap: Spacing.one },
  namedInput: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  draftBox: {
    padding: Spacing.three,
    borderRadius: Spacing.four,
    gap: Spacing.two,
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  draftIndex: {
    fontFamily: Fonts?.mono,
    width: 24,
  },
  draftMain: { flex: 1, gap: Spacing.one },
  draftInputs: { flexDirection: 'row', gap: Spacing.two },
  miniWrap: { alignItems: 'center', gap: Spacing.half },
  miniInput: {
    width: 56,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    textAlign: 'center',
    fontFamily: Fonts?.mono,
    fontSize: 14,
  },
  saveButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  group: { gap: Spacing.one },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  exerciseName: { flex: 1, flexShrink: 1 },
  // Ancho fijo para el +/✓: así un nombre largo nunca lo empuja fuera del margen.
  pickMark: { width: 16, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
