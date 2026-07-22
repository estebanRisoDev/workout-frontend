/**
 * Moderación de la comunidad. Ver backend `moderation.controller.ts`.
 *
 * Reportar un mensaje lo puede hacer cualquier usuario (una vez por mensaje). La
 * cola de reportes y las acciones (restaurar / eliminar / banear / desbanear) son
 * solo del profesor: el backend responde 403 si un alumno lo intenta.
 */

import { request } from './client';
import type { UserRole } from '@/data/workouts';

/** En qué chat vive el mensaje reportado. */
export type ReportContext = {
  type: 'activity' | 'discussion';
  id: string;
  title: string;
};

/** Una entrada de la cola de reportes del profesor. */
export type ReportItem = {
  id: string;
  /** El texto real del mensaje (solo el profesor lo ve, para poder juzgar). */
  body: string;
  status: string;
  createdAt: string;
  /** Reportantes únicos. */
  reportCount: number;
  reasons: string[];
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    role: UserRole;
    banned: boolean;
  };
  context: ReportContext | null;
};

/** Reporta un mensaje. Idempotente: reportar dos veces no suma. */
export function reportMessage(
  messageId: string,
  reason?: string
): Promise<{ ok: boolean; reportCount: number; hidden: boolean }> {
  return request(`/messages/${messageId}/report`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

/** Cola de reportes pendientes (solo profesor). */
export function getReports(signal?: AbortSignal): Promise<ReportItem[]> {
  return request<ReportItem[]>('/moderation/reports', { signal });
}

/** Descarta los reportes y reactiva el mensaje (solo profesor). */
export function restoreMessage(messageId: string): Promise<{ ok: boolean }> {
  return request(`/moderation/messages/${messageId}/restore`, { method: 'POST' });
}

/** Elimina solo ese mensaje: pasa a "mensaje eliminado" (solo profesor). */
export function removeMessage(messageId: string): Promise<{ ok: boolean }> {
  return request(`/moderation/messages/${messageId}/remove`, { method: 'POST' });
}

/** Banea al autor: no puede postear y todos sus mensajes se eliminan (profesor). */
export function banUser(userId: string): Promise<{ ok: boolean }> {
  return request(`/moderation/users/${userId}/ban`, { method: 'POST' });
}

/** Desbanea al usuario y restaura sus mensajes (solo profesor). */
export function unbanUser(userId: string): Promise<{ ok: boolean }> {
  return request(`/moderation/users/${userId}/unban`, { method: 'POST' });
}
