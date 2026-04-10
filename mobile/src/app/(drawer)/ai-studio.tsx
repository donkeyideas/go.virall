import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  TextInput as RNTextInput, Modal, Alert, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { ProfileSelector } from '../../components/ui/ProfileSelector';
import { TabPills } from '../../components/ui/TabPills';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { AnalysisModal } from '../../components/ui/AnalysisModal';
import { FontSize, Spacing, BorderRadius, neuShadow, neuShadowSm, neuInset } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import { mobileApi } from '../../lib/api';
import { trackEvent } from '../../lib/track';
import { getLatestAnalysis } from '../../lib/dal';

// Module-level cache to persist results across navigation
let cachedResult: { data: any; contentType: string } | null = null;

const CONTENT_TYPES = [
  { key: 'post_ideas', label: 'Post Ideas' },
  { key: 'captions', label: 'Captions' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'carousels', label: 'Carousels' },
  { key: 'bio', label: 'Bio' },
] as const;

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Educational', 'Storytelling'];
const TOP_TABS = ['Content Generator', 'Strategic Analysis'];

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try { return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try { return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  return result;
}

export default function AiStudioScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [topTab, setTopTab] = useState(0);

  useEffect(() => { trackEvent('page_view', 'ai-studio'); }, []);

  useEffect(() => {
    if (!organization?.id) return;
    supabase
      .from('social_profiles')
      .select('id, platform, handle, display_name')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProfiles(data ?? []);
        if (data && data.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data[0].id);
        }
      });
  }, [organization?.id]);

  const profileItems = profiles.map((p) => ({ id: p.id, platform: p.platform, username: p.handle || p.display_name || p.platform }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.topTabRow}>
          <TabPills tabs={TOP_TABS} activeIndex={topTab} onSelect={setTopTab} />
        </View>
        {topTab === 0 ? (
          <ContentGeneratorTab
            profiles={profileItems}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
          />
        ) : (
          <StrategicAnalysisTab
            profiles={profileItems}
            selectedProfileId={selectedProfileId}
            onSelectProfile={setSelectedProfileId}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

// ================================================================
// STRATEGIC ANALYSIS TAB
// ================================================================
function StrategicAnalysisTab({
  profiles,
  selectedProfileId,
  onSelectProfile,
}: {
  profiles: { id: string; platform: string; username: string }[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
}) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [profileLabel, setProfileLabel] = useState('');

  const loadData = useCallback(async () => {
    if (!selectedProfileId) return;
    const prof = profiles.find(p => p.id === selectedProfileId);
    if (prof) {
      setProfileLabel(`@${prof.username} (${prof.platform.charAt(0).toUpperCase() + prof.platform.slice(1)})`);
    }
    const analysis = await getLatestAnalysis(selectedProfileId, 'insights');
    const parsed = parseResult(analysis?.result);
    const items = parsed?.insights || parsed?.recommendations || parsed?.strategicInsights || [];
    setInsights(Array.isArray(items) ? items : []);
  }, [selectedProfileId, profiles]);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const priorityColors: Record<string, { bg: string; text: string }> = {
    critical: { bg: colors.error + '20', text: colors.error },
    important: { bg: colors.primary + '20', text: colors.primary },
    'nice-to-have': { bg: colors.success + '20', text: colors.success },
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.strategicContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {profiles.length > 0 && (
        <ProfileSelector
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={(id) => onSelectProfile(id || profiles[0]?.id)}
        />
      )}

      {insights.length === 0 ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No strategic insights yet. Generate insights to get personalized recommendations.
          </Text>
          <Pressable
            onPress={() => {
              if (!selectedProfileId) {
                Alert.alert('No Profile', 'Connect a social profile first.');
                return;
              }
              setShowModal(true);
            }}
            style={[styles.generateBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.generateText}>GENERATE INSIGHTS</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          <SectionTitle>Strategic Insights</SectionTitle>
          {insights.map((insight: any, i: number) => {
            const pKey = (insight.priority || 'important').toLowerCase();
            const pc = priorityColors[pKey] || priorityColors.important;
            return (
              <Card key={i} style={styles.insightCard}>
                <View style={styles.insightHeader}>
                  <Text style={[styles.insightTitle, { color: colors.text }]} numberOfLines={2}>
                    {insight.title || `Insight ${i + 1}`}
                  </Text>
                  <View style={[styles.priorityBadge, { backgroundColor: pc.bg }]}>
                    <Text style={[styles.priorityText, { color: pc.text }]}>
                      {(insight.priority || 'important').toUpperCase()}
                    </Text>
                  </View>
                </View>
                {insight.insight && (
                  <Text style={[styles.insightBody, { color: colors.textSecondary }]}>
                    {insight.insight}
                  </Text>
                )}
                {insight.actionItem && (
                  <View style={[styles.actionBox, { backgroundColor: colors.surfaceLight }]}>
                    <Text style={[styles.actionLabel, { color: colors.textMuted }]}>ACTION ITEM</Text>
                    <Text style={[styles.actionText, { color: colors.text }]}>{insight.actionItem}</Text>
                  </View>
                )}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
    {selectedProfileId && (
      <AnalysisModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onComplete={loadData}
        profileId={selectedProfileId}
        profileLabel={profileLabel}
        analysisType="insights"
      />
    )}
    </>
  );
}

// ================================================================
// CONTENT GENERATOR TAB
// ================================================================
function ContentGeneratorTab({
  profiles,
  selectedProfileId,
  onSelectProfile,
}: {
  profiles: { id: string; platform: string; username: string }[];
  selectedProfileId: string | null;
  onSelectProfile: (id: string | null) => void;
}) {
  const { colors } = useTheme();
  const [contentType, setContentType] = useState(cachedResult?.contentType || 'post_ideas');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('Professional');
  const [count, setCount] = useState('5');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(cachedResult?.data || null);
  const [error, setError] = useState('');
  const [showTonePicker, setShowTonePicker] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim() || !selectedProfileId) return;
    trackEvent('content_generated', 'ai-studio', { type: contentType });
    setGenerating(true);
    setError('');
    setResult(null);

    try {
      const { data, error: err } = await mobileApi('/api/mobile/content', {
        method: 'POST',
        body: {
          profileId: selectedProfileId,
          contentType,
          topic: topic.trim(),
          tone,
          count: parseInt(count) || 5,
        },
        timeoutMs: 120000,
      });

      if (err) {
        setError(err);
      } else if (data?.data) {
        setResult(data.data);
        cachedResult = { data: data.data, contentType };
      } else {
        setError('No content returned. Please try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Generation failed.');
    }
    setGenerating(false);
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.generatorContent}>
      {/* Profile Selector */}
      {profiles.length > 0 && (
        <ProfileSelector
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={(id) => onSelectProfile(id || profiles[0]?.id)}
        />
      )}

      {/* Content Type Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
        {CONTENT_TYPES.map((ct) => (
          <Pressable
            key={ct.key}
            onPress={() => setContentType(ct.key)}
            style={[
              styles.typePill,
              { borderBottomWidth: contentType === ct.key ? 2 : 0, borderBottomColor: colors.primary },
            ]}
          >
            <Text style={[styles.typeLabel, { color: contentType === ct.key ? colors.primary : colors.textSecondary }]}>
              {ct.label.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Input Form */}
      <View style={[styles.formCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <Text style={[styles.formLabel, { color: colors.textMuted }]}>TOPIC / THEME</Text>
        <RNTextInput
          style={[styles.topicInput, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
          placeholder="e.g. Summer fashion trends, Productivity hacks..."
          placeholderTextColor={colors.textMuted}
          value={topic}
          onChangeText={setTopic}
          multiline
        />

        <View style={styles.formRow}>
          <View style={styles.formHalf}>
            <Text style={[styles.formLabel, { color: colors.textMuted }]}>TONE</Text>
            <Pressable
              onPress={() => setShowTonePicker(true)}
              style={[styles.pickerBtn, { backgroundColor: colors.inputBg }, neuInset(colors)]}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>{tone}</Text>
              <Text style={[styles.pickerArrow, { color: colors.textMuted }]}>▼</Text>
            </Pressable>
          </View>
          <View style={styles.formHalf}>
            <Text style={[styles.formLabel, { color: colors.textMuted }]}>COUNT</Text>
            <RNTextInput
              style={[styles.countInput, { backgroundColor: colors.inputBg, color: colors.text }, neuInset(colors)]}
              value={count}
              onChangeText={setCount}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={generating || !topic.trim() || !selectedProfileId}
          style={({ pressed }) => [
            styles.generateBtn,
            { backgroundColor: colors.primary, opacity: (generating || !topic.trim()) ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          {generating ? (
            <View style={styles.generatingRow}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.generateText}>GENERATING...</Text>
            </View>
          ) : (
            <Text style={styles.generateText}>GENERATE</Text>
          )}
        </Pressable>
      </View>

      {generating && (
        <Text style={[styles.generatingHint, { color: colors.textMuted }]}>
          Go Virall is creating your content. This may take up to 30 seconds.
        </Text>
      )}

      {/* Error */}
      {error ? (
        <View style={[styles.errorCard, { backgroundColor: colors.error + '10' }, neuShadow(colors)]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}

      {/* Results */}
      {result && <ContentResults data={result} contentType={contentType} />}

      {!result && !generating && !error && (
        <View style={[styles.emptyState, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Enter a topic and click Generate to create {CONTENT_TYPES.find((t) => t.key === contentType)?.label.toLowerCase() || 'content'}.
          </Text>
        </View>
      )}

      {/* Tone Picker Modal */}
      <Modal visible={showTonePicker} transparent animationType="fade" onRequestClose={() => setShowTonePicker(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowTonePicker(false)}>
          <View style={[styles.toneModal, { backgroundColor: colors.surface }, neuShadow(colors)]}>
            <Text style={[styles.toneModalTitle, { color: colors.text }]}>Select Tone</Text>
            {TONES.map((t) => (
              <Pressable
                key={t}
                onPress={() => { setTone(t); setShowTonePicker(false); }}
                style={[styles.toneOption, tone === t && { backgroundColor: colors.primary + '20' }]}
              >
                <Text style={[styles.toneOptionText, { color: tone === t ? colors.primary : colors.text }]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ================================================================
// COPY BUTTON
// ================================================================
function CopyButton({ text }: { text: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}>
      <Text style={[styles.copyBtnText, { color: copied ? colors.success : colors.textSecondary }]}>
        {copied ? 'COPIED' : 'COPY'}
      </Text>
    </Pressable>
  );
}

function extractText(item: any): string {
  const parts: string[] = [];
  if (item.title) parts.push(item.title);
  if (item.hook) parts.push(`Hook: ${item.hook}`);
  if (item.angle) parts.push(`Angle: ${item.angle}`);
  if (item.text) parts.push(item.text);
  if (item.body) parts.push(item.body);
  if (item.caption) parts.push(item.caption);
  if (item.callToAction) parts.push(`CTA: ${item.callToAction}`);
  if (item.cta) parts.push(`CTA: ${item.cta}`);
  if (item.description) parts.push(item.description);
  if (item.topic) parts.push(item.topic);
  if (item.headline) parts.push(item.headline);
  if (item.hashtags?.length) parts.push(item.hashtags.join(' '));
  if (item.style) parts.push(item.style);
  if (item.keywords?.length) parts.push(item.keywords.join(', '));
  if (typeof item === 'string') parts.push(item);
  return parts.join('\n');
}

// ================================================================
// CONTENT RESULTS
// ================================================================
function ContentResults({ data, contentType }: { data: any; contentType: string }) {
  const { colors } = useTheme();

  const renderPostIdeas = () => {
    const ideas = data.ideas || [];
    return ideas.map((idea: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: colors.text, flex: 1 }]}>{idea.title}</Text>
          <CopyButton text={extractText(idea)} />
        </View>
        {idea.hook && <Text style={[styles.resultHook, { color: colors.primary }]}>Hook: {idea.hook}</Text>}
        {idea.angle && <Text style={[styles.resultBody, { color: colors.textSecondary }]}>Angle: {idea.angle}</Text>}
        {idea.format && <Text style={[styles.resultBadge, { color: colors.accent }]}>{idea.format.toUpperCase()}</Text>}
        {idea.hashtags?.length > 0 && (
          <Text style={[styles.resultHashtags, { color: colors.textMuted }]}>{idea.hashtags.join(' ')}</Text>
        )}
      </View>
    ));
  };

  const renderCaptions = () => {
    const captions = data.captions || [];
    return captions.map((cap: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          <View style={{ flex: 1 }} />
          <CopyButton text={extractText(cap)} />
        </View>
        <Text style={[styles.resultBody, { color: colors.text }]}>{cap.text || cap}</Text>
        {cap.callToAction && <Text style={[styles.resultCta, { color: colors.primary }]}>CTA: {cap.callToAction}</Text>}
        {cap.hashtags && <Text style={[styles.resultHashtags, { color: colors.textMuted }]}>{cap.hashtags.join(' ')}</Text>}
      </View>
    ));
  };

  const renderCalendar = () => {
    const days = data.calendar || [];
    return days.map((day: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          <View style={styles.calRow}>
            <Text style={[styles.calDay, { color: colors.primary }]}>{day.day}</Text>
            <Text style={[styles.calTime, { color: colors.textSecondary }]}>  {day.time}</Text>
          </View>
          <CopyButton text={extractText(day)} />
        </View>
        <Text style={[styles.resultBody, { color: colors.text }]}>{day.topic}</Text>
        {day.contentType && <Text style={[styles.resultBadge, { color: colors.accent }]}>{day.contentType}</Text>}
        {day.caption && <Text style={[styles.resultCaption, { color: colors.textSecondary }]}>{day.caption}</Text>}
      </View>
    ));
  };

  const renderScripts = () => {
    const scripts = data.scripts || [];
    return scripts.map((script: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: colors.text, flex: 1 }]}>{script.title}</Text>
          <CopyButton text={extractText(script)} />
        </View>
        {script.duration && <Text style={[styles.resultBadge, { color: colors.accent }]}>{script.duration}</Text>}
        {script.hook && (
          <View style={styles.scriptSection}>
            <Text style={[styles.scriptLabel, { color: colors.textMuted }]}>HOOK</Text>
            <Text style={[styles.resultBody, { color: colors.primary }]}>{script.hook}</Text>
          </View>
        )}
        {script.body && (
          <View style={styles.scriptSection}>
            <Text style={[styles.scriptLabel, { color: colors.textMuted }]}>BODY</Text>
            <Text style={[styles.resultBody, { color: colors.text }]}>{script.body}</Text>
          </View>
        )}
        {script.cta && (
          <View style={styles.scriptSection}>
            <Text style={[styles.scriptLabel, { color: colors.textMuted }]}>CTA</Text>
            <Text style={[styles.resultCta, { color: colors.success }]}>{script.cta}</Text>
          </View>
        )}
      </View>
    ));
  };

  const renderCarousels = () => {
    const carousels = data.carousels || [];
    return carousels.map((c: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: colors.text, flex: 1 }]}>{c.title}</Text>
          <CopyButton text={extractText(c)} />
        </View>
        {c.slides?.map((slide: any, j: number) => (
          <View key={j} style={[styles.slideCard, { backgroundColor: colors.surfaceLight }]}>
            <Text style={[styles.slideNum, { color: colors.primary }]}>Slide {j + 1}</Text>
            {slide.headline && <Text style={[styles.slideHeadline, { color: colors.text }]}>{slide.headline}</Text>}
            {slide.body && <Text style={[styles.resultBody, { color: colors.textSecondary }]}>{slide.body}</Text>}
          </View>
        ))}
        {c.caption && <Text style={[styles.resultCaption, { color: colors.textSecondary }]}>{c.caption}</Text>}
      </View>
    ));
  };

  const renderBios = () => {
    const bios = data.bios || [];
    return bios.map((bio: any, i: number) => (
      <View key={i} style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <View style={styles.resultHeader}>
          {bio.style ? <Text style={[styles.resultBadge, { color: colors.accent }]}>{bio.style}</Text> : <View />}
          <CopyButton text={extractText(bio)} />
        </View>
        <Text style={[styles.resultBody, { color: colors.text }]}>{bio.text || bio}</Text>
        {bio.keywords?.length > 0 && (
          <View style={styles.keywordRow}>
            {bio.keywords.map((k: string, j: number) => (
              <Text key={j} style={[styles.keyword, { color: colors.textMuted }]}>{k}</Text>
            ))}
          </View>
        )}
      </View>
    ));
  };

  let content;
  switch (contentType) {
    case 'post_ideas': content = renderPostIdeas(); break;
    case 'captions': content = renderCaptions(); break;
    case 'calendar': content = renderCalendar(); break;
    case 'scripts': content = renderScripts(); break;
    case 'carousels': content = renderCarousels(); break;
    case 'bio': content = renderBios(); break;
    default: content = (
      <View style={[styles.resultCard, { backgroundColor: colors.cardBg }, neuShadow(colors)]}>
        <Text style={[styles.resultBody, { color: colors.text }]}>{JSON.stringify(data, null, 2)}</Text>
      </View>
    );
  }

  return <View style={styles.resultsContainer}>{content}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topTabRow: { paddingTop: Spacing.md },

  // Content Generator
  generatorContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  typeRow: { gap: Spacing.md, paddingVertical: Spacing.xs },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  typeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  formCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.md },
  formLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  topicInput: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, minHeight: 44 },
  formRow: { flexDirection: 'row', gap: Spacing.md },
  formHalf: { flex: 1 },
  pickerBtn: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  pickerText: { fontSize: FontSize.md },
  pickerArrow: { fontSize: 10 },
  countInput: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md, minHeight: 44 },
  generateBtn: { borderRadius: BorderRadius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  generateText: { fontSize: FontSize.sm, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1.5 },

  errorCard: { borderRadius: BorderRadius.md, padding: Spacing.md },
  errorText: { fontSize: FontSize.sm },

  emptyState: { borderRadius: BorderRadius.lg, padding: Spacing.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },

  resultsContainer: { gap: Spacing.md },
  resultCard: { borderRadius: BorderRadius.lg, padding: Spacing.lg, gap: Spacing.sm },
  resultTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  resultHook: { fontSize: FontSize.sm, fontWeight: '600', fontStyle: 'italic' },
  resultBody: { fontSize: FontSize.sm, lineHeight: 20 },
  resultBadge: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  resultHashtags: { fontSize: FontSize.xs, lineHeight: 18 },
  resultCta: { fontSize: FontSize.sm, fontWeight: '600' },
  resultCaption: { fontSize: FontSize.sm, fontStyle: 'italic', lineHeight: 20, marginTop: Spacing.xs },

  calRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calDay: { fontSize: FontSize.md, fontWeight: '700' },
  calTime: { fontSize: FontSize.sm },

  scriptSection: { gap: 2, marginTop: Spacing.xs },
  scriptLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  slideCard: { borderRadius: BorderRadius.md, padding: Spacing.md, gap: 4, marginTop: Spacing.xs },
  slideNum: { fontSize: 10, fontWeight: '700' },
  slideHeadline: { fontSize: FontSize.md, fontWeight: '600' },

  keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  keyword: { fontSize: FontSize.xs },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xxl },
  toneModal: { width: '100%', maxWidth: 300, borderRadius: BorderRadius.lg, padding: Spacing.md },
  toneModalTitle: { fontSize: FontSize.lg, fontWeight: '700', marginBottom: Spacing.md, textAlign: 'center' },
  toneOption: { paddingVertical: Spacing.md, paddingHorizontal: Spacing.md, borderRadius: BorderRadius.md },
  toneOptionText: { fontSize: FontSize.md, fontWeight: '500' },

  generatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  generatingHint: { fontSize: FontSize.xs, textAlign: 'center' },

  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copyBtn: { borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  copyBtnText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // Strategic Analysis
  strategicContent: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  insightCard: { gap: Spacing.sm },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.sm },
  insightTitle: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  priorityBadge: { borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  priorityText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  insightBody: { fontSize: FontSize.sm, lineHeight: 20 },
  actionBox: { borderRadius: BorderRadius.md, padding: Spacing.md, gap: Spacing.xs },
  actionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  actionText: { fontSize: FontSize.sm, lineHeight: 20 },
});
