/** Registro de alumnos: solo lo puede pedir el profesor. Ver backend GET /students. */

import { request } from './client';
import type { SkinfoldMeasurement } from '@/data/history';
import type { Goal, Sex } from '@/data/workouts';

/** Última rutina de un alumno (o null si aún no tiene ninguna). */
export type StudentLastWorkout = {
  title: string;
  date: string;
};

/** Un alumno con su resumen de progreso, tal como lo ve el profesor. */
export type Student = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  goal: Goal | null;
  weightKg: number | null;
  /** Cantidad total de rutinas registradas. */
  workoutCount: number;
  lastWorkout: StudentLastWorkout | null;
};

export function listStudents(signal?: AbortSignal): Promise<Student[]> {
  return request<Student[]>('/students', { signal });
}

/** Perfil de un alumno con su historial JP7, como lo ve el profesor. */
export type StudentDetail = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  sex: Sex | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  goal: Goal | null;
  measurements: SkinfoldMeasurement[];
};

export function getStudent(id: string, signal?: AbortSignal): Promise<StudentDetail> {
  return request<StudentDetail>(`/students/${id}`, { signal });
}

/**
 * Lo que el profesor registra en una medición: peso/altura (opcionales) y/o los 7
 * pliegues (van completos o ninguno). El backend exige al menos un dato.
 */
export type MeasurementInput = {
  weightKg?: number;
  heightCm?: number;
  skinfoldChest?: number;
  skinfoldMidaxillary?: number;
  skinfoldTriceps?: number;
  skinfoldSubscapular?: number;
  skinfoldAbdominal?: number;
  skinfoldSuprailiac?: number;
  skinfoldThigh?: number;
};

/** El profesor registra una medición del alumno. POST /students/:id/skinfolds */
export function recordMeasurement(id: string, m: MeasurementInput): Promise<SkinfoldMeasurement> {
  return request<SkinfoldMeasurement>(`/students/${id}/skinfolds`, { method: 'POST', body: m });
}
