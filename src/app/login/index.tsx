/**
 * Pantalla de login. Es la única accesible sin sesión.
 */

import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/store/auth-store';

export default function LoginScreen() {
  const { signInWithGoogle, error } = useAuth();
  const [entrando, setEntrando] = useState(false);

  async function handleGoogle() {
    setEntrando(true);
    await signInWithGoogle();
    // No se navega desde acá: el guard de _layout redirige solo cuando el
    // estado pasa a "authenticated".
    setEntrando(false);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image
              source={require('@/assets/images/logo_mobase.jpeg')}
              style={styles.logo}
              resizeMode="cover"
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Arma tus rutinas, registra tus series y sigue tu progreso.
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleGoogle}
              disabled={entrando}
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.pressed,
                entrando && styles.disabled,
              ]}>
              {entrando ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.googleText}>
                  Continuar con Google
                </ThemedText>
              )}
            </Pressable>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            <ThemedText type="small" themeColor="textSecondary" style={styles.legal}>
              Usamos tu cuenta de Google solo para identificarte. No publicamos nada.
            </ThemedText>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
    paddingVertical: Spacing.six,
  },
  brand: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  logo: {
    // Banner ancho: el logo es cuadrado con fondo negro y el texto "MOBASE FIT"
    // centrado, así que con `cover` recortamos el margen negro y queda una tira
    // horizontal con la marca sobre un fondo negro redondeado.
    width: 260,
    height: 132,
    borderRadius: 20,
    marginBottom: Spacing.three,
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  actions: { gap: Spacing.three },
  googleButton: {
    height: 56,
    borderRadius: 16,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleText: {
    color: 'black',
    fontSize: 16,
  },
  error: {
    color: '#d9534f',
    textAlign: 'center',
  },
  legal: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
