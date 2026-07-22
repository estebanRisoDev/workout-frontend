import { Feather } from '@expo/vector-icons';
import {
  TabList,
  TabListProps,
  Tabs,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
} from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';

import { Spacing } from '@/constants/theme';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

/**
 * Barra principal, distinta según el rol:
 *
 *  - **Alumno**: Inicio · Rutinas · Dieta · Comunidad · Perfil.
 *  - **Profesor**: Inicio · **Estadísticas** · Comunidad · Perfil. El profe no
 *    entrena ni lleva dieta, así que Rutinas y Dieta no le aparecen; en su lugar
 *    "Estadísticas" abre directo el roster de alumnos (`/dieta/fisico`), donde ve
 *    su progreso físico y registra los pliegues JP7.
 *
 * Otras estadísticas (kcal/semana, progresión por ejercicio) viven dentro de
 * **Rutinas** (`/workouts/estadisticas`) y no necesitan trigger propio acá.
 */
export default function AppTabs() {
  const { user } = useAuth();
  const teacher = isTeacher(user);

  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="home" label="Inicio" />
          </TabTrigger>

          {teacher ? (
            // El profe: una sola pestaña de gestión, las estadísticas de alumnos.
            <TabTrigger name="dieta" href="/dieta/fisico" asChild>
              <TabButton icon="bar-chart-2" label="Estadísticas" />
            </TabTrigger>
          ) : (
            // El alumno: sus dos secciones propias.
            <TabTrigger name="workouts" href="/workouts" asChild>
              <TabButton icon="activity" label="Rutinas" />
            </TabTrigger>
          )}
          {!teacher && (
            <TabTrigger name="dieta" href="/dieta" asChild>
              <TabButton icon="coffee" label="Dieta" />
            </TabTrigger>
          )}

          <TabTrigger name="comunidad" href="/comunidad" asChild>
            <TabButton icon="users" label="Comunidad" />
          </TabTrigger>
          <TabTrigger name="perfil" href="/perfil" asChild>
            <TabButton icon="user" label="Perfil" />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

/** Contenedor de la barra: fondo, borde superior y respeto del área segura. */
function TabBar(props: TabListProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
          paddingBottom: insets.bottom + Spacing.one,
        },
      ]}
    />
  );
}

/** Una pestaña normal: ícono arriba, texto abajo. `isFocused` lo inyecta TabTrigger. */
function TabButton({
  icon,
  label,
  isFocused,
  ...props
}: TabTriggerSlotProps & {
  icon: keyof typeof Feather.glyphMap;
  label: string;
}) {
  const theme = useTheme();
  const color = isFocused ? theme.text : theme.textSecondary;

  return (
    <Pressable {...props} style={styles.tabItem}>
      <Feather name={icon} size={22} color={color} />
      <ThemedText
        type="small"
        themeColor={isFocused ? 'text' : 'textSecondary'}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.tabLabel}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
  },
  tabLabel: { fontSize: 11 },
});
