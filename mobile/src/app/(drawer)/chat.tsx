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
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';

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
  { label: 'Posting schedule', prompt: 'Based on my audience activity data, what\'s my optimal posting schedule for this week?' },
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
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAssistant]}>
        <View
          style={[
            styles.msgBubble,
            isUser
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.msgText,
              { color: isUser ? '#1A1035' : colors.text },
            ]}
            selectable
          >
            {item.content}
          </Text>
          {item.provider && (
            <Text style={[styles.providerTag, { color: isUser ? '#1A103580' : colors.textMuted }]}>
              {formatProvider(item.provider)}
            </Text>
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
                style={[styles.convItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
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
      {/* Provider badge */}
      <View style={[styles.providerBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.providerBarText, { color: colors.textMuted }]}>
          Virall AI
        </Text>
      </View>

      {!hasMessages ? (
        /* Welcome Screen */
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Virall AI</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            Your personal social media strategist
          </Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => sendMessage(action.prompt)}
                style={[styles.quickBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={[styles.quickBtnText, { color: colors.text }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        /* Messages */
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
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Thinking...</Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Quick actions (when in conversation) */}
      {hasMessages && (
        <FlatList
          horizontal
          data={QUICK_ACTIONS}
          keyExtractor={(item) => item.label}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => sendMessage(item.prompt)}
              disabled={isLoading}
              style={[styles.quickChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[styles.quickChipText, { color: colors.textSecondary }]}>
                {item.label}
              </Text>
            </Pressable>
          )}
          contentContainerStyle={styles.quickChipList}
          showsHorizontalScrollIndicator={false}
        />
      )}

      {/* Input */}
      <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your content, growth..."
          placeholderTextColor={colors.textMuted}
          style={[styles.inputField, { color: colors.text, backgroundColor: colors.inputBg }]}
          multiline
          maxLength={2000}
          editable={!isLoading}
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit
        />
        <Pressable
          onPress={() => sendMessage()}
          disabled={!input.trim() || isLoading}
          style={[styles.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.surfaceLight }]}
        >
          <Text style={[styles.sendBtnText, { color: input.trim() ? '#1A1035' : colors.textMuted }]}>
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function formatProvider(provider: string): string {
  const cleaned = provider.replace('byok_', '');
  const map: Record<string, string> = { openai: 'GPT-4o', anthropic: 'Claude', google: 'Gemini', gemini: 'Gemini', deepseek: 'DeepSeek' };
  return map[cleaned] || cleaned;
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
  providerBar: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerBarText: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  welcomeTitle: { fontSize: FontSize.xxl, fontWeight: '800', marginBottom: Spacing.xs },
  welcomeSubtitle: { fontSize: FontSize.md, marginBottom: Spacing.xxxl, textAlign: 'center' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm },
  quickBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: '45%',
  },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: '600', textAlign: 'center' },
  messagesList: { padding: Spacing.lg, paddingBottom: Spacing.sm },
  msgRow: { marginBottom: Spacing.md },
  msgRowUser: { alignItems: 'flex-end' },
  msgRowAssistant: { alignItems: 'flex-start' },
  msgBubble: { maxWidth: '85%', borderRadius: BorderRadius.lg, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  msgText: { fontSize: FontSize.md, lineHeight: 22 },
  providerTag: { fontSize: FontSize.xs, marginTop: Spacing.xs, textAlign: 'right' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
  loadingText: { fontSize: FontSize.sm },
  quickChipList: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  quickChip: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  quickChipText: { fontSize: FontSize.xs, fontWeight: '500' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  inputField: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    maxHeight: 100,
  },
  sendBtn: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    alignSelf: 'flex-end',
  },
  sendBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  historyTitle: { fontSize: FontSize.xl, fontWeight: '800', padding: Spacing.lg, paddingBottom: Spacing.sm },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', paddingTop: Spacing.xxxl },
  convItem: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  convTitle: { fontSize: FontSize.md, fontWeight: '600' },
  convDate: { fontSize: FontSize.xs, marginTop: Spacing.xs },
});
