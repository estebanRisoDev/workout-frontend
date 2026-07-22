/**
 * Onboarding: se muestra a pantalla completa cuando el usuario ya tiene sesión
 * pero le faltan datos físicos. Un wizard de cuatro pasos (sexo → medidas →
 * actividad → resumen) con toggles circulares; al guardar, el perfil queda
 * completo y `AuthGate` deja pasar a la app.
 */

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { firstName } from '@/data/stats';
import {
  completeSkinfolds,
  type GoalKey,
  type Metrics,
  type SkinfoldField,
  type SkinfoldValues,
} from '@/data/nutrition';
import { seedBeginnerWorkouts } from '@/api/workouts';
import type { ActivityLevel, Sex } from '@/data/workouts';
import { useAuth } from '@/store/auth-store';
import { useWorkouts } from '@/store/workouts-store';

const PASOS = ['Sexo', 'Medidas', 'Actividad', 'Pliegues', 'Objetivo'] as const;

export default function OnboardingFlow() {
  const { user, updateProfile } = useAuth();
  const { reload: reloadWorkouts } = useWorkouts();

  const [step, setStep] = useState(0);
  const [sex, setSex] = useState<Sex | null>(null);
  const [age, setAge] = useState<number | null>(25);
  const [weightKg, setWeightKg] = useState<number | null>(70);
  const [heightCm, setHeightCm] = useState<number | null>(170);
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [folds, setFolds] = useState<SkinfoldValues>({});
  const [goal, setGoal] = useState<GoalKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ¿Se puede avanzar desde el paso actual? El paso de pliegues (3) es opcional,
  // así que nunca bloquea: el usuario puede saltárselo.
  const puedeAvanzar =
    (step === 0 && sex !== null) ||
    (step === 1 && !!age && !!weightKg && !!heightCm) ||
    (step === 2 && activity !== null) ||
    step === 3 ||
    (step === 4 && goal !== null);

  const metrics: Metrics | null =
    sex && age && weightKg && heightCm && activity
      ? { sex, age, weightKg, heightCm, activityLevel: activity }
      : null;

  // Los pliegues completos (o null si faltan) para la vista previa de composición.
  const skinfolds = completeSkinfolds(folds);

  function setFold(key: SkinfoldField, value: number | null) {
    setFolds((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFinish() {
    if (!metrics || !goal || saving) return;
    setSaving(true);
    setError(null);
    try {
      // A quien declara vida sedentaria se le siembran las rutinas base ANTES de
      // completar el perfil, y se recargan en el store: así, al entrar a la app,
      // la pantalla de rutinas ya aparece con el plan lunes/miércoles/viernes
      // armado. (Sedentario ≈ recién empieza, así que no parte desde una app vacía.)
      let sembradas = false;
      if (metrics.activityLevel === 'sedentary') {
        const res = await seedBeginnerWorkouts();
        await reloadWorkouts();
        sembradas = res.created;
      }
      // Los pliegues van tal cual: los que el usuario no midió quedan `null`.
      // Guardar el perfil es lo último: al quedar completo, AuthGate renderiza la app.
      await updateProfile({ ...metrics, ...folds, goal });
      // El aviso va después de entrar a la app, para que aparezca sobre ella.
      if (sembradas) {
        Alert.alert('Se te añadieron ejercicios básicos en tu rutina 💪');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu perfil');
      setSaving(false);
    }
  }

  function next() {
    if (step < PASOS.length - 1) setStep((s) => s + 1);
    else handleFinish();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.inner}>
          {/* Progreso */}
          <View style={styles.dots}>
            {PASOS.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i <= step ? Accent : '#3a3a3a' }]}
              />
            ))}
          </View>

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 0 && (
              <Paso
                titulo={`Hola, ${firstName(user?.name ?? null, user?.email)}`}
                bajada="Para calcular tus calorías y macros necesitamos un par de datos. Empecemos: ¿cuál es tu sexo biológico?">
                <SexSelector value={sex} onChange={setSex} />
              </Paso>
            )}

            {step === 1 && (
              <Paso titulo="Tus medidas" bajada="Las usamos en la fórmula de Mifflin-St Jeor.">
                <View style={styles.medidas}>
                  <NumberStepper label="Edad" unit="años" value={age} onChange={setAge} min={12} max={100} />
                  <NumberStepper label="Peso" unit="kg" value={weightKg} onChange={setWeightKg} min={30} max={300} />
                  <NumberStepper label="Altura" unit="cm" value={heightCm} onChange={setHeightCm} min={120} max={230} />
                </View>
              </Paso>
            )}

            {step === 2 && (
              <Paso titulo="Nivel de actividad" bajada="¿Cuánto te mueves en una semana normal?">
                <ActivitySelector value={activity} onChange={setActivity} />
              </Paso>
            )}

            {step === 3 && (
              <Paso
                titulo="Pliegues (opcional)"
                bajada="Si tienes un plicómetro, mide los 7 pliegues Jackson-Pollock y estimamos tu % de grasa. Puedes saltarte este paso y agregarlos después desde tu perfil.">
                <View style={styles.pliegues}>
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
                </View>
              </Paso>
            )}

            {step === 4 && metrics && (
              <Paso
                titulo="Elige tu objetivo"
                bajada="Calculamos tus calorías y macros para cada meta. Toca la que quieras seguir; podrás cambiarla desde tu perfil.">
                <TargetsPreview metrics={metrics} selected={goal} onSelect={setGoal} />
              </Paso>
            )}

            {error && (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            )}
          </ScrollView>

          {/* Navegación */}
          <View style={styles.nav}>
            {step > 0 ? (
              <Pressable onPress={() => setStep((s) => s - 1)} hitSlop={8} disabled={saving}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Atrás
                </ThemedText>
              </Pressable>
            ) : (
              <View />
            )}

            <Pressable
              onPress={next}
              disabled={!puedeAvanzar || saving}
              style={({ pressed }) => [
                styles.cta,
                pressed && styles.pressed,
                (!puedeAvanzar || saving) && styles.disabled,
              ]}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.ctaText}>
                  {step === PASOS.length - 1 ? 'Guardar y empezar' : 'Continuar'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function Paso({
  titulo,
  bajada,
  children,
}: {
  titulo: string;
  bajada: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.paso}>
      <ThemedText type="subtitle">{titulo}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.bajada}>
        {bajada}
      </ThemedText>
      <View style={styles.pasoBody}>{children}</View>
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
  dots: {
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    paddingTop: Spacing.three,
  },
  dot: { height: 4, flex: 1, borderRadius: 9999, maxWidth: 60 },
  scroll: { paddingVertical: Spacing.five, gap: Spacing.four },
  paso: { gap: Spacing.two },
  bajada: { maxWidth: 420 },
  pasoBody: { marginTop: Spacing.four },
  medidas: { gap: Spacing.four },
  pliegues: { gap: Spacing.four },
  compCard: { borderRadius: Spacing.four, padding: Spacing.four },
  error: { color: '#d9534f', textAlign: 'center' },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  cta: {
    height: 52,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    minWidth: 180,
  },
  ctaText: { color: 'black', fontSize: 16 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
