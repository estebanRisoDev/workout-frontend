/**
 * Guarda el token de sesión.
 *
 * En el dispositivo usa SecureStore (Keychain en iOS, EncryptedSharedPreferences
 * en Android). En web SecureStore no existe, así que cae a localStorage: menos
 * seguro, pero web es solo para desarrollo.
 *
 * Se mantiene además una copia en memoria para que `client.ts` pueda adjuntar
 * el header sin volver la lectura asíncrona en cada request.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'session_token';

let cached: string | null = null;

export function getTokenSync(): string | null {
  return cached;
}

export async function loadToken(): Promise<string | null> {
  if (cached) return cached;
  try {
    cached =
      Platform.OS === 'web'
        ? globalThis.localStorage?.getItem(KEY) ?? null
        : await SecureStore.getItemAsync(KEY);
  } catch {
    // Un almacenamiento ilegible no debe tumbar la app: se trata como sin sesión.
    cached = null;
  }
  return cached;
}

export async function saveToken(token: string): Promise<void> {
  cached = token;
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, token);
    else await SecureStore.setItemAsync(KEY, token);
  } catch {
    // Si no se pudo persistir, la sesión igual funciona hasta cerrar la app.
  }
}

export async function clearToken(): Promise<void> {
  cached = null;
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Nada que hacer: en memoria ya quedó limpio.
  }
}
