/**
 * Carga el catálogo global de ejercicios.
 *
 * Va aparte del store de rutinas a propósito: el constructor solo necesita el
 * catálogo, así que no debe quedarse esperando a que carguen las rutinas
 * guardadas del usuario, que son datos distintos y sin relación.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import { listExercises } from '@/api/exercises';
import type { Exercise } from '@/data/workouts';

export type ExerciseGroup = {
  muscleGroup: string;
  exercises: Exercise[];
};

const SIN_GRUPO = 'Otros';

export function useExercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const list = await listExercises(signal);
      if (signal?.aborted) return;
      setExercises(list);
    } catch (e) {
      if (signal?.aborted) return;
      setError(e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  /** Agrupado por grupo muscular, que es como lo pinta el selector. */
  const groups = useMemo<ExerciseGroup[]>(() => {
    const byGroup = new Map<string, Exercise[]>();
    for (const ex of exercises) {
      const key = ex.muscleGroup ?? SIN_GRUPO;
      const bucket = byGroup.get(key);
      if (bucket) bucket.push(ex);
      else byGroup.set(key, [ex]);
    }
    return [...byGroup.entries()]
      .map(([muscleGroup, list]) => ({
        muscleGroup,
        exercises: [...list].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      }))
      .sort((a, b) => a.muscleGroup.localeCompare(b.muscleGroup, 'es'));
  }, [exercises]);

  return { exercises, groups, loading, error, reload: () => load() };
}
