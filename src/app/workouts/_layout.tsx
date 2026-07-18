import { Stack } from 'expo-router';

/**
 * Stack propio de la sección Workouts.
 * La lista (`index`) navega al detalle (`[id]`) manteniéndose dentro del tab.
 */
export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
