import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/store/auth-store';
import { WorkoutsProvider } from '@/store/workouts-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        {/*
          WorkoutsProvider va SIEMPRE montado, incluso sin sesión.

          Antes se montaba solo al autenticarse, y al cerrar sesión se
          desmontaba mientras una pantalla de tabs seguía viva un instante:
          esa pantalla llamaba a useWorkouts(), que lanzaba excepción y
          crasheaba la app justo al hacer logout. Ahora el provider existe
          siempre y simplemente no carga datos si no hay sesión.
        */}
        <WorkoutsProvider>
          <AuthGate />
        </WorkoutsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * Decide qué se muestra según la sesión:
 * - cargando   → spinner (todavía se está leyendo el token guardado)
 * - sin sesión → pantalla de login
 * - con sesión → la app completa
 *
 * `WorkoutsProvider` se monta solo con sesión activa: si cargara antes,
 * dispararía requests que el backend rechaza con 401.
 */
function AuthGate() {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  /**
   * Oculta el splash nativo cuando NO hay sesión.
   *
   * `preventAutoHideAsync()` se llama al arrancar y el único que llamaba a
   * `hideAsync()` era <AnimatedSplashOverlay>, que solo se monta con sesión
   * activa. Sin este efecto, un usuario deslogueado se queda mirando el splash
   * encima del login: la app funciona, pero está tapada.
   */
  useEffect(() => {
    if (status === 'unauthenticated') {
      SplashScreen.hideAsync().catch(() => {
        // Si ya estaba oculto, no hay nada que hacer.
      });
    }
  }, [status]);

  useEffect(() => {
    if (status === 'loading') return;

    const enLogin = segments[0] === 'login';

    if (status === 'unauthenticated' && !enLogin) {
      router.replace('/login');
    } else if (status === 'authenticated' && enLogin) {
      router.replace('/');
    }
  }, [status, segments, router]);

  if (status === 'loading') {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (status === 'unauthenticated') {
    // `Slot` renderiza la ruta actual, que el efecto de arriba fuerza a /login.
    return <Slot />;
  }

  return (
    <>
      <AnimatedSplashOverlay />
      <AppTabs />
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
