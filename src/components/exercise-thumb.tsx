/**
 * Miniatura de un ejercicio. Muestra la imagen del catálogo si existe; si no
 * (la mayoría del catálogo antiguo todavía no tiene), cae a un placeholder para
 * mantener la alineación de las filas/cards.
 */

import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ExerciseThumb({
  url,
  size = 44,
}: {
  url: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const box = { width: size, height: size, borderRadius: Spacing.two };

  if (!url) {
    return (
      <View style={[styles.fallback, box, { backgroundColor: theme.backgroundSelected }]}>
        <Feather name="image" size={size * 0.42} color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <Image
      source={url}
      style={[box, { backgroundColor: theme.backgroundSelected }]}
      contentFit="cover"
      transition={150}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
