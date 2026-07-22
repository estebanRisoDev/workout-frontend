/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Paleta única (la app es siempre oscura, no sigue el modo del sistema):
 * - `text`               blanco               → tipografía
 * - `background`         gris oscuro (base)   → fondo de pantalla
 * - `backgroundElement`  negro (secundario)   → tarjetas / superficies
 * - `backgroundSelected` azul oscuro (terc.)  → seleccionado / realce
 *
 * `light` y `dark` son idénticos a propósito: así el color no depende de si el
 * teléfono está en claro u oscuro; siempre se ve esta paleta.
 */
const Palette = {
  text: '#FFFFFF',
  background: '#24262B',
  backgroundElement: '#000000',
  backgroundSelected: '#16294A',
  textSecondary: '#A7ABB3',
} as const;

export const Colors = {
  light: Palette,
  dark: Palette,
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Color de acento de la app: botón central, "Empezar", píldora del día y las
 * barritas de racha completadas. Está acá para cambiarlo en un solo lugar.
 *
 * Se usa siempre con texto/íconos negros encima, así que tiene que mantenerse
 * claro y saturado para conservar el contraste.
 *
 * Azul acero de la marca MOBASE FIT (el mismo del "FIT" del logo).
 */
export const Accent = '#5B93C9';

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/**
 * Familias tipográficas de la app (cargadas en `_layout.tsx` con `useFonts`).
 *
 * Space Grotesk para títulos: geométrica, con carácter, look deportivo/técnico.
 * Inter para el cuerpo: limpia y muy legible en tamaños chicos.
 *
 * En React Native el peso NO se controla con `fontWeight` cuando hay fuente
 * propia (sobre todo en Android): cada peso es una familia distinta. Por eso se
 * elige la variante concreta aquí y en los estilos se omite `fontWeight`.
 */
export const FontFamily = {
  displaySemiBold: 'SpaceGrotesk_600SemiBold',
  displayBold: 'SpaceGrotesk_700Bold',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
