/**
 * Perfil: identidad del usuario, resumen de actividad y ajustes.
 *
 * Los números salen de las rutinas reales del store. Los ajustes todavía no se
 * persisten: no existen columnas para ellos en la base.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EditMetricsModal } from '@/components/edit-metrics-modal';
import { TargetsPreview } from '@/components/metrics-controls';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import {
  ACTIVITY_LABEL,
  GOAL_LABEL,
  SEX_LABEL,
  bodyComposition,
  metricsFromUser,
  skinfoldsFromUser,
  type GoalKey,
} from '@/data/nutrition';
import { initials, monthCount } from '@/data/stats';
import { isTeacher } from '@/data/workouts';
import { useAuth } from '@/store/auth-store';
import { useWorkouts } from '@/store/workouts-store';

export default function PerfilScreen() {
  const router = useRouter();
  const { workouts } = useWorkouts();
  const { user, signOut, updateProfile } = useAuth();
  const [editando, setEditando] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // El profesor no es un alumno: no lleva sus propias métricas corporales
  // (sexo, edad, peso, altura, pliegues JP7) ni un objetivo de dieta acá.
  const teacher = isTeacher(user);

  // Si el perfil está completo, tenemos con qué mostrar cuerpo y objetivos.
  const metrics = metricsFromUser(user);

  // Composición corporal: solo si el usuario midió los siete pliegues JP7.
  const skinfolds = skinfoldsFromUser(user);
  const composition =
    metrics && skinfolds
      ? bodyComposition(metrics.sex, metrics.age, metrics.weightKg, skinfolds)
      : null;

  // Cambiar el objetivo tocando una tarjeta: se guarda al instante y `user.goal`
  // se actualiza solo, así que la tarjeta elegida queda resaltada.
  async function cambiarObjetivo(goal: GoalKey) {
    if (goal === user?.goal) return;
    setGoalError(null);
    try {
      await updateProfile({ goal });
    } catch {
      setGoalError('No se pudo cambiar el objetivo. Reintenta.');
    }
  }

  const nombre = user?.name?.trim() || user?.email?.split('@')[0] || 'Sin nombre';
  const iniciales = initials(user?.name ?? null, user?.email);
  const miembroDesde = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  const ajustes = [
    { icon: 'sliders' as const, label: 'Unidades', value: 'kg' },
    { icon: 'bell' as const, label: 'Recordatorios', value: 'Activo' },
    { icon: 'target' as const, label: 'Objetivo semanal', value: '5 días' },
    { icon: 'clock' as const, label: 'Descanso por defecto', value: '90 s' },
    { icon: 'user' as const, label: 'Cuenta', value: '' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Identidad */}
          <View style={styles.identity}>
            {/* Google entrega una foto de perfil; si no hay, van las iniciales. */}
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <ThemedText type="title" style={styles.avatarText}>
                  {iniciales}
                </ThemedText>
              </View>
            )}
            <ThemedText type="subtitle">{nombre}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {miembroDesde ? `Miembro desde ${miembroDesde}` : 'Miembro nuevo'}
              {' · '}
              {monthCount(workouts)} este mes
            </ThemedText>
          </View>

          {/* El resumen (Entrenos/Racha/Ejercicios/kcal) se movió al tab
              Estadísticas; acá el Perfil se queda con identidad, cuerpo y ajustes. */}

          {/* Cuerpo y objetivos nutricionales (solo alumnos: el profesor no
              lleva métricas propias ni tipo de dieta). */}
          {!teacher && (
            <>
          <View style={styles.bodyHeader}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
              TU CUERPO
            </ThemedText>
            <Pressable onPress={() => setEditando(true)} hitSlop={8}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Editar
              </ThemedText>
            </Pressable>
          </View>

          {metrics ? (
            <>
              <View style={styles.bodyRow}>
                <BodyStat label="Sexo" value={SEX_LABEL[metrics.sex]} />
                <BodyStat label="Edad" value={String(metrics.age)} />
                <BodyStat label="Peso" value={`${metrics.weightKg} kg`} />
                <BodyStat label="Altura" value={`${metrics.heightCm} cm`} />
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                Actividad: {ACTIVITY_LABEL[metrics.activityLevel]}
                {user?.goal ? ` · Objetivo: ${GOAL_LABEL[user.goal]}` : ''}
              </ThemedText>
              {composition ? (
                <>
                  <View style={styles.bodyRow}>
                    <BodyStat label="% Grasa" value={`${composition.bodyFatPct}%`} />
                    <BodyStat label="Masa magra" value={`${composition.leanMassKg} kg`} />
                    <BodyStat label="Masa grasa" value={`${composition.fatMassKg} kg`} />
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    Masa magra = todo lo que no es grasa (músculo, hueso, agua,
                    órganos). Masa grasa = los kg de pura grasa. La suma da tu peso.
                  </ThemedText>
                </>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Agrega los 7 pliegues Jackson-Pollock en «Editar» para ver tu %
                  de grasa.
                </ThemedText>
              )}
              <ThemedView type="backgroundElement" style={styles.targetsCard}>
                <TargetsPreview
                  metrics={metrics}
                  selected={user?.goal}
                  onSelect={cambiarObjetivo}
                />
              </ThemedView>
              {goalError ? (
                <ThemedText type="small" style={styles.goalError}>
                  {goalError}
                </ThemedText>
              ) : null}
            </>
          ) : (
            <Pressable
              onPress={() => setEditando(true)}
              style={({ pressed }) => [styles.completeCta, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Completa tus datos para ver tus calorías y macros →
              </ThemedText>
            </Pressable>
          )}
            </>
          )}

          {/* Acceso directo al progreso físico (composición corporal / JP7), que
              ahora vive dentro de Dieta. Para el profesor abre el registro de sus
              alumnos; para el alumno, su propia composición. Las estadísticas de
              rutinas están en la pestaña Rutinas. */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            {teacher ? 'ALUMNOS' : 'PROGRESO FÍSICO'}
          </ThemedText>
          <Pressable
            onPress={() => router.push('/dieta/fisico')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.progresoCard}>
              <View style={styles.progresoIcon}>
                <Feather name="trending-up" size={18} color={Accent} />
              </View>
              <View style={styles.progresoInfo}>
                <ThemedText type="smallBold">
                  {teacher ? 'Progreso alumnos' : 'Progreso físico'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {teacher
                    ? 'Registro y avance de tus alumnos'
                    : 'Tu composición corporal e historial'}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color="#8a8a8a" />
            </ThemedView>
          </Pressable>

          {/* Ajustes */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            AJUSTES
          </ThemedText>

          <View style={styles.settingsCard}>
            {ajustes.map((item, i) => (
              <View
                key={item.label}
                style={[styles.settingRow, i > 0 && styles.settingRowBorder]}>
                <View style={styles.settingIcon}>
                  <Feather name={item.icon} size={16} color="#A7ABB3" />
                </View>
                <ThemedText type="default" style={styles.settingLabel}>
                  {item.label}
                </ThemedText>
                {item.value ? (
                  <ThemedText type="small" style={styles.settingValue}>
                    {item.value}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.logoutText}>
              Cerrar sesión
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            Los ajustes de abajo son solo visuales por ahora: todavía no hay dónde guardarlos.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>

      <EditMetricsModal
        visible={editando}
        user={user}
        onClose={() => setEditando(false)}
      />
    </ThemedView>
  );
}

/** Una celda del bloque "Tu cuerpo": valor grande arriba, etiqueta abajo. */
function BodyStat({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.bodyStat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },

  identity: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    backgroundColor: '#3a3a35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    lineHeight: 38,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
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
  statValue: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 36,
  },
  statLabel: { color: '#A7ABB3' },

  sectionLabel: {
    marginTop: Spacing.three,
    letterSpacing: 1,
  },

  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.three,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bodyStat: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: Spacing.half,
  },
  targetsCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    marginTop: Spacing.one,
  },
  completeCta: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  goalError: { color: '#d9534f' },

  progresoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  progresoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#16294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progresoInfo: { flex: 1, gap: Spacing.half },

  settingsCard: {
    backgroundColor: '#000000',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  settingRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#16294A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, color: '#FFFFFF' },
  settingValue: { color: '#9a9a9a' },
  chevron: {
    color: '#5a5e66',
    fontSize: 20,
    lineHeight: 22,
  },

  footnote: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },

  logout: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoutText: { color: '#d9534f' },
  pressed: { opacity: 0.85 },
});
