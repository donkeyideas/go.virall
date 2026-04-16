import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { cockpit } from '../../lib/cockpit-theme';
import { SmoRing } from '../../components/cockpit/SmoRing';
import { ProfileDropdown } from '../../components/cockpit/ProfileDropdown';
import { FloatingMenu } from '../../components/cockpit/FloatingMenu';
import { formatNumber } from '../../lib/format';
import { supabase } from '../../lib/supabase';

function parseResult(result: any): any {
  if (!result) return null;
  if (typeof result === 'string') {
    try {
      return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch {
      return null;
    }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try {
      return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim());
    } catch {
      return null;
    }
  }
  return result;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

function firstName(full?: string | null): string {
  if (!full) return 'Creator';
  return full.trim().split(/\s+/)[0] ?? 'Creator';
}

function platformBadgeBg(p?: string): { bg: string; icon: keyof typeof Ionicons.glyphMap } {
  const key = (p || '').toLowerCase();
  if (key === 'instagram') return { bg: '#ec4899', icon: 'logo-instagram' };
  if (key === 'tiktok') return { bg: '#111111', icon: 'logo-tiktok' };
  if (key === 'youtube') return { bg: '#ef4444', icon: 'logo-youtube' };
  if (key === 'twitter' || key === 'x') return { bg: '#1d9bf0', icon: 'logo-twitter' };
  return { bg: '#64748b', icon: 'globe-outline' };
}

export default function OverviewScreen() {
  const { mode, toggleTheme } = useTheme();
  const c = cockpit(mode);
  const { profile, organization, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<string, any>>({});

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: true });

    const profileList = profs ?? [];
    setProfiles(profileList);

    if (profileList.length === 0) return;

    const targetId = selectedProfileId ?? profileList[0].id;
    const { data: analyses } = await supabase
      .from('social_analyses')
      .select('*')
      .in(
        'social_profile_id',
        profileList.map((p: any) => p.id),
      )
      .order('created_at', { ascending: false });

    const aMap: Record<string, any> = {};
    for (const row of analyses ?? []) {
      if (row.social_profile_id === targetId && !aMap[row.analysis_type]) {
        aMap[row.analysis_type] = parseResult(row.result);
      }
    }
    if (!selectedProfileId) {
      for (const row of analyses ?? []) {
        if (!aMap[row.analysis_type]) {
          aMap[row.analysis_type] = parseResult(row.result);
        }
      }
    }
    setAnalysisMap(aMap);
  }, [organization?.id, selectedProfileId]);

  useEffect(() => {
    if (authLoading) return;
    if (organization?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadData, organization?.id, authLoading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const activeProfiles = selectedProfileId
    ? profiles.filter((p) => p.id === selectedProfileId)
    : profiles;
  const totalFollowers = activeProfiles.reduce(
    (s, p) => s + (p.followers_count || 0),
    0,
  );

  const smo = analysisMap.smo_score?.smo || analysisMap.smo_score;
  const smoScore = Math.round(smo?.overallScore ?? smo?.overall_score ?? 0);
  const smoTrend =
    smo?.trend ?? smo?.delta ?? smo?.change ?? null;

  const audience = analysisMap.audience?.audience || analysisMap.audience;
  const rawQuality = audience?.qualityScore ?? audience?.quality_score;
  const qualityScore = Math.round(
    typeof rawQuality === 'object' && rawQuality !== null
      ? rawQuality.overall ?? rawQuality.score ?? 0
      : rawQuality ?? 0,
  );
  const healthTrend = audience?.trend ?? audience?.delta ?? null;

  // Quick stats — derived
  const engagement = (() => {
    const eng = analysisMap.engagement?.engagement || analysisMap.engagement;
    const rate =
      eng?.engagementRate ??
      eng?.engagement_rate ??
      eng?.rate ??
      null;
    if (rate == null) return null;
    return typeof rate === 'number' ? rate : parseFloat(String(rate));
  })();
  const reach = (() => {
    const eng = analysisMap.engagement?.engagement || analysisMap.engagement;
    return eng?.reach ?? eng?.estimatedReach ?? null;
  })();

  const recommendations = analysisMap.content_strategy?.recommendations || [];
  const nextMove = Array.isArray(recommendations) ? recommendations[0] : null;
  const nextMoveText =
    typeof nextMove === 'string'
      ? nextMove
      : nextMove?.action || nextMove?.title || nextMove?.text || null;

  const topPost = (() => {
    let best: any = null;
    let bestProfile: any = null;
    for (const p of activeProfiles) {
      const posts: any[] = p.recent_posts || [];
      for (const post of posts) {
        if (!best || (post.likesCount || 0) > (best.likesCount || 0)) {
          best = post;
          bestProfile = p;
        }
      }
    }
    return best ? { post: best, profile: bestProfile } : null;
  })();

  const avgLikes = (() => {
    if (!topPost) return 0;
    const posts: any[] = topPost.profile?.recent_posts || [];
    if (!posts.length) return 0;
    const total = posts.reduce((s, p) => s + (p.likesCount || 0), 0);
    return total / posts.length;
  })();
  const topPostMultiplier =
    avgLikes > 0 && topPost
      ? (topPost.post.likesCount || 0) / avgLikes
      : 0;
  const isFire = topPostMultiplier >= 2;

  // Smart alert — show when top post is outperforming OR SMO dropped
  const smartAlert =
    isFire && topPost
      ? {
          title: 'Your post is taking off!',
          body: `"${(topPost.post.caption || topPost.post.text || 'Recent post').slice(
            0,
            60,
          )}" is outperforming your average by ${topPostMultiplier.toFixed(1)}x. Engage with comments now.`,
        }
      : null;

  if (loading || authLoading) {
    return (
      <View style={[styles.loader, { backgroundColor: c.bgDeep }]}>
        <ActivityIndicator size="large" color={c.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bgDeep }}>
      {/* Floating hamburger (top-left) */}
      <FloatingMenu activeKey="overview" />

      {/* Theme toggle (top-right) */}
      <Pressable
        onPress={toggleTheme}
        style={[
          styles.themeBtn,
          {
            backgroundColor: c.bgCard,
            borderColor: c.border,
            shadowColor: c.shadow,
          },
        ]}
      >
        <Ionicons
          name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
          size={18}
          color={c.textSecondary}
        />
      </Pressable>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.gold}
          />
        }
      >
        {/* Greeting */}
        <Text style={[styles.greeting, { color: c.textSecondary }]}>
          {getGreeting()}
        </Text>

        {/* Name + Profile dropdown */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: c.textPrimary }]} numberOfLines={1}>
            {firstName(profile?.full_name)}
          </Text>
          {profiles.length > 0 && (
            <ProfileDropdown
              profiles={profiles}
              selectedId={selectedProfileId}
              onSelect={setSelectedProfileId}
            />
          )}
        </View>

        {/* SMO Score ring */}
        <View style={styles.scoreSection}>
          <SmoRing
            score={smoScore}
            trend={typeof smoTrend === 'number' ? Math.round(smoTrend) : undefined}
          />
        </View>

        {/* Followers */}
        {totalFollowers > 0 && (
          <Text style={[styles.followers, { color: c.textPrimary }]}>
            {formatNumber(totalFollowers)}
            <Text style={[styles.followersLabel, { color: c.textSecondary }]}>
              {'  '}followers
            </Text>
          </Text>
        )}

        {/* Social Health Bar */}
        <View
          style={[
            styles.healthCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View style={styles.healthHeader}>
            <Text style={[styles.healthTitle, { color: c.textPrimary }]}>
              Social Health Score
            </Text>
            <View style={styles.healthRight}>
              <Text style={[styles.healthScore, { color: c.teal }]}>
                {qualityScore}
              </Text>
              {typeof healthTrend === 'number' && healthTrend !== 0 && (
                <View style={[styles.healthTrend, { backgroundColor: c.greenDim }]}>
                  <Ionicons
                    name={healthTrend >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={8}
                    color={healthTrend >= 0 ? c.green : c.red}
                  />
                  <Text
                    style={[
                      styles.healthTrendText,
                      { color: healthTrend >= 0 ? c.green : c.red },
                    ]}
                  >
                    {healthTrend >= 0 ? '+' : ''}
                    {Math.round(healthTrend)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.healthTrack, { backgroundColor: c.bgElevated }]}>
            <View
              style={[
                styles.healthFill,
                {
                  width: `${Math.max(0, Math.min(100, qualityScore))}%`,
                  backgroundColor: c.teal,
                },
              ]}
            />
          </View>
          <View style={styles.healthLabels}>
            <Text style={[styles.healthLabelText, { color: c.textMuted }]}>0</Text>
            <Text style={[styles.healthLabelText, { color: c.textMuted }]}>50</Text>
            <Text style={[styles.healthLabelText, { color: c.textMuted }]}>100</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>
              {formatNumber(totalFollowers)}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Followers</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>
              {engagement != null ? `${engagement.toFixed(1)}%` : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Eng. Rate</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.bgCard, borderColor: c.border }]}>
            <Text style={[styles.statValue, { color: c.textPrimary }]}>
              {reach ? formatNumber(reach) : '—'}
            </Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Reach</Text>
          </View>
        </View>

        {/* Smart Alert */}
        {smartAlert && (
          <View
            style={[
              styles.alertCard,
              { backgroundColor: c.goldDim, borderColor: c.goldBorder },
            ]}
          >
            <View style={[styles.alertIcon, { backgroundColor: c.goldDim }]}>
              <Ionicons name="flash" size={16} color={c.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: c.gold }]}>
                {smartAlert.title}
              </Text>
              <Text style={[styles.alertText, { color: c.textSecondary }]}>
                {smartAlert.body}
              </Text>
            </View>
          </View>
        )}

        {/* Top Post */}
        {topPost && (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
              Top performing · 24h
            </Text>
            <View style={[styles.topPost, { backgroundColor: c.bgCard, borderColor: c.border }]}>
              <View style={styles.topPostHeader}>
                <View
                  style={[
                    styles.platformBadge,
                    { backgroundColor: platformBadgeBg(topPost.profile?.platform).bg },
                  ]}
                >
                  <Ionicons
                    name={platformBadgeBg(topPost.profile?.platform).icon}
                    size={14}
                    color="#fff"
                  />
                </View>
                <Text
                  style={[styles.topPostTitle, { color: c.textPrimary }]}
                  numberOfLines={2}
                >
                  {topPost.post.caption || topPost.post.text || 'Recent post'}
                </Text>
              </View>
              <View style={styles.topPostStats}>
                <View style={styles.topPostStat}>
                  <Ionicons name="heart" size={13} color={c.red} />
                  <Text style={[styles.topPostStatValue, { color: c.textPrimary }]}>
                    {formatNumber(topPost.post.likesCount || 0)}
                  </Text>
                </View>
                <View style={styles.topPostStat}>
                  <Ionicons name="chatbubble-outline" size={13} color={c.textMuted} />
                  <Text style={[styles.topPostStatValue, { color: c.textPrimary }]}>
                    {formatNumber(topPost.post.commentsCount || 0)}
                  </Text>
                </View>
                {topPost.post.viewsCount ? (
                  <View style={styles.topPostStat}>
                    <Ionicons name="eye-outline" size={13} color={c.textMuted} />
                    <Text style={[styles.topPostStatValue, { color: c.textPrimary }]}>
                      {formatNumber(topPost.post.viewsCount)}
                    </Text>
                  </View>
                ) : null}
              </View>
              {isFire && (
                <View style={[styles.fireBadge, { backgroundColor: c.goldDim }]}>
                  <Text style={[styles.fireBadgeText, { color: c.gold }]}>
                    🔥 {topPostMultiplier.toFixed(1)}x your avg
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* Next Move */}
        {nextMoveText && (
          <View
            style={[
              styles.nextMove,
              { backgroundColor: c.tealDim, borderColor: c.tealBorder },
            ]}
          >
            <View style={[styles.nextMoveIcon, { backgroundColor: c.tealDim }]}>
              <Ionicons name="arrow-forward" size={18} color={c.teal} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextMoveLabel, { color: c.teal }]}>
                YOUR NEXT MOVE
              </Text>
              <Text
                style={[styles.nextMoveTitle, { color: c.textPrimary }]}
                numberOfLines={3}
              >
                {nextMoveText}
              </Text>
            </View>
          </View>
        )}

        {profiles.length === 0 && (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>
              Connect your first platform
            </Text>
            <Text style={[styles.emptyBody, { color: c.textSecondary }]}>
              Head to Profile → Connected Accounts to connect Instagram, TikTok, YouTube, and more.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 40,
  },
  themeBtn: {
    position: 'absolute',
    top: 58,
    right: 16,
    zIndex: 80,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },

  greeting: {
    fontSize: 14,
    paddingLeft: 48,
    marginBottom: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 48,
    paddingRight: 50,
    marginBottom: 18,
  },
  name: { fontSize: 24, fontWeight: '800', flexShrink: 1 },

  scoreSection: {
    alignItems: 'center',
    marginBottom: 8,
  },
  followers: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  followersLabel: { fontSize: 13, fontWeight: '500' },

  healthCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  healthTitle: { fontSize: 12, fontWeight: '700' },
  healthRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  healthScore: { fontSize: 18, fontWeight: '900' },
  healthTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  healthTrendText: { fontSize: 10, fontWeight: '600' },
  healthTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthFill: { height: '100%', borderRadius: 4 },
  healthLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  healthLabelText: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },

  alertCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  alertText: { fontSize: 11, lineHeight: 16 },

  sectionLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 8,
  },
  topPost: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  topPostHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  platformBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topPostTitle: { fontSize: 13, fontWeight: '600', lineHeight: 17, flex: 1 },
  topPostStats: { flexDirection: 'row', gap: 14 },
  topPostStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  topPostStatValue: { fontSize: 11, fontWeight: '700' },
  fireBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 8,
  },
  fireBadgeText: { fontSize: 10, fontWeight: '700' },

  nextMove: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextMoveIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextMoveLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: 1,
  },
  nextMoveTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },

  emptyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginTop: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyBody: { fontSize: 13, lineHeight: 20 },
});
