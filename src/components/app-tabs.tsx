import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { useTheme } from '@/hooks/use-theme';

const ACCENT = '#b5e838';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="home" label="Inicio" />
          </TabTrigger>

          <TabTrigger name="workouts" href="/workouts" asChild>
            <TabButton icon="file-text" label="Rutinas" />
          </TabTrigger>

          {/* Botón central de acción (no es una pestaña, dispara "empezar") */}
          <StartButton />

          <TabTrigger name="progreso" href="/progreso" asChild>
            <TabButton icon="bar-chart-2" label="Progreso" />
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
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

/** Botón central verde elevado. */
function StartButton() {
  const router = useRouter();
  return (
    <View style={styles.fabSlot}>
      <Pressable
        onPress={() => router.push('/workouts')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
        <Feather name="play" size={26} color="black" style={{ marginLeft: 3 }} />
      </Pressable>
    </View>
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
  fabSlot: {
    flex: 1,
    alignItems: 'center',
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28, // se eleva por encima de la barra
    // sombra
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  pressed: {
    opacity: 0.85,
  },
});
