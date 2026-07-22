/**
 * Discusiones (chats permanentes) y sus mensajes. Ver backend
 * `discussions.controller.ts`.
 *
 * CRUD de la discusión = solo profesor (el backend responde 403 si no). Leer y
 * escribir mensajes = cualquier usuario.
 */

import { request } from './client';
import type { UserRole } from '@/data/workouts';

export type Discussion = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  /** Mensajes activos en la discusión. */
  messageCount: number;
};

/** Autor de un mensaje, con lo mínimo para pintarlo en el chat. */
export type MessageAuthor = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  user: MessageAuthor;
  /** `true` si fue quitado por moderación/ban: se dibuja como "mensaje eliminado"
   *  (el body llega vacío; el texto real se queda en el backend). */
  removed: boolean;
};

export function listDiscussions(signal?: AbortSignal): Promise<Discussion[]> {
  return request<Discussion[]>('/discussions', { signal });
}

export function createDiscussion(input: {
  title: string;
  description?: string | null;
}): Promise<Discussion> {
  return request<Discussion>('/discussions', { method: 'POST', body: input });
}

export function updateDiscussion(
  id: string,
  input: { title?: string; description?: string | null }
): Promise<Discussion> {
  return request<Discussion>(`/discussions/${id}`, { method: 'PUT', body: input });
}

export function deleteDiscussion(id: string): Promise<void> {
  return request<void>(`/discussions/${id}`, { method: 'DELETE' });
}

export function listMessages(discussionId: string, signal?: AbortSignal): Promise<ChatMessage[]> {
  return request<ChatMessage[]>(`/discussions/${discussionId}/messages`, { signal });
}

export function postMessage(discussionId: string, body: string): Promise<ChatMessage> {
  return request<ChatMessage>(`/discussions/${discussionId}/messages`, {
    method: 'POST',
    body: { body },
  });
}

export function deleteMessage(messageId: string): Promise<void> {
  return request<void>(`/messages/${messageId}`, { method: 'DELETE' });
}
