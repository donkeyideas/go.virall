import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../../../contexts/theme-context';
import { useAuth } from '../../../contexts/auth-context';
import { cockpit } from '../../../lib/cockpit-theme';
import { supabase } from '../../../lib/supabase';
import { getMessagesForThread, getThreadsForUser } from '../../../lib/dal';
import { mobileApi } from '../../../lib/api';

function formatTime(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Today, ${time}`;
  const yd = new Date(today);
  yd.setDate(yd.getDate() - 1);
  if (d.toDateString() === yd.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`;
}

function initials(name: string) {
  const parts = name
    .replace(/^@/, '')
    .split(/[\s_\-.]+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function MessageThreadScreen() {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const { user } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id || !user?.id) return;
    (async () => {
      setLoading(true);
      const threads = await getThreadsForUser(user.id);
      const found = threads.find((t: any) => t.id === id);
      setThread(found ?? null);
      const msgs = await getMessagesForThread(id);
      setMessages(msgs);
      setLoading(false);
      mobileApi('/api/mobile/messages', { method: 'PUT', body: { threadId: id } });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
    })();
  }, [id, user?.id]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`dm:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `thread_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_id !== user?.id) {
            setMessages((prev) => [...prev, newMsg]);
            setTimeout(
              () => scrollRef.current?.scrollToEnd({ animated: true }),
              50,
            );
            mobileApi('/api/mobile/messages', {
              method: 'PUT',
              body: { threadId: id },
            });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending || !id) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      thread_id: id,
      sender_id: user?.id,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const { data, error } = await mobileApi<{ message: any }>(
      '/api/mobile/messages',
      { method: 'POST', body: { threadId: id, content } },
    );
    setSending(false);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    if (data?.message) {
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data.message : m)),
      );
    }
  }, [newMessage, sending, id, user?.id]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: c.bgDeep }]}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  const other = thread?.other_user;
  const name =
    other?.display_name ||
    other?.full_name ||
    other?.company_name ||
    (other?.username ? `@${other.username}` : null) ||
    (other?.account_type === 'brand' ? 'Brand Partner' : 'Creator');
  const label =
    other?.account_type === 'brand'
      ? 'Brand Partner'
      : other?.account_type === 'creator'
      ? 'Creator'
      : 'Conversation';
  const avatarUrl = other?.avatar_url || other?.brand_logo_url || null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bgDeep }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: c.bgCard, borderBottomColor: c.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={[
            styles.backBtn,
            { backgroundColor: c.bgElevated, borderColor: c.border },
          ]}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={16} color={c.textSecondary} />
        </Pressable>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, { backgroundColor: c.bgElevated }]}>
            <Text style={[styles.headerAvatarText, { color: c.gold }]}>
              {initials(name)}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerName, { color: c.textPrimary }]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.headerLabel, { color: c.textMuted }]} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.chat}
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd({ animated: false })
        }
      >
        {messages.length === 0 ? (
          <Text style={[styles.noMessages, { color: c.textMuted }]}>
            No messages yet. Start the conversation!
          </Text>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.sender_id === user?.id;
            const showTime =
              idx === 0 ||
              new Date(msg.created_at).getTime() -
                new Date(messages[idx - 1].created_at).getTime() >
                5 * 60 * 1000;
            return (
              <View key={msg.id}>
                {showTime ? (
                  <Text
                    style={[
                      styles.time,
                      { color: c.textMuted, textAlign: isMine ? 'right' : 'left' },
                    ]}
                  >
                    {formatTime(msg.created_at)}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.bubble,
                    isMine
                      ? {
                          alignSelf: 'flex-end',
                          backgroundColor: c.gold,
                          borderBottomRightRadius: 4,
                        }
                      : {
                          alignSelf: 'flex-start',
                          backgroundColor: c.bgCard,
                          borderColor: c.border,
                          borderWidth: 1,
                          borderBottomLeftRadius: 4,
                        },
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      { color: isMine ? c.goldContrast : c.textPrimary },
                    ]}
                  >
                    {msg.content}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View
        style={[
          styles.inputRow,
          { backgroundColor: c.bgCard, borderTopColor: c.border },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              color: c.textPrimary,
              backgroundColor: c.bgElevated,
              borderColor: c.border,
            },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={c.textMuted}
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
          maxLength={2000}
        />
        <Pressable
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
          style={[
            styles.sendBtn,
            {
              backgroundColor: newMessage.trim() ? c.gold : c.bgElevated,
              opacity: newMessage.trim() ? 1 : 0.6,
            },
          ]}
        >
          <Ionicons
            name="send"
            size={16}
            color={newMessage.trim() ? c.goldContrast : c.textMuted}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 12, fontWeight: '800' },
  headerName: { fontSize: 14, fontWeight: '700' },
  headerLabel: { fontSize: 10, marginTop: 1, letterSpacing: 0.3 },
  chat: { padding: 16, gap: 6, paddingBottom: 20 },
  time: {
    fontSize: 10,
    marginVertical: 8,
    letterSpacing: 0.4,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleText: { fontSize: 13.5, lineHeight: 19 },
  noMessages: {
    textAlign: 'center',
    padding: 40,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
