import { Stack } from 'expo-router';

/** Stack de Discusiones: la lista (`index`) navega al chat (`[id]`). */
export default function DiscusionesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
