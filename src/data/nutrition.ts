/**
 * Nutrición: modelo de los planes/alimentos del backend y la calculadora de
 * calorías y macros.
 *
 * La calculadora es matemática pura (no toca la red): a partir de los datos
 * físicos del perfil deriva BMR (Mifflin-St Jeor) → TDEE → tres objetivos, igual
 * que el PoC. Vive acá, junto al resto de la lógica derivada, por la misma razón
 * que `stats.ts`: es barato recalcular en vivo y no necesita un endpoint.
 */

import type { ActivityLevel, Goal, Sex, User } from './workouts';

// Las columnas de pliegues en el modelo User comparten prefijo. Se exporta para
// tipar los callbacks de los controles del formulario.
export type SkinfoldField =
  | 'skinfoldChest'
  | 'skinfoldMidaxillary'
  | 'skinfoldTriceps'
  | 'skinfoldSubscapular'
  | 'skinfoldAbdominal'
  | 'skinfoldSuprailiac'
  | 'skinfoldThigh';

// =====================================================================
// Modelo de datos (espejo de las tablas NutritionPlan / Food / intermedia)
// =====================================================================

export type Food = {
  id: string;
  name: string;
  /** Calorías por 100 g. */
  kcal: number;
  type: string | null;
  createdAt?: string;
};

/** Un alimento dentro de un plan (tabla intermedia NutritionPlanFood). */
export type NutritionPlanFood = {
  id: string;
  planId: string;
  foodId: string;
  /** Gramos prescritos de este alimento en el plan. */
  grams: number;
  order: number;
  food: Food;
};

export type NutritionPlan = {
  id: string;
  name: string;
  imageUrl: string | null;
  foods: NutritionPlanFood[];
  createdAt?: string;
};

/** Calorías reales de una porción: kcal por 100 g escalado a los gramos. */
export function foodKcal(item: NutritionPlanFood): number {
  return Math.round((item.food.kcal * item.grams) / 100);
}

/** Calorías totales de un plan, sumando cada alimento. */
export function planKcal(plan: NutritionPlan): number {
  return plan.foods.reduce((acc, item) => acc + foodKcal(item), 0);
}

// =====================================================================
// Etiquetas para la UI (las claves se guardan en inglés; el label es español)
// =====================================================================

export const SEX_LABEL: Record<Sex, string> = {
  male: 'Hombre',
  female: 'Mujer',
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  high: 'Alto',
  very_high: 'Muy alto',
};

export const GOAL_LABEL: Record<Goal, string> = {
  maintenance: 'Mantenimiento',
  hypertrophy: 'Hipertrofia',
  cut: 'Definición',
};

/** Imágenes ilustrativas de cada objetivo (bucket público en Cloudflare R2). */
const GOAL_IMAGE_BASE =
  'https://pub-f9de0df068744e6188e27cf0dab066a7.r2.dev/workout_planes_nutricion';

export const GOAL_IMAGE: Record<Goal, string> = {
  maintenance: `${GOAL_IMAGE_BASE}/mantenimiento.png`,
  hypertrophy: `${GOAL_IMAGE_BASE}/hipertrofia.png`,
  cut: `${GOAL_IMAGE_BASE}/definicion.png`,
};

/** Descripción corta que acompaña a cada nivel en el selector. */
export const ACTIVITY_HINT: Record<ActivityLevel, string> = {
  sedentary: 'Poco o nada de ejercicio',
  light: '1-3 días/semana',
  moderate: '3-5 días/semana',
  high: '6-7 días/semana',
  very_high: 'Físico + entreno diario',
};

/** Multiplicador del TDEE por nivel de actividad. */
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
};

export const SEX_OPTIONS = Object.keys(SEX_LABEL) as Sex[];
export const ACTIVITY_OPTIONS = Object.keys(ACTIVITY_FACTOR) as ActivityLevel[];

// =====================================================================
// Calculadora
// =====================================================================

/** Los datos mínimos que necesita la calculadora. */
export type Metrics = {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  activityLevel: ActivityLevel;
};

/**
 * ¿El perfil tiene los cinco datos que necesita la calculadora? Es lo que gatilla
 * el onboarding: mientras devuelva `null`, falta completar el perfil.
 */
export function metricsFromUser(user: User | null): Metrics | null {
  if (!user) return null;
  const { sex, age, weightKg, heightCm, activityLevel } = user;
  if (
    sex == null ||
    age == null ||
    weightKg == null ||
    heightCm == null ||
    activityLevel == null
  ) {
    return null;
  }
  return { sex, age, weightKg, heightCm, activityLevel };
}

/**
 * ¿El usuario ya completó su onboarding? Requiere los cinco datos físicos y,
 * además, un objetivo elegido: hasta tener ambos, el wizard sigue apareciendo.
 */
export function isProfileComplete(user: User | null): boolean {
  return metricsFromUser(user) !== null && user?.goal != null;
}

/** BMR por Mifflin-St Jeor. */
export function basalMetabolicRate(m: Metrics): number {
  const base = 10 * m.weightKg + 6.25 * m.heightCm - 5 * m.age;
  return Math.round(base + (m.sex === 'male' ? 5 : -161));
}

/** Gasto energético total diario. */
export function totalDailyEnergy(m: Metrics): number {
  return Math.round(basalMetabolicRate(m) * ACTIVITY_FACTOR[m.activityLevel]);
}

/** Alias del tipo del modelo, para no repetir la unión en toda la calculadora. */
export type GoalKey = Goal;

/**
 * Definición de cada objetivo, calibrada para reproducir el PoC:
 * - `calorieFactor` escala el TDEE (hipertrofia +12.5%, definición −17.5%).
 * - proteína y grasa se fijan por g/kg; los carbohidratos cuadran el resto.
 */
const GOALS: Record<
  GoalKey,
  { label: string; calorieFactor: number; proteinPerKg: number; fatPerKg: number }
> = {
  maintenance: { label: 'Mantenimiento', calorieFactor: 1.0, proteinPerKg: 1.6, fatPerKg: 0.9 },
  hypertrophy: { label: 'Hipertrofia', calorieFactor: 1.125, proteinPerKg: 2.0, fatPerKg: 0.9 },
  cut: { label: 'Definición', calorieFactor: 0.825, proteinPerKg: 2.2, fatPerKg: 0.6 },
};

export const GOAL_ORDER: GoalKey[] = ['maintenance', 'hypertrophy', 'cut'];

export type Macros = { protein: number; carbs: number; fat: number };

export type GoalTarget = {
  key: GoalKey;
  label: string;
  kcal: number;
  macros: Macros;
};

/** Los tres objetivos con sus calorías y macros, a partir del perfil. */
export function goalTargets(m: Metrics): GoalTarget[] {
  const tdee = totalDailyEnergy(m);

  return GOAL_ORDER.map((key) => {
    const goal = GOALS[key];
    const kcal = Math.round(tdee * goal.calorieFactor);

    const protein = Math.round(goal.proteinPerKg * m.weightKg);
    const fat = Math.round(goal.fatPerKg * m.weightKg);
    // Los carbohidratos absorben las calorías que sobran (nunca negativos).
    const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

    return { key, label: goal.label, kcal, macros: { protein, carbs, fat } };
  });
}

// =====================================================================
// Composición corporal: Jackson-Pollock 7 pliegues → % de grasa
// =====================================================================
//
// Es un cálculo APARTE del calórico (que sigue con Mifflin-St Jeor). Los siete
// pliegues estiman la densidad corporal (Jackson & Pollock, 1978) y de ahí el
// porcentaje de grasa por la ecuación de Siri. Informativo: no alimenta el TDEE
// ni los macros; se muestra en el Perfil cuando el usuario midió los siete.

/** Los siete pliegues del protocolo JP7, en milímetros. */
export type Skinfolds = Record<SkinfoldField, number>;

/**
 * Metadata de cada sitio para la UI: la clave (columna en User), su etiqueta y
 * una pista de dónde se toma el pliegue. El orden es el del protocolo.
 */
export const SKINFOLD_SITES: {
  key: SkinfoldField;
  label: string;
  hint: string;
}[] = [
  { key: 'skinfoldChest', label: 'Pecho', hint: 'Diagonal, entre axila y pezón' },
  { key: 'skinfoldMidaxillary', label: 'Axilar medio', hint: 'Línea media axilar, a la altura del esternón' },
  { key: 'skinfoldTriceps', label: 'Tríceps', hint: 'Vertical, punto medio del brazo' },
  { key: 'skinfoldSubscapular', label: 'Subescapular', hint: 'Diagonal, bajo la escápula' },
  { key: 'skinfoldAbdominal', label: 'Abdomen', hint: 'Vertical, 2 cm al lado del ombligo' },
  { key: 'skinfoldSuprailiac', label: 'Suprailíaco', hint: 'Diagonal, sobre la cresta ilíaca' },
  { key: 'skinfoldThigh', label: 'Muslo', hint: 'Vertical, punto medio del muslo' },
];

/**
 * Los pliegues tal como los maneja un formulario: cada uno puede faltar (`null`)
 * o no haberse tocado (`undefined`) mientras se está midiendo.
 */
export type SkinfoldValues = { [K in SkinfoldField]?: number | null };

/**
 * Si el mapa parcial trae los siete pliegues con un número válido, devuelve el
 * `Skinfolds` completo; si falta alguno, `null`. Sirve tanto para el User
 * guardado como para el estado en vivo de un formulario.
 */
export function completeSkinfolds(values: SkinfoldValues): Skinfolds | null {
  const folds = {} as Skinfolds;
  for (const { key } of SKINFOLD_SITES) {
    const v = values[key];
    if (v == null) return null;
    folds[key] = v;
  }
  return folds;
}

/**
 * ¿El usuario tiene los siete pliegues medidos? Devuelve `null` si falta alguno;
 * es lo que gatilla mostrar (o no) el panel de composición corporal.
 */
export function skinfoldsFromUser(user: User | null): Skinfolds | null {
  if (!user) return null;
  return completeSkinfolds(user);
}

/** Suma de los siete pliegues (mm), el insumo de la fórmula de densidad. */
export function skinfoldSum(folds: Skinfolds): number {
  return SKINFOLD_SITES.reduce((acc, { key }) => acc + folds[key], 0);
}

/**
 * % de grasa corporal por Jackson-Pollock 7 + Siri.
 *
 * Densidad corporal (g/cc), cuadrática en la suma de pliegues y lineal en la
 * edad, con coeficientes distintos por sexo. Luego Siri: %grasa = 495/D − 450.
 */
export function bodyFatPercent(sex: Sex, age: number, folds: Skinfolds): number {
  const s = skinfoldSum(folds);
  const density =
    sex === 'male'
      ? 1.112 - 0.00043499 * s + 0.00000055 * s * s - 0.00028826 * age
      : 1.097 - 0.00046971 * s + 0.00000056 * s * s - 0.00012828 * age;
  const bodyFat = 495 / density - 450;
  // Nunca negativo ni absurdo aunque los pliegues sean muy chicos/grandes.
  return Math.max(0, Math.round(bodyFat * 10) / 10);
}

export type BodyComposition = {
  /** Porcentaje de grasa corporal (0-100). */
  bodyFatPct: number;
  /** Masa grasa en kg. */
  fatMassKg: number;
  /** Masa magra (libre de grasa) en kg. */
  leanMassKg: number;
};

/** Composición corporal completa: necesita los pliegues y el peso del perfil. */
export function bodyComposition(
  sex: Sex,
  age: number,
  weightKg: number,
  folds: Skinfolds
): BodyComposition {
  const bodyFatPct = bodyFatPercent(sex, age, folds);
  const fatMassKg = Math.round(((weightKg * bodyFatPct) / 100) * 10) / 10;
  const leanMassKg = Math.round((weightKg - fatMassKg) * 10) / 10;
  return { bodyFatPct, fatMassKg, leanMassKg };
}

// =====================================================================
// Gasto calórico de ejercicios (medidor de calorías)
// =====================================================================

/** MET por defecto para ejercicios sin clasificar (`met` nulo en el catálogo). */
const DEFAULT_MET = 5.0;

/**
 * Segundos que dura una repetición (tiempo bajo tensión aproximado). Se usan
 * para convertir las reps en tiempo de esfuerzo: reps × 3 s ≈ la fase activa.
 */
const SECONDS_PER_REP = 3;

/**
 * Descanso asumido entre series cuando la serie no tiene uno definido. Los MET
 * del Compendium se midieron sobre la sesión COMPLETA (con descansos), así que
 * hay que incluir el descanso para no subcontar; sin un valor propio se usa este.
 */
const DEFAULT_REST_SECONDS = 60;

/**
 * Factor EPOC (afterburn): la fuerza deja el metabolismo elevado horas después
 * del esfuerzo, gasto que ocurre fuera de la sesión. Se aproxima con un +10%
 * sobre el gasto en sesión. Es parte de por qué "quema más de lo que parece".
 */
const EPOC_FACTOR = 1.1;

/**
 * Calorías quemadas en una serie, método MET del Compendium of Physical
 * Activities (el estándar de toda app/API de fitness):
 *
 *   kcal = MET × 3.5 × pesoCorporal / 200 × minutos × EPOC
 *
 * La duración incluye el esfuerzo (reps × tempo) MÁS el descanso, porque el MET
 * es un promedio de sesión con descansos incluidos. Los `met` del catálogo son
 * de esfuerzo VIGOROSO (series de trabajo), no moderado.
 *
 * NOTA sobre la carga: no se suma un término de "trabajo mecánico". El MET ya
 * incluye el costo de mover las pesas (es gasto corporal medido), y el trabajo
 * mecánico puro de un levantamiento es físicamente diminuto (~0.5 kcal): sumarlo
 * era doble conteo. La intensidad la refleja el MET del ejercicio, no el kg
 * puntual, cuyo efecto real sobre las calorías es mínimo. `liftedWeightKg` y
 * `muscleGroup` se mantienen en la firma por compatibilidad; no se usan.
 */
export function caloriesForSet(params: {
  met: number | null;
  bodyWeightKg: number;
  reps: number;
  restSeconds: number | null;
  liftedWeightKg: number | null;
  muscleGroup: string | null;
}): number {
  const { met, bodyWeightKg, reps, restSeconds } = params;
  if (reps <= 0 || bodyWeightKg <= 0) return 0;

  const seconds = reps * SECONDS_PER_REP + (restSeconds ?? DEFAULT_REST_SECONDS);
  const metKcal = ((met ?? DEFAULT_MET) * 3.5 * bodyWeightKg) / 200 * (seconds / 60);

  return metKcal * EPOC_FACTOR;
}
