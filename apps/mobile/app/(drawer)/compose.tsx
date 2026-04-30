import { useState, useEffect, useCallback } from 'react';
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
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Button } from '@/components/ui/Button';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { AccountPicker } from '@/components/ui/AccountPicker';
import { useConnectedAccounts } from '@/hooks/useConnectedAccounts';

// ── Types ───────────────────────────────────────────────────────────
interface ConnectedPlatform {
  platform: string;
  username: string;
  follower_count: number;
}

type PlatformKey = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'facebook' | 'twitch';

// ── Platform format mapping ─────────────────────────────────────────
const PLATFORM_FORMATS: Record<string, string[]> = {
  instagram: ['Reel', 'Carousel', 'Story', 'Post'],
  tiktok: ['Video', 'Slideshow'],
  youtube: ['Short', 'Video'],
  linkedin: ['Post'],
  x: ['Post'],
  facebook: ['Post'],
  twitch: ['Post'],
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'IG',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

// ── Score Ring ───────────────────────────────────────────────────────
function ScoreDisplay({ score, tokens: t }: { score: number | null; tokens: ReturnType<typeof useTokens> }) {
  if (score === null) return null;

  const color =
    score >= 75
      ? isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good
      : score >= 50
        ? isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn
        : isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad;

  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak';

  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <View style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 3,
        borderColor: color,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.04)' : isEditorial(t) ? t.surface : t.surface,
        ...(isGlass(t) && Platform.OS === 'ios' ? { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 } : {}),
        ...(isNeumorphic(t) ? neumorphicRaisedStyle(t as NeumorphicTheme, 'sm') : {}),
      }}>
        <Text style={{
          fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayBold : t.fontDisplayBold,
          fontSize: 28,
          color: color,
        }}>
          {score}
        </Text>
      </View>
      <Text style={{
        fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
        fontSize: 10,
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: color,
      }}>
        {label}
      </Text>
    </View>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────
export default function ComposeScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  // ── State ───────────────────────────────────────────────────────
  const [platforms, setPlatforms] = useState<ConnectedPlatform[]>([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(true);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [hook, setHook] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [viralScore, setViralScore] = useState<number | null>(null);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { accounts, loading: accountsLoading } = useConnectedAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // ── Derived values ──────────────────────────────────────────────
  const formats = selectedPlatform ? (PLATFORM_FORMATS[selectedPlatform] ?? ['Post']) : [];
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const mutedColor = t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
  const accentFg = isGlass(t) ? '#fff' : isEditorial(t) ? t.ink : t.fg;

  // ── Fetch platforms ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.get<ConnectedPlatform[]>('/platforms');
        if (!mounted) return;
        setPlatforms(data);
        if (data.length > 0) {
          setSelectedPlatform(data[0].platform);
          const firstFormats = PLATFORM_FORMATS[data[0].platform] ?? ['Post'];
          setSelectedFormat(firstFormats[0]);
        }
      } catch {
        if (mounted) setMessage({ text: 'Failed to load platforms', type: 'error' });
      } finally {
        if (mounted) setLoadingPlatforms(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Reset format when platform changes ──────────────────────────
  const handlePlatformSelect = useCallback((platform: string) => {
    setSelectedPlatform(platform);
    const availableFormats = PLATFORM_FORMATS[platform] ?? ['Post'];
    setSelectedFormat(availableFormats[0]);
    setViralScore(null); // Clear score on platform change
  }, []);

  // ── Score post ──────────────────────────────────────────────────
  const handleScore = useCallback(async () => {
    if (!selectedPlatform || !hook.trim()) return;
    setScoring(true);
    setMessage(null);
    try {
      const result = await api.post<{ score: number }>('/score', {
        platform: selectedPlatform,
        format: selectedFormat.toLowerCase(),
        hook: hook.trim(),
        caption: caption.trim(),
        hashtags: hashtags.trim(),
      });
      setViralScore(result.score ?? (typeof result === 'number' ? result : null));
    } catch {
      setMessage({ text: 'Failed to compute score', type: 'error' });
    } finally {
      setScoring(false);
    }
  }, [selectedPlatform, selectedFormat, hook, caption, hashtags]);

  // ── Save post ───────────────────────────────────────────────────
  const handleSave = useCallback(async (status: 'draft' | 'scheduled') => {
    if (!selectedPlatform || !hook.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post('/posts', {
        platform: selectedPlatform,
        format: selectedFormat.toLowerCase(),
        hook: hook.trim(),
        caption: caption.trim(),
        hashtags: hashtags.trim(),
        status,
        ...(selectedAccountId ? { platformAccountId: selectedAccountId } : {}),
      });
      setMessage({
        text: status === 'draft' ? 'Draft saved!' : 'Post scheduled!',
        type: 'success',
      });
      // Clear form after saving
      setHook('');
      setCaption('');
      setHashtags('');
      setViralScore(null);
    } catch {
      setMessage({ text: `Failed to ${status === 'draft' ? 'save draft' : 'schedule post'}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  }, [selectedPlatform, selectedFormat, hook, caption, hashtags]);

  // ── Theme-aware input styles ────────────────────────────────────
  const inputStyle = (multiline = false) => {
    const base = {
      fontFamily: t.fontBody,
      fontSize: 14,
      color: fg,
      paddingHorizontal: 14,
      paddingVertical: 12,
      ...(multiline ? { minHeight: 100, textAlignVertical: 'top' as const } : {}),
    };

    if (isGlass(t)) {
      return {
        ...base,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: t.line,
        borderRadius: t.radiusMd,
      };
    }

    if (isEditorial(t)) {
      return {
        ...base,
        backgroundColor: t.surface,
        borderWidth: t.border.width,
        borderColor: t.border.color,
        borderRadius: 0,
      };
    }

    // Neumorphic — inset shadow appearance
    return {
      ...base,
      backgroundColor: t.surfaceDarker,
      borderRadius: t.radiusMd,
      borderWidth: 0,
    };
  };

  // ── Pill button styles ──────────────────────────────────────────
  const pillStyle = (selected: boolean) => {
    if (isGlass(t)) {
      return {
        backgroundColor: selected ? t.violet : t.surfaceStronger,
        borderWidth: 1,
        borderColor: selected ? t.violet : t.line,
        borderRadius: t.radiusFull,
        paddingVertical: 8,
        paddingHorizontal: 16,
        ...(selected ? t.shadowPrimary : {}),
      };
    }

    if (isEditorial(t)) {
      return {
        backgroundColor: selected ? t.lime : t.surface,
        borderWidth: t.border.width,
        borderColor: t.border.color,
        borderRadius: 0,
        paddingVertical: 8,
        paddingHorizontal: 16,
        ...(selected ? t.shadowButton : t.shadowCardSmall),
      };
    }

    // Neumorphic
    const nt = t as NeumorphicTheme;
    const neuStyle = Platform.OS === 'ios'
      ? (selected ? nt.shadowOutSm.inner : nt.shadowOutSm.outer)
      : (selected
        ? { borderWidth: 1.5, borderTopColor: 'rgba(167,173,184,0.4)', borderLeftColor: 'rgba(167,173,184,0.4)', borderBottomColor: 'rgba(255,255,255,0.6)', borderRightColor: 'rgba(255,255,255,0.6)' }
        : neumorphicRaisedStyle(nt, 'sm'));
    return {
      backgroundColor: nt.surface,
      borderRadius: nt.radiusFull,
      paddingVertical: 8,
      paddingHorizontal: 16,
      ...neuStyle,
    };
  };

  const pillTextStyle = (selected: boolean) => {
    if (isGlass(t)) {
      return {
        fontFamily: t.fontBodySemibold,
        fontSize: 12,
        color: selected ? '#fff' : t.muted,
        letterSpacing: 0.3,
      };
    }

    if (isEditorial(t)) {
      return {
        fontFamily: t.fontMono,
        fontSize: 10,
        fontWeight: '700' as const,
        color: selected ? t.ink : t.muted,
        textTransform: 'uppercase' as const,
        letterSpacing: 0.8,
      };
    }

    // Neumorphic
    return {
      fontFamily: t.fontBodySemibold,
      fontSize: 12,
      color: selected ? t.accent : t.muted,
      letterSpacing: 0.3,
    };
  };

  // ── Label style ─────────────────────────────────────────────────
  const labelStyle = {
    fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodySemibold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: mutedColor,
    marginBottom: 8,
  };

  // ── Message color ───────────────────────────────────────────────
  const messageColor = (type: 'success' | 'error') => {
    if (type === 'success') return isGlass(t) ? t.good : isEditorial(t) ? t.lime : t.good;
    return isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad;
  };

  // ── Loading state ───────────────────────────────────────────────
  if (loadingPlatforms) {
    const loaderColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isGlass(t) ? 'transparent' : t.bg }}>
        <ActivityIndicator size="large" color={loaderColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: isGlass(t) ? 'transparent' : t.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 40,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page title ──────────────────────────────── */}
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
            {'Viral '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Compose
            </Text>
          </Text>
          <Text
            style={{
              color: isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted,
              fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            Create & score content
          </Text>
        </View>

        {/* ── Toast / message ─────────────────────────── */}
        {message && (
          <View style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            marginBottom: 16,
            borderRadius: isGlass(t) ? t.radiusMd : isEditorial(t) ? 0 : t.radiusMd,
            backgroundColor: isGlass(t)
              ? 'rgba(255,255,255,0.06)'
              : isEditorial(t) ? t.surface : t.surface,
            borderWidth: isEditorial(t) ? t.border.width : isGlass(t) ? 1 : 0,
            borderColor: isEditorial(t) ? t.border.color : isGlass(t) ? t.line : 'transparent',
            ...(isNeumorphic(t) ? neumorphicRaisedStyle(t as NeumorphicTheme, 'sm') : {}),
          }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
              fontSize: 13,
              color: messageColor(message.type),
              textAlign: 'center',
            }}>
              {message.text}
            </Text>
          </View>
        )}

        {/* ── No platforms state ──────────────────────── */}
        {platforms.length === 0 && (
          <ThemedCard padding={24}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              fontSize: 18,
              color: fg,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              No platforms connected
            </Text>
            <Text style={{
              fontFamily: t.fontBody,
              fontSize: 13,
              color: mutedColor,
              textAlign: 'center',
            }}>
              Add a social account in Settings to start composing posts.
            </Text>
          </ThemedCard>
        )}

        {/* Account picker */}
        <AccountPicker
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelect={(accountId, accountPlatform) => {
            setSelectedAccountId(accountId);
            if (accountPlatform) handlePlatformSelect(accountPlatform);
          }}
          loading={accountsLoading}
          label="Posting as"
        />

        {platforms.length > 0 && (
          <>
            {/* ── Platform & format ──────────────────────── */}
            <SectionHeader number="01" title="Platform & format" emphasisWord="format" meta={`${platforms.length} connected`} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 20 }}
              contentContainerStyle={{ gap: 8 }}
            >
              {platforms.map((p) => (
                <Pressable
                  key={p.platform}
                  onPress={() => handlePlatformSelect(p.platform)}
                  style={pillStyle(selectedPlatform === p.platform)}
                >
                  <Text style={pillTextStyle(selectedPlatform === p.platform)}>
                    {PLATFORM_LABELS[p.platform] ?? p.platform}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* ── Format selector ────────────────────────── */}
            {formats.length > 0 && (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 20 }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {formats.map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => {
                        setSelectedFormat(f);
                        setViralScore(null);
                      }}
                      style={pillStyle(selectedFormat === f)}
                    >
                      <Text style={pillTextStyle(selectedFormat === f)}>
                        {f}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {/* ── Content inputs ─────────────────────────── */}
            <SectionHeader number="02" title="Your content" emphasisWord="content" />
            <Text style={labelStyle}>Hook</Text>
            <TextInput
              style={inputStyle()}
              placeholder="Your opening hook..."
              placeholderTextColor={t.faint}
              value={hook}
              onChangeText={setHook}
              returnKeyType="next"
            />

            <View style={{ height: 16 }} />

            {/* ── Caption input ──────────────────────────── */}
            <Text style={labelStyle}>Caption</Text>
            <TextInput
              style={inputStyle(true)}
              placeholder="Write your caption..."
              placeholderTextColor={t.faint}
              value={caption}
              onChangeText={setCaption}
              multiline
              textAlignVertical="top"
            />

            <View style={{ height: 16 }} />

            {/* ── Hashtags input ──────────────────────────── */}
            <Text style={labelStyle}>Hashtags</Text>
            <TextInput
              style={inputStyle()}
              placeholder="#trending #viral #content"
              placeholderTextColor={t.faint}
              value={hashtags}
              onChangeText={setHashtags}
              autoCapitalize="none"
            />

            <View style={{ height: 24 }} />

            <SectionHeader number="03" title="Viral score" emphasisWord="score" meta={viralScore !== null ? String(viralScore) : undefined} />
            {/* ── Viral score section ────────────────────── */}
            <ThemedCard padding={20}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplay : t.fontDisplay,
                    fontSize: 18,
                    color: fg,
                    marginBottom: 4,
                  }}>
                    Viral Score
                  </Text>
                  <Text style={{
                    fontFamily: t.fontBody,
                    fontSize: 12,
                    color: mutedColor,
                  }}>
                    {viralScore !== null
                      ? 'Tap Score to recompute'
                      : 'Analyze your post\'s viral potential'}
                  </Text>
                </View>

                {viralScore !== null && (
                  <ScoreDisplay score={viralScore} tokens={t} />
                )}
              </View>

              <View style={{ marginTop: 16 }}>
                <Button
                  label={scoring ? 'Scoring...' : 'Score'}
                  onPress={handleScore}
                  disabled={scoring || !hook.trim()}
                  size="md"
                />
              </View>
            </ThemedCard>

            <View style={{ height: 24 }} />

            <SectionHeader number="04" title="Save & publish" emphasisWord="publish" />
            {/* ── Action buttons ──────────────────────────── */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={saving ? 'Saving...' : 'Save Draft'}
                  variant="ghost"
                  onPress={() => handleSave('draft')}
                  disabled={saving || !hook.trim()}
                  size="lg"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={saving ? 'Saving...' : 'Schedule'}
                  onPress={() => handleSave('scheduled')}
                  disabled={saving || !hook.trim()}
                  size="lg"
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
