/**
 * Pantalla "Dieta": el plan de comidas del día.
 *
 * El backend hace todo el trabajo (repartir el target entre las cuatro comidas y
 * buscar un plato para cada una); acá solo se pinta lo que llega. Ver
 * GET /nutrition/daily-plan.
 *
 * Desde acá se entra al PROGRESO FÍSICO (`/dieta/fisico`): composición corporal
 * e historial JP7 del alumno, y para el profesor el registro de sus alumnos.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ApiError } from '@/api/client';
import {
  fetchDailyPlan,
  type DayPlan,
  type MealIngredient,
  type PlanMeal,
  type PlannedSlot,
  type PlanTarget,
} from '@/api/nutrition';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { GOAL_LABEL } from '@/data/nutrition';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

export default function DietaScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const teacher = isTeacher(user);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  // El objetivo del perfil. Es la dependencia del efecto de abajo: si el usuario
  // lo cambia en Perfil, el plan que se está mostrando ya no corresponde.
  const goal = user?.goal ?? null;

  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      // El profesor no lleva su propia dieta: entra a Dieta solo para gestionar
      // el cambio físico de sus alumnos, así que no se le pide plan.
      if (teacher) {
        setStatus('ready');
        return;
      }
      setStatus('loading');
      setError(null);
      try {
        setPlan(await fetchDailyPlan(undefined, signal));
        setStatus('ready');
      } catch (e) {
        if (signal?.aborted) return;
        setError(mensajeDeError(e));
        setStatus('error');
      }
    },
    [teacher]
  );

  // Se recarga al montar Y cada vez que cambia el objetivo.
  //
  // A propósito NO se recarga en cada visita a la pestaña (useFocusEffect): el
  // objetivo es el único dato que invalida el plan de verdad, así que basta con
  // rearmarlo cuando ese cambia (y con "Cambiar el menú" a pedido del usuario).
  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar, goal]);

  return (
    <ScreenFade>
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={status === 'loading' && plan !== null} onRefresh={() => cargar()} />
          }>
          <View style={styles.header}>
            <ThemedText type="subtitle">Dieta</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {/* Se muestra el objetivo para que quede claro de cuál plan se
                  trata: al cambiarlo en Perfil, esta línea cambia con él. */}
              {teacher
                ? 'Registra y sigue el cambio físico de tus alumnos.'
                : goal
                  ? `Plan de ${GOAL_LABEL[goal].toLowerCase()}, según tu peso y objetivo.`
                  : 'Tu plan de hoy, calculado desde tu peso y tu objetivo.'}
            </ThemedText>
          </View>

          {/* Acceso al progreso físico (composición corporal / JP7). Para el
              alumno es su avance; para el profesor, el registro de sus alumnos. */}
          <Pressable
            onPress={() => router.push('/dieta/fisico')}
            style={({ pressed }) => pressed && styles.pressed}>
            <ThemedView type="backgroundElement" style={styles.progresoCard}>
              <View style={styles.progresoIcon}>
                <Feather name="trending-up" size={18} color={Accent} />
              </View>
              <View style={styles.progresoInfo}>
                <ThemedText type="smallBold">
                  {teacher ? 'Progreso físico de alumnos' : 'Progreso físico'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {teacher
                    ? 'Composición corporal y registro JP7'
                    : 'Peso, altura y composición corporal'}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={20} color="#8a8a8a" />
            </ThemedView>
          </Pressable>

          {teacher ? null : (
            <>
              {status === 'loading' && !plan && (
                <View style={styles.centered}>
                  <ActivityIndicator />
                  <ThemedText type="small" themeColor="textSecondary">
                    Armando tu plan…
                  </ThemedText>
                </View>
              )}

              {status === 'error' && (
                <View style={styles.centered}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.errorText}>
                    {error}
                  </ThemedText>
                  <Pressable
                    onPress={() => cargar()}
                    style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.retryText}>
                      Reintentar
                    </ThemedText>
                  </Pressable>
                </View>
              )}

              {plan && (
                <>
                  <ResumenDelDia plan={plan} />

                  <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                    COMIDAS DE HOY
                  </ThemedText>

                  {plan.meals.map((p) => (
                    <TarjetaComida key={p.slot.key} planificada={p} />
                  ))}

                  <Pressable
                    onPress={() => cargar()}
                    style={({ pressed }) => [styles.refresh, pressed && styles.pressed]}>
                    <ThemedText type="smallBold" style={styles.refreshText}>
                      Cambiar el menú
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
    </ScreenFade>
  );
}

/** Cabecera con el target del día y lo que suman los platos elegidos. */
function ResumenDelDia({ plan }: { plan: DayPlan }) {
  const theme = useTheme();
  const { totals, target } = plan;

  // Cuánto del objetivo cubren los platos de hoy, acotado a 1 para la barra.
  const progreso = target.kcal > 0 ? Math.min(1, totals.kcal / target.kcal) : 0;

  return (
    <ThemedView type="backgroundElement" style={styles.resumen}>
      <View style={styles.resumenTop}>
        <View>
          <ThemedText type="small" themeColor="textSecondary">
            CALORÍAS DE HOY
          </ThemedText>
          <ThemedText type="subtitle">
            {Math.round(totals.kcal)}
            <ThemedText type="small" themeColor="textSecondary">
              {'  '}/ {target.kcal} kcal
            </ThemedText>
          </ThemedText>
        </View>
      </View>

      <View style={[styles.barraFondo, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.barraLlena, { width: `${progreso * 100}%` }]} />
      </View>

      <View style={styles.macrosRow}>
        <Macro label="Proteína" real={totals.macros.protein} objetivo={target.macros.protein} />
        <Macro label="Carbos" real={totals.macros.carbs} objetivo={target.macros.carbs} />
        <Macro label="Grasa" real={totals.macros.fat} objetivo={target.macros.fat} />
      </View>
    </ThemedView>
  );
}

/** Un macro: cuánto suman los platos y cuánto pedía el objetivo. */
function Macro({ label, real, objetivo }: { label: string; real: number; objetivo: number }) {
  return (
    <View style={styles.macro}>
      <ThemedText type="smallBold">{Math.round(real)} g</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        de {objetivo} g
      </ThemedText>
    </View>
  );
}

/** Una comida: foto, título y sus macros. */
function TarjetaComida({ planificada }: { planificada: PlannedSlot }) {
  const theme = useTheme();
  const { slot, meal } = planificada;

  // Defensa contra respuestas sin los campos de porción: durante un hot-reload
  // el estado puede traer un plan pedido a una versión anterior del backend, y
  // ahí `portions`/`served` llegan undefined. Se cae de vuelta a la porción tal
  // cual, que es exactamente lo que hacía la pantalla antes del ajuste.
  const portions = planificada.portions ?? 1;
  const grams = planificada.grams ?? null;
  const served = planificada.served ?? servedDesdeLaReceta(meal);

  // Una ranura sin plato es normal: la ventana de macros puede quedar vacía.
  if (!meal) {
    return (
      <ThemedView type="backgroundElement" style={styles.tarjetaVacia}>
        <ThemedText type="smallBold">{slot.label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          No encontramos un plato que calce con estos macros.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.tarjeta}>
      {meal.imageUrl ? (
        <Image source={{ uri: meal.imageUrl }} style={styles.foto} resizeMode="cover" />
      ) : (
        <View style={[styles.foto, { backgroundColor: theme.backgroundSelected }]} />
      )}

      <View style={styles.tarjetaInfo}>
        <View style={styles.pill}>
          <ThemedText type="small" style={styles.pillText}>
            {slot.label.toUpperCase()}
          </ThemedText>
        </View>

        <ThemedText numberOfLines={2}>
          {meal.title}
        </ThemedText>

        {/* La cantidad a servir. Es la línea que hace que el día cuadre: los
            macros de abajo son los de ESTA cantidad, no los de la receta. */}
        <ThemedText type="smallBold">{textoPorcion(portions, grams)}</ThemedText>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(served.kcal)} kcal
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ·
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(served.macros.protein)} g proteína
          </ThemedText>
          {meal.readyInMinutes != null && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                ·
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {meal.readyInMinutes} min
              </ThemedText>
            </>
          )}
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(served.macros.carbs)} g carbohidratos
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            ·
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(served.macros.fat)} g grasa
          </ThemedText>
        </View>

        {/* Desglose de ingredientes: solo en platos ya descompuestos. Los gramos
            y macros se escalan por `portions`, igual que los macros de arriba. */}
        {meal.ingredients && meal.ingredients.length > 0 && (
          <IngredientesDesplegable ingredients={meal.ingredients} portions={portions} />
        )}
      </View>
    </ThemedView>
  );
}

/** Desplegable con los ingredientes de la receta y el aporte de cada uno. */
function IngredientesDesplegable({
  ingredients,
  portions,
}: {
  ingredients: MealIngredient[];
  portions: number;
}) {
  const theme = useTheme();
  const [abierto, setAbierto] = useState(false);

  return (
    <View style={[styles.ingredientes, { borderTopColor: theme.backgroundSelected }]}>
      <Pressable
        onPress={() => setAbierto((v) => !v)}
        hitSlop={6}
        style={styles.ingHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {abierto ? 'Ocultar ingredientes' : 'Ver ingredientes'}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {abierto ? '▾' : '▸'}
        </ThemedText>
      </Pressable>

      {abierto && (
        <View style={styles.ingList}>
          {ingredients.map((ing, i) => {
            // Gramos a nearest 5 (como el peso del plato); macros a entero.
            const gramos = Math.round((ing.grams * portions) / 5) * 5;
            return (
              <View key={i} style={styles.ingRow}>
                <View style={styles.ingNameCol}>
                  <ThemedText type="small">{ing.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Math.round(ing.protein * portions)}P · {Math.round(ing.carbs * portions)}C ·{' '}
                    {Math.round(ing.fat * portions)}G
                  </ThemedText>
                </View>
                <View style={styles.ingRightCol}>
                  <ThemedText type="smallBold">{gramos} g</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Math.round(ing.kcal * portions)} kcal
                  </ThemedText>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Los macros de una porción, con la forma de `served`. Ver el fallback arriba. */
function servedDesdeLaReceta(meal: PlanMeal | null): PlanTarget {
  if (!meal) return { kcal: 0, macros: { protein: 0, carbs: 0, fat: 0 } };
  return {
    kcal: meal.kcal,
    macros: { protein: meal.protein, carbs: meal.carbs, fat: meal.fat },
  };
}

/**
 * Cómo se le pide al usuario que sirva el plato.
 *
 * Se prefieren los gramos cuando la receta informa su peso: "620 g" se entiende
 * y se pesa; "1,05 porciones" no le dice nada a nadie. Cuando el factor es
 * prácticamente 1 se omite del todo — decir "1 porción" es ruido.
 */
function textoPorcion(portions: number, grams: number | null): string {
  const casiUna = Math.abs(portions - 1) < 0.075;

  if (grams != null) {
    return casiUna ? `1 porción (${grams} g)` : `${formatearPorciones(portions)} (${grams} g)`;
  }
  return casiUna ? '1 porción' : formatearPorciones(portions);
}

/** "1,5 porciones" — con coma decimal y sin ceros de relleno. */
function formatearPorciones(portions: number): string {
  const texto = portions.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
  return `${texto} ${portions === 1 ? 'porción' : 'porciones'}`;
}

/** Traduce los errores del backend a algo que el usuario entienda. */
function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) {
      return 'Completa tu perfil (peso, estatura, edad y objetivo) para armar tu dieta.';
    }
    if (e.status === 0) {
      return 'No pudimos conectar con el servidor.';
    }
    return e.message;
  }
  return 'Algo salió mal armando tu plan.';
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
  header: { gap: Spacing.half },

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

  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.three,
  },
  errorText: { textAlign: 'center' },
  retry: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: 9999,
    backgroundColor: Accent,
  },
  retryText: { color: 'black' },

  // --- Resumen ---
  resumen: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  resumenTop: { flexDirection: 'row', justifyContent: 'space-between' },
  barraFondo: { height: 8, borderRadius: 9999, overflow: 'hidden' },
  barraLlena: { height: '100%', borderRadius: 9999, backgroundColor: Accent },
  macrosRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macro: { alignItems: 'center', gap: Spacing.half },

  sectionLabel: { marginTop: Spacing.two, letterSpacing: 1 },

  // --- Tarjeta de comida ---
  tarjeta: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  foto: { width: '100%', height: 160 },
  tarjetaInfo: { padding: Spacing.four, gap: Spacing.two },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: Accent,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
  },
  pillText: { color: 'black', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },

  // --- Desplegable de ingredientes ---
  ingredientes: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.two,
  },
  ingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingList: { gap: Spacing.two },
  ingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  ingNameCol: { flex: 1, gap: Spacing.half },
  ingRightCol: { alignItems: 'flex-end', gap: Spacing.half },

  tarjetaVacia: {
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.half,
  },

  refresh: {
    marginTop: Spacing.two,
    height: 52,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: { color: 'black', fontSize: 16 },
  pressed: { opacity: 0.85 },
});
