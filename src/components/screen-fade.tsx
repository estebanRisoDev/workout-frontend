import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

/**
 * Envuelve una pantalla y la hace aparecer con un fade suave CADA VEZ que gana
 * foco (no solo al montarse). Suaviza el cambio entre pestañas, que por defecto
 * es un corte seco: al entrar a Rutinas/Dieta/Comunidad/Progreso, la pantalla se
 * desvanece hacia adentro en ~260ms en vez de aparecer de golpe.
 *
 * Dos capas a propósito: el `View` externo es OPACO con el fondo del tema y no
 * se anima; el `Animated.View` interno es el que hace el fade. Si solo se animara
 * la opacidad de una capa sin fondo, mientras es semitransparente se vería *a
 * través* hasta el fondo de la ventana (blanco de Android o la pantalla anterior),
 * y el primer frame parpadeaba en blanco o negro según qué hubiera detrás. Con la
 * capa opaca, el primer frame siempre es el fondo de la app y el contenido entra
 * encima.
 */
export function ScreenFade({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const opacity = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      opacity.value = withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) });
      return () => cancelAnimation(opacity);
    }, [opacity])
  );

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={[fill, { backgroundColor: theme.background }]}>
      <Animated.View style={[fill, style, animated]}>{children}</Animated.View>
    </View>
  );
}

const fill: ViewStyle = { flex: 1 };
