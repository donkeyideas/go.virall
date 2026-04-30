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
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccountPicker } from '@/components/ui/AccountPicker';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Storytelling'];

const ALL_PLATFORMS = [
  { id: 'general', label: 'General' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'x', label: 'X' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitch', label: 'Twitch' },
];

const CONTENT_FORMATS: Record<string, string[]> = {
  instagram: ['Reels', 'Carousels', 'Stories', 'Single Posts', 'Live'],
  tiktok: ['Short-form Video', 'Long-form (60s-3min)', 'Duets', 'Photo Carousels'],
  youtube: ['Shorts', 'Long-form Video', 'Live', 'Community Posts'],
  linkedin: ['Text Post', 'Article', 'Carousel (PDF)', 'Video', 'Newsletter'],
  x: ['Tweet', 'Thread', 'Video', 'Poll'],
  facebook: ['Reel', 'Story', 'Post', 'Live', 'Group Post'],
  twitch: ['Stream Title', 'Panel Description', 'Chat Command', 'Clip Title'],
};

type Idea = {
  title?: string;
  hook?: string;
  angle?: string;
  format?: string;
  estimatedEngagement?: string;
  hashtags?: string[];
};

export default function IdeasScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [platform, setPlatform] = useState('general');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Casual');
  const [toneOpen, setToneOpen] = useState(false);
  const [count, setCount] = useState(8);
  const [results, setResults] = useState<Idea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const { accounts, loading: accountsLoading } = useConnectedAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;
  const accent = isGlass(t) ? t.violet : isEditorial(t) ? t.ink : t.accent;
  const formats = CONTENT_FORMATS[platform] ?? [];

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Enter a topic to brainstorm.'); return; }
    setError(null);
    setLoading(true);
    setResults([]);
    try {
      const raw = await api.post<Record<string, unknown>>('/content/generate', {
        contentType: 'post_ideas',
        platform: platform === 'general' ? 'instagram' : platform,
        topic: topic.trim(),
        tone,
        count,
        ...(selectedAccountId ? { platformAccountId: selectedAccountId } : {}),
      });
      const inner = (raw as Record<string, unknown>).data ?? raw;
      setResults(((inner as Record<string, unknown>).ideas ?? []) as Idea[]);
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
        platform: platform === 'general' ? 'instagram' : platform,
        contentType: 'ideas',
      });
      const suggested = (raw as Record<string, unknown>).topic ?? '';
      if (suggested) setTopic(String(suggested));
    } catch { /* ignore */ }
    setSuggesting(false);
  }, [platform]);

  function copyIdea(idea: Idea, index: number) {
    const text = `${idea.title}\n\nHook: ${idea.hook}\nAngle: ${idea.angle}\nFormat: ${idea.format ?? ''}\n\n${(idea.hashtags ?? []).join(' ')}`;
    Clipboard.setStringAsync(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  }

  const engagementColor = (level: string) => {
    if (level === 'high') return isGlass(t) ? '#8affc1' : isEditorial(t) ? t.lime : '#6aa684';
    if (level === 'medium') return isGlass(t) ? '#ffb648' : isEditorial(t) ? '#e8b92b' : '#c39560';
    return muted;
  };

  return (
    <View style={{ flex: 1, backgroundColor: isGlass(t) ? 'transparent' : t.bg }}>
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
            {'Post '}
            <Text style={{ fontFamily: t.fontDisplay, fontWeight: '900', fontStyle: 'normal' }}>Ideas</Text>
          </Text>
          {isEditorial(t) && (
            <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: muted, marginTop: 6 }}>
              Studio / Brainstorm
            </Text>
          )}
          <Text style={{ color: muted, fontSize: 13, fontFamily: t.fontBody, marginTop: 8 }}>
            Rapid-fire brainstorm — hooks, angles, and formats to fill your pipeline.
          </Text>
        </View>

        {/* Account picker */}
        <AccountPicker
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={(accountId, accountPlatform) => {
            setSelectedAccountId(accountId);
            if (accountPlatform) setPlatform(accountPlatform);
          }}
          loading={accountsLoading}
          label="Generating for"
        />

        {/* Platform pills */}
        <SectionHeader number="01" title="Target platform" emphasisWord="platform" />
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
                  color: platform === p.id
                    ? (isEditorial(t) ? t.bg : '#fff')
                    : muted,
                }}>{p.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Content formats strip */}
        {formats.length > 0 && platform !== 'general' && (
          <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginBottom: 16,
            padding: 12,
            borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 0 : 14,
            backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
            ...(isEditorial(t) ? { borderWidth: 1, borderColor: t.border.color } : {}),
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: muted, fontFamily: t.fontBody, marginRight: 4 }}>Best formats:</Text>
            {formats.map((f) => (
              <View key={f} style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.1)' : isEditorial(t) ? t.surfaceAlt : t.surface,
                ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
              }}>
                <Text style={{ fontSize: 11, color: isGlass(t) ? t.violet : fg, fontFamily: t.fontBody }}>{f}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Input card */}
        <SectionHeader number="02" title="Brainstorm" emphasisWord="Brainstorm" />
        <ThemedCard padding={16} style={{ marginBottom: 16 }}>
          {/* Topic input */}
          <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 8 }}>
            What do you want to post about?
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput
              value={topic}
              onChangeText={setTopic}
              placeholder="e.g. Morning routines, AI tools, Travel hacks..."
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
              {suggesting ? (
                <ActivityIndicator size="small" color={accent} />
              ) : (
                <IconStar size={16} color={isEditorial(t) ? t.bg : accent} />
              )}
            </Pressable>
          </View>

          {/* Tone + Count row */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Tone</Text>
              <Pressable
                onPress={() => setToneOpen(!toneOpen)}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 14,
                  paddingVertical: 12,
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
                  ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
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
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 6 }}>Count</Text>
              <TextInput
                value={String(count)}
                onChangeText={(v) => setCount(Math.max(1, Math.min(10, parseInt(v) || 1)))}
                keyboardType="number-pad"
                style={{
                  textAlign: 'center',
                  fontFamily: t.fontBody,
                  fontSize: 14,
                  color: fg,
                  paddingVertical: 12,
                  backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surface : t.surfaceDarker,
                  borderWidth: isEditorial(t) ? 1.5 : isGlass(t) ? 1 : 0,
                  borderColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'transparent',
                  borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 14,
                }}
              />
            </View>
          </View>

          {/* Generate button */}
          <Pressable
            onPress={handleGenerate}
            disabled={loading || !topic.trim()}
            style={{
              marginTop: 14,
              height: 48,
              borderRadius: isNeumorphic(t) ? 16 : isEditorial(t) ? 2 : 14,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: loading || !topic.trim() ? 0.5 : 1,
              ...(isEditorial(t)
                ? { backgroundColor: t.ink, borderWidth: 1.5, borderColor: t.ink }
                : isNeumorphic(t)
                ? { backgroundColor: t.surface, ...t.shadowOutSm.outer }
                : { backgroundColor: t.violet }),
            }}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              fontFamily: t.fontBody,
              color: isEditorial(t) ? t.bg : isNeumorphic(t) ? t.accent : '#fff',
            }}>
              {loading ? 'Brainstorming...' : 'Brainstorm'}
            </Text>
          </Pressable>
        </ThemedCard>

        {/* Error */}
        {error && (
          <View style={{ padding: 14, marginBottom: 16, borderRadius: 12, backgroundColor: isGlass(t) ? 'rgba(255,113,168,0.1)' : 'rgba(200,60,60,0.1)' }}>
            <Text style={{ color: isGlass(t) ? t.bad : '#c87878', fontSize: 13, fontFamily: t.fontBody }}>{error}</Text>
          </View>
        )}

        {/* Loading */}
        {loading && (
          <ThemedCard padding={20} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="small" color={accent} />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: fg, fontFamily: t.fontBody }}>Brainstorming ideas...</Text>
                <Text style={{ fontSize: 12, color: muted, fontFamily: t.fontBody, marginTop: 2 }}>This may take 10-30 seconds.</Text>
              </View>
            </View>
          </ThemedCard>
        )}

        {/* Results header */}
        {!loading && results.length > 0 && (
          <>
            <SectionHeader number="03" title="Results" emphasisWord="Results" meta={`${results.length} ideas`} />
            <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
              <Pressable onPress={handleGenerate}>
                <Text style={{ fontSize: 12, color: accent, fontFamily: t.fontBody }}>Regenerate</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* Results */}
        {!loading && results.map((idea, i) => (
          <ThemedCard key={i} padding={16} style={{ marginBottom: 12 }}>
            {/* Title + Copy */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: fg, fontFamily: t.fontDisplay, lineHeight: 20 }}>
                {idea.title ?? ''}
              </Text>
              <Pressable onPress={() => copyIdea(idea, i)} style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                borderWidth: 1, borderColor: copiedIndex === i ? (isGlass(t) ? '#8affc1' : '#6aa684') : (isGlass(t) ? t.line : isEditorial(t) ? t.border.color : t.surfaceDarker),
                backgroundColor: copiedIndex === i ? 'rgba(34,197,94,0.1)' : 'transparent',
              }}>
                <Text style={{ fontSize: 11, color: copiedIndex === i ? (isGlass(t) ? '#8affc1' : '#6aa684') : muted, fontFamily: t.fontBody }}>
                  {copiedIndex === i ? 'Copied!' : 'Copy'}
                </Text>
              </Pressable>
            </View>

            {/* Hook */}
            <View style={{
              padding: 12,
              borderRadius: isNeumorphic(t) ? 14 : isEditorial(t) ? 0 : 12,
              marginBottom: 10,
              backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surfaceAlt : t.surface,
              ...(isEditorial(t) ? { borderLeftWidth: 3, borderLeftColor: t.ink } : {}),
              ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', color: muted, fontFamily: isEditorial(t) ? t.fontMono : t.fontBody, marginBottom: 4 }}>Hook</Text>
              <Text style={{ fontSize: 14, color: fg, fontFamily: t.fontBody, lineHeight: 20 }}>{idea.hook ?? ''}</Text>
            </View>

            {/* Angle */}
            <Text style={{ fontSize: 13, color: muted, fontFamily: t.fontBody, lineHeight: 18, marginBottom: 10 }}>
              <Text style={{ fontWeight: '600' }}>Angle: </Text>{idea.angle ?? ''}
            </Text>

            {/* Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {idea.format && (
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: isGlass(t) ? 'rgba(139,92,246,0.15)' : isEditorial(t) ? t.ink : t.surface,
                  ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: isGlass(t) ? t.violet : isEditorial(t) ? '#fff' : fg, fontFamily: t.fontBody }}>{idea.format}</Text>
                </View>
              )}
              {idea.estimatedEngagement && (
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
                  backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : t.surface,
                  ...(isNeumorphic(t) ? t.shadowOutSm.outer : {}),
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: engagementColor(idea.estimatedEngagement), fontFamily: t.fontBody }}>{idea.estimatedEngagement} engagement</Text>
                </View>
              )}
            </View>

            {/* Hashtags */}
            {idea.hashtags && idea.hashtags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {idea.hashtags.map((tag, j) => (
                  <Text key={j} style={{ fontSize: 11, color: accent, fontFamily: t.fontBody, opacity: 0.8 }}>{tag}</Text>
                ))}
              </View>
            )}
          </ThemedCard>
        ))}

        {/* Empty state */}
        {!loading && results.length === 0 && !error && (
          <ThemedCard padding={40} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: muted, fontFamily: t.fontBody, textAlign: 'center' }}>
              Enter a topic and hit Brainstorm to generate content ideas.
            </Text>
          </ThemedCard>
        )}
      </ScrollView>
    </View>
  );
}
