import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { IconStar, IconChevronDown } from '@/components/icons/Icons';

const TONES = ['Professional', 'Creative', 'Minimalist', 'Authoritative', 'Approachable', 'Humorous'];

const ALL_PLATFORMS = [
  { id: 'instagram', label: 'Instagram', bioLimit: 150 },
  { id: 'tiktok', label: 'TikTok', bioLimit: 80 },
  { id: 'youtube', label: 'YouTube', bioLimit: 1000 },
  { id: 'linkedin', label: 'LinkedIn', bioLimit: 2600 },
  { id: 'x', label: 'X', bioLimit: 160 },
  { id: 'facebook', label: 'Facebook', bioLimit: 101 },
  { id: 'twitch', label: 'Twitch', bioLimit: 300 },
];

type Bio = {
  text?: string;
  style?: string;
  callToAction?: string;
  keywords?: string[];
};

export default function BioScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [platform, setPlatform] = useState('instagram');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Creative');
  const [toneOpen, setToneOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [results, setResults] = useState<Bio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;
  const bioLimit = ALL_PLATFORMS.find((p) => p.id === platform)?.bioLimit ?? 150;

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Describe yourself or your niche.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const raw = await api.post<Record<string, unknown>>('/content/generate', {
        contentType: 'bio',
        platform,
        topic: topic.trim(),
        tone,
        count,
      });
      const inner = (raw as Record<string, unknown>).data ?? raw;
      setResults(((inner as Record<string, unknown>).bios ?? []) as Bio[]);
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
        contentType: 'bio',
      });
      const suggested = (raw as Record<string, unknown>).topic ?? '';
      if (suggested) setTopic(String(suggested));
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [platform]);

  function copyBio(_text: string, index: number) {
    setCopiedIndex(index);
    Alert.alert('Copied', 'Long-press the bio text to select and copy it.');
    setTimeout(() => setCopiedIndex(null), 2000);
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
            {'Bio '}
            <Text style={{ fontFamily: t.fontDisplay, fontWeight: '900', fontStyle: 'normal' }}>Optimizer</Text>
          </Text>
          {isEditorial(t) && (
            <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: muted, marginTop: 6 }}>
              Studio / Branding
            </Text>
          )}
          <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody, marginTop: 8 }}>
            Optimized profile bios with keywords and character limits per platform.
          </Text>
        </View>

        {/* Platform pills with bio limits */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 20 }}>
            {ALL_PLATFORMS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPlatform(p.id)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
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
                <Text style={{
                  fontSize: 10,
                  fontFamily: t.fontDisplay,
                  opacity: 0.6,
                  color: platform === p.id ? (isEditorial(t) ? t.bg : '#fff') : muted,
                }}>{p.bioLimit}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Bio limit indicator */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 12,
          marginBottom: 16,
          borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 0 : 14,
          backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
          ...(isEditorial(t) ? { borderWidth: 1, borderColor: t.border.color } : {}),
          ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
        }}>
          <Text style={{ fontSize: 12, color: muted, fontFamily: t.fontBody }}>
            Bio limit: <Text style={{ color: fg, fontWeight: '700', fontFamily: t.fontDisplay }}>{bioLimit}</Text> characters
          </Text>
          <Text style={{ fontSize: 11, color: muted, fontFamily: t.fontBody }}>
            {bioLimit <= 100 ? 'Ultra-tight' : bioLimit <= 300 ? 'Short' : 'Extended'}
          </Text>
        </View>

        {/* Input card */}
        <ThemedCard padding={16} style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 8 }}>
            Describe yourself / your niche
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Tech reviewer, Fitness coach..."
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

          {/* Style + Variants */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Style</Text>
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
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Variants</Text>
              <TextInput
                value={String(count)}
                onChangeText={(v) => setCount(Math.max(1, Math.min(10, parseInt(v) || 1)))}
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
                : { backgroundColor: '#10b981' }),
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', fontFamily: t.fontBody, color: isEditorial(t) ? t.bg : isNeumorphic(t) ? t.accent : '#fff' }}>
              {loading ? 'Optimizing...' : 'Generate Bios'}
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
                <Text style={{ fontSize: 14, fontWeight: '500', color: fg, fontFamily: t.fontBody }}>Optimizing bios...</Text>
                <Text style={{ fontSize: 12, color: muted, fontFamily: t.fontBody, marginTop: 2 }}>This may take 10-20 seconds.</Text>
              </View>
            </View>
          </ThemedCard>
        )}

        {/* Results header */}
        {!loading && results.length > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody }}>
              {results.length} Bio Variants
            </Text>
            <Pressable onPress={handleGenerate}>
              <Text style={{ fontSize: 12, color: accent, fontFamily: t.fontBody }}>Regenerate</Text>
            </Pressable>
          </View>
        )}

        {/* Results */}
        {!loading && results.map((bio, i) => {
          const text = String(bio.text ?? '');
          const pct = Math.min((text.length / bioLimit) * 100, 100);
          const barColor = pct > 95 ? (isGlass(t) ? t.bad : '#c87878') : pct > 80 ? (isGlass(t) ? '#ffb648' : '#c39560') : (isGlass(t) ? '#8affc1' : '#6aa684');

          return (
            <ThemedCard key={i} padding={16} style={{ marginBottom: 12 }}>
              {/* Style badge + Copy */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{
                  paddingHorizontal: 12, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: isGlass(t) ? 'rgba(16,185,129,0.12)' : isEditorial(t) ? t.ink : t.surface,
                  ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isGlass(t) ? '#10b981' : isEditorial(t) ? '#fff' : fg, fontFamily: t.fontBody }}>
                    {String(bio.style ?? `Variant ${i + 1}`)}
                  </Text>
                </View>
                <Pressable onPress={() => copyBio(text, i)} style={{
                  paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
                  borderWidth: 1, borderColor: copiedIndex === i ? '#6aa684' : (isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker),
                  backgroundColor: copiedIndex === i ? 'rgba(34,197,94,0.1)' : 'transparent',
                }}>
                  <Text style={{ fontSize: 11, color: copiedIndex === i ? '#6aa684' : muted, fontFamily: t.fontBody }}>
                    {copiedIndex === i ? 'Copied!' : 'Copy'}
                  </Text>
                </Pressable>
              </View>

              {/* Bio text */}
              <View style={{
                padding: 14,
                borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 12,
                marginBottom: 10,
                backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surface,
                ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
              }}>
                <Text style={{ fontSize: 15, color: fg, fontFamily: t.fontBody, lineHeight: 22 }} selectable>
                  {text}
                </Text>
              </View>

              {/* CTA */}
              {bio.callToAction && (
                <Text style={{ fontSize: 12, color: accent, fontWeight: '500', fontFamily: t.fontBody, marginBottom: 8 }}>
                  CTA: {String(bio.callToAction)}
                </Text>
              )}

              {/* Keywords */}
              {bio.keywords && bio.keywords.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  {bio.keywords.map((kw, j) => (
                    <View key={j} style={{
                      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                      backgroundColor: isGlass(t) ? 'rgba(16,185,129,0.08)' : isEditorial(t) ? t.surfaceAlt : t.surface,
                      ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
                    }}>
                      <Text style={{ fontSize: 10, fontWeight: '500', color: muted, fontFamily: t.fontBody }}>{String(kw)}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Character count bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : t.surfaceDarker, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${pct}%`, backgroundColor: barColor, borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 11, color: pct > 95 ? barColor : muted, fontFamily: t.fontDisplay, fontWeight: '500' }}>
                  {text.length}/{bioLimit}
                </Text>
              </View>
            </ThemedCard>
          );
        })}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <ThemedCard padding={40} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody, textAlign: 'center' }}>
              Describe yourself or your niche and generate optimized bios for any platform.
            </Text>
          </ThemedCard>
        )}
      </ScrollView>
    </View>
  );
}
