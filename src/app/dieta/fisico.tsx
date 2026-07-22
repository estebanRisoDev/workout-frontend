/**
 * PROGRESO FÍSICO (sub-pantalla de la sección Dieta).
 *
 * - Alumno: su composición corporal actual + historial de peso, altura y % de
 *   grasa (desde `/users/me/measurements`).
 * - Profesor: roster de alumnos; al tocar uno, un detalle INLINE (sin ruta nueva)
 *   con su historial y un formulario para registrar una medición (peso/altura y
 *   los 7 pliegues JP7).
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getMyMeasurements } from '@/api/users';
import {
  getStudent,
  listStudents,
  recordMeasurement,
  type MeasurementInput,
  type Student,
  type StudentDetail,
} from '@/api/students';
import { BarChart } from '@/components/bar-chart';
import { NumberStepper, SkinfoldInputs } from '@/components/metrics-controls';
import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { SkinfoldMeasurement } from '@/data/history';
import {
  bodyComposition,
  bodyFatPercent,
  completeSkinfolds,
  skinfoldsFromUser,
  type Skinfolds,
  type SkinfoldValues,
} from '@/data/nutrition';
import { initials, type ChartPoint } from '@/data/stats';
import { isTeacher, type Sex } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

export default function FisicoScreen() {
  const { user } = useAuth();
  return (
    <ScreenFade>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          {isTeacher(user) ? <VistaProfesor /> : <VistaAlumno />}
        </SafeAreaView>
      </ThemedView>
    </ScreenFade>
  );
}

/** Enlace de vuelta a la pantalla de Dieta. */
function VolverADieta() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <ThemedText type="linkPrimary">‹ Dieta</ThemedText>
    </Pressable>
  );
}

// =====================================================================
// ALUMNO
// =====================================================================

function VistaAlumno() {
  const { user } = useAuth();
  const [measurements, setMeasurements] = useState<SkinfoldMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setMeasurements(await getMyMeasurements(signal));
    } catch {
      // Silencioso: las secciones muestran su propio vacío.
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar]);

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={loading && measurements.length > 0} onRefresh={() => cargar()} />
      }>
      <VolverADieta />
      <ThemedText type="title">Progreso físico</ThemedText>

      <SeccionFisico
        measurements={measurements}
        sex={user?.sex ?? null}
        age={user?.age ?? null}
        weightKg={user?.weightKg ?? null}
        currentFolds={skinfoldsFromUser(user ?? null)}
      />
    </ScrollView>
  );
}

/** Composición actual + historial de peso, altura y % de grasa. */
function SeccionFisico({
  measurements,
  sex,
  age,
  weightKg,
  currentFolds,
}: {
  measurements: SkinfoldMeasurement[];
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  currentFolds: Skinfolds | null;
}) {
  const comp =
    sex && age && weightKg && currentFolds ? bodyComposition(sex, age, weightKg, currentFolds) : null;

  const serie: ChartPoint[] = useMemo(
    () => bodyFatSeries(measurements, sex, age),
    [measurements, sex, age]
  );

  return (
    <View style={styles.seccion}>
      <ThemedView type="backgroundElement" style={styles.card}>
        {comp ? (
          <View style={styles.compRow}>
            <CompStat label="% Grasa" value={`${comp.bodyFatPct}%`} />
            <CompStat label="Masa magra" value={`${comp.leanMassKg} kg`} />
            <CompStat label="Masa grasa" value={`${comp.fatMassKg} kg`} />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            Cuando tu profesor registre tus 7 pliegues verás acá tu composición corporal.
          </ThemedText>
        )}
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Peso (kg)</ThemedText>
        <BarChart
          data={measureSeries(measurements, 'weightKg')}
          decimals={1}
          unit="kg"
          emptyText="Sin registros de peso todavía."
        />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Altura (cm)</ThemedText>
        <BarChart
          data={measureSeries(measurements, 'heightCm')}
          color="#7aa87a"
          decimals={0}
          unit="cm"
          emptyText="Sin registros de altura todavía."
        />
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Historial de % de grasa</ThemedText>
        <BarChart
          data={serie}
          color="#e0863a"
          decimals={1}
          unit="% grasa"
          emptyText="Sin mediciones de pliegues todavía."
        />
      </ThemedView>
    </View>
  );
}

// =====================================================================
// PROFESOR
// =====================================================================

function VistaProfesor() {
  const [selected, setSelected] = useState<string | null>(null);
  if (selected) return <DetalleAlumno studentId={selected} onBack={() => setSelected(null)} />;
  return <RosterAlumnos onOpen={setSelected} />;
}

function RosterAlumnos({ onOpen }: { onOpen: (id: string) => void }) {
  const theme = useTheme();
  const [students, setStudents] = useState<Student[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    listStudents(ac.signal)
      .then(setStudents)
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const filtrados = students.filter((s) => {
    const t = `${s.name ?? ''} ${s.email}`.toLowerCase();
    return t.includes(q.trim().toLowerCase());
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Sin "‹ Dieta": para el profe esto ya es una pestaña propia (Estadísticas),
          no una sub-pantalla de Dieta. */}
      <ThemedText type="title">Alumnos</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Toca un alumno para ver su progreso y registrar su medición.
      </ThemedText>

      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder="Buscar por nombre o correo"
        placeholderTextColor={theme.textSecondary}
        style={[styles.search, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
      />

      {loading ? (
        <ActivityIndicator style={{ marginVertical: Spacing.five }} />
      ) : (
        filtrados.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => onOpen(s.id)}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.studentRow}>
              {s.avatarUrl ? (
                <Image source={{ uri: s.avatarUrl }} style={styles.avatarSm} />
              ) : (
                <View style={styles.avatarSm}>
                  <ThemedText type="smallBold">{initials(s.name, s.email)}</ThemedText>
                </View>
              )}
              <View style={styles.studentInfo}>
                <ThemedText type="smallBold" numberOfLines={1}>
                  {s.name ?? s.email}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {s.workoutCount} rutinas
                  {s.lastWorkout ? ` · última: ${s.lastWorkout.title}` : ''}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color="#8a8a8a" />
            </ThemedView>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

/** Detalle inline de un alumno: historial + formulario de registro. */
function DetalleAlumno({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [folds, setFolds] = useState<SkinfoldValues>({});
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        setDetail(await getStudent(studentId, signal));
      } catch {
        if (!signal?.aborted) setError('No se pudo cargar el alumno.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [studentId]
  );

  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar]);

  async function guardar() {
    const completos = completeSkinfolds(folds);
    const nFolds = Object.values(folds).filter((v) => typeof v === 'number' && v > 0).length;
    // Pliegues: completos o ninguno. Un subconjunto no sirve.
    if (!completos && nFolds > 0) {
      setError('Los pliegues van completos (los 7) o ninguno.');
      return;
    }
    const payload: MeasurementInput = {};
    if (weight != null) payload.weightKg = weight;
    if (height != null) payload.heightCm = height;
    if (completos) Object.assign(payload, completos);
    if (Object.keys(payload).length === 0) {
      setError('Ingresa al menos peso, altura o los 7 pliegues.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await recordMeasurement(studentId, payload);
      setFolds({});
      setWeight(null);
      setHeight(null);
      await cargar();
    } catch {
      setError('No se pudo guardar la medición. Reintenta.');
    } finally {
      setSaving(false);
    }
  }

  const sex = detail?.sex ?? null;
  const age = detail?.age ?? null;
  const serie = useMemo(
    () => bodyFatSeries(detail?.measurements ?? [], sex, age),
    [detail, sex, age]
  );
  // Composición: la medición más reciente que tenga los 7 pliegues.
  const ultimaConPliegues = detail?.measurements.find((m) => foldsFromMeasurement(m) !== null) ?? null;
  const pesoComp = ultimaConPliegues?.weightKg ?? detail?.weightKg ?? null;
  const foldsComp = ultimaConPliegues ? foldsFromMeasurement(ultimaConPliegues) : null;
  const compActual =
    sex && age && pesoComp && foldsComp ? bodyComposition(sex, age, pesoComp, foldsComp) : null;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <Pressable onPress={onBack} hitSlop={8}>
        <ThemedText type="linkPrimary">‹ Alumnos</ThemedText>
      </Pressable>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: Spacing.five }} />
      ) : detail ? (
        <>
          <ThemedText type="subtitle">{detail.name ?? detail.email}</ThemedText>

          {compActual ? (
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.compRow}>
                <CompStat label="% Grasa" value={`${compActual.bodyFatPct}%`} />
                <CompStat label="Masa magra" value={`${compActual.leanMassKg} kg`} />
                <CompStat label="Masa grasa" value={`${compActual.fatMassKg} kg`} />
              </View>
            </ThemedView>
          ) : null}

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Peso (kg)</ThemedText>
            <BarChart
              data={measureSeries(detail.measurements, 'weightKg')}
              decimals={1}
              unit="kg"
              emptyText="Sin registros de peso."
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Altura (cm)</ThemedText>
            <BarChart
              data={measureSeries(detail.measurements, 'heightCm')}
              color="#7aa87a"
              decimals={0}
              unit="cm"
              emptyText="Sin registros de altura."
            />
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Historial de % de grasa</ThemedText>
            <BarChart
              data={serie}
              color="#e0863a"
              decimals={1}
              unit="% grasa"
              emptyText="Sin mediciones de pliegues registradas."
            />
          </ThemedView>

          {/* Formulario de registro: peso/altura (siempre) + pliegues (opcionales). */}
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Registrar medición</ThemedText>
            <View style={styles.medidas}>
              <NumberStepper label="Peso" unit="kg" value={weight} onChange={setWeight} min={15} max={300} />
              <NumberStepper label="Altura" unit="cm" value={height} onChange={setHeight} min={90} max={230} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              Pliegues JP7 (mm) — opcionales; para estimar % de grasa se necesitan los 7.
            </ThemedText>
            <SkinfoldInputs
              values={folds}
              onChange={(key, value) => setFolds((prev) => ({ ...prev, [key]: value }))}
            />
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <Pressable
              onPress={guardar}
              disabled={saving}
              style={({ pressed }) => [styles.cta, (pressed || saving) && styles.pressed]}>
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.ctaText}>
                  Guardar medición
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {error ?? 'Alumno no encontrado.'}
        </ThemedText>
      )}
    </ScrollView>
  );
}

// =====================================================================
// Auxiliares
// =====================================================================

/** Etiqueta de fecha corta para el eje X: "13 jul". */
function fmtDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
    .replace('.', '');
}

/** Serie de un campo antropométrico (peso/altura) por medición, cronológico. */
function measureSeries(
  measurements: SkinfoldMeasurement[],
  field: 'weightKg' | 'heightCm'
): ChartPoint[] {
  return [...measurements]
    .reverse()
    .slice(-8)
    .filter((m) => m[field] != null)
    .map((m) => ({ label: fmtDate(m.measuredAt), value: Math.round((m[field] as number) * 10) / 10 }));
}

/** Serie de % de grasa por medición (solo las que tienen los 7 pliegues). */
function bodyFatSeries(
  measurements: SkinfoldMeasurement[],
  sex: Sex | null,
  age: number | null
): ChartPoint[] {
  if (!sex || !age) return [];
  return [...measurements]
    .reverse()
    .slice(-8)
    .map((m) => ({ m, folds: foldsFromMeasurement(m) }))
    .filter((x): x is { m: SkinfoldMeasurement; folds: Skinfolds } => x.folds !== null)
    .map(({ m, folds }) => ({
      label: fmtDate(m.measuredAt),
      value: Math.round(bodyFatPercent(sex, age, folds) * 10) / 10,
    }));
}

/** Arma un `Skinfolds` desde una medición; `null` si le falta algún pliegue. */
function foldsFromMeasurement(m: SkinfoldMeasurement): Skinfolds | null {
  const vals = [
    m.skinfoldChest, m.skinfoldMidaxillary, m.skinfoldTriceps, m.skinfoldSubscapular,
    m.skinfoldAbdominal, m.skinfoldSuprailiac, m.skinfoldThigh,
  ];
  if (vals.some((v) => v == null)) return null;
  return {
    skinfoldChest: m.skinfoldChest!,
    skinfoldMidaxillary: m.skinfoldMidaxillary!,
    skinfoldTriceps: m.skinfoldTriceps!,
    skinfoldSubscapular: m.skinfoldSubscapular!,
    skinfoldAbdominal: m.skinfoldAbdominal!,
    skinfoldSuprailiac: m.skinfoldSuprailiac!,
    skinfoldThigh: m.skinfoldThigh!,
  };
}

function CompStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compStat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },

  seccion: { gap: Spacing.two },
  card: { borderRadius: Spacing.four, padding: Spacing.four, gap: Spacing.three },
  medidas: { gap: Spacing.three },

  compRow: { flexDirection: 'row', gap: Spacing.two },
  compStat: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
  },

  search: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  avatarSm: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: '#3a3a35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: { flex: 1, gap: Spacing.half },

  cta: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: 'black', fontSize: 16 },
  error: { color: '#d9534f' },
  pressed: { opacity: 0.7 },
});
