/** Edición del perfil propio. Ver backend PUT /users/me. */

import { request } from './client';
import type { SkinfoldMeasurement } from '@/data/history';
import type { ActivityLevel, Goal, Sex, User } from '@/data/workouts';

/** Campos que el usuario puede editar de su propio perfil. */
export type ProfileInput = {
  name?: string;
  sex?: Sex;
  age?: number;
  weightKg?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
  goal?: Goal;
  // Pliegues Jackson-Pollock 7, en mm. `null` los borra; se envían solo cuando
  // el usuario tocó el formulario de composición corporal.
  skinfoldChest?: number | null;
  skinfoldMidaxillary?: number | null;
  skinfoldTriceps?: number | null;
  skinfoldSubscapular?: number | null;
  skinfoldAbdominal?: number | null;
  skinfoldSuprailiac?: number | null;
  skinfoldThigh?: number | null;
};

export function updateProfile(input: ProfileInput): Promise<User> {
  return request<User>('/users/me', { method: 'PUT', body: input });
}

/** Historial JP7 propio del alumno (las registra el profesor). GET /users/me/measurements */
export function getMyMeasurements(signal?: AbortSignal): Promise<SkinfoldMeasurement[]> {
  return request<SkinfoldMeasurement[]>('/users/me/measurements', { signal });
}
