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

function platformTag(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return 'IG';
  if (k.startsWith('tik')) return 'TT';
  if (k.startsWith('you')) return 'YT';
  if (k.startsWith('twit') || k === 'x') return 'X';
  return k.slice(0, 2).toUpperCase();
}

function platformBg(p: string): string {
  const k = p.toLowerCase();
  if (k.startsWith('inst')) return '#ec4899';
  if (k.startsWith('tik')) return '#06b6d4';
  if (k.startsWith('you')) return '#ef4444';
  if (k.startsWith('twit') || k === 'x') return '#1d9bf0';
  return '#64748b';
}

interface Idea {
  type: string;
  title: string;
  desc: string;
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

  const loadProfiles = useCallback(async () => {
    if (!organization?.id) return;
    const { data } = await supabase
      .from('social_profiles')
      .select('id, platform, username')
      .eq('organization_id', organization.id);
    setProfiles(data ?? []);
    // Default the active platform to the first connected profile
    if (data && data[0]?.platform) {
      setPlatform(data[0].platform.toLowerCase());
    }
  }, [organization?.id]);

  const loadSaved = useCallback(async () => {
    if (!organization?.id) return;
    const { data: profIds } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id);
    const ids = (profIds ?? []).map((p: any) => p.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('social_analyses')
      .select('result, created_at')
      .in('social_profile_id', ids)
      .eq('analysis_type', 'content_generator')
      .order('created_at', { ascending: false })
      .limit(10);
    const collected: Idea[] = [];
    for (const s of data ?? []) {
      const items =
        s.result?.ideas ||
        s.result?.post_ideas ||
        s.result?.captions ||
        s.result?.hooks ||
        [];
      for (const raw of items.slice(0, 2)) {
        const text =
          typeof raw === 'string'
            ? raw
            : raw.title || raw.caption || raw.hook || raw.idea || '';
        if (text) {
          collected.push({
            type: s.result?.platform || platform,
            title: text,
            desc: '',
            tags: raw?.tags ?? [],
          });
        }
      }
    }
    setSaved(collected.slice(0, 6));
  }, [organization?.id, platform]);

  useEffect(() => {
    loadProfiles();
    loadSaved();
  }, [loadProfiles, loadSaved]);

  const generate = async () => {
    const profile = profiles.find(
      (p) => p.platform?.toLowerCase() === platform,
    );
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
    const { data, error, planLimitReached } = await mobileApi<any>(
      '/api/mobile/content',
      {
        method: 'POST',
        body: {
          profileId: profile.id,
          contentType: 'post_ideas',
          topic: `${platform} content for ${profile.username}`,
          tone: 'Playful',
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
      data?.data?.ideas ||
      data?.data?.post_ideas ||
      data?.data?.captions ||
      []
    )[0];
    const text =
      typeof first === 'string'
        ? first
        : first?.title || first?.caption || first?.idea || '';
    setIdea({
      type: `${ALL_PLATFORMS[platform] || platform} Post`,
      title: text || 'Try again — AI returned no content.',
      desc: typeof first === 'object' ? first?.desc || first?.description || '' : '',
      tags: typeof first === 'object' ? first?.tags || [] : [],
    });
    loadSaved();
  };

  const copyIdea = async () => {
    if (!idea) return;
    const text = [idea.title, idea.desc, idea.tags.join(' ')]
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
            <Text style={[styles.ideaType, { color: c.gold }]}>{idea.type}</Text>
            <Text style={[styles.ideaTitle, { color: c.textPrimary }]}>
              {idea.title}
            </Text>
            {idea.desc ? (
              <Text style={[styles.ideaDesc, { color: c.textSecondary }]}>
                {idea.desc}
              </Text>
            ) : null}
            {idea.tags.length ? (
              <View style={styles.tagRow}>
                {idea.tags.map((t, i) => (
                  <View
                    key={i}
                    style={[
                      styles.tag,
                      { backgroundColor: c.goldDim, borderColor: c.goldBorder },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: c.gold }]}>{t}</Text>
                  </View>
                ))}
              </View>
            ) : null}
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
                  Copy
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

        {saved.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
              Saved ideas
            </Text>
            <View style={styles.savedList}>
              {saved.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.savedItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <View
                    style={[
                      styles.savedPlatform,
                      { backgroundColor: platformBg(s.type) },
                    ]}
                  >
                    <Text style={styles.savedPlatformText}>
                      {platformTag(s.type)}
                    </Text>
                  </View>
                  <Text
                    style={[styles.savedText, { color: c.textPrimary }]}
                    numberOfLines={2}
                  >
                    {s.title}
                  </Text>
                  <Pressable
                    onPress={() => copyText(s.title)}
                    style={[styles.savedCopy, { backgroundColor: c.bgElevated }]}
                    hitSlop={6}
                  >
                    <Ionicons name="copy-outline" size={12} color={c.textSecondary} />
                  </Pressable>
                </View>
              ))}
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
    gap: 8,
  },
  ideaType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  ideaTitle: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  ideaDesc: { fontSize: 12.5, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: { fontSize: 10, fontWeight: '600' },
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
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
});
