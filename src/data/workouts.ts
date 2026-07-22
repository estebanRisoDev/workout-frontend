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
  /** URL de la imagen ilustrativa. `null` en el catálogo antiguo → placeholder. */
  imageUrl: string | null;
  /**
   * MET (Metabolic Equivalent of Task): cuánto gasta el ejercicio respecto al
   * reposo. Alimenta el medidor de calorías (ver `caloriesForSet` en
   * nutrition.ts). `null` en ejercicios sin clasificar → cae a un MET por defecto.
   */
  met: number | null;
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
  /** Descanso objetivo en segundos. */
  restSeconds: number | null;
  done: boolean;
  /**
   * Calorías quemadas en la serie, congeladas al marcarla como hecha (MET +
   * trabajo mecánico). `null` mientras no esté hecha. La suma por rutina es la
   * estadística de calorías. La calcula el backend; el cliente la refleja.
   */
  caloriesBurned: number | null;
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

/** Sexo biológico para la fórmula de Mifflin-St Jeor (male: +5, female: −161). */
export type Sex = 'male' | 'female';

/** Nivel de actividad; cada uno mapea a un multiplicador del TDEE en nutrition.ts. */
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high';

/** Objetivo / tipo de dieta elegido por el usuario. */
export type Goal = 'maintenance' | 'hypertrophy' | 'cut';

/** Rol del usuario. La app es personal de un único profesor; el resto son alumnos. */
export type UserRole = 'user' | 'teacher';

export type User = {
  id: string;
  email: string;
  name: string | null;
  /** Id estable del usuario en Google. `null` si aún no vinculó su cuenta. */
  googleId: string | null;
  /** Foto de perfil que entrega Google. */
  avatarUrl: string | null;
  /** "user" (alumno) o "teacher" (el profesor dueño de la app). */
  role: UserRole;
  createdAt?: string;

  // Datos físicos que captura el onboarding. `null` mientras no los complete.
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  activityLevel: ActivityLevel | null;
  /** Objetivo/tipo de dieta elegido en el onboarding. */
  goal: Goal | null;

  // Pliegues cutáneos Jackson-Pollock 7, en milímetros. Opcionales e
  // independientes del cálculo calórico: solo alimentan la estimación de % de
  // grasa (ver `bodyFatPercent` en nutrition.ts). `null` mientras no se midan.
  skinfoldChest: number | null;
  skinfoldMidaxillary: number | null;
  skinfoldTriceps: number | null;
  skinfoldSubscapular: number | null;
  skinfoldAbdominal: number | null;
  skinfoldSuprailiac: number | null;
  skinfoldThigh: number | null;
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
  Pick<WorkoutSet, 'reps' | 'weightKg' | 'restSeconds' | 'done' | 'order'>
>;

/**
 * Patch de una serie desde el cliente. Además de los campos del endpoint, lleva
 * `caloriesBurned` como valor LOCAL (optimista, para que el total reaccione al
 * instante); el store no lo envía al backend, que lo recalcula por su cuenta.
 */
export type SetPatch = WorkoutSetInput & { caloriesBurned?: number | null };

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

/** ¿Este usuario es el profesor (dueño de la app)? */
export function isTeacher(user: User | null): boolean {
  return user?.role === 'teacher';
}

/** Nombre visible de un ejercicio de rutina. */
export function exerciseName(we: WorkoutExercise): string {
  return we.exercise.name;
}

/** Cantidad total de series de una rutina. */
export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((acc, we) => acc + we.sets.length, 0);
}


/** Fecha de la rutina en formato corto para las tarjetas. */
export function formatWorkoutDate(workout: Workout): string {
  return new Date(workout.date).toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
