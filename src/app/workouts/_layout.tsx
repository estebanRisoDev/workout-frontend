import { Stack } from 'expo-router';

/**
 * Stack propio de la sección Workouts.
 * La lista (`index`) navega al detalle (`[id]`) manteniéndose dentro del tab.
 *
 * `index` y `armar` son las dos caras del selector superior (WorkoutsSegmented):
 * alternar entre ellas es un cambio de pestaña, no un drill-in, así que van SIN
 * animación. Si deslizaran, durante la transición se verían los dos selectores
 * encimados (uno entrando, otro saliendo) y parecía que salían "dos botones de
 * distinto tamaño". `estadisticas` y `[id]` sí conservan el slide de entrar.
 */
export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="armar" options={{ animation: 'none' }} />
      <Stack.Screen name="estadisticas" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
