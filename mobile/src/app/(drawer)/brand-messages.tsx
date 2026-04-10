import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
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

export default function BrandMessagesScreen() {
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

  useEffect(() => { trackEvent('page_view', 'brand_messages'); }, []);

  // ── Load threads ─────────────────────────────────────────────────
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

  // ── Open thread and load messages ────────────────────────────────
  const openThread = useCallback(async (thread: any) => {
    setActiveThread(thread);
    const msgs = await getMessagesForThread(thread.id);
    setMessages(msgs);

    // Mark thread as read
    mobileApi('/api/mobile/messages', { method: 'PUT', body: { threadId: thread.id } });

    // Scroll to bottom after messages render
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 100);
  }, []);

  // ── Real-time subscription for active thread ─────────────────────
  useEffect(() => {
    if (!activeThread?.id) return;
    const channel = supabase
      .channel(`brand-dm:${activeThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `thread_id=eq.${activeThread.id}`,
      }, (payload) => {
        const incoming = payload.new as any;
        // Only add messages from the other party
        if (incoming.sender_id !== user?.id) {
          setMessages(prev => [...prev, incoming]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
          // Mark read immediately
          mobileApi('/api/mobile/messages', { method: 'PUT', body: { threadId: activeThread.id } });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeThread?.id, user?.id]);

  // ── Real-time subscription for thread list (new messages indicator) ──
  useEffect(() => {
    if (!user?.id || activeThread) return;
    const channel = supabase
      .channel('brand-threads-update')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'message_threads',
      }, () => {
        // Reload threads when any thread is updated (new message arrived)
        loadThreads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, activeThread, loadThreads]);

  // ── Send message ─────────────────────────────────────────────────
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
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      return;
    }
    // Replace temp message with real one from server
    if (data?.message) {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? data.message : m));
    }
  };

  // ── Loading state ────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Thread detail view ───────────────────────────────────────────
  if (activeThread) {
    const otherName = activeThread.other_user?.full_name
      || activeThread.other_user?.company_name
      || 'Creator';

    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {/* Thread header */}
        <View style={[styles.threadHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => { setActiveThread(null); loadThreads(); }}
            style={styles.backBtn}
          >
            <Text style={[styles.backText, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Avatar name={otherName} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.threadName, { color: colors.text }]} numberOfLines={1}>
              {otherName}
            </Text>
            {activeThread.other_user?.account_type && (
              <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                {activeThread.other_user.account_type === 'creator' ? 'Creator' : 'Brand'}
              </Text>
            )}
          </View>
        </View>

        {/* Messages list */}
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: Spacing.md }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.length === 0 ? (
            <Text style={[styles.noMessages, { color: colors.textMuted }]}>
              No messages yet. Start the conversation!
            </Text>
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

        {/* Message input */}
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
            <Text style={[styles.sendBtnText, { color: newMessage.trim() ? '#FFF' : colors.textMuted }]}>
              {sending ? '...' : 'Send'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Thread list view ─────────────────────────────────────────────
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
            Your conversations with creators will appear here.
          </Text>
        </View>
      ) : (
        threads.map((thread: any) => {
          const unread = thread.unread_count || 0;
          const otherName = thread.other_user?.full_name
            || thread.other_user?.company_name
            || 'Creator';
          const accountType = thread.other_user?.account_type;

          return (
            <Pressable key={thread.id} onPress={() => openThread(thread)}>
              <View style={[styles.threadItem, { borderBottomColor: colors.border }]}>
                <Avatar name={otherName} size={44} />
                <View style={styles.threadInfo}>
                  <View style={styles.threadTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.threadItemName,
                          { color: colors.text },
                          unread > 0 && { fontWeight: '800' },
                        ]}
                        numberOfLines={1}
                      >
                        {otherName}
                      </Text>
                      {accountType && (
                        <Text style={{ color: colors.textMuted, fontSize: FontSize.xs }}>
                          {accountType === 'creator' ? 'Creator' : 'Brand'}
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.threadTime, { color: colors.textMuted }]}>
                      {formatThreadTime(thread.last_message_at)}
                    </Text>
                  </View>
                  <View style={styles.threadBottomRow}>
                    <Text
                      style={[
                        styles.threadPreview,
                        { color: unread > 0 ? colors.text : colors.textSecondary },
                        unread > 0 && { fontWeight: '600' },
                      ]}
                      numberOfLines={1}
                    >
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

/**
 * Format the thread timestamp to show relative time for today,
 * day name for this week, or date otherwise.
 */
function formatThreadTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  content: { paddingBottom: 100 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', marginTop: Spacing.xxl, padding: Spacing.lg },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '700' },
  emptySubtitle: { fontSize: FontSize.md, marginTop: Spacing.sm, textAlign: 'center' },

  // Thread list
  threadItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md, borderBottomWidth: 1 },
  threadInfo: { flex: 1 },
  threadTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  threadItemName: { fontSize: FontSize.md, fontWeight: '600' },
  threadTime: { fontSize: FontSize.xs, marginLeft: Spacing.sm },
  threadBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  threadPreview: { fontSize: FontSize.sm, flex: 1 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: Spacing.sm },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

  // Thread detail header
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1 },
  backBtn: { paddingRight: Spacing.sm },
  backText: { fontSize: FontSize.md, fontWeight: '600' },
  threadName: { fontSize: FontSize.md, fontWeight: '700' },
  noMessages: { textAlign: 'center', marginTop: Spacing.xl, fontSize: FontSize.md },

  // Input area
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1 },
  messageInput: { flex: 1, borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, maxHeight: 100 },
  sendBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
  sendBtnText: { fontWeight: '700', fontSize: FontSize.md },
});
