import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';

// ── Types ──────────────────────────────────────────────────────────────
interface Signal {
  name: string;
  score: number;
  weight: string;
  explanation: string;
}

interface GoVirallData {
  overall: number;
  status: { label: string; description: string };
  signals: Signal[];
  stats: {
    totalFollowers: number;
    connectedPlatforms: number;
    postsAnalyzed: number;
    postsPerWeek: number;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────
function scoreColor(score: number, t: ReturnType<typeof useTokens>): string {
  if (score >= 60) return isGlass(t) ? t.good : isEditorial(t) ? '#22c55e' : t.good;
  if (score >= 30) return isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn;
  return isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad;
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Main Screen ──────────────────────────────────────────────────────────
export default function GoVirallScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<GoVirallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await api.get<GoVirallData>('/go-virall');
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchData(); }, [fetchData]);

  const fg = isGlass(t) ? t.fg : t.ink;
  const muted = t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;

  // Loading
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
      >
        {/* ── Page title ──────────────────────────── */}
        <View style={{ paddingLeft: 56, paddingTop: 14, paddingBottom: 16 }}>
          <Text
            style={{
              color: fg,
              fontSize: isGlass(t) ? 34 : isEditorial(t) ? 36 : 32,
              fontFamily: isGlass(t) ? t.fontDisplay : isEditorial(t) ? t.fontDisplayItalic : t.fontDisplay,
              lineHeight: isGlass(t) ? 38 : isEditorial(t) ? 40 : 36,
              letterSpacing: -0.5,
            }}
          >
            {'Go '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Virall
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
            Viral momentum tracker
          </Text>
        </View>

        {error && (
          <View style={{ padding: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: isGlass(t) ? t.bad : '#ef4444', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {data && (
          <>
            {/* ── Overall score + heat bar ──────────── */}
            <ThemedCard padding={20} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <View style={{ alignItems: 'center', minWidth: 70 }}>
                  <Text style={{
                    fontFamily: t.fontDisplay,
                    fontWeight: '900',
                    fontStyle: isEditorial(t) ? 'italic' : 'normal',
                    fontSize: 56,
                    lineHeight: 56,
                    letterSpacing: -2,
                    color: scoreColor(data.overall, t),
                  }}>
                    {data.overall}
                  </Text>
                  <Text style={{
                    fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
                    fontSize: 10, letterSpacing: 1, color: muted, marginTop: 2,
                  }}>
                    / 100
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  {/* Heat bar */}
                  <View style={{
                    height: 24,
                    borderRadius: isEditorial(t) ? 4 : 12,
                    backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surfaceAlt : t.surfaceDarker,
                    overflow: 'hidden',
                    ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.max(data.overall, 2)}%`,
                      borderRadius: isEditorial(t) ? 4 : 12,
                      backgroundColor: scoreColor(data.overall, t),
                    }} />
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Text style={{
                  fontFamily: t.fontDisplay, fontWeight: '900',
                  fontStyle: isEditorial(t) ? 'italic' : 'normal',
                  fontSize: 18, color: scoreColor(data.overall, t),
                }}>
                  {data.status.label}
                </Text>
                <Text style={{ fontSize: 13, color: muted, flex: 1 }}>
                  {data.status.description}
                </Text>
              </View>
            </ThemedCard>

            {/* ── Quick stats ──────────────────────── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingBottom: 4 }}
              style={{ marginBottom: 20 }}
            >
              {[
                { label: 'Followers', value: fmtK(data.stats.totalFollowers) },
                { label: 'Platforms', value: `${data.stats.connectedPlatforms}` },
                { label: 'Analyzed', value: `${data.stats.postsAnalyzed}` },
                { label: 'Posts/wk', value: data.stats.postsPerWeek > 0 ? `${data.stats.postsPerWeek}` : '\u2014' },
              ].map((s) => (
                <ThemedCard key={s.label} padding={14} style={{ minWidth: 100, alignItems: 'center' }}>
                  <Text style={{
                    fontFamily: isGlass(t) ? t.fontMono : isEditorial(t) ? t.fontMono : t.fontBodyBold,
                    fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: muted, marginBottom: 4,
                  }}>
                    {s.label}
                  </Text>
                  <Text style={{
                    fontFamily: t.fontDisplay, fontWeight: '900',
                    fontStyle: isEditorial(t) ? 'italic' : 'normal',
                    fontSize: 22, letterSpacing: -0.5, color: fg,
                  }}>
                    {s.value}
                  </Text>
                </ThemedCard>
              ))}
            </ScrollView>

            {/* ── Momentum signals ─────────────────── */}
            <Kicker style={{ marginBottom: 12 }}>Momentum signals</Kicker>
            <View style={{ gap: 12, marginBottom: 24 }}>
              {data.signals.map((signal) => (
                <ThemedCard key={signal.name} padding={16}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <Text style={{
                        fontFamily: t.fontDisplay, fontWeight: '900',
                        fontSize: 15, color: fg, letterSpacing: -0.3,
                      }}>
                        {signal.name}
                      </Text>
                      <Text style={{
                        fontFamily: isGlass(t) ? t.fontMono : t.fontBodyBold,
                        fontSize: 9, letterSpacing: 1, color: muted, textTransform: 'uppercase',
                      }}>
                        {signal.weight} weight
                      </Text>
                    </View>
                    <Text style={{
                      fontFamily: t.fontDisplay, fontWeight: '900',
                      fontStyle: isEditorial(t) ? 'italic' : 'normal',
                      fontSize: 26, letterSpacing: -1, color: scoreColor(signal.score, t),
                    }}>
                      {signal.score}
                      <Text style={{ fontSize: 12, fontWeight: '500', opacity: 0.4 }}>/100</Text>
                    </Text>
                  </View>

                  {/* Progress bar */}
                  <View style={{
                    height: 5, borderRadius: 3, marginBottom: 8,
                    backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surfaceAlt : t.surfaceDarker,
                    overflow: 'hidden',
                    ...(isNeumorphic(t) ? t.shadowOutSm.inner : {}),
                  }}>
                    <View style={{
                      height: '100%',
                      width: `${Math.max(signal.score, 1)}%`,
                      borderRadius: 3,
                      backgroundColor: scoreColor(signal.score, t),
                    }} />
                  </View>

                  <Text style={{ fontSize: 12, lineHeight: 18, color: muted, fontFamily: t.fontBody }}>
                    {signal.explanation}
                  </Text>
                </ThemedCard>
              ))}
            </View>
          </>
        )}

        {!data && !error && (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <Text style={{ color: muted, fontSize: 14 }}>No data available</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
