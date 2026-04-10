import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { mobileApi } from '../../lib/api';
import { trackEvent } from '../../lib/track';
import { Spacing, FontSize, BorderRadius, neuShadow, neuShadowSm } from '../../constants/theme';
import { SimpleMarkdown } from '../../components/ui/SimpleMarkdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

const QUICK_ACTIONS = [
  { label: 'Content ideas', prompt: 'Generate 5 content ideas optimized for my audience based on my recent top-performing posts.' },
  { label: 'Write captions', prompt: 'Write 3 engaging captions for my next post. Make them shareable and include CTAs.' },
  { label: 'Best hashtags', prompt: 'What are the best hashtags for my niche right now? Give me 4 sets: niche, growth, community, and trending.' },
  { label: 'Analyze my week', prompt: 'Analyze my performance over the last 7 days. What worked, what didn\'t, and what should I do next?' },
  { label: 'Growth tips', prompt: 'Based on my current metrics, give me 5 specific growth strategies for this week.' },
  { label: 'Schedule posts', prompt: 'Based on my audience activity data, what\'s my optimal posting schedule for this week?' },
];

export default function ChatScreen() {
  const { colors } = useTheme();
  const { profile } = useAuth();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => { trackEvent('page_view', 'chat'); }, []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16 }}>
          <Pressable onPress={() => setShowHistory(!showHistory)}>
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              History
            </Text>
          </Pressable>
          <Pressable onPress={startNewChat}>
            <Text style={{ color: colors.primary, fontSize: FontSize.sm, fontWeight: '600' }}>
              + New
            </Text>
          </Pressable>
        </View>
      ),
    });
  }, [navigation, colors, showHistory]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    const { data } = await mobileApi<{ conversations: Conversation[] }>('/api/mobile/chat', { method: 'GET' });
    if (data?.conversations) setConversations(data.conversations);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await mobileApi<{ messages: Message[] }>(`/api/mobile/chat?conversationId=${convId}`, { method: 'GET' });
    if (data?.messages) {
      setMessages(data.messages);
      setConversationId(convId);
      setShowHistory(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    setShowHistory(false);
  };

  const deleteConversation = (convId: string) => {
    Alert.alert('Delete Conversation', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await mobileApi('/api/mobile/chat', {
            method: 'DELETE',
            body: { conversationId: convId },
          });
          setConversations((prev) => prev.filter((c) => c.id !== convId));
          if (conversationId === convId) startNewChat();
        },
      },
    ]);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;
    trackEvent('chat_message', 'chat');

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await mobileApi<{
        text: string;
        provider: string;
        conversationId: string;
      }>('/api/mobile/chat', {
        method: 'POST',
        body: { message: msgText, conversationId },
        timeoutMs: 90000,
      });

      if (error || !data) throw new Error(error || 'Failed to send');

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
        setConversations((prev) => [
          { id: data.conversationId, title: msgText.slice(0, 60), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      const assistantMsg: Message = {
        id: `temp-${Date.now()}-reply`,
        role: 'assistant',
        content: data.text,
        provider: data.provider,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}-error`,
          role: 'assistant',
          content: `Sorry, something went wrong: ${err.message}. Please try again.`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, conversationId]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    const textColor = isUser ? '#FFFFFF' : colors.text;
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        {/* Assistant avatar */}
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
            <Text style={[styles.avatarIcon, { color: colors.primary }]}>V</Text>
          </View>
        )}
        <View
          style={[
            styles.msgBubble,
            isUser
              ? { backgroundColor: colors.primary }
              : [{ backgroundColor: colors.surface }, neuShadow(colors)],
          ]}
        >
          {isUser ? (
            <Text style={[styles.msgText, { color: textColor }]} selectable>
              {item.content}
            </Text>
          ) : (
            <SimpleMarkdown
              content={item.content}
              color={textColor}
              mutedColor={colors.textMuted}
              accentColor={colors.primary}
              baseStyle={styles.msgText}
            />
          )}
        </View>
      </View>
    );
  }, [colors]);

  // History view
  if (showHistory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>Conversations</Text>
        {conversations.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No conversations yet. Start a new chat!
          </Text>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => loadMessages(item.id)}
                onLongPress={() => deleteConversation(item.id)}
                style={[styles.convItem, { backgroundColor: colors.surface }, neuShadow(colors)]}
              >
                <Text style={[styles.convTitle, { color: colors.text }]} numberOfLines={1}>
                  {item.title || 'Untitled'}
                </Text>
                <Text style={[styles.convDate, { color: colors.textMuted }]}>
                  {formatRelativeTime(item.updated_at)}
                </Text>
              </Pressable>
            )}
            contentContainerStyle={{ padding: Spacing.lg }}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          />
        )}
      </View>
    );
  }

  const hasMessages = messages.length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {!hasMessages ? (
        /* ── Welcome Screen ── */
        <View style={styles.welcomeContainer}>
          {/* Strategist Avatar */}
          <View style={[styles.welcomeAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={{ fontSize: 28 }}>V</Text>
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Smart Strategist</Text>
          <View style={styles.onlineRow}>
            <View style={[styles.onlineDot, { backgroundColor: '#4ADE80' }]} />
            <Text style={[styles.onlineText, { color: '#4ADE80' }]}>Online</Text>
          </View>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            Your personal social media strategist.{'\n'}Ask me anything about your content and growth.
          </Text>

          {/* Welcome quick actions as compact pills */}
          <View style={styles.welcomeChips}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => sendMessage(action.prompt)}
                style={[styles.welcomeChip, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
              >
                <Text style={[styles.welcomeChipText, { color: colors.primary }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        /* ── Messages ── */
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.loadingRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary + '25' }]}>
                  <Text style={[styles.avatarIcon, { color: colors.primary }]}>V</Text>
                </View>
                <View style={[styles.loadingBubble, { backgroundColor: colors.surface }, neuShadow(colors)]}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />
      )}

      {/* ── Input Bar ── */}
      <View style={[styles.inputBar, { backgroundColor: colors.background }]}>
        <View style={[styles.inputWrapper, { backgroundColor: colors.surface }, neuShadow(colors)]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your strategist..."
            placeholderTextColor={colors.textMuted}
            style={[styles.inputField, { color: colors.text }]}
            multiline
            maxLength={2000}
            editable={!isLoading}
            onSubmitEditing={() => sendMessage()}
            blurOnSubmit
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            style={[
              styles.sendBtn,
              { backgroundColor: input.trim() ? colors.primary : colors.surfaceLight },
            ]}
          >
            <Text style={[styles.sendArrow, { color: input.trim() ? '#FFFFFF' : colors.textMuted }]}>
              {'>'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Welcome ──
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  welcomeAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  welcomeSubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  welcomeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  welcomeChip: {
    borderRadius: 20,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  welcomeChipText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },

  // ── Messages ──
  messagesList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  avatarIcon: {
    fontSize: 14,
    fontWeight: '800',
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  msgText: {
    fontSize: FontSize.sm,
    lineHeight: 21,
  },

  // ── Loading ──
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
  },

  // ── Quick Chips ──
  quickChipList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  quickChip: {
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  quickChipText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },

  // ── Input Bar ──
  inputBar: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 28,
    paddingLeft: Spacing.lg,
    paddingRight: 4,
    paddingVertical: 4,
  },
  inputField: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrow: {
    fontSize: 18,
    fontWeight: '800',
  },

  // ── History ──
  historyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    paddingTop: Spacing.xxxl,
  },
  convItem: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  convTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  convDate: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
});
