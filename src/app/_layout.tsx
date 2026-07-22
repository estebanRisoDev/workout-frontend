import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import OnboardingFlow from '@/components/onboarding-flow';
import { isProfileComplete } from '@/data/nutrition';
import { AuthProvider, useAuth } from '@/store/auth-store';
import { WorkoutsProvider } from '@/store/workouts-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // Las fuentes se cargan en runtime; hasta que estén, se mantiene el splash
  // nativo (preventAutoHideAsync) para no mostrar un parpadeo con Roboto.
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={DarkTheme}>
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
  const { status, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Con sesión pero sin datos físicos: el onboarding va antes que la app.
  const necesitaOnboarding = status === 'authenticated' && !isProfileComplete(user);

  /**
   * Oculta el splash nativo cuando NO hay sesión.
   *
   * `preventAutoHideAsync()` se llama al arrancar y el único que llamaba a
   * `hideAsync()` era <AnimatedSplashOverlay>, que solo se monta con sesión
   * activa. Sin este efecto, un usuario deslogueado se queda mirando el splash
   * encima del login: la app funciona, pero está tapada.
   */
  useEffect(() => {
    // El <AnimatedSplashOverlay> solo se monta con la app completa; en el login y
    // en el onboarding hay que ocultar el splash nativo a mano para no taparlos.
    if (status === 'unauthenticated' || necesitaOnboarding) {
      SplashScreen.hideAsync().catch(() => {
        // Si ya estaba oculto, no hay nada que hacer.
      });
    }
  }, [status, necesitaOnboarding]);

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

  // Sesión iniciada pero perfil incompleto: onboarding a pantalla completa.
  if (necesitaOnboarding) {
    return <OnboardingFlow />;
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
