import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { IconSend } from '@/components/icons/Icons';

// ── Types ─────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content:
    "I'm your AI strategist. Ask me about content strategy, growth tactics, or optimization tips.",
  timestamp: new Date(),
};

let msgCounter = 0;
function nextId(): string {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

// ── Main Screen ───────────────────────────────────────────────────
export default function ChatScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // ── Theme-derived colors ────────────────────────────────────
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  // User bubble
  const userBubbleBg = isGlass(t)
    ? t.violet
    : isEditorial(t)
      ? t.ink
      : t.accent;
  const userBubbleText = isGlass(t)
    ? '#ffffff'
    : isEditorial(t)
      ? t.bg
      : '#ffffff';

  // Assistant bubble
  const assistantBubbleBg = isGlass(t)
    ? 'rgba(255,255,255,0.06)'
    : isEditorial(t)
      ? t.surface
      : t.surface;
  const assistantBubbleText = isGlass(t)
    ? t.fg
    : isEditorial(t)
      ? t.ink
      : t.fg;
  const assistantBubbleBorder = isEditorial(t)
    ? { borderWidth: t.border.width, borderColor: t.border.color }
    : {};
  const assistantBubbleShadow = isNeumorphic(t) ? t.shadowOutSm.outer : {};

  // Input bar
  const inputBg = isGlass(t)
    ? 'rgba(255,255,255,0.06)'
    : isEditorial(t)
      ? t.bg
      : t.surfaceLighter;
  const inputBorder = isGlass(t)
    ? t.line
    : isEditorial(t)
      ? t.border.color
      : 'transparent';
  const inputText = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const placeholderColor = isGlass(t) ? t.faint : isEditorial(t) ? t.muted : t.faint;
  const sendBtnBg = isGlass(t)
    ? t.violet
    : isEditorial(t)
      ? t.ink
      : t.accent;
  const sendBtnColor = isGlass(t)
    ? '#ffffff'
    : isEditorial(t)
      ? t.bg
      : '#ffffff';

  // Input bar container
  const inputBarBg = isGlass(t)
    ? t.bgMid
    : isEditorial(t)
      ? t.surfaceAlt
      : t.bg;

  // ── Send message ────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    // Scroll to bottom after user message
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const data = await api.post<{ reply: string }>('/chat', { message: text });
      const assistantMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content: data.reply ?? String(data),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: nextId(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, sending]);

  // ── Render ──────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1 }}>
        {/* ── Messages ────────────────────────────── */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
            padding: 20,
            paddingTop: insets.top + 10,
            paddingBottom: 16,
          }}
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Page title */}
          <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
            <Text
              style={{
                color: isGlass(t) ? t.fg : t.ink,
                fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
                fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
                lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
                letterSpacing: -0.5,
              }}
            >
              {'AI '}
              <Text style={{
                fontFamily: t.fontDisplayItalic,
                color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
              }}>
                Strategist
              </Text>
            </Text>
            <Text
              style={{
                color: muted,
                fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
                fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginTop: 8,
              }}
            >
              Growth advisor
            </Text>
          </View>

          {/* Message bubbles */}
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  marginBottom: 12,
                }}
              >
                <View
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: isGlass(t)
                      ? t.radiusMd
                      : isEditorial(t)
                        ? 2
                        : t.radiusMd,
                    backgroundColor: isUser ? userBubbleBg : assistantBubbleBg,
                    ...(isUser ? {} : assistantBubbleBorder),
                    ...(isUser ? {} : assistantBubbleShadow),
                    // Rounded corner exceptions for chat bubbles
                    ...(isGlass(t) || isNeumorphic(t)
                      ? isUser
                        ? { borderBottomRightRadius: 4 }
                        : { borderBottomLeftRadius: 4 }
                      : {}),
                  }}
                >
                  <Text
                    style={{
                      color: isUser ? userBubbleText : assistantBubbleText,
                      fontSize: 14,
                      fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
                      lineHeight: 20,
                    }}
                  >
                    {msg.content}
                  </Text>
                </View>
                <Text
                  style={{
                    color: isGlass(t) ? t.faint : isEditorial(t) ? t.faint : t.faint,
                    fontSize: 10,
                    fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBody,
                    marginTop: 4,
                    textAlign: isUser ? 'right' : 'left',
                    paddingHorizontal: 4,
                  }}
                >
                  {msg.timestamp.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            );
          })}

          {/* Typing indicator */}
          {sending && (
            <View
              style={{
                alignSelf: 'flex-start',
                maxWidth: '82%',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingVertical: 12,
                  borderRadius: isGlass(t)
                    ? t.radiusMd
                    : isEditorial(t)
                      ? 2
                      : t.radiusMd,
                  backgroundColor: assistantBubbleBg,
                  ...assistantBubbleBorder,
                  ...assistantBubbleShadow,
                  borderBottomLeftRadius: isGlass(t) || isNeumorphic(t) ? 4 : 2,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ActivityIndicator size="small" color={accentColor} />
                <Text
                  style={{
                    color: muted,
                    fontSize: 13,
                    fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
                  }}
                >
                  Thinking...
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Input bar ───────────────────────────── */}
        <View
          style={{
            backgroundColor: inputBarBg,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: Math.max(insets.bottom, 12) + 4,
            borderTopWidth: isEditorial(t) ? t.border.width : isGlass(t) ? 1 : 0,
            borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 10,
            }}
          >
            {/* Text input */}
            <View
              style={{
                flex: 1,
                backgroundColor: inputBg,
                borderRadius: isGlass(t)
                  ? t.radiusMd
                  : isEditorial(t)
                    ? 2
                    : t.radiusMd,
                borderWidth: isGlass(t) ? 1 : isEditorial(t) ? t.border.width : 0,
                borderColor: inputBorder,
                paddingHorizontal: 14,
                paddingVertical: Platform.OS === 'ios' ? 10 : 6,
                minHeight: 42,
                justifyContent: 'center',
                // Neumorphic inset shadow approximation
                ...(isNeumorphic(t)
                  ? (Platform.OS === 'ios'
                    ? { shadowColor: t.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.5, shadowRadius: 6 }
                    : { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.35)', borderLeftColor: 'rgba(167,173,184,0.35)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' })
                  : {}),
              }}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask anything..."
                placeholderTextColor={placeholderColor}
                multiline
                maxLength={2000}
                returnKeyType="default"
                onSubmitEditing={handleSend}
                style={{
                  color: inputText,
                  fontSize: 15,
                  fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
                  maxHeight: 100,
                  lineHeight: 20,
                }}
              />
            </View>

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || sending}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                borderRadius: isGlass(t) ? t.radiusMd : isEditorial(t) ? 2 : t.radiusMd,
                backgroundColor: sendBtnBg,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: !input.trim() || sending ? 0.4 : pressed ? 0.7 : 1,
                ...(isEditorial(t)
                  ? {
                      borderWidth: t.border.width,
                      borderColor: t.border.color,
                      ...t.shadowButton,
                    }
                  : {}),
                ...(isGlass(t) ? t.shadowPrimary : {}),
              })}
            >
              {sending ? (
                <ActivityIndicator size="small" color={sendBtnColor} />
              ) : (
                <IconSend size={18} color={sendBtnColor} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
