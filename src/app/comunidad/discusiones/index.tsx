/**
 * Lista de discusiones (chats permanentes de la comunidad).
 *
 * La pantalla muestra SOLO las discusiones. El profesor tiene un botón "+" que
 * abre un menú (modal) para crear, y en cada fila puede editar o borrar (borrar
 * es fakedelete en el backend). Los alumnos solo ven la lista y entran al chat.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createDiscussion,
  deleteDiscussion,
  listDiscussions,
  updateDiscussion,
  type Discussion,
} from '@/api/discussions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

export default function DiscusionesListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const soyProfesor = isTeacher(user);

  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de crear/editar. `editId` seteado = edición; null = creación.
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDiscussions(await listDiscussions());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar las discusiones');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  function abrirCrear() {
    setEditId(null);
    setTitle('');
    setDescription('');
    setFormOpen(true);
  }

  function abrirEditar(d: Discussion) {
    setEditId(d.id);
    setTitle(d.title);
    setDescription(d.description ?? '');
    setFormOpen(true);
  }

  async function guardar() {
    if (!title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await updateDiscussion(editId, { title: title.trim(), description: description.trim() || null });
      } else {
        await createDiscussion({ title: title.trim(), description: description.trim() || null });
      }
      setFormOpen(false);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  }

  async function borrar(id: string) {
    try {
      await deleteDiscussion(id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <ThemedText type="linkPrimary">‹ Comunidad</ThemedText>
          </Pressable>

          <View style={styles.titleRow}>
            <ThemedText
              type="title"
              style={styles.titleText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.6}>
              Discusiones
            </ThemedText>
            {soyProfesor && (
              <Pressable
                onPress={abrirCrear}
                style={({ pressed }) => [styles.addBtn, pressed && styles.pressed]}>
                <Feather name="plus" size={26} color="black" />
              </Pressable>
            )}
          </View>

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {loading && <ActivityIndicator style={styles.loader} />}

          {!loading && discussions.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              {soyProfesor
                ? 'Aún no hay discusiones. Toca “+” para crear la primera.'
                : 'El profesor todavía no abrió discusiones.'}
            </ThemedText>
          )}

          {discussions.map((d) => (
            <Pressable
              key={d.id}
              onPress={() =>
                router.push({
                  pathname: '/comunidad/discusiones/[id]',
                  params: { id: d.id, title: d.title },
                })
              }
              style={({ pressed }) => pressed && styles.pressed}>
              <ThemedView type="backgroundElement" style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: theme.backgroundSelected }]}>
                  <Feather name="message-circle" size={20} color={Accent} />
                </View>
                <View style={styles.rowInfo}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {d.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {d.description ? `${d.description} · ` : ''}
                    {d.messageCount} {d.messageCount === 1 ? 'mensaje' : 'mensajes'}
                  </ThemedText>
                </View>

                {soyProfesor && (
                  <View style={styles.rowActions}>
                    <Pressable onPress={() => abrirEditar(d)} hitSlop={8}>
                      <Feather name="edit-2" size={18} color={theme.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => borrar(d.id)} hitSlop={8}>
                      <Feather name="trash-2" size={18} color="#d9534f" />
                    </Pressable>
                  </View>
                )}
              </ThemedView>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Menú de crear / editar discusión */}
      <Modal
        visible={formOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setFormOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFormOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <ThemedView type="background" style={styles.sheetInner}>
              <ThemedText type="subtitle">
                {editId ? 'Editar discusión' : 'Nueva discusión'}
              </ThemedText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Título (ej: General, Nutrición…)"
                placeholderTextColor={theme.textSecondary}
                autoFocus
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Descripción (opcional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { color: theme.text, backgroundColor: theme.backgroundElement },
                ]}
              />
              <View style={styles.sheetActions}>
                <Pressable onPress={() => setFormOpen(false)} hitSlop={8}>
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    Cancelar
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={guardar}
                  disabled={!title.trim() || saving}
                  style={({ pressed }) => [
                    styles.cta,
                    pressed && styles.pressed,
                    (!title.trim() || saving) && styles.disabled,
                  ]}>
                  {saving ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <ThemedText type="smallBold" style={styles.ctaText}>
                      {editId ? 'Guardar' : 'Crear'}
                    </ThemedText>
                  )}
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  titleText: { flex: 1 },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: '#d9534f' },
  loader: { marginVertical: Spacing.four },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, gap: Spacing.half },
  rowActions: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },

  // --- Modal ---
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: { width: '100%' },
  sheetInner: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.four,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingBottom: Spacing.five,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.four,
    marginTop: Spacing.one,
  },
  cta: {
    height: 48,
    borderRadius: 14,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
  },
  ctaText: { color: 'black', fontSize: 16 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
