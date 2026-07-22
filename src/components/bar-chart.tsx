/**
 * Gráfico de barras simple y theme-aware, hecho con Views (mismo enfoque que las
 * barritas de racha en index.tsx — más robusto que texto en SVG). Escala las
 * barras al valor máximo; muestra el valor arriba y la etiqueta abajo.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type Bar = { label: string; value: number };

/** Alto en px de la barra más alta. */
const MAX_BAR_H = 110;

export function BarChart({
  data,
  color,
  decimals = 0,
  unit,
  emptyText = 'Sin datos todavía.',
}: {
  data: Bar[];
  color?: string;
  decimals?: number;
  unit?: string;
  emptyText?: string;
}) {
  const theme = useTheme();
  const fill = color ?? Accent;

  if (data.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
        {emptyText}
      </ThemedText>
    );
  }

  const max = Math.max(1, ...data.map((b) => b.value));

  return (
    <View style={styles.wrap}>
      <View style={styles.plot}>
        {data.map((b, i) => {
          const h = b.value > 0 ? Math.max(3, Math.round((b.value / max) * MAX_BAR_H)) : 0;
          return (
            <View key={i} style={styles.col}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.value}>
                {b.value > 0 ? b.value.toFixed(decimals) : ''}
              </ThemedText>
              <View
                style={[
                  styles.bar,
                  { height: h, backgroundColor: b.value > 0 ? fill : theme.backgroundSelected },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((b, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary" style={styles.label} numberOfLines={1}>
            {b.label}
          </ThemedText>
        ))}
      </View>
      {unit ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.unit}>
          {unit}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.one },
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_H + 22, // deja espacio para el valor arriba
    gap: Spacing.one,
  },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.half },
  value: { fontSize: 11 },
  bar: { width: '68%', maxWidth: 40, borderRadius: 6 },
  labels: { flexDirection: 'row', gap: Spacing.one },
  label: { flex: 1, textAlign: 'center', fontSize: 11 },
  unit: { textAlign: 'right' },
  empty: { paddingVertical: Spacing.four, textAlign: 'center' },
});
