/**
 * Perfil: identidad del usuario, resumen de actividad y ajustes.
 *
 * Los números salen de las rutinas reales del store. Los ajustes todavía no se
 * persisten: no existen columnas para ellos en la base.
 */

import { Feather } from '@expo/vector-icons';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { initials, monthCount, streakDays } from '@/data/stats';
import { useAuth } from '@/store/auth-store';
import { useWorkouts } from '@/store/workouts-store';

export default function PerfilScreen() {
  const { workouts } = useWorkouts();
  const { user, signOut } = useAuth();

  const nombre = user?.name?.trim() || user?.email?.split('@')[0] || 'Sin nombre';
  const iniciales = initials(user?.name ?? null, user?.email);
  const miembroDesde = user?.createdAt ? new Date(user.createdAt).getFullYear() : null;

  // Ejercicios distintos usados en todas sus rutinas.
  const ejerciciosDistintos = new Set(
    workouts.flatMap((w) => w.exercises.map((we) => we.exerciseId))
  ).size;

  const stats = [
    { value: workouts.length, label: 'Entrenos' },
    { value: streakDays(workouts), label: 'Racha' },
    { value: ejerciciosDistintos, label: 'Ejercicios' },
  ];

  const ajustes = [
    { icon: 'sliders' as const, label: 'Unidades', value: 'kg' },
    { icon: 'bell' as const, label: 'Recordatorios', value: 'Activo' },
    { icon: 'target' as const, label: 'Objetivo semanal', value: '5 días' },
    { icon: 'clock' as const, label: 'Descanso por defecto', value: '90 s' },
    { icon: 'user' as const, label: 'Cuenta', value: '' },
  ];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Identidad */}
          <View style={styles.identity}>
            {/* Google entrega una foto de perfil; si no hay, van las iniciales. */}
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <ThemedText type="title" style={styles.avatarText}>
                  {iniciales}
                </ThemedText>
              </View>
            )}
            <ThemedText type="subtitle">{nombre}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {miembroDesde ? `Miembro desde ${miembroDesde}` : 'Miembro nuevo'}
              {' · '}
              {monthCount(workouts)} este mes
            </ThemedText>
          </View>

          {/* Resumen */}
          <View style={styles.statsRow}>
            {stats.map((stat) => (
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

          {/* Ajustes */}
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionLabel}>
            AJUSTES
          </ThemedText>

          <View style={styles.settingsCard}>
            {ajustes.map((item, i) => (
              <View
                key={item.label}
                style={[styles.settingRow, i > 0 && styles.settingRowBorder]}>
                <View style={styles.settingIcon}>
                  <Feather name={item.icon} size={16} color="#4a4a4a" />
                </View>
                <ThemedText type="default" style={styles.settingLabel}>
                  {item.label}
                </ThemedText>
                {item.value ? (
                  <ThemedText type="small" style={styles.settingValue}>
                    {item.value}
                  </ThemedText>
                ) : null}
                <ThemedText style={styles.chevron}>›</ThemedText>
              </View>
            ))}
          </View>

          <Pressable
            onPress={signOut}
            style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.logoutText}>
              Cerrar sesión
            </ThemedText>
          </Pressable>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footnote}>
            Los ajustes son solo visuales por ahora: todavía no hay dónde guardarlos.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.five,
  },

  identity: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 9999,
    backgroundColor: '#3a3a35',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarText: {
    color: 'white',
    fontSize: 32,
    lineHeight: 38,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: Spacing.four,
    alignItems: 'center',
    gap: Spacing.half,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  statValue: {
    color: 'black',
    fontSize: 30,
    lineHeight: 36,
  },
  statLabel: { color: '#6b6b6b' },

  sectionLabel: {
    marginTop: Spacing.three,
    letterSpacing: 1,
  },

  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  settingRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececec',
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#f3f3ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { flex: 1, color: 'black' },
  settingValue: { color: '#9a9a9a' },
  chevron: {
    color: '#c4c4c4',
    fontSize: 20,
    lineHeight: 22,
  },

  footnote: {
    marginTop: Spacing.two,
    textAlign: 'center',
  },

  logout: {
    marginTop: Spacing.four,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'white',
  },
  logoutText: { color: '#d9534f' },
  pressed: { opacity: 0.85 },
});
