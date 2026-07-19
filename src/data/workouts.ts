/**
 * Modelo de datos de la app, espejo del schema de Prisma del backend.
 *
 * Jerarquía: `Workout` -> `WorkoutExercise` -> `WorkoutSet`.
 *
 * Ojo con `WorkoutExercise` vs `Exercise`: `Exercise` es el catálogo global
 * (nombre único, compartido por todas las rutinas) y `WorkoutExercise` es la
 * instancia de ese ejercicio *dentro de* una rutina, con su orden, sus notas y
 * sus series. El backend expone ambos anidados en la misma respuesta.
 */

/** Entrada del catálogo global de ejercicios (`Exercise` en Prisma). */
export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string | null;
  createdAt?: string;
};

/** Una serie (`WorkoutSet` en Prisma). */
export type WorkoutSet = {
  id: string;
  workoutExerciseId: string;
  order: number;
  reps: number;
  /** Peso en kg. `null` = peso corporal / sin carga. */
  weightKg: number | null;
  /** Rate of Perceived Exertion (1-10). */
  rpe: number | null;
  /** Descanso objetivo en segundos. */
  restSeconds: number | null;
  done: boolean;
  createdAt?: string;
};

/** Un ejercicio dentro de una rutina (`WorkoutExercise` en Prisma). */
export type WorkoutExercise = {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
  notes: string | null;
  exercise: Exercise;
  sets: WorkoutSet[];
  createdAt?: string;
};

/** Una rutina / sesión (`Workout` en Prisma). */
export type Workout = {
  id: string;
  userId: string;
  title: string;
  /** Día o etiqueta libre, ej: "Lunes - Empuje". */
  day: string | null;
  /** ISO 8601, tal como lo serializa Prisma. */
  date: string;
  notes: string | null;
  exercises: WorkoutExercise[];
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  /** Id estable del usuario en Google. `null` si aún no vinculó su cuenta. */
  googleId: string | null;
  /** Foto de perfil que entrega Google. */
  avatarUrl: string | null;
  createdAt?: string;
};

// --- Payloads de escritura (lo que aceptan los endpoints) ---

export type WorkoutInput = Partial<Pick<Workout, 'title' | 'day' | 'notes' | 'date'>>;

export type WorkoutExerciseInput = {
  name?: string;
  muscleGroup?: string | null;
  notes?: string | null;
  order?: number;
};

export type WorkoutSetInput = Partial<
  Pick<WorkoutSet, 'reps' | 'weightKg' | 'rpe' | 'restSeconds' | 'done' | 'order'>
>;

// --- Valores por defecto ---

/** Serie por defecto al añadir una nueva (el id lo asigna el backend). */
export const defaultSet: Required<Pick<WorkoutSetInput, 'reps' | 'weightKg' | 'restSeconds' | 'done'>> = {
  reps: 10,
  weightKg: 20,
  restSeconds: 90,
  done: false,
};

export const defaultWorkoutTitle = 'Nueva rutina';
export const defaultExerciseName = 'Nuevo ejercicio';

// --- Utilidades de lectura ---

/** Nombre visible de un ejercicio de rutina. */
export function exerciseName(we: WorkoutExercise): string {
  return we.exercise.name;
}

/** Cantidad total de series de una rutina. */
export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((acc, we) => acc + we.sets.length, 0);
}

/** Volumen total (kg) = suma de reps * peso. Las series sin peso suman 0. */
export function totalVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (acc, we) => acc + we.sets.reduce((s, set) => s + set.reps * (set.weightKg ?? 0), 0),
    0
  );
}

/** Fecha de la rutina en formato corto para las tarjetas. */
export function formatWorkoutDate(workout: Workout): string {
  return new Date(workout.date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
