import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { cockpit } from '../../lib/cockpit-theme';
import { mobileApi } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { ScreenHeader } from '../../components/cockpit/ScreenHeader';
import { useToast } from '../../components/cockpit/Toast';
import { useAppModal } from '../../components/cockpit/AppModal';

const ALL_PLATFORMS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  twitter: 'Twitter',
  x: 'X',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

function platformIcon(p: string): keyof typeof Ionicons.glyphMap {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return 'logo-instagram';
  if (k.startsWith('tik')) return 'logo-tiktok';
  if (k.startsWith('you')) return 'logo-youtube';
  if (k.startsWith('twit') || k === 'x') return 'logo-twitter';
  if (k.startsWith('lin')) return 'logo-linkedin';
  if (k.startsWith('fac')) return 'logo-facebook';
  if (k.startsWith('pin')) return 'logo-pinterest';
  return 'sparkles';
}

function platformBg(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return '#ec4899';
  if (k.startsWith('tik')) return '#000000';
  if (k.startsWith('you')) return '#ef4444';
  if (k.startsWith('twit') || k === 'x') return '#1d9bf0';
  if (k.startsWith('lin')) return '#0a66c2';
  if (k.startsWith('fac')) return '#1877f2';
  if (k.startsWith('pin')) return '#e60023';
  return '#64748b';
}

interface Idea {
  type: string;
  title: string;
  body: string;
  cta: string;
  tags: string[];
}

export default function IdeasScreen() {
  const { mode } = useTheme();
  const c = cockpit(mode);
  const { organization } = useAuth();
  const { showToast } = useToast();
  const { showModal } = useAppModal();

  const [profiles, setProfiles] = useState<any[]>([]);
  const [platform, setPlatform] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [saved, setSaved] = useState<Idea[]>([]);
  const [expandedSaved, setExpandedSaved] = useState<number | null>(null);

  // Derive the platform pill list strictly from connected profiles.
  const connectedPlatforms = useMemo(() => {
    const seen = new Set<string>();
    const out: { key: string; label: string }[] = [];
    for (const p of profiles) {
      const key = (p.platform || '').toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ key, label: ALL_PLATFORMS[key] || key.charAt(0).toUpperCase() + key.slice(1) });
    }
    return out;
  }, [profiles]);

  // The active profile used for generation + display
  const activeProfile = useMemo(
    () => profiles.find((p) => (p.platform || '').toLowerCase() === platform) || null,
    [profiles, platform],
  );

  // Only show saved ideas for the currently selected platform.
  // Twitter and X are treated as the same platform.
  const filteredSaved = useMemo(() => {
    if (!platform) return saved;
    const normalize = (p: string) => {
      const k = (p || '').toLowerCase();
      if (k.startsWith('twit') || k === 'x') return 'twitter';
      return k;
    };
    const target = normalize(platform);
    return saved.filter((s) => normalize(s.type) === target);
  }, [saved, platform]);

  // Platform caption character limits (matches server-side PLATFORM_CHAR_LIMITS)
  const platformCharLimit = useMemo(() => {
    const limits: Record<string, number> = {
      twitter: 280,
      x: 280,
      instagram: 2200,
      tiktok: 4000,
      youtube: 5000,
      linkedin: 3000,
      threads: 500,
      pinterest: 500,
      facebook: 63206,
    };
    return limits[platform] ?? null;
  }, [platform]);

  const loadProfiles = useCallback(async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('social_profiles')
      .select('id, platform, handle, display_name')
      .eq('organization_id', organization.id);
    setProfiles(data ?? []);
    // Default the active platform to the first connected profile ONLY if
    // the user hasn't already picked one. Using functional setState so a
    // re-run of loadProfiles doesn't clobber the user's selection.
    if (data && data[0]?.platform) {
      const first = data[0].platform.toLowerCase();
      setPlatform((prev) => prev || first);
    }
  }, [organization?.id]);

  const loadSaved = useCallback(async () => {
    if (!organization?.id) return;
    const { data: profRows } = await supabase
      .from('social_profiles')
      .select('id, platform')
      .eq('organization_id', organization.id);
    const ids = (profRows ?? []).map((p: any) => p.id);
    if (ids.length === 0) return;
    // Map profile id → platform so we can tag each saved idea correctly.
    const platformByProfile: Record<string, string> = {};
    for (const p of profRows ?? []) {
      platformByProfile[p.id] = (p.platform || '').toLowerCase();
    }
    const { data } = await supabase
      .from('social_analyses')
      .select('result, created_at, social_profile_id')
      .in('social_profile_id', ids)
      .eq('analysis_type', 'content_generator')
      .order('created_at', { ascending: false })
      .limit(10);
    const collected: Idea[] = [];
    for (const s of data ?? []) {
      const items =
        s.result?.captions ||
        s.result?.ideas ||
        s.result?.post_ideas ||
        s.result?.hooks ||
        [];
      const rowPlatform =
        (s.result?.platform || platformByProfile[s.social_profile_id] || '')
          .toLowerCase();
      for (const raw of items.slice(0, 2)) {
        const body =
          typeof raw === 'string'
            ? raw
            : raw.text || raw.caption || raw.body || raw.title || raw.hook || raw.idea || '';
        if (body) {
          const firstLine = body.split('\n')[0].slice(0, 70);
          collected.push({
            type: rowPlatform,
            title: typeof raw === 'object' ? raw.title || firstLine : firstLine,
            body,
            cta: typeof raw === 'object' ? raw.callToAction || raw.cta || '' : '',
            tags: typeof raw === 'object' ? raw.hashtags || raw.tags || [] : [],
          });
        }
      }
    }
    setSaved(collected.slice(0, 6));
  }, [organization?.id]);

  useEffect(() => {
    loadProfiles();
    loadSaved();
  }, [loadProfiles, loadSaved]);

  const generate = async () => {
    const profile = activeProfile;
    if (!profile) {
      showModal({
        title: 'No connected profile',
        message:
          'Connect a social profile first to generate AI content ideas.',
        kind: 'warning',
        buttons: [{ label: 'Got it', variant: 'primary' }],
      });
      return;
    }
    setGenerating(true);
    const handleLabel = profile.handle
      ? `@${String(profile.handle).replace(/^@/, '')}`
      : profile.display_name || 'my audience';
    const platformLabel = ALL_PLATFORMS[platform] || platform;
    // Tone varies by platform — LinkedIn wants authority, Twitter wants punchy,
    // TikTok/IG want conversational. Server enforces per-platform char limits.
    const toneByPlatform: Record<string, string> = {
      linkedin: 'Authoritative and insightful',
      twitter: 'Punchy and conversational',
      x: 'Punchy and conversational',
      instagram: 'Engaging and authentic',
      tiktok: 'Hook-driven and casual',
      youtube: 'Curious and informative',
      threads: 'Casual and thoughtful',
      facebook: 'Warm and community-focused',
    };
    const { data, error, planLimitReached } = await mobileApi<any>(
      '/api/mobile/content',
      {
        method: 'POST',
        body: {
          profileId: profile.id,
          contentType: 'captions',
          topic: `Ready-to-post ${platformLabel} post for ${handleLabel}`,
          tone: toneByPlatform[platform] || 'Engaging',
          count: 1,
        },
      },
    );
    setGenerating(false);
    if (planLimitReached) {
      showModal({
        title: 'Plan limit reached',
        message:
          "You've hit your content generation limit for this month. Upgrade to keep generating ideas.",
        kind: 'warning',
        buttons: [{ label: 'OK', variant: 'primary' }],
      });
      return;
    }
    if (error) {
      showModal({
        title: 'Generation failed',
        message: error,
        kind: 'danger',
        buttons: [{ label: 'Close', variant: 'primary' }],
      });
      return;
    }
    const first = (
      data?.data?.captions ||
      data?.data?.ideas ||
      data?.data?.post_ideas ||
      []
    )[0];
    const body =
      typeof first === 'string'
        ? first
        : first?.text || first?.caption || first?.body || first?.title || '';
    setIdea({
      type: `${platformLabel} Post`,
      title: typeof first === 'object' ? first?.title || '' : '',
      body: body || 'Try again — AI returned no content.',
      cta: typeof first === 'object' ? first?.callToAction || first?.cta || '' : '',
      tags: typeof first === 'object' ? first?.hashtags || first?.tags || [] : [],
    });
    loadSaved();
  };

  const copyIdea = async () => {
    if (!idea) return;
    const text = [idea.body, idea.cta, idea.tags.join(' ')]
      .filter(Boolean)
      .join('\n\n');
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard!');
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard!');
  };

  const saveIdea = () => showToast('Idea saved!');

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDeep }}>
      <ScreenHeader title="Quick Ideas" activeKey="ideas" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: c.bgCard, borderColor: c.goldBorder },
          ]}
        >
          <View style={[styles.aiIcon, { backgroundColor: c.goldDim }]}>
            <Ionicons name="sparkles" size={20} color={c.gold} />
          </View>
          <Text style={[styles.cardTitle, { color: c.textPrimary }]}>
            AI Content Generator
          </Text>
          <Text style={[styles.cardDesc, { color: c.textSecondary }]}>
            Instant ideas tailored to your audience and trends.
          </Text>

          {connectedPlatforms.length === 0 ? (
            <View
              style={[
                styles.noPlatformBox,
                { backgroundColor: c.bgElevated, borderColor: c.border },
              ]}
            >
              <Ionicons name="link-outline" size={14} color={c.textMuted} />
              <Text
                style={[styles.noPlatformText, { color: c.textSecondary }]}
                numberOfLines={2}
              >
                Connect a social profile from the Profile tab to start
                generating ideas.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.pills}>
                {connectedPlatforms.map((p) => {
                  const active = platform === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => setPlatform(p.key)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: active ? c.goldDim : c.bgElevated,
                          borderColor: active ? c.gold : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color: active ? c.gold : c.textSecondary,
                            fontWeight: active ? '700' : '500',
                          },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {activeProfile ? (
                <View style={styles.targetRow}>
                  <Ionicons name="person-circle-outline" size={13} color={c.textMuted} />
                  <Text style={[styles.targetText, { color: c.textSecondary }]} numberOfLines={1}>
                    Generating for{' '}
                    <Text style={{ color: c.gold, fontWeight: '700' }}>
                      @{String(activeProfile.handle || activeProfile.display_name || '').replace(/^@/, '') || 'account'}
                    </Text>
                    {platformCharLimit ? ` · ${platformCharLimit} char max` : ''}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          <Pressable
            onPress={generate}
            disabled={generating || connectedPlatforms.length === 0}
            style={[
              styles.generateBtn,
              {
                backgroundColor: c.gold,
                opacity:
                  generating || connectedPlatforms.length === 0 ? 0.55 : 1,
              },
            ]}
          >
            {generating ? (
              <ActivityIndicator size="small" color={c.goldContrast} />
            ) : (
              <Text style={[styles.generateBtnText, { color: c.goldContrast }]}>
                {idea ? 'Generate Another' : 'Generate Idea'}
              </Text>
            )}
          </Pressable>
        </View>

        {idea ? (
          <View
            style={[
              styles.ideaCard,
              { backgroundColor: c.bgCard, borderColor: c.goldBorder },
            ]}
          >
            <View style={styles.ideaHeaderRow}>
              <View style={styles.ideaTypeRow}>
                <View
                  style={[
                    styles.ideaLogoBadge,
                    { backgroundColor: platformBg(platform) },
                  ]}
                >
                  <Ionicons
                    name={platformIcon(platform)}
                    size={12}
                    color="#fff"
                  />
                </View>
                <Text style={[styles.ideaType, { color: c.gold }]}>
                  {idea.type}
                </Text>
              </View>
              {platformCharLimit ? (
                <Text style={[styles.ideaCharCount, { color: c.textMuted }]}>
                  {
                    (idea.body +
                      (idea.cta ? '\n\n' + idea.cta : '') +
                      (idea.tags.length ? '\n' + idea.tags.join(' ') : ''))
                      .length
                  }
                  /{platformCharLimit}
                </Text>
              ) : null}
            </View>
            {idea.title ? (
              <Text style={[styles.ideaTitle, { color: c.textPrimary }]}>
                {idea.title}
              </Text>
            ) : null}
            <View
              style={[
                styles.postBody,
                { backgroundColor: c.bgElevated, borderColor: c.border },
              ]}
            >
              <Text style={[styles.postBodyText, { color: c.textPrimary }]}>
                {idea.body}
              </Text>
              {idea.cta ? (
                <Text style={[styles.postCtaText, { color: c.gold }]}>
                  {idea.cta}
                </Text>
              ) : null}
              {idea.tags.length ? (
                <Text style={[styles.postTagsText, { color: c.teal }]}>
                  {idea.tags.join(' ')}
                </Text>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Pressable
                onPress={copyIdea}
                style={[
                  styles.actionBtn,
                  { backgroundColor: c.bgElevated, borderColor: c.border },
                ]}
              >
                <Ionicons name="copy-outline" size={13} color={c.textSecondary} />
                <Text style={[styles.actionText, { color: c.textSecondary }]}>
                  Copy Post
                </Text>
              </Pressable>
              <Pressable
                onPress={saveIdea}
                style={[styles.actionBtn, { backgroundColor: c.gold }]}
              >
                <Text style={[styles.actionText, { color: c.goldContrast }]}>
                  Save
                </Text>
              </Pressable>
              <Pressable
                onPress={generate}
                style={[
                  styles.actionBtn,
                  { backgroundColor: c.bgElevated, borderColor: c.border },
                ]}
              >
                <Text style={[styles.actionText, { color: c.textSecondary }]}>
                  Another
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {filteredSaved.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
              Saved {ALL_PLATFORMS[platform] || ''} ideas
            </Text>
            <View style={styles.savedList}>
              {filteredSaved.map((s, i) => {
                const expanded = expandedSaved === i;
                const hasPlatform = !!s.type;
                const tagBg = hasPlatform ? platformBg(s.type) : c.gold;
                const icon = platformIcon(s.type);
                return (
                  <Pressable
                    key={i}
                    onPress={() => setExpandedSaved(expanded ? null : i)}
                    style={[
                      styles.savedItem,
                      {
                        backgroundColor: c.bgCard,
                        borderColor: expanded ? c.goldBorder : c.border,
                      },
                    ]}
                  >
                    <View style={styles.savedRow}>
                      <View
                        style={[
                          styles.savedPlatform,
                          { backgroundColor: tagBg },
                        ]}
                      >
                        <Ionicons
                          name={icon}
                          size={14}
                          color={hasPlatform ? '#fff' : c.goldContrast}
                        />
                      </View>
                      <Text
                        style={[styles.savedText, { color: c.textPrimary }]}
                        numberOfLines={expanded ? undefined : 3}
                      >
                        {s.body || s.title}
                      </Text>
                      <Pressable
                        onPress={() =>
                          copyText(
                            [s.body, s.cta, s.tags.join(' ')]
                              .filter(Boolean)
                              .join('\n\n'),
                          )
                        }
                        style={[
                          styles.savedCopy,
                          { backgroundColor: c.bgElevated },
                        ]}
                        hitSlop={6}
                      >
                        <Ionicons
                          name="copy-outline"
                          size={12}
                          color={c.textSecondary}
                        />
                      </Pressable>
                    </View>
                    {expanded ? (
                      <View
                        style={[
                          styles.savedExpandBox,
                          {
                            backgroundColor: c.bgElevated,
                            borderColor: c.border,
                          },
                        ]}
                      >
                        {s.cta ? (
                          <Text
                            style={[styles.postCtaText, { color: c.gold }]}
                          >
                            {s.cta}
                          </Text>
                        ) : null}
                        {s.tags.length ? (
                          <Text
                            style={[styles.postTagsText, { color: c.teal }]}
                          >
                            {s.tags.join(' ')}
                          </Text>
                        ) : null}
                        <View style={styles.savedExpandFooter}>
                          <Ionicons
                            name="chevron-up"
                            size={12}
                            color={c.textMuted}
                          />
                          <Text
                            style={[
                              styles.savedExpandHint,
                              { color: c.textMuted },
                            ]}
                          >
                            Tap to collapse
                          </Text>
                        </View>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 18, gap: 16, paddingBottom: 80 },
  card: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  aiIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardDesc: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
    lineHeight: 17,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 14,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: { fontSize: 11 },
  generateBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  generateBtnText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },
  ideaCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  ideaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ideaTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ideaLogoBadge: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ideaType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ideaCharCount: {
    fontSize: 10,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  ideaTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  postBody: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  postBodyText: { fontSize: 13.5, lineHeight: 20 },
  postCtaText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  postTagsText: { fontSize: 12.5, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  actionText: { fontSize: 11.5, fontWeight: '600' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  savedList: { gap: 8 },
  savedItem: {
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  savedPlatform: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedPlatformText: {
    color: '#fff',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  savedText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  savedCopy: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedExpandBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  savedExpandFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  savedExpandHint: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  noPlatformBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
    marginBottom: 14,
  },
  noPlatformText: { fontSize: 12, flex: 1, lineHeight: 16 },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'center',
    maxWidth: '100%',
  },
  targetText: { fontSize: 11, flexShrink: 1 },
});
