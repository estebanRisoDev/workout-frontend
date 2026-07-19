/**
 * Sesión: obtener y conservar el token con que se firman todas las requests.
 */

import { request } from './client';
import { clearToken, saveToken } from './token';
import type { User } from '@/data/workouts';

type LoginResponse = { token: string; user: User };

/** El usuario de la sesión actual, según el token guardado. */
export function fetchMe(signal?: AbortSignal): Promise<User> {
  return request<User>('/auth/me', { signal });
}

/** Login: cambia el idToken de Google por un token nuestro. */
export async function loginWithGoogle(idToken: string): Promise<User> {
  const { token, user } = await request<LoginResponse>('/auth/google', {
    method: 'POST',
    body: { idToken },
  });
  await saveToken(token);
  return user;
}

export async function logout(): Promise<void> {
  await clearToken();
}

