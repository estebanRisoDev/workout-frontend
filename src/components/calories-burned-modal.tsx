/**
 * Pop-up de calorías quemadas: aparece al marcar una serie como hecha ("done").
 *
 * Un 🔥 que late y el número de kcal escrito letra por letra, cada una ciclando
 * entre rojos y naranjos con un pequeño desfase (efecto "lámpara de lava"). Se
 * cierra solo a los ~2.6 s o al tocar en cualquier parte.
 *
 * La animación de color va por el driver JS (`useNativeDriver: false`): RN no
 * anima `color` en el hilo nativo. Es un modal breve, así que no pesa.
 */

import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Spacing } from '@/constants/theme';

/** Auto-cierre del pop-up, en ms. */
const AUTO_DISMISS_MS = 2600;

/** Paleta cálida del ciclo: rojo → naranjo → ámbar (ida y vuelta). */
const WARM = ['#ff2d2d', '#ff8c00', '#ffb300'] as const;

/** Desfase entre letras, en ms: crea la "ola" de color de una letra a la otra. */
const CHAR_STAGGER_MS = 120;

export function CaloriesBurnedModal({
  visible,
  kcal,
  onClose,
}: {
  visible: boolean;
  kcal: number;
  onClose: () => void;
}) {
  // Entrada: escala con rebote + fade. Estos sí van por el driver nativo.
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const label = `${Math.round(kcal)} kcal`;
  const chars = useMemo(() => label.split(''), [label]);

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.6);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // El número (kcal) entra en las dependencias para reiniciar el temporizador
    // si el usuario marca otra serie mientras el pop-up sigue abierto.
    const t = setTimeout(onClose, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible, kcal, onClose, scale, opacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <FireIcon />
          <View style={styles.row}>
            {chars.map((c, i) => (
              <LavaChar key={i} char={c} delay={i * CHAR_STAGGER_MS} />
            ))}
          </View>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.caption}>
            ¡Serie completada!
          </ThemedText>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** 🔥 con un latido suave y continuo. */
function FireIcon() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  return <Animated.Text style={[styles.fire, { transform: [{ scale }] }]}>🔥</Animated.Text>;
}

/** Una letra que cicla de color (rojo↔naranjo↔ámbar) y sube/baja apenas. */
function LavaChar({ char, delay }: { char: string; delay: number }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(t, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    // El desfase por letra genera la ola tipo lámpara de lava.
    const timeout = setTimeout(() => anim.start(), delay);
    return () => {
      clearTimeout(timeout);
      anim.stop();
    };
  }, [t, delay]);

  const color = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: WARM as unknown as string[],
  });
  const translateY = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] });

  // El espacio no se anima (se vería como un salto vacío): va con color fijo.
  if (char === ' ') return <ThemedText style={styles.kcal}> </ThemedText>;

  return (
    <Animated.Text style={[styles.kcal, { color, transform: [{ translateY }] }]}>
      {char}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.six,
    borderRadius: Spacing.five,
    backgroundColor: '#141414',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,140,0,0.35)',
  },
  fire: {
    fontSize: 64,
    lineHeight: 72,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kcal: {
    fontFamily: FontFamily.displayBold,
    fontSize: 44,
    lineHeight: 52,
    color: '#ff6a00',
  },
  caption: {
    marginTop: Spacing.one,
    letterSpacing: 0.5,
  },
});
