/**
 * Tipos del historial (espejo del backend): sesiones de rutina archivadas por
 * semana y mediciones Jackson-Pollock en el tiempo. Alimentan el tab de
 * Estadísticas (progresión por ejercicio, racha histórica, composición corporal).
 */

/** Una serie hecha, congelada en el historial de una sesión. */
export type SessionSet = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  muscleGroup: string | null;
  reps: number;
  weightKg: number | null;
  caloriesBurned: number | null;
  order: number;
};

/** Una rutina completada en una semana (archivada al pasar de semana). */
export type WorkoutSession = {
  id: string;
  userId: string;
  sourceWorkoutId: string | null;
  title: string;
  day: string | null;
  /** ISO: lunes de la semana a la que corresponde. */
  weekStart: string;
  completedAt: string;
  totalCalories: number;
  sets: SessionSet[];
};

/**
 * Una medición corporal en una fecha. Peso y altura sirven para todos (clave en
 * niños/adolescentes que crecen); los 7 pliegues JP7 son opcionales.
 */
export type SkinfoldMeasurement = {
  id: string;
  userId: string;
  measuredById: string | null;
  measuredAt: string;
  weightKg: number | null;
  heightCm: number | null;
  skinfoldChest: number | null;
  skinfoldMidaxillary: number | null;
  skinfoldTriceps: number | null;
  skinfoldSubscapular: number | null;
  skinfoldAbdominal: number | null;
  skinfoldSuprailiac: number | null;
  skinfoldThigh: number | null;
};
