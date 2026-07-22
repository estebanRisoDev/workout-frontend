import { Stack } from 'expo-router';

/**
 * Stack de la pestaña Comunidad. El panel/landing (`index`) navega a las
 * sub-pantallas (actividades, discusiones) manteniéndose dentro del tab; por eso
 * viven acá adentro y no como rutas de nivel superior (que la barra custom de
 * expo-router/ui no puede alcanzar).
 */
export default function ComunidadLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="actividades" />
      <Stack.Screen name="discusiones" />
      <Stack.Screen name="moderacion" />
    </Stack>
  );
}
