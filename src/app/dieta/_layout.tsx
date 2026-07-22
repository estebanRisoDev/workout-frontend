import { Stack } from 'expo-router';

/**
 * Stack propio de la sección Dieta.
 * El plan del día (`index`) navega al progreso físico (`fisico`) —composición
 * corporal e historial JP7— manteniéndose dentro del tab.
 */
export default function DietaLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="fisico" />
    </Stack>
  );
}
