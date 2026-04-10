import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, FlatList, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { getThreadsForUser, getMessagesForThread } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuInset } from '../../constants/theme';
import { Avatar } from '../../components/ui/Avatar';
import { ChatBubble } from '../../components/ui/ChatBubble';
import { trackEvent } from '../../lib/track';

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [threads, setThreads] = useState<any[]>([]);
  const [activeThread, setActiveThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { trackEvent('page_view', 'messages'); }, []);

  const loadThreads = useCallback(async () => {
    if (!user?.id) return;
    const data = await getThreadsForUser(user.id);
    setThreads(data);
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      loadThreads().finally(() => setLoading(false));
    }
  }, [loadThreads, user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  }, [loadThreads]);

  // Load messages when thread selected
  const openThread = useCallback(async (thread: any) => {
    setActiveThread(thread);
    const msgs = await getMessagesForThread(thread.id);
    setMessages(msgs);

    // Mark as read
    mobileApi('/api/mobile/messages', { method: 'PUT', body: { threadId: thread.id } });

    // Scroll to bottom
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  // Real-time subscription
  useEffect(() => {
    if (!activeThread?.id) return;
    const channel = supabase
      .channel(`dm:${activeThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `thread_id=eq.${activeThread.id}`,
      }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.sender_id !== user?.id) {
          setMessages(prev => [...prev, newMsg]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          // Mark read immediately
          mobileApi('/api/mobile/messages', { method: 'PUT', body: { threadId: activeThread.id } });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeThread?.id, user?.id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeThread || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic add
    const tempMsg = {
      id: `temp-${Date.now()}`,
      thread_id: activeThread.id,
      sender_id: user?.id,
      content,
      message_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);

    const { data, error } = await mobileApi<{ message: any }>('/api/mobile/messages', {
      method: 'POST',
      body: { threadId: activeThread.id, content },
    });

    setSending(false);
    if (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      return;
    }
    // Replace temp with real
    if (data?.message) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
    }
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Thread view
  if (activeThread) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={[styles.threadHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { setActiveThread(null); loadThreads(); }} style={styles.backBtn}>
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Avatar name={activeThread.other_user?.full_name || 'User'} size={32} />
          <Text style={[styles.threadName, { color: colors.text }]} numberOfLines={1}>
            {activeThread.other_user?.full_name || 'User'}
          </Text>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={[styles.noMessages, { color: colors.textMuted }]}>No messages yet. Start the conversation!</Text>
          ) : (
            messages.map((msg: any) => (
              <ChatBubble
                key={msg.id}
                content={msg.content}
                isMine={msg.sender_id === user?.id}
                timestamp={msg.created_at}
                messageType={msg.message_type}
              />
            ))
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputRow, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.messageInput, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={2000}
            onSubmitEditing={sendMessage}
          />
          <Pressable
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            style={[styles.sendBtn, { backgroundColor: newMessage.trim() ? colors.primary : colors.surfaceLight }]}
          >
            <Text style={[styles.sendBtnText, { color: newMessage.trim() ? '#FFF' : colors.textMuted }]}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // Thread list
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {threads.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Messages</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Your conversations will appear here.
          </Text>
        </View>
      ) : (
        threads.map((thread: any) => {
          const unread = thread.unread_count || 0;
          return (
            <Pressable key={thread.id} onPress={() => openThread(thread)}>
              <View style={[styles.threadItem, { borderBottomColor: colors.border }]}>
                <Avatar name={thread.other_user?.full_name || 'User'} size={44} />
                <View style={styles.threadInfo}>
                  <View style={styles.threadTopRow}>
                    <Text style={[styles.threadItemName, { color: colors.text }, unread > 0 && { fontWeight: '800' }]} numberOfLines={1}>
                      {thread.other_user?.full_name || 'User'}
                    </Text>
                    <Text style={[styles.threadTime, { color: colors.textMuted }]}>
                      {new Date(thread.last_message_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.threadBottomRow}>
                    <Text style={[styles.threadPreview, { color: unread > 0 ? colors.text : colors.textSecondary }]} numberOfLines={1}>
                      {thread.last_message_preview || 'No messages yet'}
                    </Text>
                    {unread > 0 && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: Spacing.xxl, padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },
  threadItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1 },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadItemName: { fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  threadTime: { fontSize: FontSize.xs },
  threadBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  threadPreview: { fontSize: FontSize.sm, flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1 },
  backBtn: { paddingRight: Spacing.sm },
  backText: { fontSize: FontSize.md, fontWeight: '600' },
  threadName: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  noMessages: { textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.md },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1 },
  messageInput: { flex: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, maxHeight: 100 },
  sendBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  sendBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
