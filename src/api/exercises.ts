/** Catálogo global de ejercicios. */

import { request } from './client';
import type { Exercise } from '@/data/workouts';

export function listExercises(signal?: AbortSignal): Promise<Exercise[]> {
  return request<Exercise[]>('/exercises', { signal });
}

export function createExercise(name: string, muscleGroup?: string): Promise<Exercise> {
  return request<Exercise>('/exercises', { method: 'POST', body: { name, muscleGroup } });
}
