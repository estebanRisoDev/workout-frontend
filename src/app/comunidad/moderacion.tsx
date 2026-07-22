/**
 * Cola de reportes (solo profesor). Lista los mensajes denunciados con el texto
 * real, cuántos los reportaron y en qué chat están. Por cada uno, el profesor
 * decide: Restaurar (descartar los reportes), Eliminar (solo ese mensaje) o
 * Banear al autor (elimina todos sus mensajes y le corta el posteo).
 *
 * El ban es SIEMPRE decisión humana: acá el profe ve la evidencia antes de actuar.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  banUser,
  getReports,
  removeMessage,
  restoreMessage,
  type ReportItem,
} from '@/api/moderation';
import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { initials } from '@/data/stats';
import { useTheme } from '@/hooks/use-theme';

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ModeracionScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      setItems(await getReports(signal));
      setError(null);
    } catch (e) {
      if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar la cola');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    cargar(ac.signal);
    return () => ac.abort();
  }, [cargar]);

  async function accion(fn: () => Promise<unknown>, messageId: string) {
    setBusy(messageId);
    setError(null);
    try {
      await fn();
      // Cualquier acción resuelve el reporte: se saca de la cola.
      setItems((prev) => prev.filter((it) => it.id !== messageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción');
    } finally {
      setBusy(null);
    }
  }

  function confirmarBan(item: ReportItem) {
    const nombre = item.author.name?.trim() || 'este usuario';
    Alert.alert(
      'Banear usuario',
      `Se eliminarán TODOS los mensajes de ${nombre} y no podrá volver a escribir en la comunidad. Es reversible.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Banear',
          style: 'destructive',
          onPress: () => accion(() => banUser(item.author.id), item.id),
        },
      ]
    );
  }

  return (
    <ScreenFade>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={loading && items.length > 0} onRefresh={() => cargar()} />
            }>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="linkPrimary">‹ Comunidad</ThemedText>
            </Pressable>
            <ThemedText type="title">Reportes</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Mensajes denunciados. Revisa cada uno y decide. El ban es tu decisión.
            </ThemedText>

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}

            {loading && items.length === 0 ? (
              <ActivityIndicator style={{ marginVertical: Spacing.five }} />
            ) : items.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyCard}>
                <Feather name="check-circle" size={22} color="#7aa87a" />
                <ThemedText type="small" themeColor="textSecondary">
                  Sin reportes pendientes. Todo tranquilo.
                </ThemedText>
              </ThemedView>
            ) : (
              items.map((item) => (
                <ReportCard
                  key={item.id}
                  item={item}
                  busy={busy === item.id}
                  onRestore={() => accion(() => restoreMessage(item.id), item.id)}
                  onRemove={() => accion(() => removeMessage(item.id), item.id)}
                  onBan={() => confirmarBan(item)}
                />
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </ScreenFade>
  );
}

function ReportCard({
  item,
  busy,
  onRestore,
  onRemove,
  onBan,
}: {
  item: ReportItem;
  busy: boolean;
  onRestore: () => void;
  onRemove: () => void;
  onBan: () => void;
}) {
  const theme = useTheme();
  const nombre = item.author.name?.trim() || 'Sin nombre';

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        {item.author.avatarUrl ? (
          <Image source={{ uri: item.author.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatar}>
            <ThemedText type="smallBold">{initials(item.author.name, '')}</ThemedText>
          </View>
        )}
        <View style={styles.headerInfo}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {nombre}
            {item.author.banned ? ' · baneado' : ''}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {item.context ? `${item.context.title} · ` : ''}
            {fmtFecha(item.createdAt)}
          </ThemedText>
        </View>
        <View style={[styles.countPill, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name="flag" size={12} color="#d9534f" />
          <ThemedText type="smallBold">{item.reportCount}</ThemedText>
        </View>
      </View>

      {/* El texto real del mensaje denunciado (solo lo ve el profesor). */}
      <ThemedView type="backgroundSelected" style={styles.quote}>
        <ThemedText type="default">{item.body}</ThemedText>
      </ThemedView>

      {item.status === 'hidden' ? (
        <ThemedText type="small" themeColor="textSecondary">
          Auto-ocultado (en revisión) por acumular reportes.
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onRestore}
          disabled={busy}
          style={({ pressed }) => [styles.actionBtn, styles.restore, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Restaurar
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onRemove}
          disabled={busy}
          style={({ pressed }) => [styles.actionBtn, styles.remove, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.removeText}>
            Eliminar
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onBan}
          disabled={busy}
          style={({ pressed }) => [styles.actionBtn, styles.ban, pressed && styles.pressed]}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="smallBold" style={styles.banText}>
              Banear
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.three,
  },
  error: { color: '#d9534f' },
  emptyCard: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: '#3a3a35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, gap: Spacing.half },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: 9999,
  },
  quote: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  actions: { flexDirection: 'row', gap: Spacing.two },
  actionBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restore: { backgroundColor: '#2a2c31' },
  remove: { backgroundColor: '#3a2a2a' },
  removeText: { color: '#e0863a' },
  ban: { backgroundColor: '#d9534f' },
  banText: { color: 'white' },
  pressed: { opacity: 0.7 },
});
