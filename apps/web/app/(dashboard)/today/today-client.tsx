'use client';

import {
  KpiCard,
  PulseBar,
  ScoreGauge,
  StrategistCard,
  GrowthChart,
  PlatformsList,
  ActionCard,
  WinCard,
  QuickActions,
} from '@govirall/ui-web';
import type { ActionItem } from '@govirall/core';

type Factor = { label: string; value: number };
type Platform = { id: string; platform: string; handle: string | null; follower_count: number | null; share: number };
type TopPost = {
  id: string;
  hook: string;
  platform: string;
  format: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  published_at: string | null;
  total: number;
};
type GrowthPoint = { date: string; followers: number; engagement: number; revenue: number };

type ChatMessage = { role: 'ai' | 'user'; text: string };

type Props = {
  theme: string;
  displayName: string;
  totalFollowers: number;
  postCount: number;
  wonDealValue: number;
  activeDealValue: number;
  connectedPlatformCount: number;
  smoScore: number | null;
  smoFactors: Factor[] | null;
  doNow: ActionItem[];
  compounds: ActionItem[];
  wins: ActionItem[];
  platforms: Platform[];
  hasNextPost: boolean;
  topPosts: TopPost[];
  growthData: GrowthPoint[];
  engagementRate: number;
  chatHistory: ChatMessage[];
};

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function fmt(cents: number) {
  const dollars = cents >= 100 ? cents / 100 : cents;
  return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtK(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtNum(n: number) {
  return n.toLocaleString('en-US');
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E4405F',
  tiktok: '#00F2EA',
  youtube: '#FF0000',
  linkedin: '#0A66C2',
  x: '#fff',
  facebook: '#1877F2',
  twitch: '#9146FF',
};

export function TodayClient(props: Props) {
  if (props.theme === 'neumorphic') {
    return <NeumorphicToday {...props} />;
  }
  return <SidebarToday {...props} />;
}

function SidebarToday({
  theme,
  displayName,
  totalFollowers,
  postCount,
  wonDealValue,
  connectedPlatformCount,
  smoScore,
  smoFactors,
  doNow,
  compounds,
  wins,
  platforms,
  hasNextPost,
  topPosts,
  growthData,
  engagementRate,
  chatHistory,
}: Props) {
  const isEditorial = theme === 'neon-editorial';
  const kpiVariants: Array<'default' | 'lime' | 'dark' | 'hot'> = ['default', 'lime', 'dark', 'hot'];

  // Build initial chat messages: use persisted history, or fallback to greeting
  const initialChatMessages: ChatMessage[] = chatHistory.length > 0
    ? chatHistory
    : [{ role: 'ai' as const, text: `Hi ${displayName} — I reviewed your recent activity. Let me know what you need help with.` }];

  return (
    <>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: isEditorial ? 38 : 26, flexWrap: 'wrap', gap: 20 }}>
        <div>
          {isEditorial && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '.18em', marginBottom: 14 }}>
              VOL 04 · ED 12 · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()} &apos;26
            </div>
          )}
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: isEditorial ? 300 : 400,
              fontStyle: isEditorial ? 'italic' : 'normal',
              fontSize: isEditorial ? 'clamp(44px, 5.5vw, 72px)' : 'clamp(36px, 4.2vw, 56px)',
              lineHeight: isEditorial ? 0.95 : 1,
              letterSpacing: isEditorial ? '-.025em' : '-.02em',
              color: isEditorial ? 'var(--ink)' : 'var(--fg)',
            }}
          >
            {isEditorial ? (
              <>Good {getTimeOfDay()},<br /><span style={{ fontWeight: 900, fontStyle: 'normal' }}>{displayName}.</span></>
            ) : (
              <>
                Good {getTimeOfDay()},{' '}
                <em
                  style={{
                    fontStyle: 'italic',
                    background: 'linear-gradient(135deg, var(--lilac), var(--rose) 50%, var(--amber))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {displayName}
                </em>
                .
              </>
            )}
          </h2>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="Followers"
          value={totalFollowers > 0 ? fmtK(totalFollowers) : '--'}
          theme={theme}
          variant={kpiVariants[0]}
          glowColor="var(--violet)"
        />
        <KpiCard
          label="Posts"
          value={postCount > 0 ? String(postCount) : '--'}
          theme={theme}
          variant={kpiVariants[1]}
          glowColor="var(--rose)"
        />
        <KpiCard
          label="Revenue"
          value={wonDealValue > 0 ? fmt(wonDealValue) : '$0'}
          theme={theme}
          variant={kpiVariants[2]}
          glowColor="var(--cyan)"
        />
        <KpiCard
          label="Platforms"
          value={String(connectedPlatformCount)}
          theme={theme}
          variant={kpiVariants[3]}
          glowColor="var(--amber)"
          change={connectedPlatformCount > 0 ? 'connected' : undefined}
          changeDirection="up"
        />
      </div>

      {/* Main grid: Score + Strategist */}
      <div className="grid-main-2col" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: isEditorial ? 18 : 20, marginBottom: isEditorial ? 22 : 22 }}>
        <ScoreGauge
          score={smoScore}
          factors={smoFactors?.slice(0, 3) ?? undefined}
          theme={theme}
          title="SMO Score"
          subtitle={smoScore != null ? `Your social optimization health` : 'Connect platforms & compute your score'}
        />
        <StrategistCard
          theme={theme}
          messages={initialChatMessages}
          quickActions={['Draft captions', 'Hashtag set', 'Weekly plan']}
        />
      </div>

      {/* Growth chart */}
      <div style={{ marginBottom: isEditorial ? 22 : 22 }}>
        <GrowthChart
          theme={theme}
          data={growthData.length >= 2 ? growthData : undefined}
          currentFollowers={totalFollowers}
        />
      </div>

      {/* Bottom row */}
      <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isEditorial ? 18 : 20 }}>
        <PlatformsList platforms={platforms} theme={theme} />
        {/* Top content */}
        <TopContentCard theme={theme} posts={topPosts} />
        {/* Engagement card */}
        <EngagementCard theme={theme} engagementRate={engagementRate} connectedPlatformCount={connectedPlatformCount} smoScore={smoScore} />
      </div>
    </>
  );
}

function TopContentCard({ theme, posts }: { theme: string; posts: TopPost[] }) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  return (
    <div
      style={{
        padding: 24,
        ...(isEditorial
          ? { border: '1.5px solid var(--ink)', borderRadius: 20, background: 'var(--paper)' }
          : isNeumorphic
          ? { borderRadius: 24, background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-md)' }
          : {
              background: 'var(--glass, rgba(255,255,255,.06))',
              backdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
            }),
      }}
    >
      <h3
        style={{
          fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
          fontWeight: isEditorial ? 900 : isNeumorphic ? 500 : 400,
          fontStyle: isEditorial ? 'italic' : isNeumorphic ? 'italic' : 'normal',
          fontSize: isEditorial ? 30 : isNeumorphic ? 22 : 20,
          marginBottom: 16,
          color: isEditorial ? 'var(--ink)' : 'var(--fg)',
        }}
      >
        Top content{isEditorial ? '.' : ''}
      </h3>
      {posts.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {posts.map((post, i) => (
            <div
              key={post.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: isNeumorphic ? 16 : 12,
                ...(isNeumorphic
                  ? { background: 'var(--surface, var(--bg))', boxShadow: 'var(--in-sm)' }
                  : { background: isEditorial ? 'rgba(0,0,0,.03)' : 'rgba(255,255,255,.03)', border: isEditorial ? '1px solid rgba(0,0,0,.08)' : '1px solid rgba(255,255,255,.05)' }),
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: PLATFORM_COLORS[post.platform] ?? 'var(--muted)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: post.platform === 'x' ? '#000' : '#fff',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: isEditorial ? 'var(--ink)' : 'var(--fg)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {post.hook}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {post.likes > 0 && `${fmtNum(post.likes)} likes`}
                  {post.views > 0 && ` · ${fmtNum(post.views)} views`}
                  {post.comments > 0 && ` · ${fmtNum(post.comments)} comments`}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>
          Publish content to see your top performers here.
        </p>
      )}
    </div>
  );
}

function EngagementCard({ theme, engagementRate, connectedPlatformCount, smoScore }: { theme: string; engagementRate: number; connectedPlatformCount: number; smoScore: number | null }) {
  const isEditorial = theme === 'neon-editorial';
  const isNeumorphic = theme === 'neumorphic';

  return (
    <div
      style={{
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...(isEditorial
          ? { background: 'var(--hot)', color: '#fff', border: '1.5px solid var(--hot)', borderRadius: 20 }
          : isNeumorphic
          ? { borderRadius: 24, background: 'var(--surface, var(--bg))', boxShadow: 'var(--out-md)' }
          : {
              background: 'var(--glass, rgba(255,255,255,.06))',
              backdropFilter: 'blur(24px) saturate(1.2)',
              border: '1px solid var(--line)',
              borderRadius: 20,
              boxShadow: '0 20px 60px -20px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.08)',
            }),
      }}
    >
      <h3
        style={{
          fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
          fontWeight: isEditorial ? 900 : isNeumorphic ? 500 : 400,
          fontStyle: isEditorial ? 'italic' : isNeumorphic ? 'italic' : 'normal',
          fontSize: isEditorial ? 30 : isNeumorphic ? 22 : 20,
          marginBottom: 16,
          color: isNeumorphic ? 'var(--ink, var(--fg))' : undefined,
        }}
      >
        Quick stats{isEditorial ? '.' : ''}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: isNeumorphic ? 14 : 16 }}>
        {/* SMO Score */}
        <div
          style={isNeumorphic ? {
            padding: '12px 14px',
            borderRadius: 16,
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--in-sm)',
          } : {}}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.15em',
            color: isEditorial ? 'rgba(255,255,255,.7)' : 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            SMO SCORE
          </div>
          <div
            style={{
              fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontSize: isEditorial ? 42 : 32,
              letterSpacing: '-.03em',
              lineHeight: 1,
              color: isNeumorphic ? 'var(--accent, var(--color-primary))' : undefined,
              ...(isEditorial || isNeumorphic ? {} : { background: 'linear-gradient(135deg, var(--amber), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),
            }}
          >
            {smoScore != null ? smoScore : '--'}
            <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted)', marginLeft: 2, ...(isEditorial || isNeumorphic ? {} : { WebkitTextFillColor: 'var(--muted)', background: 'none', WebkitBackgroundClip: 'unset' }) }}>/100</span>
          </div>
        </div>
        {/* Platforms */}
        <div
          style={isNeumorphic ? {
            padding: '12px 14px',
            borderRadius: 16,
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--in-sm)',
          } : {}}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.15em',
            color: isEditorial ? 'rgba(255,255,255,.7)' : 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            PLATFORMS
          </div>
          <div
            style={{
              fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontSize: isEditorial ? 42 : 32,
              letterSpacing: '-.03em',
              lineHeight: 1,
              color: isNeumorphic ? 'var(--accent, var(--color-primary))' : undefined,
              ...(isEditorial || isNeumorphic ? {} : { background: 'linear-gradient(135deg, var(--amber), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),
            }}
          >
            {connectedPlatformCount}
            <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--muted)', marginLeft: 6, ...(isEditorial || isNeumorphic ? {} : { WebkitTextFillColor: 'var(--muted)', background: 'none', WebkitBackgroundClip: 'unset' }) }}>connected</span>
          </div>
        </div>
        {/* Engagement ratio */}
        <div
          style={isNeumorphic ? {
            padding: '12px 14px',
            borderRadius: 16,
            background: 'var(--surface, var(--bg))',
            boxShadow: 'var(--in-sm)',
          } : {}}
        >
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '.15em',
            color: isEditorial ? 'rgba(255,255,255,.7)' : 'var(--muted)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            F/F RATIO
          </div>
          <div
            style={{
              fontFamily: isNeumorphic ? "'Fraunces', serif" : 'var(--font-display)',
              fontWeight: isEditorial ? 900 : 400,
              fontSize: isEditorial ? 42 : 32,
              letterSpacing: '-.03em',
              lineHeight: 1,
              color: isNeumorphic ? 'var(--accent, var(--color-primary))' : undefined,
              ...(isEditorial || isNeumorphic ? {} : { background: 'linear-gradient(135deg, var(--amber), var(--rose))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }),
            }}
          >
            {engagementRate > 0 ? (
              <>
                {engagementRate.toFixed(1)}
                <span style={{ fontSize: 16, fontWeight: 400, color: 'var(--muted)', marginLeft: 2, ...(isEditorial || isNeumorphic ? {} : { WebkitTextFillColor: 'var(--muted)', background: 'none', WebkitBackgroundClip: 'unset' }) }}>x</span>
              </>
            ) : '--'}
          </div>
        </div>
      </div>
    </div>
  );
}

function NeumorphicToday({
  theme,
  displayName,
  totalFollowers,
  postCount,
  wonDealValue,
  connectedPlatformCount,
  smoScore,
  smoFactors,
  platforms,
  topPosts,
  growthData,
  engagementRate,
  chatHistory,
}: Props) {
  const initialChatMessages: ChatMessage[] = chatHistory.length > 0
    ? chatHistory
    : [{ role: 'ai' as const, text: `Hi ${displayName} — I reviewed your recent activity. Let me know what you need help with.` }];

  return (
    <>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 26, flexWrap: 'wrap', gap: 20 }}>
        <h2
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 400,
            fontSize: 'clamp(36px, 4.2vw, 56px)',
            lineHeight: 1,
            letterSpacing: '-.02em',
            color: 'var(--ink, var(--fg))',
          }}
        >
          Good {getTimeOfDay()},{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--accent, var(--color-primary))', fontWeight: 500 }}>
            {displayName}
          </em>
          .
        </h2>
      </div>

      {/* KPI row */}
      <div className="grid-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Followers" value={totalFollowers > 0 ? fmtK(totalFollowers) : '--'} theme="neumorphic" variant="default" glowColor="var(--violet)" />
        <KpiCard label="Posts" value={postCount > 0 ? String(postCount) : '--'} theme="neumorphic" variant="lime" glowColor="var(--rose)" />
        <KpiCard label="Revenue" value={wonDealValue > 0 ? fmt(wonDealValue) : '$0'} theme="neumorphic" variant="dark" glowColor="var(--cyan)" />
        <KpiCard label="Platforms" value={String(connectedPlatformCount)} theme="neumorphic" variant="hot" glowColor="var(--amber)" change={connectedPlatformCount > 0 ? 'connected' : undefined} changeDirection="up" />
      </div>

      {/* Main grid: Score + Strategist */}
      <div className="grid-main-2col" style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 20, marginBottom: 22 }}>
        <ScoreGauge
          score={smoScore}
          factors={smoFactors?.slice(0, 3) ?? undefined}
          theme="neumorphic"
          title="SMO Score"
          subtitle={smoScore != null ? 'Your social optimization health' : 'Connect platforms & compute your score'}
        />
        <StrategistCard
          theme="neumorphic"
          messages={initialChatMessages}
          quickActions={['Draft captions', 'Hashtag set', 'Weekly plan']}
        />
      </div>

      {/* Growth chart */}
      <div style={{ marginBottom: 22 }}>
        <GrowthChart
          theme="neumorphic"
          data={growthData.length >= 2 ? growthData : undefined}
          currentFollowers={totalFollowers}
        />
      </div>

      {/* Bottom row */}
      <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
        <PlatformsList platforms={platforms} theme="neumorphic" />
        <TopContentCard theme="neumorphic" posts={topPosts} />
        <EngagementCard theme="neumorphic" engagementRate={engagementRate} connectedPlatformCount={connectedPlatformCount} smoScore={smoScore} />
      </div>
    </>
  );
}
