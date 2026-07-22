/** Feed de mensajes recientes de la comunidad (Inicio del profesor). */

import { request } from './client';
import type { MessageAuthor } from './discussions';

export type FeedSource = {
  type: 'discussion' | 'activity';
  id: string;
  title: string;
};

export type FeedItem = {
  id: string;
  body: string;
  createdAt: string;
  user: MessageAuthor;
  source: FeedSource;
};

export function listFeed(signal?: AbortSignal): Promise<FeedItem[]> {
  return request<FeedItem[]>('/feed', { signal });
}
