import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { IconStar, IconChevronDown } from '@/components/icons/Icons';

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Storytelling'];

const ALL_PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
];

type Script = {
  title?: string;
  hook?: string;
  body?: string;
  callToAction?: string;
  duration?: string;
  visualNotes?: string;
};

export default function ScriptsScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [platform, setPlatform] = useState('tiktok');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Casual');
  const [toneOpen, setToneOpen] = useState(false);
  const [count, setCount] = useState(3);
  const [results, setResults] = useState<Script[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Enter a topic for your scripts.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    setExpandedIndex(null);
    try {
      const raw = await api.post<Record<string, unknown>>('/content/generate', {
        contentType: 'scripts',
        platform,
        topic: topic.trim(),
        tone,
        count,
      });
      const inner = (raw as Record<string, unknown>).data ?? raw;
      const scripts = ((inner as Record<string, unknown>).scripts ?? []) as Script[];
      setResults(scripts);
      if (scripts.length > 0) setExpandedIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed.');
    } finally {
      setLoading(false);
    }
  }, [platform, topic, tone, count]);

  const suggestTopic = useCallback(async () => {
    setSuggesting(true);
    try {
      const raw = await api.post<Record<string, unknown>>('/content/suggest-topic', {
        platform,
        contentType: 'scripts',
      });
      const suggested = (raw as Record<string, unknown>).topic ?? '';
      if (suggested) setTopic(String(suggested));
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [platform]);

  function copyScript(script: Script, index: number) {
    const text = `${script.title ?? ''}\n\nHOOK (first 3 sec):\n${script.hook ?? ''}\n\nBODY:\n${script.body ?? ''}\n\nCTA:\n${script.callToAction ?? ''}\n\nDuration: ${script.duration ?? ''}\nVisual notes: ${script.visualNotes ?? ''}`;
    Clipboard.setStringAsync(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}>
        {/* Title */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text style={{
            color: fg,
            fontSize: isEditorial(t) ? 36 : 34,
            fontFamily: isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
            lineHeight: isEditorial(t) ? 40 : 38,
            letterSpacing: -0.5,
          }}>
            {'Script '}
            <Text style={{ fontFamily: t.fontDisplay, fontWeight: '900', fontStyle: 'normal' }}>Writer</Text>
          </Text>
          {isEditorial(t) && (
            <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: muted, marginTop: 6 }}>
              Studio / Production
            </Text>
          )}
          <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody, marginTop: 8 }}>
            Structured video scripts with hooks, body, CTAs, and timing cues.
          </Text>
        </View>

        {/* Platform pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 20 }}>
            {ALL_PLATFORMS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPlatform(p.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 12,
                  ...(platform === p.id
                    ? isEditorial(t)
                      ? { backgroundColor: t.ink, borderWidth: 1.5, borderColor: t.ink }
                      : isNeumorphic(t)
                      ? { backgroundColor: t.surface, ...t.shadowOutSm.inner }
                      : { backgroundColor: t.violet }
                    : isEditorial(t)
                    ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: t.ink }
                    : isNeumorphic(t)
                    ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
                    : { backgroundColor: 'rgba(255,255,255,0.04)' }),
                }}
              >
                <Text style={{
                  fontSize: 13,
                  fontFamily: t.fontBody,
                  fontWeight: platform === p.id ? '600' : '400',
                  color: platform === p.id ? (isEditorial(t) ? t.bg : '#fff') : muted,
                }}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Input card */}
        <ThemedCard padding={16} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 8 }}>
            Video topic
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. 5 productivity hacks, Day in my life..."
              placeholderTextColor={isGlass(t) ? t.faint : isEditorial(t) ? t.muted : t.faint}
              style={{
                flex: 1,
                fontFamily: t.fontBody,
                fontSize: 14,
                color: fg,
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surface : t.surfaceDarker,
                borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
                borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
                borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 14,
              }}
              onSubmitEditing={handleGenerate}
            />
            <Pressable
              onPress={suggestTopic}
              disabled={suggesting}
              style={{
                width: 44,
                height: 44,
                borderRadius: isEditorial(t) ? 2 : 12,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.ink : t.surface,
                ...(isEditorial(t) ? { borderWidth: 1.5, borderColor: t.ink } : {}),
                ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
              }}
            >
              {suggesting ? <ActivityIndicator size="small" color={accent} /> : <IconStar size={16} color={isEditorial(t) ? t.bg : accent} />}
            </Pressable>
          </View>

          {/* Tone + Count */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Tone</Text>
              <Pressable
                onPress={() => setToneOpen(!toneOpen)}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 14, paddingVertical: 12,
                  backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surface : t.surfaceDarker,
                  borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
                  borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
                  borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 14,
                }}
              >
                <Text style={{ color: fg, fontSize: 14, fontFamily: t.fontBody }}>{tone}</Text>
                <IconChevronDown size={14} color={muted} />
              </Pressable>
              {toneOpen && (
                <View style={{
                  marginTop: 4,
                  borderRadius: isEditorial(t) ? 0 : 12,
                  backgroundColor: isGlass(t) ? t.bgMid : isEditorial(t) ? t.surface : t.surfaceLighter,
                  ...(isEditorial(t) ? { borderWidth: 1.5, borderColor: t.ink } : {}),
                  overflow: 'hidden',
                }}>
                  {TONES.map((tn) => (
                    <Pressable key={tn} onPress={() => { setTone(tn); setToneOpen(false); }} style={{ paddingHorizontal: 14, paddingVertical: 10, backgroundColor: tone === tn ? (isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.lime : t.surfaceDarker) : 'transparent' }}>
                      <Text style={{ color: fg, fontSize: 13, fontFamily: t.fontBody }}>{tn}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
            <View style={{ width: 70 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Scripts</Text>
              <TextInput
                value={String(count)}
                onChangeText={(v) => setCount(Math.max(1, Math.min(5, parseInt(v) || 1)))}
                keyboardType="number-pad"
                style={{
                  textAlign: 'center', fontFamily: t.fontBody, fontSize: 14, color: fg, paddingVertical: 12,
                  backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surface : t.surfaceDarker,
                  borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
                  borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
                  borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 14,
                }}
              />
            </View>
          </View>

          {/* Generate */}
          <Pressable
            onPress={handleGenerate}
            disabled={loading || !topic.trim()}
            style={{
              marginTop: 14, height: 48,
              borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 14,
              justifyContent: 'center', alignItems: 'center',
              opacity: loading || !topic.trim() ? 0.5 : 1,
              ...(isEditorial(t)
                ? { backgroundColor: t.ink, borderWidth: 1.5, borderColor: t.ink }
                : isNeumorphic(t)
                ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
                : { backgroundColor: '#f59e0b' }),
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: t.fontBody, color: isEditorial(t) ? t.bg : isNeumorphic(t) ? t.accent : '#fff' }}>
              {loading ? 'Writing...' : 'Write Scripts'}
            </Text>
          </Pressable>
        </ThemedCard>

        {error && (
          <View style={{ padding: 14, marginBottom: 16, borderRadius: 12, backgroundColor: 'rgba(200,60,60,0.1)' }}>
            <Text style={{ color: isGlass(t) ? t.bad : '#c87878', fontSize: 13, fontFamily: t.fontBody }}>{error}</Text>
          </View>
        )}

        {loading && (
          <ThemedCard padding={20} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="small" color={accent} />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: fg, fontFamily: t.fontBody }}>Writing scripts...</Text>
                <Text style={{ fontSize: 12, color: muted, fontFamily: t.fontBody, marginTop: 2 }}>This may take 15-30 seconds.</Text>
              </View>
            </View>
          </ThemedCard>
        )}

        {/* Results header */}
        {!loading && results.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody }}>
              {results.length} Scripts
            </Text>
            <Pressable onPress={handleGenerate}>
              <Text style={{ fontSize: 12, color: accent, fontFamily: t.fontBody }}>Regenerate</Text>
            </Pressable>
          </View>
        )}

        {/* Results — accordion style */}
        {!loading && results.map((script, i) => {
          const isExpanded = expandedIndex === i;
          return (
            <ThemedCard key={i} padding={16} style={{ marginBottom: 12 }}>
              {/* Header — always visible, tappable */}
              <Pressable onPress={() => setExpandedIndex(isExpanded ? null : i)}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  {/* Number badge */}
                  <View style={{
                    width: 32, height: 32, borderRadius: 10,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: isGlass(t) ? 'rgba(245,158,11,0.15)' : isEditorial(t) ? t.ink : t.surface,
                    ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: isGlass(t) ? '#f59e0b' : isEditorial(t) ? '#fff' : fg, fontFamily: t.fontDisplay }}>{i + 1}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: fg, fontFamily: t.fontDisplay }}>{String(script.title ?? '')}</Text>
                    {!isExpanded && (
                      <Text style={{ fontSize: 12, color: muted, fontFamily: t.fontBody, marginTop: 2 }} numberOfLines={1}>
                        {String(script.hook ?? '').slice(0, 80)}...
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {script.duration && (
                      <View style={{
                        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
                        backgroundColor: isGlass(t) ? 'rgba(245,158,11,0.15)' : isEditorial(t) ? t.ink : t.surface,
                        ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: isGlass(t) ? '#f59e0b' : isEditorial(t) ? '#fff' : fg, fontFamily: t.fontDisplay }}>
                          {String(script.duration)}
                        </Text>
                      </View>
                    )}
                    <Text style={{ fontSize: 16, color: muted, transform: [{ rotate: isExpanded ? '0deg' : '-90deg' }] }}>
                      {'\u25BE'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Expanded content */}
              {isExpanded && (
                <View style={{ marginTop: 16, gap: 14 }}>
                  {/* Hook — highlighted */}
                  <View style={{
                    padding: 14,
                    borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 12,
                    backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surface,
                    borderLeftWidth: 3,
                    borderLeftColor: accent,
                    ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: isGlass(t) ? t.violet : accent, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 4 }}>
                      Hook -- First 3 Seconds
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '500', color: fg, fontFamily: t.fontBody, lineHeight: 22 }}>{String(script.hook ?? '')}</Text>
                  </View>

                  {/* Body */}
                  <View>
                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Body</Text>
                    <Text style={{ fontSize: 14, color: fg, fontFamily: t.fontBody, lineHeight: 22 }}>{String(script.body ?? '')}</Text>
                  </View>

                  {/* CTA */}
                  {script.callToAction && (
                    <View style={{
                      padding: 12,
                      borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 12,
                      backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surface,
                      ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 4 }}>Call to Action</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: accent, fontFamily: t.fontBody }}>{String(script.callToAction)}</Text>
                    </View>
                  )}

                  {/* Visual Notes */}
                  {script.visualNotes && (
                    <View style={{
                      padding: 12,
                      borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 12,
                      borderWidth: 1,
                      borderStyle: 'dashed',
                      borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker,
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 4 }}>Visual Notes</Text>
                      <Text style={{ fontSize: 13, color: muted, fontFamily: t.fontBody, fontStyle: 'italic', lineHeight: 20 }}>{String(script.visualNotes)}</Text>
                    </View>
                  )}

                  {/* Copy button */}
                  <View style={{ alignItems: 'flex-end' }}>
                    <Pressable
                      onPress={() => copyScript(script, i)}
                      style={{
                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
                        borderWidth: 1,
                        borderColor: copiedIndex === i ? '#6aa684' : (isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker),
                        backgroundColor: copiedIndex === i ? 'rgba(34,197,94,0.1)' : 'transparent',
                      }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '500', color: copiedIndex === i ? '#6aa684' : muted, fontFamily: t.fontBody }}>
                        {copiedIndex === i ? 'Copied!' : 'Copy Full Script'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </ThemedCard>
          );
        })}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <ThemedCard padding={40} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody, textAlign: 'center' }}>
              Enter a video topic to generate structured scripts with hooks, body, and CTAs.
            </Text>
          </ThemedCard>
        )}
      </ScrollView>
    </View>
  );
}
