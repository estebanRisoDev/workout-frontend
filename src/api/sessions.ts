/** Historial de sesiones de rutina del usuario. Ver backend GET /sessions. */

import { request } from './client';
import type { WorkoutSession } from '@/data/history';

export function getSessions(signal?: AbortSignal): Promise<WorkoutSession[]> {
  return request<WorkoutSession[]>('/sessions', { signal });
}
