import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, type TextInput as TI } from 'react-native';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { IconSend, IconBot } from '@/components/icons/Icons';
import { api } from '@/lib/api';

interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

interface Props {
  displayName: string;
}

export function StrategistChat({ displayName }: Props) {
  const t = useTokens();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: `Hi ${displayName} -- I reviewed your recent activity. What can I help with?` },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TI>(null);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.ink;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.pink : t.accent;
  const bgInput = isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter;
  const borderColor = isGlass(t) ? 'rgba(255,255,255,0.12)' : isEditorial(t) ? t.border.color : 'transparent';

  const quickActions = ['Draft captions', 'Hashtag set', 'Weekly plan'];

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;

    const userMsg: ChatMessage = { role: 'user', text: msg };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post<{ reply: string }>('/chat', {
        messages: [...messages, userMsg].map((m) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
      });
      setMessages((prev) => [...prev, { role: 'ai', text: res.reply ?? 'I could not generate a response.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'ai', text: 'Something went wrong. Try again.' }]);
    } finally {
      setSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <ThemedCard padding={isEditorial(t) ? 18 : 20}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <View style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.08)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
          justifyContent: 'center', alignItems: 'center',
        }}>
          <IconBot size={14} color={accent} />
        </View>
        <Kicker>Virall AI Strategist</Kicker>
      </View>

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={{ maxHeight: 200, marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              marginBottom: 8,
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              backgroundColor: m.role === 'user'
                ? accent
                : (isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? 'rgba(0,0,0,0.04)' : t.surfaceLighter),
              borderRadius: 14,
              paddingVertical: 8,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{
              fontFamily: t.fontBody, fontSize: 13,
              color: m.role === 'user' ? '#fff' : fg,
              lineHeight: 18,
            }}>
              {m.text}
            </Text>
          </View>
        ))}
        {sending && (
          <View style={{ alignSelf: 'flex-start', padding: 8 }}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        )}
      </ScrollView>

      {/* Quick actions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action}
              onPress={() => handleSend(action)}
              style={{
                paddingVertical: 6, paddingHorizontal: 12,
                borderRadius: 16,
                backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
                borderWidth: 1,
                borderColor,
              }}
            >
              <Text style={{ fontFamily: t.fontMono, fontSize: 10, color: muted, letterSpacing: 0.5 }}>
                {action}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Input row */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: bgInput,
        borderRadius: 20, borderWidth: 1, borderColor,
        paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 4,
      }}>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your strategist..."
          placeholderTextColor={muted}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
          style={{
            flex: 1, fontFamily: t.fontBody, fontSize: 13, color: fg,
            paddingVertical: 0,
          }}
        />
        <TouchableOpacity onPress={() => handleSend()} disabled={!input.trim() || sending}>
          <IconSend size={18} color={input.trim() ? accent : muted} />
        </TouchableOpacity>
      </View>
    </ThemedCard>
  );
}
