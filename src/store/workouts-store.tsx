/**
 * Store en memoria de rutinas basado en React Context.
 *
 * Es intencionalmente simple (sin persistencia) para servir de base: acá se
 * pueden enchufar más adelante AsyncStorage, SQLite (expo-sqlite) o una API.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  newExercise,
  newSet,
  newWorkout,
  seedWorkouts,
  type Exercise,
  type ExerciseSet,
  type Workout,
} from '@/data/workouts';

type WorkoutsContextValue = {
  workouts: Workout[];
  getWorkout: (id: string) => Workout | undefined;

  addWorkout: (title?: string) => Workout;
  updateWorkout: (id: string, patch: Partial<Omit<Workout, 'id' | 'exercises'>>) => void;
  removeWorkout: (id: string) => void;

  addExercise: (workoutId: string, name?: string) => void;
  updateExercise: (
    workoutId: string,
    exerciseId: string,
    patch: Partial<Omit<Exercise, 'id' | 'sets'>>
  ) => void;
  removeExercise: (workoutId: string, exerciseId: string) => void;

  addSet: (workoutId: string, exerciseId: string) => void;
  updateSet: (
    workoutId: string,
    exerciseId: string,
    setId: string,
    patch: Partial<Omit<ExerciseSet, 'id'>>
  ) => void;
  removeSet: (workoutId: string, exerciseId: string, setId: string) => void;
};

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>(seedWorkouts);

  /** Helper: mapea el workout con `id` aplicando `fn`, deja el resto igual. */
  const mapWorkout = useCallback((id: string, fn: (w: Workout) => Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? fn(w) : w)));
  }, []);

  const getWorkout = useCallback(
    (id: string) => workouts.find((w) => w.id === id),
    [workouts]
  );

  const addWorkout = useCallback((title?: string) => {
    const w = newWorkout(title);
    setWorkouts((prev) => [w, ...prev]);
    return w;
  }, []);

  const updateWorkout = useCallback<WorkoutsContextValue['updateWorkout']>(
    (id, patch) => mapWorkout(id, (w) => ({ ...w, ...patch })),
    [mapWorkout]
  );

  const removeWorkout = useCallback((id: string) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const addExercise = useCallback<WorkoutsContextValue['addExercise']>(
    (workoutId, name) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: [...w.exercises, newExercise(name)],
      })),
    [mapWorkout]
  );

  const updateExercise = useCallback<WorkoutsContextValue['updateExercise']>(
    (workoutId, exerciseId, patch) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((ex) =>
          ex.id === exerciseId ? { ...ex, ...patch } : ex
        ),
      })),
    [mapWorkout]
  );

  const removeExercise = useCallback<WorkoutsContextValue['removeExercise']>(
    (workoutId, exerciseId) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.filter((ex) => ex.id !== exerciseId),
      })),
    [mapWorkout]
  );

  const addSet = useCallback<WorkoutsContextValue['addSet']>(
    (workoutId, exerciseId) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((ex) => {
          if (ex.id !== exerciseId) return ex;
          // Copia los valores de la última serie como punto de partida.
          const last = ex.sets[ex.sets.length - 1];
          const clone = last
            ? newSet({ reps: last.reps, weight: last.weight, rpe: last.rpe, restSeconds: last.restSeconds })
            : newSet();
          return { ...ex, sets: [...ex.sets, clone] };
        }),
      })),
    [mapWorkout]
  );

  const updateSet = useCallback<WorkoutsContextValue['updateSet']>(
    (workoutId, exerciseId, setId, patch) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : {
                ...ex,
                sets: ex.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
              }
        ),
      })),
    [mapWorkout]
  );

  const removeSet = useCallback<WorkoutsContextValue['removeSet']>(
    (workoutId, exerciseId, setId) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((ex) =>
          ex.id !== exerciseId
            ? ex
            : { ...ex, sets: ex.sets.filter((s) => s.id !== setId) }
        ),
      })),
    [mapWorkout]
  );

  const value = useMemo<WorkoutsContextValue>(
    () => ({
      workouts,
      getWorkout,
      addWorkout,
      updateWorkout,
      removeWorkout,
      addExercise,
      updateExercise,
      removeExercise,
      addSet,
      updateSet,
      removeSet,
    }),
    [
      workouts,
      getWorkout,
      addWorkout,
      updateWorkout,
      removeWorkout,
      addExercise,
      updateExercise,
      removeExercise,
      addSet,
      updateSet,
      removeSet,
    ]
  );

  return <WorkoutsContext.Provider value={value}>{children}</WorkoutsContext.Provider>;
}

export function useWorkouts(): WorkoutsContextValue {
  const ctx = useContext(WorkoutsContext);
  if (!ctx) {
    throw new Error('useWorkouts debe usarse dentro de <WorkoutsProvider>');
  }
  return ctx;
}
