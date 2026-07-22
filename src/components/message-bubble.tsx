/**
 * Burbuja de chat compartida por discusiones y actividades, con moderación.
 *
 * - Un mensaje `removed` (quitado por moderación/ban) NO se dibuja como burbuja:
 *   se muestra un tombstone "mensaje eliminado". Los consecutivos se COLAPSAN en
 *   uno solo ("N mensajes eliminados") para que un ban no deje un cementerio.
 * - Long-press sobre una burbuja abre el menú: Reportar (si no es propio) y/o
 *   Eliminar (autor o profesor).
 */

import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import type { ChatMessage } from '@/api/discussions';
import { Accent, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Rojo de acciones destructivas (mismo tono que se usa en errores/eliminar). */
const Destructive = '#d9534f';

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

/** Marcador "mensaje eliminado" (o "N mensajes eliminados"). */
export function RemovedTombstone({ count }: { count: number }) {
  return (
    <View style={styles.tombstoneWrap}>
      <ThemedView type="backgroundElement" style={styles.tombstone}>
        <Feather name="slash" size={12} color="#8a8a8a" />
        <ThemedText type="small" themeColor="textSecondary">
          {count === 1 ? 'mensaje eliminado' : `${count} mensajes eliminados`}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

/** Un ítem ya listo para pintar en el chat: separador de día, mensaje o tombstone. */
export type ChatItem =
  | { kind: 'day'; key: string; label: string }
  | { kind: 'message'; key: string; message: ChatMessage }
  | { kind: 'gap'; key: string; count: number };

/** Clave de día LOCAL (año-mes-día) para detectar cuándo cambia la fecha. */
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Etiqueta humana del día: "Hoy", "Ayer" o "22 de julio" (con año si es otro). */
function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/**
 * Arma la lista final del chat: inserta un separador de día (estilo WhatsApp)
 * cada vez que cambia la fecha, y colapsa runs de mensajes `removed` consecutivos
 * en un solo tombstone. Un cambio de día corta el run, así el separador nunca
 * queda enterrado dentro de un tombstone. Reemplaza a `collapseMessages`.
 */
export function buildChatItems(messages: ChatMessage[]): ChatItem[] {
  const out: ChatItem[] = [];
  let lastDay: string | null = null;
  let run = 0;
  let firstKey = '';
  const flushGap = () => {
    if (run > 0) {
      out.push({ kind: 'gap', key: `t-${firstKey}`, count: run });
      run = 0;
    }
  };
  for (const m of messages) {
    const day = dayKey(m.createdAt);
    if (day !== lastDay) {
      flushGap();
      out.push({ kind: 'day', key: `d-${day}`, label: dayLabel(m.createdAt) });
      lastDay = day;
    }
    if (m.removed) {
      if (run === 0) firstKey = m.id;
      run += 1;
    } else {
      flushGap();
      out.push({ kind: 'message', key: m.id, message: m });
    }
  }
  flushGap();
  return out;
}

/** Separador de día centrado, tipo píldora (estilo WhatsApp: "Hoy", "Ayer"…). */
export function DateDivider({ label }: { label: string }) {
  return (
    <View style={styles.dividerWrap}>
      <ThemedView type="backgroundElement" style={styles.dividerPill}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.dividerText}>
          {label}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

export function MessageBubble({
  message,
  mine,
  canDelete,
  canReport,
  deleteAsButton = false,
  onDelete,
  onReport,
}: {
  message: ChatMessage;
  mine: boolean;
  canDelete: boolean;
  canReport: boolean;
  /**
   * Si `true`, eliminar se ofrece como un botón de tacho visible (uso del
   * profesor, que modera). Si `false`, eliminar va por long-press (el alumno
   * borrando lo suyo). Ver los dos chats.
   */
  deleteAsButton?: boolean;
  onDelete: () => void;
  onReport: () => void;
}) {
  const theme = useTheme();
  const autor = message.user.name?.trim() || 'Alguien';
  const esProfe = message.user.role === 'teacher';
  // Popup abierto y en qué modo: reportar (banderita) o eliminar (tacho/long-press).
  const [sheet, setSheet] = useState<SheetMode>(null);

  // Afordancias del costado según quién mira:
  //  - profe (deleteAsButton): tacho visible para moderar; no reporta (ya es el mod).
  //  - alumno: banderita para reportar ajenos; borra lo suyo por long-press.
  const showTrash = canDelete && deleteAsButton;
  const showFlag = canReport && !deleteAsButton;
  const longPressDelete = canDelete && !deleteAsButton;

  return (
    <>
      <View style={[styles.rowWrap, mine ? styles.rowWrapMine : styles.rowWrapOther]}>
        <Pressable
          onLongPress={longPressDelete ? () => setSheet('delete') : undefined}
          delayLongPress={350}
          style={styles.bubbleWrap}>
          <ThemedView
            type={mine ? undefined : 'backgroundElement'}
            style={[styles.bubble, mine && { backgroundColor: Accent }]}>
            <ThemedText
              type="small"
              style={[styles.author, mine && styles.authorMine, esProfe && !mine && { color: Accent }]}>
              {mine ? 'Tú' : autor}
              {esProfe && !mine ? ' · profe' : ''}
            </ThemedText>
            <ThemedText type="default" style={mine ? styles.bodyMine : { color: theme.text }}>
              {message.body}
            </ThemedText>
            <ThemedText
              type="small"
              style={[styles.hora, mine ? styles.horaMine : { color: theme.textSecondary }]}>
              {formatHora(message.createdAt)}
            </ThemedText>
          </ThemedView>
        </Pressable>

        {showFlag && (
          <Pressable
            onPress={() => setSheet('report')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Reportar mensaje"
            style={({ pressed }) => [styles.flagBtn, pressed && styles.flagBtnPressed]}>
            <Feather name="flag" size={15} color={theme.textSecondary} />
          </Pressable>
        )}
        {showTrash && (
          <Pressable
            onPress={() => setSheet('delete')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Eliminar mensaje"
            style={({ pressed }) => [styles.flagBtn, pressed && styles.flagBtnPressed]}>
            <Feather name="trash-2" size={15} color={Destructive} />
          </Pressable>
        )}
      </View>

      <MessageActionsSheet
        mode={sheet}
        message={message}
        onReport={onReport}
        onDelete={onDelete}
        onClose={() => setSheet(null)}
      />
    </>
  );
}

/** Modo del pop-up de acciones (o `null` = cerrado). */
type SheetMode = null | 'report' | 'delete';

/** Título, botón e ícono de cada modo del pop-up. */
const SHEET_CONFIG = {
  report: { title: '¿Reportar este mensaje?', label: 'Reportar', icon: 'flag', color: Accent },
  delete: { title: '¿Eliminar este mensaje?', label: 'Eliminar', icon: 'trash-2', color: Destructive },
} as const;

/**
 * Pop-up de confirmación propio (reemplaza al `Alert.alert` nativo). Tarjeta
 * centrada con entrada por escala, una vista previa del mensaje y un único botón
 * de confirmación según el modo. Confirmar cierra el pop-up antes de disparar el
 * callback para que la navegación/refresco no compita con la animación de cierre.
 */
function MessageActionsSheet({
  mode,
  message,
  onReport,
  onDelete,
  onClose,
}: {
  mode: SheetMode;
  message: ChatMessage;
  onReport: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const visible = mode !== null;
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.85);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
  }, [visible, scale, opacity]);

  const cfg = mode ? SHEET_CONFIG[mode] : null;
  const autor = message.user.name?.trim() || 'Alguien';

  /** Cierra el pop-up y luego ejecuta la acción del modo actual. */
  function confirm() {
    const action = mode === 'report' ? onReport : onDelete;
    onClose();
    action();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* El card intercepta el toque para que no cierre al tocarlo. */}
        <Animated.View style={{ opacity, transform: [{ scale }], width: '100%', maxWidth: 340 }}>
          <Pressable onPress={() => {}}>
            <ThemedView type="background" style={styles.sheet}>
              {cfg && (
                <>
                  <ThemedText type="smallBold" style={styles.sheetTitle}>
                    {cfg.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.sheetPreview}>
                    {autor}: “{message.body}”
                  </ThemedText>

                  <View style={styles.sheetActions}>
                    <SheetButton icon={cfg.icon} label={cfg.label} color={cfg.color} onPress={confirm} />
                  </View>

                  <Pressable onPress={onClose} style={styles.cancel} hitSlop={6}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      Cancelar
                    </ThemedText>
                  </Pressable>
                </>
              )}
            </ThemedView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Botón de acción del pop-up: ícono + texto en el color de la acción. */
function SheetButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.sheetBtn, pressed && styles.sheetBtnPressed]}>
      <Feather name={icon} size={18} color={color} />
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.one,
    maxWidth: '88%',
  },
  rowWrapMine: { alignSelf: 'flex-end' },
  rowWrapOther: { alignSelf: 'flex-start' },
  bubbleWrap: { flexShrink: 1 },
  flagBtn: {
    paddingHorizontal: Spacing.one,
    paddingBottom: Spacing.two,
  },
  flagBtnPressed: { opacity: 0.5 },
  bubble: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  author: { color: '#8a8a8a', fontSize: 12 },
  authorMine: { color: 'rgba(0,0,0,0.55)' },
  bodyMine: { color: 'black' },
  hora: { fontSize: 10, alignSelf: 'flex-end' },
  horaMine: { color: 'rgba(0,0,0,0.55)' },

  dividerWrap: { alignSelf: 'center', marginVertical: Spacing.two },
  dividerPill: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
  },
  dividerText: { letterSpacing: 0.5, textTransform: 'capitalize' },

  tombstoneWrap: { alignSelf: 'center', maxWidth: '85%' },
  tombstone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 9999,
    opacity: 0.75,
  },

  // --- Pop-up de acciones del mensaje ---
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  sheet: {
    borderRadius: Spacing.four,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  sheetTitle: { letterSpacing: 0.5 },
  sheetPreview: { fontStyle: 'italic', opacity: 0.8 },
  sheetActions: { gap: Spacing.two, marginTop: Spacing.one },
  sheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sheetBtnPressed: { opacity: 0.6 },
  cancel: {
    alignItems: 'center',
    paddingTop: Spacing.one,
  },
});
