/**
 * Chat de una discusión: lista de mensajes + caja para escribir.
 *
 * Sin websockets: se refresca por polling cada pocos segundos, suficiente para
 * un chat de comunidad. Cada uno puede borrar sus mensajes; el profesor puede
 * borrar cualquiera (fakedelete en el backend).
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  deleteMessage,
  listMessages,
  postMessage,
  type ChatMessage,
} from '@/api/discussions';
import { reportMessage } from '@/api/moderation';
import {
  DateDivider,
  MessageBubble,
  RemovedTombstone,
  buildChatItems,
} from '@/components/message-bubble';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Accent, MaxContentWidth, Spacing } from '@/constants/theme';
import { isTeacher } from '@/data/workouts';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/store/auth-store';

const POLL_MS = 4000;

export default function DiscusionChatScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const soyProfesor = isTeacher(user);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const cargar = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      try {
        const list = await listMessages(id, signal);
        if (!signal?.aborted) setMessages(list);
      } catch (e) {
        if (!signal?.aborted) setError(e instanceof Error ? e.message : 'No se pudo cargar el chat');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id]
  );

  // Carga inicial + polling mientras la pantalla está montada.
  useEffect(() => {
    const controller = new AbortController();
    void cargar(controller.signal);
    const timer = setInterval(() => cargar(), POLL_MS);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [cargar]);

  async function enviar() {
    const body = text.trim();
    if (!body || sending || !id) return;
    setSending(true);
    setError(null);
    try {
      const nuevo = await postMessage(id, body);
      setText('');
      setMessages((prev) => [...prev, nuevo]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  }

  async function borrar(messageId: string) {
    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar el mensaje');
    }
  }

  async function reportar(messageId: string) {
    try {
      await reportMessage(messageId);
      // Refresca por si el reporte lo llevó al umbral y quedó oculto "en revisión".
      await cargar();
      Alert.alert('Gracias', 'El profesor revisará este mensaje.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo reportar el mensaje');
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior="padding"
          keyboardVerticalOffset={insets.top}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={8}>
              <ThemedText type="linkPrimary">‹</ThemedText>
            </Pressable>
            <ThemedText type="subtitle" style={styles.headerTitle} numberOfLines={1}>
              {title || 'Discusión'}
            </ThemedText>
            <View style={{ width: 16 }} />
          </View>

          {loading ? (
            <ActivityIndicator style={styles.loader} />
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={styles.messages}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
              {messages.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
                  Todavía no hay mensajes. Sé el primero en escribir.
                </ThemedText>
              )}
              {buildChatItems(messages).map((item) =>
                item.kind === 'day' ? (
                  <DateDivider key={item.key} label={item.label} />
                ) : item.kind === 'gap' ? (
                  <RemovedTombstone key={item.key} count={item.count} />
                ) : (
                  <MessageBubble
                    key={item.key}
                    message={item.message}
                    mine={item.message.userId === user?.id}
                    canDelete={item.message.userId === user?.id || soyProfesor}
                    canReport={item.message.userId !== user?.id}
                    deleteAsButton={soyProfesor}
                    onDelete={() => borrar(item.message.id)}
                    onReport={() => reportar(item.message.id)}
                  />
                )
              )}
            </ScrollView>
          )}

          {error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <View style={[styles.inputBar, { borderTopColor: theme.backgroundSelected }]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
            />
            <Pressable
              onPress={enviar}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [
                styles.sendBtn,
                pressed && styles.pressed,
                (!text.trim() || sending) && styles.disabled,
              ]}>
              {sending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <ThemedText type="smallBold" style={styles.sendText}>
                  Enviar
                </ThemedText>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  headerTitle: { flex: 1, flexShrink: 1 },
  loader: { marginTop: Spacing.five },
  messages: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  empty: { textAlign: 'center', marginTop: Spacing.five },
  bubbleWrap: { maxWidth: '85%' },
  bubbleWrapMine: { alignSelf: 'flex-end' },
  bubbleWrapOther: { alignSelf: 'flex-start' },
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
  error: { color: '#d9534f', textAlign: 'center', paddingHorizontal: Spacing.four },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    maxHeight: 120,
  },
  sendBtn: {
    height: 44,
    borderRadius: 14,
    backgroundColor: Accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  sendText: { color: 'black' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
