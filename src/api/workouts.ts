/** Endpoints de rutinas, ejercicios de rutina y series. Ver backend/src/routes/index.ts */

import { request } from './client';
import type {
  Workout,
  WorkoutExercise,
  WorkoutExerciseInput,
  WorkoutInput,
  WorkoutSet,
  WorkoutSetInput,
} from '@/data/workouts';

// --- Workouts ---

/** Las rutinas del usuario del token: el backend ya no acepta userId por query. */
export function listWorkouts(signal?: AbortSignal): Promise<Workout[]> {
  return request<Workout[]>('/workouts', { signal });
}

export function fetchWorkout(id: string, signal?: AbortSignal): Promise<Workout> {
  return request<Workout>(`/workouts/${id}`, { signal });
}

/** El dueño lo asigna el backend según el token; ya no se manda userId. */
export function createWorkout(input: WorkoutInput = {}): Promise<Workout> {
  return request<Workout>('/workouts', { method: 'POST', body: input });
}

export function updateWorkout(id: string, input: WorkoutInput): Promise<Workout> {
  return request<Workout>(`/workouts/${id}`, { method: 'PUT', body: input });
}

export function deleteWorkout(id: string): Promise<void> {
  return request<void>(`/workouts/${id}`, { method: 'DELETE' });
}

// --- Ejercicios dentro de una rutina ---

export function createWorkoutExercise(
  workoutId: string,
  input: WorkoutExerciseInput & { name: string }
): Promise<WorkoutExercise> {
  return request<WorkoutExercise>(`/workouts/${workoutId}/exercises`, {
    method: 'POST',
    body: input,
  });
}

export function updateWorkoutExercise(
  id: string,
  input: WorkoutExerciseInput
): Promise<WorkoutExercise> {
  return request<WorkoutExercise>(`/workout-exercises/${id}`, { method: 'PUT', body: input });
}

export function deleteWorkoutExercise(id: string): Promise<void> {
  return request<void>(`/workout-exercises/${id}`, { method: 'DELETE' });
}

// --- Series ---

export function createWorkoutSet(
  workoutExerciseId: string,
  input: WorkoutSetInput & { reps: number }
): Promise<WorkoutSet> {
  return request<WorkoutSet>('/sets', {
    method: 'POST',
    body: { workoutExerciseId, ...input },
  });
}

export function updateWorkoutSet(id: string, input: WorkoutSetInput): Promise<WorkoutSet> {
  return request<WorkoutSet>(`/sets/${id}`, { method: 'PUT', body: input });
}

export function deleteWorkoutSet(id: string): Promise<void> {
  return request<void>(`/sets/${id}`, { method: 'DELETE' });
}
