/**
 * Actividades de la comunidad. Ver backend `activities.controller.ts`.
 *
 * Ver la lista es para todos; crear y cerrar son solo del profesor (el backend
 * responde 403 si un alumno lo intenta).
 */

import { request } from './client';
import type { ChatMessage } from './discussions';

export type Activity = {
  id: string;
  title: string;
  description: string | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  /** ISO 8601. */
  scheduledFor: string;
  allDay: boolean;
  createdAt: string;
  /** ISO 8601 si está cerrada (fakedelete), o null si sigue activa. */
  deletedAt: string | null;
};

/** Lo que el profesor manda al crear. */
export type ActivityInput = {
  title: string;
  description?: string | null;
  addressText?: string | null;
  lat?: number | null;
  lng?: number | null;
  scheduledFor?: string;
  allDay?: boolean;
};

/** Actividades activas (todos los usuarios). */
export function listActivities(signal?: AbortSignal): Promise<Activity[]> {
  return request<Activity[]>('/activities', { signal });
}

/** Historial de actividades cerradas (solo profesor). */
export function listEndedActivities(signal?: AbortSignal): Promise<Activity[]> {
  return request<Activity[]>('/activities/ended', { signal });
}

export function createActivity(input: ActivityInput): Promise<Activity> {
  return request<Activity>('/activities', { method: 'POST', body: input });
}

/** Edita una actividad (ubicación, título…). Solo profesor. */
export function updateActivity(id: string, input: Partial<ActivityInput>): Promise<Activity> {
  return request<Activity>(`/activities/${id}`, { method: 'PUT', body: input });
}

/** Cierra la actividad (fakedelete). Devuelve la actividad ya cerrada. */
export function closeActivity(id: string): Promise<Activity> {
  return request<Activity>(`/activities/${id}`, { method: 'DELETE' });
}

/** Una actividad por id (activa o cerrada), para su pantalla de detalle. */
export function getActivity(id: string, signal?: AbortSignal): Promise<Activity> {
  return request<Activity>(`/activities/${id}`, { signal });
}

/** Mensajes del chat de una actividad. */
export function listActivityMessages(id: string, signal?: AbortSignal): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/activities/${id}/messages`, { signal });
}

/** Escribe en el chat de la actividad (solo si sigue activa). */
export function postActivityMessage(id: string, body: string): Promise<ChatMessage> {
  return request<ChatMessage>(`/activities/${id}/messages`, { method: 'POST', body: { body } });
}
