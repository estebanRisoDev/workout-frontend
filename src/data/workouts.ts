/**
 * Modelo de datos de la app de entrenamientos.
 *
 * Un `Workout` (rutina / sesión) contiene varios `Exercise`.
 * Cada `Exercise` contiene varias `ExerciseSet` (series) donde vive el detalle
 * programable: repeticiones, peso, RPE, descanso y si ya se completó.
 */

export type ExerciseSet = {
  id: string;
  reps: number;
  /** Peso en kg. 0 = peso corporal / sin carga. */
  weight: number;
  /** Rate of Perceived Exertion (1-10), opcional. */
  rpe?: number;
  /** Descanso objetivo en segundos, opcional. */
  restSeconds?: number;
  done: boolean;
};

export type Exercise = {
  id: string;
  name: string;
  /** Grupo muscular u otra etiqueta libre. */
  muscle?: string;
  notes?: string;
  sets: ExerciseSet[];
};

export type Workout = {
  id: string;
  title: string;
  /** Día o etiqueta, ej: "Lunes - Empuje". */
  day?: string;
  notes?: string;
  exercises: Exercise[];
};

/** Generador de ids simple y estable en runtime (no usar en SSR). */
let counter = 0;
export function makeId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function newSet(partial?: Partial<ExerciseSet>): ExerciseSet {
  return {
    id: makeId('set'),
    reps: 10,
    weight: 20,
    rpe: undefined,
    restSeconds: 90,
    done: false,
    ...partial,
  };
}

export function newExercise(name = 'Nuevo ejercicio'): Exercise {
  return {
    id: makeId('ex'),
    name,
    sets: [newSet()],
  };
}

export function newWorkout(title = 'Nueva rutina'): Workout {
  return {
    id: makeId('w'),
    title,
    exercises: [],
  };
}

/** Utilidad: cantidad total de series de una rutina. */
export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
}

/** Volumen total (kg) = suma de reps * peso de todas las series. */
export function totalVolume(workout: Workout): number {
  return workout.exercises.reduce(
    (acc, ex) => acc + ex.sets.reduce((s, set) => s + set.reps * set.weight, 0),
    0
  );
}

/** Datos de ejemplo para arrancar. */
export const seedWorkouts: Workout[] = [
  {
    id: 'w_seed_push',
    title: 'Empuje A',
    day: 'Lunes - Empuje',
    notes: 'Enfoque en pecho y hombro. Progresión lineal semanal.',
    exercises: [
      {
        id: 'ex_seed_bench',
        name: 'Press banca',
        muscle: 'Pecho',
        sets: [
          { id: 'set_1', reps: 8, weight: 60, rpe: 7, restSeconds: 120, done: false },
          { id: 'set_2', reps: 8, weight: 60, rpe: 8, restSeconds: 120, done: false },
          { id: 'set_3', reps: 6, weight: 65, rpe: 9, restSeconds: 150, done: false },
        ],
      },
      {
        id: 'ex_seed_ohp',
        name: 'Press militar',
        muscle: 'Hombro',
        sets: [
          { id: 'set_4', reps: 10, weight: 35, rpe: 7, restSeconds: 90, done: false },
          { id: 'set_5', reps: 10, weight: 35, rpe: 8, restSeconds: 90, done: false },
        ],
      },
    ],
  },
  {
    id: 'w_seed_pull',
    title: 'Tracción A',
    day: 'Miércoles - Tracción',
    notes: 'Espalda y bíceps.',
    exercises: [
      {
        id: 'ex_seed_row',
        name: 'Remo con barra',
        muscle: 'Espalda',
        sets: [
          { id: 'set_6', reps: 10, weight: 50, rpe: 7, restSeconds: 120, done: false },
          { id: 'set_7', reps: 10, weight: 50, rpe: 8, restSeconds: 120, done: false },
          { id: 'set_8', reps: 8, weight: 55, rpe: 9, restSeconds: 120, done: false },
        ],
      },
    ],
  },
];
