/**
 * Store de rutinas conectado a la API del backend (Express + Prisma).
 *
 * Estrategia de escritura:
 * - Cambios estructurales (crear/borrar rutina, ejercicio o serie) esperan la
 *   respuesta del servidor y aplican el objeto que devuelve, porque el id lo
 *   asigna Postgres.
 * - Ediciones de campos (título, reps, peso, ✓) se aplican al estado local al
 *   instante y se mandan al servidor con debounce, para no lanzar un PUT por
 *   cada tecla. Si el PUT falla, se recarga desde el servidor para resincronizar.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import * as api from '@/api/workouts';
import { useAuth } from './auth-store';
import {
  defaultExerciseName,
  defaultSet,
  defaultWorkoutTitle,
  type User,
  type Workout,
  type WorkoutExercise,
  type SetPatch,
  type WorkoutExerciseInput,
  type WorkoutInput,
  type WorkoutSet,
  type WorkoutSetInput,
} from '@/data/workouts';

/** Cuánto esperamos tras la última tecla antes de mandar el PUT. */
const WRITE_DEBOUNCE_MS = 500;

export type StoreStatus = 'loading' | 'ready' | 'error';

/**
 * Una fila del constructor: un ejercicio del catálogo con su prescripción.
 * `sets` es la *cantidad* de series (el "4" de "4 × 8"); al guardar se expande
 * a esa cantidad de filas `WorkoutSet` iguales en la base.
 */
export type DraftItem = {
  exerciseId: string;
  name: string;
  muscleGroup: string | null;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSeconds: number | null;
};

type WorkoutsContextValue = {
  workouts: Workout[];
  user: User | null;
  status: StoreStatus;
  /** Mensaje del último fallo de red/API, o null. */
  error: string | null;
  reload: () => Promise<void>;

  getWorkout: (id: string) => Workout | undefined;

  addWorkout: (title?: string) => Promise<Workout | null>;
  /** Guarda el borrador del constructor como una rutina nueva. */
  createWorkoutFromDraft: (
    meta: { title: string; day?: string | null },
    items: DraftItem[]
  ) => Promise<Workout | null>;
  updateWorkout: (id: string, patch: WorkoutInput) => void;
  removeWorkout: (id: string) => Promise<void>;

  addExercise: (
    workoutId: string,
    name?: string,
    muscleGroup?: string | null
  ) => Promise<void>;
  updateExercise: (
    workoutId: string,
    workoutExerciseId: string,
    patch: WorkoutExerciseInput
  ) => void;
  removeExercise: (workoutId: string, workoutExerciseId: string) => Promise<void>;

  addSet: (workoutId: string, workoutExerciseId: string) => Promise<void>;
  updateSet: (
    workoutId: string,
    workoutExerciseId: string,
    setId: string,
    // `caloriesBurned` es local (para actualizar el total en vivo); NO se envía al
    // backend, que lo recalcula solo. El resto sí va al endpoint.
    patch: SetPatch
  ) => void;
  removeSet: (workoutId: string, workoutExerciseId: string, setId: string) => Promise<void>;
};

const WorkoutsContext = createContext<WorkoutsContextValue | null>(null);

export function WorkoutsProvider({ children }: { children: ReactNode }) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [status, setStatus] = useState<StoreStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // La identidad la resuelve el auth store; acá solo se consume.
  const { user, status: authStatus } = useAuth();
  const conSesion = authStatus === 'authenticated';

  // Un timer por campo editado (clave: "set:<id>", "workout:<id>", ...), para
  // que editar reps de dos series distintas no cancele el PUT de la otra.
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  // El último patch pendiente de cada clave, acumulado entre teclas.
  const pending = useRef(new Map<string, Record<string, unknown>>());

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus('loading');
    setError(null);
    try {
      const list = await api.listWorkouts(signal);
      if (signal?.aborted) return;
      setWorkouts(list);
      setStatus('ready');
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Error desconocido');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // Sin sesión no se pide nada (el backend responde 401) y se limpia lo que
    // hubiera quedado del usuario anterior, para que al cambiar de cuenta no
    // se vean por un instante las rutinas del que cerró sesión.
    if (!conSesion) {
      setWorkouts([]);
      setStatus('loading');
      return;
    }

    const controller = new AbortController();
    load(controller.signal);
    return () => {
      controller.abort();
    };
  }, [load, conSesion, user?.id]);

  // Al desmontar, no dejamos timers colgando disparando PUTs.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach(clearTimeout);
      map.clear();
    };
  }, []);

  const reload = useCallback(() => load(), [load]);

  /** Reporta un fallo de escritura y resincroniza con el servidor. */
  const handleWriteError = useCallback(
    (e: unknown) => {
      setError(e instanceof Error ? e.message : 'Error desconocido');
      void load();
    },
    [load]
  );

  /**
   * Acumula `patch` y programa el envío. Las llamadas seguidas sobre la misma
   * clave se funden en un solo PUT con todos los campos tocados.
   */
  const scheduleWrite = useCallback(
    (key: string, patch: Record<string, unknown>, send: (merged: any) => Promise<unknown>) => {
      pending.current.set(key, { ...pending.current.get(key), ...patch });

      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);

      timers.current.set(
        key,
        setTimeout(() => {
          const merged = pending.current.get(key) ?? {};
          pending.current.delete(key);
          timers.current.delete(key);
          send(merged).catch(handleWriteError);
        }, WRITE_DEBOUNCE_MS)
      );
    },
    [handleWriteError]
  );

  // --- Helpers de actualización local ---

  const mapWorkout = useCallback((id: string, fn: (w: Workout) => Workout) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? fn(w) : w)));
  }, []);

  const mapExercise = useCallback(
    (workoutId: string, weId: string, fn: (we: WorkoutExercise) => WorkoutExercise) =>
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.map((we) => (we.id === weId ? fn(we) : we)),
      })),
    [mapWorkout]
  );

  const getWorkout = useCallback(
    (id: string) => workouts.find((w) => w.id === id),
    [workouts]
  );

  // --- Workouts ---

  const addWorkout = useCallback<WorkoutsContextValue['addWorkout']>(
    async (title = defaultWorkoutTitle) => {
      if (!user) return null;
      try {
        const created = await api.createWorkout({ title });
        setWorkouts((prev) => [created, ...prev]);
        return created;
      } catch (e) {
        handleWriteError(e);
        return null;
      }
    },
    [user, handleWriteError]
  );

  const createWorkoutFromDraft = useCallback<WorkoutsContextValue['createWorkoutFromDraft']>(
    async (meta, items) => {
      if (!user) return null;
      try {
        const workout = await api.createWorkout({
          title: meta.title,
          day: meta.day ?? null,
        });

        // Los ejercicios se crean en serie para que el `order` del backend
        // (que cuenta los existentes) respete el orden del borrador.
        const exercises: WorkoutExercise[] = [];
        for (const item of items) {
          const we = await api.createWorkoutExercise(workout.id, {
            name: item.name,
            muscleGroup: item.muscleGroup,
          });

          // "4 × 8 · 60 kg" se expande a 4 series idénticas.
          const sets: WorkoutSet[] = [];
          for (let i = 0; i < item.sets; i++) {
            sets.push(
              await api.createWorkoutSet(we.id, {
                reps: item.reps,
                weightKg: item.weightKg,
                restSeconds: item.restSeconds,
                done: false,
              })
            );
          }
          exercises.push({ ...we, sets });
        }

        const complete: Workout = { ...workout, exercises };
        setWorkouts((prev) => [complete, ...prev]);
        return complete;
      } catch (e) {
        handleWriteError(e);
        return null;
      }
    },
    [user, handleWriteError]
  );

  const updateWorkout = useCallback<WorkoutsContextValue['updateWorkout']>(
    (id, patch) => {
      mapWorkout(id, (w) => ({ ...w, ...patch }));
      scheduleWrite(`workout:${id}`, patch, (merged) => api.updateWorkout(id, merged));
    },
    [mapWorkout, scheduleWrite]
  );

  const removeWorkout = useCallback<WorkoutsContextValue['removeWorkout']>(
    async (id) => {
      const snapshot = workouts;
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      try {
        await api.deleteWorkout(id);
      } catch (e) {
        setWorkouts(snapshot);
        handleWriteError(e);
      }
    },
    [workouts, handleWriteError]
  );

  // --- Ejercicios de la rutina ---

  const addExercise = useCallback<WorkoutsContextValue['addExercise']>(
    async (workoutId, name = defaultExerciseName, muscleGroup) => {
      try {
        // Al elegir del catálogo, el nombre exacto hace que el backend enlace la
        // entrada existente (con su imagen y grupo) en vez de crear una nueva.
        const created = await api.createWorkoutExercise(workoutId, { name, muscleGroup });
        mapWorkout(workoutId, (w) => ({ ...w, exercises: [...w.exercises, created] }));
      } catch (e) {
        handleWriteError(e);
      }
    },
    [mapWorkout, handleWriteError]
  );

  const updateExercise = useCallback<WorkoutsContextValue['updateExercise']>(
    (workoutId, weId, patch) => {
      // `name` y `muscleGroup` viven en el catálogo anidado, `notes`/`order` en la fila.
      mapExercise(workoutId, weId, (we) => ({
        ...we,
        ...(patch.notes !== undefined && { notes: patch.notes }),
        ...(patch.order !== undefined && { order: patch.order }),
        exercise: {
          ...we.exercise,
          ...(patch.name !== undefined && { name: patch.name }),
          ...(patch.muscleGroup !== undefined && { muscleGroup: patch.muscleGroup }),
        },
      }));
      scheduleWrite(`exercise:${weId}`, patch, (merged) =>
        api.updateWorkoutExercise(weId, merged).then((fresh) =>
          // El backend puede repuntar la fila a otra entrada del catálogo al
          // renombrar, así que adoptamos su versión.
          mapExercise(workoutId, weId, (we) => ({ ...we, ...fresh }))
        )
      );
    },
    [mapExercise, scheduleWrite]
  );

  const removeExercise = useCallback<WorkoutsContextValue['removeExercise']>(
    async (workoutId, weId) => {
      const snapshot = workouts;
      mapWorkout(workoutId, (w) => ({
        ...w,
        exercises: w.exercises.filter((we) => we.id !== weId),
      }));
      try {
        await api.deleteWorkoutExercise(weId);
      } catch (e) {
        setWorkouts(snapshot);
        handleWriteError(e);
      }
    },
    [workouts, mapWorkout, handleWriteError]
  );

  // --- Series ---

  const addSet = useCallback<WorkoutsContextValue['addSet']>(
    async (workoutId, weId) => {
      const we = workouts.find((w) => w.id === workoutId)?.exercises.find((x) => x.id === weId);
      const last: WorkoutSet | undefined = we?.sets[we.sets.length - 1];
      // La nueva serie copia la anterior como punto de partida.
      const input = last
        ? {
            reps: last.reps,
            weightKg: last.weightKg,
            restSeconds: last.restSeconds,
            done: false,
          }
        : defaultSet;

      try {
        const created = await api.createWorkoutSet(weId, input);
        mapExercise(workoutId, weId, (x) => ({ ...x, sets: [...x.sets, created] }));
      } catch (e) {
        handleWriteError(e);
      }
    },
    [workouts, mapExercise, handleWriteError]
  );

  const updateSet = useCallback<WorkoutsContextValue['updateSet']>(
    (workoutId, weId, setId, patch) => {
      // El patch local incluye `caloriesBurned` (para que el total reaccione al
      // instante), pero al backend solo se le mandan los campos que acepta: él
      // recalcula las calorías por su cuenta.
      const { caloriesBurned: _ignored, ...netPatch } = patch;
      mapExercise(workoutId, weId, (we) => ({
        ...we,
        sets: we.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
      }));
      scheduleWrite(`set:${setId}`, netPatch, (merged) => api.updateWorkoutSet(setId, merged));
    },
    [mapExercise, scheduleWrite]
  );

  const removeSet = useCallback<WorkoutsContextValue['removeSet']>(
    async (workoutId, weId, setId) => {
      const snapshot = workouts;
      mapExercise(workoutId, weId, (we) => ({
        ...we,
        sets: we.sets.filter((s) => s.id !== setId),
      }));
      try {
        await api.deleteWorkoutSet(setId);
      } catch (e) {
        setWorkouts(snapshot);
        handleWriteError(e);
      }
    },
    [workouts, mapExercise, handleWriteError]
  );

  const value = useMemo<WorkoutsContextValue>(
    () => ({
      workouts,
      user,
      status,
      error,
      reload,
      getWorkout,
      addWorkout,
      createWorkoutFromDraft,
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
      user,
      status,
      error,
      reload,
      getWorkout,
      addWorkout,
      createWorkoutFromDraft,
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
