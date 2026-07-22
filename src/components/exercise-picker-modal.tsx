/**
 * Selector de ejercicios del catálogo para añadir a una rutina existente.
 *
 * Reemplaza al viejo "Nuevo ejercicio" de texto libre: aquí solo se eligen
 * ejercicios que YA existen en la base (agrupados por músculo, con buscador),
 * así el ejercicio queda enlazado a su entrada del catálogo (imagen incluida).
 * Se puede añadir varios seguidos; los que ya están en la rutina se marcan.
 */

import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseThumb } from '@/components/exercise-thumb';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import type { Exercise } from '@/data/workouts';
import { useExercises } from '@/hooks/use-exercises';
import { useTheme } from '@/hooks/use-theme';

export function ExercisePickerModal({
  visible,
  existingExerciseIds,
  onPick,
  onClose,
}: {
  visible: boolean;
  /** Ids del catálogo ya presentes en la rutina: se marcan como añadidos. */
  existingExerciseIds: Set<string>;
  /** Añade el ejercicio elegido a la rutina. */
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { groups, loading, error, reload } = useExercises();
  const [query, setQuery] = useState('');

  // Filtro por nombre (sin acentos ni mayúsculas) sobre los grupos del catálogo.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        exercises: g.exercises.filter((ex) => ex.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.exercises.length > 0);
  }, [groups, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cerrar
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">Añadir ejercicio</ThemedText>
              <View style={{ width: 48 }} />
            </View>

            <ThemedView type="backgroundElement" style={styles.searchBox}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ejercicio…"
                placeholderTextColor={theme.textSecondary}
                style={[styles.searchInput, { color: theme.text }]}
              />
            </ThemedView>

            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {loading && (
                <View style={styles.centeredBlock}>
                  <ActivityIndicator />
                </View>
              )}

              {error && !loading && (
                <View style={styles.centeredBlock}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {error}
                  </ThemedText>
                  <Pressable onPress={reload} hitSlop={8}>
                    <ThemedText type="linkPrimary">Reintentar</ThemedText>
                  </Pressable>
                </View>
              )}

              {!loading && !error && filtered.length === 0 && (
                <View style={styles.centeredBlock}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Sin resultados para “{query}”.
                  </ThemedText>
                </View>
              )}

              {filtered.map((group) => (
                <View key={group.muscleGroup} style={styles.group}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    {group.muscleGroup.toUpperCase()}
                  </ThemedText>
                  {group.exercises.map((ex) => {
                    const added = existingExerciseIds.has(ex.id);
                    return (
                      <Pressable
                        key={ex.id}
                        onPress={() => onPick(ex)}
                        style={({ pressed }) => pressed && styles.pressed}>
                        <ThemedView
                          type={added ? 'backgroundSelected' : 'backgroundElement'}
                          style={styles.row}>
                          <ExerciseThumb url={ex.imageUrl} size={40} />
                          <ThemedText
                            type="default"
                            style={styles.name}
                            numberOfLines={2}>
                            {ex.name}
                          </ThemedText>
                          <ThemedText
                            type="smallBold"
                            themeColor={added ? 'text' : 'textSecondary'}
                            style={{ color: added ? Accent : undefined }}>
                            {added ? '✓' : '+'}
                          </ThemedText>
                        </ThemedView>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <Pressable onPress={onClose} style={({ pressed }) => [pressed && styles.pressed]}>
              <ThemedView type="backgroundSelected" style={styles.doneButton}>
                <ThemedText type="smallBold">Listo</ThemedText>
              </ThemedView>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  searchBox: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginBottom: Spacing.two,
  },
  searchInput: { paddingVertical: Spacing.two, fontSize: 16 },
  scroll: { paddingVertical: Spacing.two, gap: Spacing.three },
  centeredBlock: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  group: { gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  // flexShrink evita que un nombre largo empuje el "+" fuera del margen.
  name: { flex: 1, flexShrink: 1 },
  doneButton: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  pressed: { opacity: 0.7 },
});
