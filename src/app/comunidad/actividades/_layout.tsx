import { Stack } from 'expo-router';

/** Stack de Actividades: la lista (`index`) navega al detalle/chat (`[id]`). */
export default function ActividadesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
