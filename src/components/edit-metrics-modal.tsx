/**
 * Modal para editar los datos físicos desde el Perfil. Reutiliza los mismos
 * controles circulares del onboarding y muestra los objetivos recalculándose en
 * vivo mientras se editan los valores.
 */

import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActivitySelector,
  BodyCompositionPreview,
  NumberStepper,
  SexSelector,
  SkinfoldInputs,
  TargetsPreview,
} from '@/components/metrics-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  SKINFOLD_SITES,
  completeSkinfolds,
  type GoalKey,
  type Metrics,
  type SkinfoldField,
  type SkinfoldValues,
} from '@/data/nutrition';
import type { ActivityLevel, Sex, User } from '@/data/workouts';
import { useAuth } from '@/store/auth-store';

export function EditMetricsModal({
  visible,
  user,
  onClose,
}: {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}) {
  const { updateProfile } = useAuth();

  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [folds, setFolds] = useState<SkinfoldValues>({});
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, se siembra el formulario con lo que hay guardado.
  useEffect(() => {
    if (visible) {
      setSex(user?.sex ?? null);
      setAge(user?.age ?? null);
      setWeightKg(user?.weightKg ?? null);
      setHeightCm(user?.heightCm ?? null);
      setActivity(user?.activityLevel ?? null);
      const seed: SkinfoldValues = {};
      for (const { key } of SKINFOLD_SITES) seed[key] = user?.[key] ?? null;
      setFolds(seed);
      setGoal(user?.goal ?? null);
      setError(null);
    }
  }, [visible, user]);

  const metrics: Metrics | null =
    sex && age && weightKg && heightCm && activity
      ? { sex, age, weightKg, heightCm, activityLevel: activity }
      : null;

  // Pliegues completos (o null) para la vista previa de composición corporal.
  const skinfolds = completeSkinfolds(folds);

  function setFold(key: SkinfoldField, value: number | null) {
    setFolds((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!metrics || !goal || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile({ ...metrics, ...folds, goal });
      setSaving(false);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.inner}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancelar
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">Editar datos</ThemedText>
              <View style={{ width: 60 }} />
            </View>

            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <Section label="SEXO">
                <SexSelector value={sex} onChange={setSex} />
              </Section>

              <Section label="MEDIDAS">
                <View style={styles.medidas}>
                  <NumberStepper label="Edad" unit="años" value={age} onChange={setAge} min={12} max={100} />
                  <NumberStepper label="Peso" unit="kg" value={weightKg} onChange={setWeightKg} min={30} max={300} />
                  <NumberStepper label="Altura" unit="cm" value={heightCm} onChange={setHeightCm} min={120} max={230} />
                </View>
              </Section>

              <Section label="ACTIVIDAD">
                <ActivitySelector value={activity} onChange={setActivity} />
              </Section>

              <Section label="PLIEGUES (JACKSON-POLLOCK 7)">
                <SkinfoldInputs values={folds} onChange={setFold} />
                {metrics && skinfolds && (
                  <ThemedView type="backgroundElement" style={styles.compCard}>
                    <BodyCompositionPreview
                      sex={metrics.sex}
                      age={metrics.age}
                      weightKg={metrics.weightKg}
                      folds={skinfolds}
                    />
                  </ThemedView>
                )}
              </Section>

              {metrics && (
                <Section label="OBJETIVO">
                  <TargetsPreview metrics={metrics} selected={goal} onSelect={setGoal} />
                </Section>
              )}

              {error && (
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
              )}
            </ScrollView>

            <Pressable
              onPress={handleSave}
              disabled={!metrics || !goal || saving}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.pressed,
                (!metrics || !goal || saving) && styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.ctaText}>
                  Guardar cambios
                </ThemedText>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
        {label}
      </ThemedText>
      {children}
    </View>
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
  scroll: { paddingVertical: Spacing.three, gap: Spacing.five },
  section: { gap: Spacing.three },
  sectionLabel: { letterSpacing: 1 },
  medidas: { gap: Spacing.four },
  compCard: { borderRadius: Spacing.four, padding: Spacing.four, marginTop: Spacing.two },
  error: { color: '#d9534f', textAlign: 'center' },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.three,
  },
  ctaText: { color: 'black', fontSize: 16 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
