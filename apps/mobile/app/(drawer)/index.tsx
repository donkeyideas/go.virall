import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle, neumorphicInsetCircleStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { useAuth } from '@/lib/auth';
import { useTodayData } from '@/hooks/useTodayData';
import { PulseStats, type PulseStat } from '@/components/cards/PulseMetric';
import { SmoCard } from '@/components/cards/SmoCard';
import { NextPostCard } from '@/components/cards/NextPostCard';
import { ActionCard } from '@/components/cards/ActionCard';
import { WinCard } from '@/components/cards/WinCard';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateMeta(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const date = d.getDate();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${month} ${date} · ${time}`;
}

// ── Section Header ─────────────────────────────────────────────────
function SectionHeader({ number, title, emphasisWord, meta }: { number: string; title: string; emphasisWord?: string; meta?: string }) {
  const t = useTokens();

  if (isGlass(t)) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, marginTop: 12 }}>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.fg, letterSpacing: -0.3 }}>
          {emphasisWord && title.includes(emphasisWord) ? (
            <>
              {title.split(emphasisWord)[0]}
              <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>{emphasisWord}</Text>
              {title.split(emphasisWord)[1]}
            </>
          ) : title}
        </Text>
        {meta && <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>{meta}</Text>}
      </View>
    );
  }

  if (isEditorial(t)) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, marginTop: 12, gap: 10 }}>
        <View style={{ backgroundColor: t.ink, paddingVertical: 2, paddingHorizontal: 6 }}>
          <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1, color: t.bg }}>{number}</Text>
        </View>
        <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, letterSpacing: -0.3, color: t.ink }}>
          {emphasisWord && title.includes(emphasisWord) ? (
            <>
              {title.split(emphasisWord)[0]}
              <Text style={{ fontStyle: 'italic' }}>{emphasisWord}</Text>
              {title.split(emphasisWord)[1]}
            </>
          ) : title}
        </Text>
        {meta && <Text style={{ fontFamily: t.fontMono, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: t.muted, marginLeft: 'auto' }}>{meta}</Text>}
      </View>
    );
  }

  // Neumorphic
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, marginTop: 12 }}>
      <Text style={{ fontFamily: t.fontDisplay, fontSize: 22, color: t.ink, letterSpacing: -0.4 }}>
        {emphasisWord && title.includes(emphasisWord) ? (
          <>
            {title.split(emphasisWord)[0]}
            <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>{emphasisWord}</Text>
            {title.split(emphasisWord)[1]}
          </>
        ) : title}
      </Text>
      {meta && <Text style={{ fontFamily: t.fontBodyExtraBold, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint }}>{meta}</Text>}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────
export default function TodayScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();
  const { user: authUser } = useAuth();
  const { loading, error, user, pulse, smo, nextPost, actions, wins, refresh } = useTodayData();

  const firstName = user?.displayName?.split(' ')[0]
    ?? authUser?.user_metadata?.display_name?.split(' ')[0]
    ?? 'there';

  // Convert pulse data to PulseStat[] for PulseStats component
  const pulseStats: PulseStat[] = [
    { label: 'Followers', value: pulse.followers.formatted, delta: pulse.followers.delta, deltaVariant: pulse.followers.deltaVariant },
    { label: 'Engage', value: pulse.engagement.formatted, delta: pulse.engagement.delta, deltaVariant: pulse.engagement.deltaVariant },
    { label: 'Revenue', value: pulse.revenueMtd.formatted, delta: pulse.revenueMtd.delta, deltaVariant: pulse.revenueMtd.deltaVariant },
    { label: 'Pipeline', value: pulse.pipeline.formatted, delta: pulse.pipeline.delta, deltaVariant: pulse.pipeline.deltaVariant },
  ];

  // Loading state
  if (loading) {
    const color = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={color} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top + 10 }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent}
          />
        }
      >
        {/* ── Greeting area ─────────────────────────── */}
        {isGlass(t) && (
          <View style={{ paddingLeft: 76, paddingRight: 20, paddingTop: 24, paddingBottom: 16 }}>
            <View style={{ position: 'absolute', right: 20, top: 24 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: t.violet,
                justifyContent: 'center', alignItems: 'center',
                ...(Platform.OS === 'ios' ? { shadowColor: t.violet, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 } : { elevation: 6 }),
              }}>
                <Text style={{ fontFamily: t.fontDisplayItalic, color: t.bg, fontSize: 14, fontWeight: '700' }}>
                  {firstName[0]?.toUpperCase() ?? 'G'}
                </Text>
              </View>
            </View>
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 38, color: t.fg, lineHeight: 40, letterSpacing: -0.5 }}>
              {`${getGreeting()}, `}
              <Text style={{ fontFamily: t.fontDisplayItalic, color: t.violetSoft }}>{`${firstName}`}</Text>
              {'.'}
            </Text>
            <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: t.subtle, marginTop: 8 }}>
              {getDateMeta()}
            </Text>
          </View>
        )}

        {isEditorial(t) && (
          <View style={{ paddingLeft: 76, paddingRight: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1.5, borderBottomColor: t.ink }}>
            {/* Kicker row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontFamily: t.fontMono, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: t.ink }}>Today's briefing</Text>
              <View style={{ flex: 1, height: 1.5, backgroundColor: t.ink, marginHorizontal: 10 }} />
              <Text style={{ fontFamily: t.fontMono, fontSize: 10, color: t.muted }}>{getDateMeta()}</Text>
            </View>
            {/* Avatar top-right */}
            <View style={{ position: 'absolute', right: 20, top: 20 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: t.pink,
                borderWidth: 1.5, borderColor: t.ink,
                justifyContent: 'center', alignItems: 'center',
                ...t.shadowButton,
              }}>
                <Text style={{ fontFamily: t.fontDisplayItalic, color: t.bg, fontSize: 13, fontWeight: '700' }}>
                  {firstName[0]?.toUpperCase() ?? 'G'}
                </Text>
              </View>
            </View>
            {/* Headline */}
            <Text style={{ fontFamily: t.fontDisplayItalic, fontSize: 42, color: t.ink, lineHeight: 40, letterSpacing: -1.5, marginTop: 6 }}>
              {`${getGreeting()}, `}
              <Text style={{ backgroundColor: t.lime, paddingHorizontal: 6 }}>{firstName}</Text>
              {'.'}
            </Text>
          </View>
        )}

        {isNeumorphic(t) && (
          <View style={{ paddingLeft: 76, paddingRight: 24, paddingTop: 20, paddingBottom: 18 }}>
            {/* Avatar block top-right */}
            <View style={{ position: 'absolute', right: 24, top: 20 }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 10,
                paddingVertical: 4, paddingLeft: 4, paddingRight: 12,
                borderRadius: 999,
                ...neumorphicRaisedStyle(t as NeumorphicTheme, 'sm'),
              }}>
                <View style={neumorphicInsetCircleStyle(t as NeumorphicTheme, 34)}>
                  <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent, fontSize: 13 }}>
                    {firstName[0]?.toUpperCase() ?? 'G'}
                  </Text>
                </View>
                <Text style={{ fontFamily: t.fontBodyBold, fontSize: 12, color: t.fg, letterSpacing: 0.2 }}>{firstName}</Text>
              </View>
            </View>
            {/* Headline */}
            <Text style={{ fontFamily: t.fontDisplay, fontSize: 36, color: t.ink, lineHeight: 38, letterSpacing: -1.2 }}>
              {`${getGreeting()},\n`}
              <Text style={{ fontFamily: t.fontDisplayItalic, color: t.accent }}>{firstName}</Text>
              {'.'}
            </Text>
            <Text style={{ fontFamily: t.fontBodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: t.faint, marginTop: 10 }}>
              {getDateMeta()}
            </Text>
          </View>
        )}

        {/* ── Pulse Stats ───────────────────────────── */}
        <View style={{ marginBottom: 16 }}>
          <PulseStats stats={pulseStats} />
        </View>

        {/* ── SMO Card ──────────────────────────────── */}
        {smo && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <SmoCard
              score={smo.score}
              deltaText={smo.delta}
              strongest={smo.strongest}
              biggestLift={smo.biggestLift}
              factors={smo.factors}
            />
          </View>
        )}

        {/* ── Section: Your next post ───────────────── */}
        {nextPost && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader number="02" title="Your next post" meta="Upcoming" />
            <NextPostCard
              status={nextPost.status}
              time={nextPost.time}
              hook={nextPost.hook}
              score={nextPost.score}
              hookStrength={nextPost.score != null && nextPost.score >= 70 ? 'Strong' : nextPost.score != null ? 'Moderate' : undefined}
              predicted={nextPost.score != null ? `${(nextPost.score * 180).toFixed(0)}` : undefined}
            />
          </View>
        )}

        {/* ── Section: Do now (actions) ────────────── */}
        {actions.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader
              number="03"
              title={`Do now (${actions.filter(a => a.variant === 'urgent').length} urgent)`}
            />
            <View style={{ gap: 12 }}>
              {actions.map((action) => (
                <ActionCard
                  key={action.id}
                  variant={action.variant}
                  kicker={action.kicker}
                  eyebrow={action.eyebrow}
                  title={action.title}
                  emphasisWord={action.emphasisWord}
                  meta={action.meta}
                  primaryCta={{ label: action.primaryCta, onPress: () => {} }}
                  skipCta={action.skipCta ? { label: action.skipCta, onPress: () => {} } : undefined}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Section: This week's wins ─────────────── */}
        {wins.length > 0 && (
          <View style={{ paddingHorizontal: 20 }}>
            <SectionHeader number="05" title="This week's wins" />
            <View style={{ gap: 10 }}>
              {wins.map((win) => (
                <WinCard
                  key={win.id}
                  kicker={win.kicker}
                  text={win.text}
                  emphasisText={win.emphasisText}
                  number={win.number}
                  iconName={win.iconName}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state ───────────────────────────── */}
        {!loading && !smo && actions.length === 0 && wins.length === 0 && !nextPost && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              fontSize: 20,
              color: isGlass(t) ? t.fg : isEditorial(t) ? t.ink : t.ink,
              textAlign: 'center',
              marginBottom: 8,
            }}>
              Connect a platform to get started.
            </Text>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontBody : isEditorial(t) ? t.fontBody : t.fontBody,
              fontSize: 13,
              color: isGlass(t) ? t.muted : isEditorial(t) ? t.muted : t.muted,
              textAlign: 'center',
            }}>
              Add your social accounts in Settings to see your real data here.
            </Text>
          </View>
        )}

        {/* ── Error state ───────────────────────────── */}
        {error && (
          <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
            <Text style={{
              fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontMono,
              fontSize: 11,
              color: isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad,
              textAlign: 'center',
            }}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
