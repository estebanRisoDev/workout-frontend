/**
 * Barra de descanso: cuenta regresiva que aparece abajo al marcar una serie como
 * hecha ("done"). No bloquea la pantalla —el usuario sigue viendo y editando la
 * rutina mientras descansa—. Muestra el tiempo restante, una barra de progreso
 * que se vacía, un botón +15 s y una ✕ para saltar. Al llegar a 0 se queda un
 * momento en "¡A la siguiente!" y se cierra sola.
 *
 * El conteo se ancla a un timestamp de fin (`endsAt`) en vez de restar un
 * contador: así no acumula desfase si un tick se atrasa.
 */

import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Accent, BottomTabInset, Fonts, MaxContentWidth, Spacing } from '@/constants/theme';

/** Cada cuánto se refresca el conteo (fluido sin gastar batería de más). */
const TICK_MS = 200;

/** Cuánto se queda la barra en "¡Listo!" antes de cerrarse sola. */
const DONE_LINGER_MS = 1800;

/** Segundos que agrega el botón +15 s. */
const BUMP_SECONDS = 15;

function formatTime(msLeft: number): string {
  const total = Math.ceil(msLeft / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RestTimerBar({
  visible,
  durationSeconds,
  restKey,
  onFinish,
}: {
  visible: boolean;
  durationSeconds: number;
  /** Cambia cada vez que arranca un descanso nuevo: reinicia el conteo. */
  restKey: number;
  onFinish: () => void;
}) {
  const insets = useSafeAreaInsets();
  const endsAtRef = useRef(0);
  const totalMsRef = useRef(1);
  const [msLeft, setMsLeft] = useState(0);
  const [finished, setFinished] = useState(false);

  // Arranca (o reinicia) el conteo cuando empieza un descanso nuevo.
  useEffect(() => {
    if (!visible) return;
    const durMs = durationSeconds * 1000;
    endsAtRef.current = Date.now() + durMs;
    totalMsRef.current = durMs;
    setMsLeft(durMs);
    setFinished(false);

    const id = setInterval(() => {
      const left = endsAtRef.current - Date.now();
      if (left <= 0) {
        clearInterval(id);
        setMsLeft(0);
        setFinished(true);
      } else {
        setMsLeft(left);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [visible, restKey, durationSeconds]);

  // Al terminar: un "buzz" para avisar sin mirar la pantalla, la barra se queda
  // un momento en "listo" y luego se cierra. El haptic no existe en web.
  useEffect(() => {
    if (!finished) return;
    if (Platform.OS !== 'web') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const t = setTimeout(onFinish, DONE_LINGER_MS);
    return () => clearTimeout(t);
  }, [finished, onFinish]);

  if (!visible) return null;

  function addTime() {
    endsAtRef.current += BUMP_SECONDS * 1000;
    const left = endsAtRef.current - Date.now();
    // El total sube si el +15 s deja más tiempo del máximo visto: así la barra
    // no se "desborda" y el progreso sigue teniendo sentido.
    totalMsRef.current = Math.max(totalMsRef.current, left);
    setMsLeft(left);
    setFinished(false);
  }

  const progress = finished ? 1 : Math.max(0, Math.min(1, msLeft / totalMsRef.current));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: BottomTabInset + insets.bottom + Spacing.two }]}>
      <View style={styles.card}>
        <View style={styles.row}>
          <Feather name={finished ? 'check-circle' : 'clock'} size={18} color={Accent} />
          <ThemedText type="smallBold" style={styles.label}>
            {finished ? '¡A la siguiente! 💪' : 'Descanso'}
          </ThemedText>

          {!finished && <ThemedText style={styles.time}>{formatTime(msLeft)}</ThemedText>}

          {!finished && (
            <Pressable onPress={addTime} hitSlop={8} style={styles.bump}>
              <ThemedText type="smallBold" style={styles.bumpText}>
                +{BUMP_SECONDS}s
              </ThemedText>
            </Pressable>
          )}

          <Pressable onPress={onFinish} hitSlop={10} style={styles.skip}>
            <Feather name="x" size={18} color="#8a8a8a" />
          </Pressable>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth,
    backgroundColor: '#141414',
    borderRadius: Spacing.four,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91,147,201,0.4)',
    // Sombra para que "flote" sobre la rutina (iOS + Android).
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  label: { flex: 1 },
  time: {
    fontFamily: Fonts?.mono,
    fontSize: 22,
    lineHeight: 26,
  },
  bump: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(91,147,201,0.16)',
  },
  bumpText: { color: Accent },
  skip: {
    paddingHorizontal: Spacing.one,
  },
  track: {
    height: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 9999,
    backgroundColor: Accent,
  },
});
