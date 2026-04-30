import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import type { TopPost, ScheduledPost } from '@/hooks/useTodayData';

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00F2EA',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  x: '#1DA1F2',
  facebook: '#1877F2',
  twitch: '#9146FF',
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

interface Props {
  topPosts: TopPost[];
  scheduledPosts: ScheduledPost[];
}

export function ContentCard({ topPosts, scheduledPosts }: Props) {
  const t = useTokens();

  const fg = isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.ink;
  const muted = t.muted;
  const fontBody = t.fontBody;
  const fontBold = t.fontBodySemibold ?? (t as any).fontBodyBold ?? fontBody;
  const isEmpty = scheduledPosts.length === 0 && topPosts.length === 0;

  const rowBg = isGlass(t) ? 'rgba(255,255,255,0.03)' : isEditorial(t) ? 'rgba(0,0,0,0.03)' : (t as any).surfaceLighter;

  const badgeBg = isGlass(t) ? 'rgba(139,92,246,0.25)' : isEditorial(t) ? (t as any).ink : (t as any).accent;
  const badgeFg = isGlass(t) ? t.fg : isEditorial(t) ? (t as any).bg : '#fff';

  return (
    <ThemedCard padding={isEditorial(t) ? 18 : 20}>
      <Kicker>Content</Kicker>

      {isEmpty ? (
        <Text style={{ fontFamily: fontBody, fontSize: 13, color: muted, marginTop: 12 }}>
          No content yet. Head to Compose to create your first post.
        </Text>
      ) : (
        <View style={{ marginTop: 14, gap: 10 }}>
          {/* Scheduled posts */}
          {scheduledPosts.map((post) => (
            <View
              key={post.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 10, borderRadius: 12,
                backgroundColor: rowBg,
              }}
            >
              {/* Clock icon in platform color */}
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: PLATFORM_COLORS[post.platform] ?? muted,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                  <Circle cx={12} cy={12} r={10} stroke={post.platform === 'x' ? '#000' : '#fff'} strokeWidth={2.5} />
                  <Polyline points="12,6 12,12 16,14" stroke={post.platform === 'x' ? '#000' : '#fff'} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </View>

              {/* Hook + date */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fontBold, fontSize: 13, color: fg }}>
                  {post.hook}
                </Text>
                <Text style={{ fontFamily: fontBody, fontSize: 11, color: muted, marginTop: 2 }}>
                  {post.scheduled_at ? fmtDate(post.scheduled_at) : post.format}
                  {' · '}{post.platform.charAt(0).toUpperCase() + post.platform.slice(1)}
                </Text>
              </View>

              {/* Scheduled badge */}
              <View style={{
                paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6,
                backgroundColor: badgeBg,
              }}>
                <Text style={{
                  fontFamily: (t as any).fontMono ?? fontBody,
                  fontSize: 8, fontWeight: '600', letterSpacing: 0.6,
                  textTransform: 'uppercase', color: badgeFg,
                }}>
                  Scheduled
                </Text>
              </View>
            </View>
          ))}

          {/* Divider */}
          {scheduledPosts.length > 0 && topPosts.length > 0 && (
            <View style={{
              height: 1, marginVertical: 4,
              backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.06)',
            }} />
          )}

          {/* Top performing posts */}
          {topPosts.map((post, i) => (
            <View
              key={post.id}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                padding: 10, borderRadius: 12,
                backgroundColor: rowBg,
              }}
            >
              {/* Rank badge */}
              <View style={{
                width: 28, height: 28, borderRadius: 8,
                backgroundColor: PLATFORM_COLORS[post.platform] ?? muted,
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontFamily: (t as any).fontBodyBold ?? fontBody, fontSize: 12, color: post.platform === 'x' ? '#000' : '#fff', fontWeight: '700' }}>
                  {i + 1}
                </Text>
              </View>

              {/* Hook + stats */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={{ fontFamily: fontBold, fontSize: 13, color: fg }}>
                  {post.hook}
                </Text>
                <Text style={{ fontFamily: fontBody, fontSize: 11, color: muted, marginTop: 2 }}>
                  {post.likes > 0 ? `${fmtNum(post.likes)} likes` : ''}
                  {post.views > 0 ? `${post.likes > 0 ? ' · ' : ''}${fmtNum(post.views)} views` : ''}
                  {post.comments > 0 ? ` · ${fmtNum(post.comments)} comments` : ''}
                  {post.likes === 0 && post.views === 0 && post.comments === 0 ? 'No engagement data' : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ThemedCard>
  );
}
