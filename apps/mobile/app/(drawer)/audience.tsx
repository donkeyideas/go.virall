import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import {
  IconInstagram,
  IconTikTok,
  IconYouTube,
  IconLinkedIn,
  IconTwitter,
  IconFacebook,
  IconTwitch,
  IconGlobe,
} from '@/components/icons/Icons';
import type { ComponentType } from 'react';

// ── Types ──────────────────────────────────────────────────────────────

interface PlatformAccount {
  id: string;
  platform: string;
  username: string;
  follower_count: number | null;
  following_count: number | null;
  post_count: number | null;
  sync_status: string;
  connected_at: string;
}

interface Competitor {
  id: string;
  platform: string;
  username: string;
  follower_count: number | null;
  engagement_rate: number | null;
}

// ── Platform display helpers ──────────────────────────────────────────

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
  twitch: 'Twitch',
};

const PLATFORM_ICONS: Record<string, ComponentType<{ size?: number; color?: string }>> = {
  instagram: IconInstagram,
  tiktok: IconTikTok,
  youtube: IconYouTube,
  linkedin: IconLinkedIn,
  x: IconTwitter,
  facebook: IconFacebook,
  twitch: IconTwitch,
};

function formatCount(n: number | null | undefined): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function syncColor(status: string): string {
  if (status === 'healthy' || status === 'connected' || status === 'synced') return '#4ade80';
  if (status === 'syncing' || status === 'pending') return '#facc15';
  return '#f87171';
}

// ── Main Screen ───────────────────────────────────────────────────────

export default function AudienceScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [platforms, setPlatforms] = useState<PlatformAccount[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [platformsData, competitorsData] = await Promise.all([
        api.get<PlatformAccount[]>('/platforms'),
        api.get<Competitor[]>('/audience/competitors').catch(() => [] as Competitor[]),
      ]);
      setPlatforms(platformsData ?? []);
      setCompetitors(competitorsData ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load audience data';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────────

  const totalFollowers = platforms.reduce((sum, p) => sum + (p.follower_count ?? 0), 0);
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const muted = t.muted;

  // ── Loading state ───────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: 20,
          paddingTop: insets.top + 10,
          paddingBottom: 40,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* ── Page title ──────────────────────────────────── */}
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
            {'Audience '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Intel
            </Text>
          </Text>
          <Text
            style={{
              color: muted,
              fontSize: isGlass(t) ? 10 : isEditorial(t) ? 10 : 11,
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              marginTop: 8,
            }}
          >
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} connected
          </Text>
        </View>

        {isEditorial(t) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 56 }}>
            <View style={{ backgroundColor: t.ink, paddingVertical: 1, paddingHorizontal: 6 }}>
              <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, color: t.bg }}>
                {platforms.length} CONNECTED
              </Text>
            </View>
            <View style={{ flex: 1, height: 1.5, backgroundColor: t.ink, marginLeft: 10 }} />
          </View>
        )}

        {isNeumorphic(t) && (
          <Text style={{
            fontFamily: t.fontBodyBold,
            fontSize: 11,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: t.faint,
            marginBottom: 20,
            paddingLeft: 56,
          }}>
            {platforms.length} platform{platforms.length !== 1 ? 's' : ''} connected
          </Text>
        )}

        {/* ── Error state ─────────────────────────────────── */}
        {error && (
          <View style={{ paddingHorizontal: 4, paddingVertical: 12 }}>
            <Text style={{
              fontFamily: t.fontMono,
              fontSize: 11,
              color: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
              textAlign: 'center',
            }}>
              {error}
            </Text>
          </View>
        )}

        {/* ── Empty state ─────────────────────────────────── */}
        {platforms.length === 0 && !error && (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              fontSize: 20,
              color: fg,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              No platforms connected
            </Text>
            <Text style={{
              fontFamily: t.fontBody,
              fontSize: 13,
              color: t.muted,
              textAlign: 'center',
              maxWidth: 260,
            }}>
              Connect a platform in Settings to see your audience breakdown here.
            </Text>
          </View>
        )}

        {/* ── Total Followers KPI ─────────────────────────── */}
        {platforms.length > 0 && (
          <ThemedCard padding={20} elevation="md">
            <Kicker color={accentColor}>Total Followers</Kicker>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayBold : t.fontDisplayBold,
              fontSize: 42,
              color: fg,
              marginTop: 6,
              letterSpacing: -1,
            }}>
              {formatCount(totalFollowers)}
            </Text>
            <Text style={{
              fontFamily: t.fontBody,
              fontSize: 12,
              color: t.muted,
              marginTop: 4,
            }}>
              Across {platforms.length} platform{platforms.length !== 1 ? 's' : ''}
            </Text>
          </ThemedCard>
        )}

        {/* ── Platform Breakdown ──────────────────────────── */}
        {platforms.length > 0 && (
          <View style={{ marginTop: 24 }}>
            {isGlass(t) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, letterSpacing: -0.3 }}>
                  {'Platform '}
                  <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>breakdown</Text>
                </Text>
              </View>
            )}

            {isEditorial(t) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <View style={{ backgroundColor: t.ink, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1, color: t.bg }}>01</Text>
                </View>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, letterSpacing: -0.3, color: t.ink }}>
                  {'Platform '}
                  <Text style={{ fontStyle: 'italic' }}>breakdown</Text>
                </Text>
              </View>
            )}

            {isNeumorphic(t) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.ink, letterSpacing: -0.4 }}>
                  {'Platform '}
                  <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>breakdown</Text>
                </Text>
              </View>
            )}

            <View style={{ gap: 10 }}>
              {platforms.map((p) => (
                <PlatformRow key={p.id} platform={p} />
              ))}
            </View>
          </View>
        )}

        {/* ── Competitors Section ─────────────────────────── */}
        {competitors.length > 0 && (
          <View style={{ marginTop: 28 }}>
            {isGlass(t) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, letterSpacing: -0.3 }}>
                  {'Tracked '}
                  <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>competitors</Text>
                </Text>
                <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>
                  {competitors.length} tracked
                </Text>
              </View>
            )}

            {isEditorial(t) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                <View style={{ backgroundColor: t.ink, paddingVertical: 2, paddingHorizontal: 6 }}>
                  <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1, color: t.bg }}>02</Text>
                </View>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, letterSpacing: -0.3, color: t.ink }}>
                  {'Tracked '}
                  <Text style={{ fontStyle: 'italic' }}>competitors</Text>
                </Text>
                <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted, marginLeft: 'auto' }}>
                  {competitors.length} tracked
                </Text>
              </View>
            )}

            {isNeumorphic(t) && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.ink, letterSpacing: -0.4 }}>
                  {'Tracked '}
                  <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>competitors</Text>
                </Text>
                <Text style={{ fontFamily: t.fontBodyBold, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>
                  {competitors.length} tracked
                </Text>
              </View>
            )}

            <View style={{ gap: 10 }}>
              {competitors.map((c) => (
                <CompetitorRow key={c.id} competitor={c} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Platform Row Component ────────────────────────────────────────────

function PlatformRow({ platform }: { platform: PlatformAccount }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;
  const statusColor = syncColor(platform.sync_status);

  return (
    <ThemedCard padding={16} elevation="sm">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Platform icon circle */}
        <View style={{
          width: 40,
          height: 40,
          borderRadius: isEditorial(t) ? 0 : 20,
          backgroundColor: isGlass(t) ? t.surfaceStronger : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 14,
          borderWidth: isEditorial(t) ? t.border.width : 0,
          borderColor: isEditorial(t) ? t.border.color : 'transparent',
        }}>
          {(() => {
            const PIcon = PLATFORM_ICONS[platform.platform] ?? IconGlobe;
            return <PIcon size={20} color={fg} />;
          })()}
        </View>

        {/* Platform info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontBodySemibold : isEditorial(t) ? t.fontBodyBold : t.fontBodySemibold,
              fontSize: 15,
              color: fg,
            }}>
              {PLATFORM_LABELS[platform.platform] ?? platform.platform}
            </Text>
            {/* Sync status dot */}
            <View style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: statusColor,
            }} />
          </View>
          <Text style={{
            fontFamily: t.fontBody,
            fontSize: 12,
            color: t.muted,
            marginTop: 2,
          }}>
            @{platform.username}
          </Text>
        </View>

        {/* Follower count */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{
            fontFamily: isGlass(t) ? t.fontBodyBold : isEditorial(t) ? t.fontDisplayBold : t.fontBodyBold,
            fontSize: 18,
            color: fg,
            letterSpacing: -0.5,
          }}>
            {formatCount(platform.follower_count)}
          </Text>
          <Text style={{
            fontFamily: t.fontMono,
            fontSize: 9,
            letterSpacing: 1,
            textTransform: 'uppercase',
            color: t.faint,
          }}>
            followers
          </Text>
        </View>
      </View>

      {/* Bottom row: following / posts / status label */}
      <View style={{
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: isEditorial(t) ? t.border.width : 1,
        borderTopColor: isGlass(t) ? t.line : isEditorial(t) ? t.border.color : 'rgba(0,0,0,0.06)',
        gap: 16,
      }}>
        <View>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint }}>
            Following
          </Text>
          <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 13, color: fg, marginTop: 2 }}>
            {formatCount(platform.following_count)}
          </Text>
        </View>
        <View>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint }}>
            Posts
          </Text>
          <Text style={{ fontFamily: t.fontBodySemibold, fontSize: 13, color: fg, marginTop: 2 }}>
            {formatCount(platform.post_count)}
          </Text>
        </View>
        <View style={{ marginLeft: 'auto', alignItems: 'flex-end' }}>
          <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint }}>
            Status
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
            <Text style={{
              fontFamily: t.fontBodyMedium,
              fontSize: 12,
              color: statusColor,
              textTransform: 'capitalize',
            }}>
              {platform.sync_status}
            </Text>
          </View>
        </View>
      </View>
    </ThemedCard>
  );
}

// ── Competitor Row Component ──────────────────────────────────────────

function CompetitorRow({ competitor }: { competitor: Competitor }) {
  const t = useTokens();
  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.fg;

  const engagePct = competitor.engagement_rate != null
    ? `${(competitor.engagement_rate * 100).toFixed(1)}%`
    : '--';

  return (
    <ThemedCard padding={16} elevation="sm">
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* Platform icon */}
        <View style={{
          width: 36,
          height: 36,
          borderRadius: isEditorial(t) ? 0 : 18,
          backgroundColor: isGlass(t) ? t.surfaceStronger : isEditorial(t) ? t.surfaceAlt : t.surfaceLighter,
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
          borderWidth: isEditorial(t) ? t.border.width : 0,
          borderColor: isEditorial(t) ? t.border.color : 'transparent',
        }}>
          {(() => {
            const PIcon = PLATFORM_ICONS[competitor.platform] ?? IconGlobe;
            return <PIcon size={18} color={fg} />;
          })()}
        </View>

        {/* Competitor info */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontFamily: isGlass(t) ? t.fontBodySemibold : isEditorial(t) ? t.fontBodyBold : t.fontBodySemibold,
            fontSize: 14,
            color: fg,
          }}>
            @{competitor.username}
          </Text>
          <Text style={{
            fontFamily: t.fontBody,
            fontSize: 11,
            color: t.muted,
            marginTop: 1,
          }}>
            {PLATFORM_LABELS[competitor.platform] ?? competitor.platform}
          </Text>
        </View>

        {/* Metrics */}
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-end' }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint }}>
              Followers
            </Text>
            <Text style={{
              fontFamily: t.fontBodyBold,
              fontSize: 15,
              color: fg,
              marginTop: 2,
              letterSpacing: -0.3,
            }}>
              {formatCount(competitor.follower_count)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: t.faint }}>
              Engage
            </Text>
            <Text style={{
              fontFamily: t.fontBodyBold,
              fontSize: 15,
              color: isGlass(t) ? t.mint : isEditorial(t) ? t.lime : t.good,
              marginTop: 2,
            }}>
              {engagePct}
            </Text>
          </View>
        </View>
      </View>
    </ThemedCard>
  );
}
