import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * Barra de progreso circular dibujada con SVG.
 * @param progress valor de 0 a 1 (ej: 4/5 = 0.8)
 * @param children contenido que se muestra centrado dentro del aro
 */
function CircularProgress({
  size = 90,
  stroke = 10,
  progress = 0,
  color = '#b5e838',
  children,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const radius = (size - stroke) / 2; // radio del aro
  const circumference = 2 * Math.PI * radius; // largo total de la vuelta
  const offset = circumference * (1 - progress); // cuánto se "recorta"

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {/* aro de fondo */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={stroke}
          fill="none"
        />
        {/* aro de progreso */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </Svg>
      {/* contenido centrado */}
      <View style={styles.circleCenter}>{children}</View>
    </View>
  );
}

/**
 * Fondo de franjas diagonales (placeholder de "foto"). Se estira al contenedor.
 */
function StripesBackground({ color = '#e2e2e2' }: { color?: string }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern
          id="stripes"
          width={16}
          height={16}
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)">
          <Line x1={0} y1={0} x2={0} y2={16} stroke={color} strokeWidth={9} />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#stripes)" />
    </Svg>
  );
}

export default function HomeScreen() {
  const done = 4;
  const goal = 5;

  // 7 días de la semana. true = entrenado (verde), false = pendiente (gris).
  // Por ahora fijos; luego se reemplazan por datos reales.
  const week = [true, true, true, true, true, true, false];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>

        {/* HEADER: fila → texto a la izq, botón a la der */}
        <View style={styles.topSection}>
          <View style={styles.topSubSection}>
            <ThemedText type="small" themeColor="textSecondary">
              Jueves 17 de Jul
            </ThemedText>
            <ThemedText type="subtitle">Buenas, Alex</ThemedText>
          </View>

          <Pressable style={styles.loginButton}>
            <ThemedText style={{ color: 'white' }}>AR</ThemedText>
          </Pressable>
        </View>

        {/* RACHA: dos tarjetas lado a lado */}
        <View style={styles.streakSection}>
          <View style={styles.streakSubSection1}>
            <ThemedText type="small" themeColor="textSecondary">
              RACHA
            </ThemedText>
            <ThemedText type="subtitle" style={{ color: 'white' }}>
              6 días
            </ThemedText>

            {/* fila de 7 días: una barrita por día */}
            <View style={styles.weekRow}>
              {week.map((trained, i) => (
                <View
                  key={i}
                  style={[styles.dayBar, { backgroundColor: trained ? '#b5e838' : '#3a3a3a' }]}
                />
              ))}
            </View>
          </View>

          <ThemedView type="backgroundElement" style={styles.streakSubSection2}>
            <CircularProgress progress={done / goal}>
              <ThemedText type="smallBold">
                {done}/{goal}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Semana
              </ThemedText>
            </CircularProgress>
          </ThemedView>
        </View>

        {/* ENTRENAMIENTO DE HOY */}
        <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
          ENTRENAMIENTO DE HOY
        </ThemedText>

        <View style={styles.todayCard}>
          {/* parte superior: "foto" con franjas */}
          <View style={styles.todayPhoto}>
            <StripesBackground />

            <View style={styles.dayPill}>
              <ThemedText type="smallBold" style={styles.dayPillText}>
                DÍA DE EMPUJE
              </ThemedText>
            </View>

            <View style={styles.photoTag}>
              <ThemedText type="small" style={styles.photoTagText}>
                foto rutina · empuje
              </ThemedText>
            </View>
          </View>

          {/* parte inferior: info + acciones */}
          <View style={styles.todayInfo}>
            <ThemedText type="subtitle" style={styles.todayTitle}>
              Pecho · Hombro · Tríceps
            </ThemedText>

            <View style={styles.metaRow}>
              <ThemedText type="small" style={styles.metaText}>5 ejercicios</ThemedText>
              <ThemedText type="small" style={styles.metaDot}>·</ThemedText>
              <ThemedText type="small" style={styles.metaText}>~52 min</ThemedText>
              <ThemedText type="small" style={styles.metaDot}>·</ThemedText>
              <ThemedText type="small" style={styles.metaText}>Intermedio</ThemedText>
            </View>

            <View style={styles.todayActions}>
              <Pressable style={styles.startButton}>
                <ThemedText type="smallBold" style={styles.startButtonText}>
                  ▶  Empezar
                </ThemedText>
              </Pressable>

              <Pressable style={styles.iconButton}>
                <ThemedText style={styles.iconButtonText}>›</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ESTADÍSTICAS: dos tarjetas */}
        <View style={styles.statsRow}>
          {[
            { value: '14', label: 'Entrenos / mes' },
            { value: '32.4t', label: 'Volumen total' },
          ].map((stat) => (
            <View key={stat.label} style={styles.statCard}>
              <ThemedText type="title" style={styles.statValue}>
                {stat.value}
              </ThemedText>
              <ThemedText type="small" style={styles.statLabel}>
                {stat.label}
              </ThemedText>
            </View>
          ))}
        </View>

        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },

  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  topSubSection: {
    flexDirection: 'column',
    gap: Spacing.half,
  },

  streakSection: {
    flexDirection: 'row', // ← fila: las dos tarjetas lado a lado
    gap: Spacing.three,
    // sin flex:1: la altura la define el padding/contenido de las tarjetas
  },

  streakSubSection1: {
    flex: 0.7, // 70% del ancho
    padding: Spacing.four, // ← padding = altura (antes no tenían y desaparecían)
    borderRadius: 25,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: 'black',
  },

  weekRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },

  dayBar: {
    flex: 1, // cada barrita reparte el ancho por igual
    height: 8,
    borderRadius: 9999,
  },

  streakSubSection2: {
    flex: 0.3, // 30% del ancho
    padding: Spacing.three,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loginButton: {
    width: 32,
    height: 32,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },

  // --- ENTRENAMIENTO DE HOY ---
  sectionLabel: {
    marginTop: Spacing.two,
    letterSpacing: 1,
  },

  todayCard: {
    borderRadius: 24,
    overflow: 'hidden', // recorta las franjas y las esquinas
    backgroundColor: 'white',
    // sombra suave para que "flote"
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3, // sombra en Android
  },

  todayPhoto: {
    height: 170,
    padding: Spacing.three,
    justifyContent: 'space-between', // pill arriba, tag abajo
    alignItems: 'flex-start',
    backgroundColor: '#ededed',
  },

  dayPill: {
    backgroundColor: '#b5e838',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
  },
  dayPillText: {
    color: 'black',
    letterSpacing: 0.5,
  },

  photoTag: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  photoTagText: {
    color: '#8a8a8a',
  },

  todayInfo: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  todayTitle: {
    color: 'black',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  metaText: {
    color: '#6b6b6b',
  },
  metaDot: {
    color: '#c4c4c4',
  },

  todayActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  startButton: {
    flex: 1, // ocupa el ancho disponible
    height: 56,
    borderRadius: 16,
    backgroundColor: '#b5e838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: 'black',
    fontSize: 16,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: 'black',
    fontSize: 22,
    lineHeight: 24,
  },

  // --- ESTADÍSTICAS ---
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1, // cada tarjeta ocupa la mitad
    backgroundColor: 'white',
    borderRadius: 24,
    padding: Spacing.four,
    gap: Spacing.one,
    // misma sombra suave que la tarjeta de hoy
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statValue: {
    color: 'black',
    fontSize: 34,
    lineHeight: 40,
  },
  statLabel: {
    color: '#6b6b6b',
  },
});
