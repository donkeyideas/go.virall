import { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { TextInput as RNTextInput } from 'react-native';
import { FontSize, Spacing, BorderRadius } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

const API_BASE = 'https://qrtbfhhhilcoeovdubqb.supabase.co';
const SUGGESTIONS = [
  'Analyze my best performing content',
  'Help me write a caption',
  'What hashtags should I use?',
  'Compare my platforms',
];

interface Message {
  id: string;
  role: 'ai' | 'user';
  text: string;
}

export default function AIChatScreen() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: 'Welcome to Go Virall AI! I can help you optimize your content strategy, analyze trends, and grow your audience. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');

      // Call the Next.js API route for AI chat
      // In production, use your deployed URL. For dev, use local network IP.
      const res = await fetch('https://qrtbfhhhilcoeovdubqb.functions.supabase.co/mobile-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text.trim() }),
      }).catch(() => null);

      let aiText: string;

      if (res && res.ok) {
        const data = await res.json();
        aiText = data.text;
      } else {
        // Fallback: call the web app API directly if available
        const webRes = await fetch('http://localhost:3600/api/mobile/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message: text.trim() }),
        }).catch(() => null);

        if (webRes && webRes.ok) {
          const data = await webRes.json();
          aiText = data.text;
        } else {
          aiText = 'I was unable to reach the AI service right now. Make sure the Go Virall web server is running, then try again.';
        }
      }

      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `Something went wrong: ${err.message || 'Unknown error'}. Please try again.`,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>AI Assistant</Text>

        <ScrollView
          ref={scrollRef}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.bubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                {
                  backgroundColor: msg.role === 'user' ? colors.accent : colors.cardBg,
                  borderColor: msg.role === 'user' ? colors.accent : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { color: msg.role === 'user' ? '#FFFFFF' : colors.text },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          ))}

          {sending && (
            <View style={[styles.bubble, styles.aiBubble, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.accent} />
            </View>
          )}

          {!sending && messages.length <= 1 && (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => sendMessage(s)}
                  style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.surfaceLight }]}
                >
                  <Text style={[styles.chipText, { color: colors.textSecondary }]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { backgroundColor: colors.tabBar, borderTopColor: colors.border }]}>
          <RNTextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
            placeholder="Ask anything..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => sendMessage(input)}
            returnKeyType="send"
            editable={!sending}
          />
          <Pressable
            onPress={() => sendMessage(input)}
            disabled={sending}
            style={[styles.sendBtn, { backgroundColor: colors.primary, opacity: sending ? 0.5 : 1 }]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  bubbleText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chip: {
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: FontSize.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    minHeight: 44,
  },
  sendBtn: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  sendText: {
    color: '#0C0A14',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});
