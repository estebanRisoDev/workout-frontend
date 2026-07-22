/**
 * Comunidad: se adapta al rol.
 *
 *  - Profesor (dueño de la app): ve su PANEL — Registro de alumnos (activo) y
 *    Actividades (crear salidas con ubicación y notificar; WIP).
 *  - Alumno: ve la comunidad — Discusiones (foro por temas) y Ubicación de la
 *    próxima actividad. Ambas WIP.
 *
 * El contenido real de discusiones/actividades llega en fases siguientes
 * (necesitan backend de mensajes y de actividades); acá queda la estructura.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listActivities, type Activity } from '@/api/activities';
import { MapPreview } from '@/components/map-preview';
import { ScreenFade } from '@/components/screen-fade';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export default function ComunidadScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const soyProfesor = isTeacher(user);

  // El alumno ve las actividades activas en vivo; el profesor las gestiona aparte.
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loadingAct, setLoadingAct] = useState(true);
  // Congela el scroll mientras se manipula un mapa embebido.
  const [mapLocked, setMapLocked] = useState(false);

  useEffect(() => {
    if (soyProfesor) return;
    const controller = new AbortController();
    (async () => {
      setLoadingAct(true);
      try {
        const list = await listActivities(controller.signal);
        if (!controller.signal.aborted) setActivities(list);
      } catch {
        // Silencioso: la sección simplemente queda vacía si falla.
      } finally {
        if (!controller.signal.aborted) setLoadingAct(false);
      }
    })();
    return () => controller.abort();
  }, [soyProfesor]);

  return (
    <ScreenFade>
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          scrollEnabled={!mapLocked}
          showsVerticalScrollIndicator={false}>
          <ThemedText type="title">{soyProfesor ? 'Panel' : 'Comunidad'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {soyProfesor
              ? 'Gestiona a tus alumnos y las actividades de la comunidad.'
              : 'Conecta con otros, comparte tu progreso y entérate de las próximas actividades.'}
          </ThemedText>

          {soyProfesor ? (
            <>
              <SectionCard
                icon="map-pin"
                title="Actividades"
                hint="Crea salidas (ej. calistenia en Penco) con su lugar y ciérralas al terminar."
                onPress={() => router.push('/comunidad/actividades')}
              />
              <SectionCard
                icon="message-circle"
                title="Discusiones"
                hint="Chats grupales permanentes que creas y solo tú puedes cerrar."
                onPress={() => router.push('/comunidad/discusiones')}
              />
              <SectionCard
                icon="flag"
                title="Reportes"
                hint="Mensajes denunciados por los alumnos. Revisa y modera (eliminar o banear)."
                onPress={() => router.push('/comunidad/moderacion')}
              />
            </>
          ) : (
            <>
              <SectionCard
                icon="message-circle"
                title="Discusiones"
                hint="Chats grupales permanentes de la comunidad: rutinas, dudas y motivación."
                onPress={() => router.push('/comunidad/discusiones')}
              />

              <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
                PRÓXIMAS ACTIVIDADES
              </ThemedText>

              {loadingAct && <ActivityIndicator style={styles.loader} />}

              {!loadingAct && activities.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  No hay actividades por ahora. El profesor avisará cuando arme una salida.
                </ThemedText>
              )}

              {activities.map((a) => (
                <StudentActivityCard
                  key={a.id}
                  activity={a}
                  onInteractingChange={setMapLocked}
                  onOpen={() =>
                    router.push({
                      pathname: '/comunidad/actividades/[id]',
                      params: { id: a.id, title: a.title },
                    })
                  }
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
    </ScreenFade>
  );
}

/** Tarjeta de una actividad activa, como la ve el alumno. Toca para abrir su
 *  detalle (chat + temporizador); el mapa embebido se maneja solo. */
function StudentActivityCard({
  activity,
  onInteractingChange,
  onOpen,
}: {
  activity: Activity;
  onInteractingChange?: (active: boolean) => void;
  onOpen?: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onOpen} style={({ pressed }) => pressed && styles.pressed}>
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name="map-pin" size={20} color={Accent} />
        </View>
        <View style={styles.actInfo}>
          <ThemedText type="subtitle" style={styles.actTitle} numberOfLines={2}>
            {activity.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {activity.addressText ? `${activity.addressText} · ` : ''}
            {formatFecha(activity.scheduledFor)}
            {activity.allDay ? ' · todo el día' : ''}
          </ThemedText>
        </View>
      </View>
      {activity.description ? (
        <ThemedText type="small" themeColor="textSecondary">
          {activity.description}
        </ThemedText>
      ) : null}

      {activity.lat != null && activity.lng != null && (
        <>
          <View style={styles.mapWrap}>
            <MapPreview
              lat={activity.lat}
              lng={activity.lng}
              height={160}
              onInteractingChange={onInteractingChange}
            />
          </View>
          <Pressable
            onPress={() => {
              // geo: abre la app de mapas del teléfono con navegación al punto.
              const label = encodeURIComponent(activity.title);
              Linking.openURL(
                `geo:${activity.lat},${activity.lng}?q=${activity.lat},${activity.lng}(${label})`
              );
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.mapLink, pressed && styles.pressed]}>
            <Feather name="navigation" size={14} color={Accent} />
            <ThemedText type="smallBold" style={{ color: Accent }}>
              Cómo llegar
            </ThemedText>
          </Pressable>
        </>
      )}

      <View style={styles.cardFooter}>
        <Feather name="message-circle" size={14} color={theme.textSecondary} />
        <ThemedText type="small" themeColor="textSecondary">
          Toca para ver el chat y el detalle ›
        </ThemedText>
      </View>
    </ThemedView>
    </Pressable>
  );
}

function SectionCard({
  icon,
  title,
  hint,
  badge,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  hint: string;
  badge?: string;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const card = (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: theme.backgroundSelected }]}>
          <Feather name={icon} size={20} color={Accent} />
        </View>
        <ThemedText type="subtitle" style={styles.cardTitle}>
          {title}
        </ThemedText>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
            <ThemedText type="small" themeColor="textSecondary">
              {badge}
            </ThemedText>
          </View>
        ) : onPress ? (
          <Feather name="chevron-right" size={22} color={theme.textSecondary} />
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
    </ThemedView>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {card}
    </Pressable>
  ) : (
    card
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Platform.OS === 'web' ? Spacing.six : Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  card: {
    borderRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { flex: 1, flexShrink: 1 },
  actInfo: { flex: 1, gap: Spacing.half },
  actTitle: { flexShrink: 1 },
  mapWrap: { marginTop: Spacing.one },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, marginTop: Spacing.one },
  badge: {
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    borderRadius: 9999,
  },
  sectionLabel: { marginTop: Spacing.two, letterSpacing: 1 },
  loader: { marginVertical: Spacing.three },
  pressed: { opacity: 0.7 },
});
