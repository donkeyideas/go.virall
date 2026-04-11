import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
  Pressable, TextInput, Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { getTrendingTopics } from '../../lib/dal';
import { mobileApi } from '../../lib/api';
import { Spacing, FontSize, BorderRadius, neuShadowSm, neuInset } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { trackEvent } from '../../lib/track';

const PLATFORMS = ['instagram', 'tiktok', 'youtube', 'twitter'];

export default function HashtagsScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topics, setTopics] = useState<any[]>([]);

  // Analyzer state
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [niche, setNiche] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Trend scanning
  const [scanning, setScanning] = useState(false);

  useEffect(() => { trackEvent('page_view', 'hashtags'); }, []);

  const loadData = useCallback(async () => {
    const data = await getTrendingTopics();
    setTopics(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleAnalyze = async () => {
    if (!content.trim()) { Alert.alert('Error', 'Enter your post content first'); return; }
    setAnalyzing(true);
    setResult(null);
    const { data, error } = await mobileApi<{ data: any }>('/api/mobile/hashtags', {
      method: 'POST',
      body: { action: 'recommend', content: content.trim(), platform, niche: niche.trim() || 'general' },
    });
    setAnalyzing(false);
    if (error) { Alert.alert('Error', error); return; }
    setResult(data?.data);
  };

  const handleScanTrends = async () => {
    setScanning(true);
    const { data, error } = await mobileApi<{ data: any }>('/api/mobile/hashtags', {
      method: 'POST',
      body: { action: 'scan', platform, niche: niche.trim() || 'general' },
    });
    setScanning(false);
    if (error) { Alert.alert('Error', error); return; }
    await loadData();
  };

  const copyHashtags = async (hashtags: string[]) => {
    const text = hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Hashtags copied to clipboard');
  };

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Hashtag Analyzer */}
      <Card>
        <SectionTitle>Hashtag Analyzer</SectionTitle>
        <TextInput
          placeholder="Paste your post content here..."
          placeholderTextColor={colors.textMuted}
          value={content}
          onChangeText={setContent}
          multiline
          style={[styles.input, styles.inputMulti, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
        />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Platform</Text>
        <View style={styles.platformRow}>
          {PLATFORMS.map(p => (
            <Pressable
              key={p}
              onPress={() => setPlatform(p)}
              style={[styles.chip, { backgroundColor: colors.surface }, neuShadowSm(colors), platform === p && { backgroundColor: colors.primary + '20' }]}
            >
              <Text style={[styles.chipText, { color: platform === p ? colors.primary : colors.text }]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          placeholder="Niche (optional)"
          placeholderTextColor={colors.textMuted}
          value={niche}
          onChangeText={setNiche}
          style={[styles.input, { color: colors.text, backgroundColor: colors.background }, neuInset(colors)]}
        />

        <Pressable
          onPress={handleAnalyze}
          disabled={analyzing}
          style={[styles.analyzeBtn, { backgroundColor: colors.primary, opacity: analyzing ? 0.6 : 1 }]}
        >
          <Text style={styles.analyzeBtnText}>
            {analyzing ? 'Analyzing...' : 'Get Recommendations'}
          </Text>
        </Pressable>
      </Card>

      {/* AI Results */}
      {result && (
        <Card>
          <SectionTitle>Recommended Hashtags</SectionTitle>
          <View style={styles.hashtagGrid}>
            {(result.hashtags ?? []).map((tag: string, i: number) => (
              <View key={i} style={[styles.hashtagChip, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.hashtagText, { color: colors.primary }]}>
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </Text>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => copyHashtags(result.hashtags ?? [])}
            style={[styles.copyBtn, { backgroundColor: colors.surface }, neuShadowSm(colors)]}
          >
            <Text style={[styles.copyBtnText, { color: colors.primary }]}>Copy All</Text>
          </Pressable>

          {result.reasoning && (
            <Text style={[styles.reasoning, { color: colors.textSecondary }]}>{result.reasoning}</Text>
          )}

          {result.predicted_reach_boost != null && (
            <View style={[styles.boostBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={styles.boostText}>+{result.predicted_reach_boost}% predicted reach boost</Text>
            </View>
          )}
        </Card>
      )}

      {/* Trending Topics */}
      <View style={styles.trendHeader}>
        <SectionTitle>Trending Topics</SectionTitle>
        <Pressable
          onPress={handleScanTrends}
          disabled={scanning}
          style={[styles.scanBtn, { backgroundColor: colors.surface, opacity: scanning ? 0.6 : 1 }, neuShadowSm(colors)]}
        >
          <Text style={[styles.scanBtnText, { color: colors.primary }]}>
            {scanning ? 'Scanning...' : 'Scan Trends'}
          </Text>
        </Pressable>
      </View>

      {topics.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          No trending topics cached. Tap "Scan Trends" to discover current trends.
        </Text>
      ) : (
        topics.map((topic: any) => (
          <Card key={topic.id}>
            <View style={styles.topicHeader}>
              <Text style={[styles.topicName, { color: colors.text }]}>{topic.topic}</Text>
              <View style={[styles.scorePill, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.scoreText, { color: colors.primary }]}>{topic.trend_score}</Text>
              </View>
            </View>
            {topic.hashtags?.length > 0 && (
              <Pressable onPress={() => copyHashtags(topic.hashtags)}>
                <View style={styles.topicHashtags}>
                  {topic.hashtags.slice(0, 5).map((h: string, i: number) => (
                    <Text key={i} style={[styles.topicHashtag, { color: colors.textSecondary }]}>
                      {h.startsWith('#') ? h : `#${h}`}
                    </Text>
                  ))}
                </View>
              </Pressable>
            )}
            {topic.ai_analysis && (
              <Text style={[styles.topicAnalysis, { color: colors.textMuted }]} numberOfLines={2}>{topic.ai_analysis}</Text>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  input: { borderRadius: BorderRadius.md, padding: Spacing.md, fontSize: FontSize.md, marginTop: Spacing.sm },
  inputMulti: { minHeight: 80, textAlignVertical: 'top' },
  fieldLabel: { fontSize: FontSize.sm, marginTop: Spacing.md },
  platformRow: { flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  chipText: { fontSize: FontSize.sm, fontWeight: '600' },
  analyzeBtn: { padding: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.md },
  analyzeBtnText: { color: '#FFF', fontWeight: '700', fontSize: FontSize.md },
  hashtagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  hashtagChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  hashtagText: { fontSize: FontSize.sm, fontWeight: '600' },
  copyBtn: { borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', marginTop: Spacing.md },
  copyBtnText: { fontWeight: '700', fontSize: FontSize.sm },
  reasoning: { fontSize: FontSize.sm, marginTop: Spacing.md, lineHeight: 20 },
  boostBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, marginTop: Spacing.sm, alignSelf: 'flex-start' },
  boostText: { color: '#065F46', fontWeight: '700', fontSize: FontSize.sm },
  trendHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanBtn: { borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  scanBtnText: { fontWeight: '700', fontSize: FontSize.sm },
  emptyText: { textAlign: 'center', fontSize: FontSize.md },
  topicHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topicName: { fontSize: FontSize.md, fontWeight: '700', flex: 1 },
  scorePill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  scoreText: { fontSize: FontSize.sm, fontWeight: '700' },
  topicHashtags: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  topicHashtag: { fontSize: FontSize.sm },
  topicAnalysis: { fontSize: FontSize.sm, marginTop: Spacing.xs, lineHeight: 18 },
});
