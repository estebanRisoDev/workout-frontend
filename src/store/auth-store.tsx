/**
 * Sesión del usuario.
 *
 * Flujo del login con Google:
 *   1. `GoogleSignin.signIn()` abre el selector nativo de cuentas.
 *   2. Google devuelve un `idToken` firmado por él.
 *   3. Ese idToken viaja al backend, que verifica la firma contra las llaves
 *      públicas de Google y emite NUESTRO token de sesión.
 *   4. Desde ahí todas las requests usan el token propio; Google ya no participa.
 *
 * El idToken de Google nunca se guarda: es de un solo uso.
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchMe, loginWithGoogle, logout as apiLogout } from '@/api/auth';
import { clearToken, loadToken } from '@/api/token';
import { updateProfile as apiUpdateProfile, type ProfileInput } from '@/api/users';
import type { User } from '@/data/workouts';

/**
 * El Client ID **Web**, no el de Android. Confunde, pero es así: el de Android
 * solo debe existir en Google Cloud Console para que Google reconozca la firma
 * de la app; el que se declara acá es el Web, y es el que aparece como "aud"
 * en el idToken que el backend valida.
 */
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  // Pedimos idToken explicitamente: es lo unico que el backend necesita.
  offlineAccess: false,
});

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Guarda datos del perfil (onboarding y edición) y refresca el usuario. */
  updateProfile: (input: ProfileInput) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Al abrir la app: si hay token guardado y sigue siendo valido, se reanuda
  // la sesion sin volver a pasar por Google.
  useEffect(() => {
    let cancelado = false;

    (async () => {
      const token = await loadToken();
      if (!token) {
        if (!cancelado) setStatus('unauthenticated');
        return;
      }
      try {
        const me = await fetchMe();
        if (cancelado) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        // Token vencido o usuario borrado: se descarta y se pide login.
        await clearToken();
        if (!cancelado) setStatus('unauthenticated');
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      // En Android hay que confirmar que Google Play Services este disponible.
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const response = await GoogleSignin.signIn();
      const idToken =
        response.type === 'success' ? response.data.idToken : null;

      if (response.type === 'cancelled') {
        // El usuario cerro el selector: no es un error que mostrar.
        return;
      }
      if (!idToken) {
        setError('Google no devolvió un idToken. Revisa el webClientId.');
        return;
      }

      const me = await loginWithGoogle(idToken);
      setUser(me);
      setStatus('authenticated');
    } catch (e: any) {
      // DEVELOPER_ERROR casi siempre es el SHA-1 o el package name mal
      // registrados en Google Cloud Console, no un fallo del codigo.
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e?.code === 'DEVELOPER_ERROR' || e?.code === '10') {
        setError(
          'Configuración de Google incorrecta: revisa el SHA-1 y el package name en Google Cloud Console.'
        );
        return;
      }
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await GoogleSignin.signOut();
    } catch {
      // Si Google falla igual cerramos la sesion local.
    }
    await apiLogout();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // El backend devuelve el usuario ya actualizado; lo adoptamos como fuente de
  // verdad para que el onboarding/Perfil reflejen justo lo que quedó guardado.
  const updateProfile = useCallback(async (input: ProfileInput) => {
    const fresh = await apiUpdateProfile(input);
    setUser(fresh);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, error, signInWithGoogle, signOut, updateProfile }),
    [user, status, error, signInWithGoogle, signOut, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
