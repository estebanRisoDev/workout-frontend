/**
 * Selector de sub-pestañas de la sección Rutinas: "Mis rutinas" | "Armar workout".
 *
 * Usa `router.replace` para que alternar entre las dos no apile pantallas en el
 * stack (si no, el botón atrás recorrería todos los cambios de pestaña).
 */

import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TABS = [
  { label: 'Mis rutinas', path: '/workouts' },
  { label: 'Armar workout', path: '/workouts/armar' },
] as const;

export function WorkoutsSegmented() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundElement }]}>
      {TABS.map((tab) => {
        const active = pathname === tab.path;
        return (
          <Pressable
            key={tab.path}
            onPress={() => {
              if (!active) router.replace(tab.path);
            }}
            style={[
              styles.tab,
              active && { backgroundColor: theme.backgroundSelected },
            ]}>
            <ThemedText type={active ? 'smallBold' : 'small'} themeColor={active ? 'text' : 'textSecondary'}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two + Spacing.half,
  },
});
