/**
 * Cliente HTTP mínimo contra la API de Express del backend.
 *
 * La URL base sale de `EXPO_PUBLIC_API_URL` (las vars `EXPO_PUBLIC_*` quedan
 * embebidas en el bundle, ver docs de Expo SDK 54). En un emulador Android
 * `localhost` apunta al propio emulador, por eso el fallback usa 10.0.2.2.
 */

import { Platform } from 'react-native';

import { getTokenSync } from './token';

function defaultBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return 'http://localhost:3000';
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl();

/** Error con el status HTTP, para que la UI pueda distinguir 404 de caída de red. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  // El backend saca el usuario de este token; ya no se manda userId por query.
  const token = getTokenSync();
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    // fetch solo rechaza por red/CORS/abort, nunca por status HTTP.
    if (signal?.aborted) throw cause;
    throw new ApiError(`No se pudo conectar con la API (${API_URL})`, 0);
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    let message = `Error ${res.status}`;
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error) message = parsed.error;
    } catch {
      if (detail) message = detail;
    }
    throw new ApiError(message, res.status);
  }

  // 204 No Content: no hay cuerpo que parsear.
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
