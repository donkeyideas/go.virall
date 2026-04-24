import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { neumorphicRaisedStyle } from '@/components/ui/NeumorphicView';
import type { NeumorphicTheme } from '@/lib/tokens/neumorphic';
import { api } from '@/lib/api';
import { ThemedCard } from '@/components/ui/ThemedCard';
import { Kicker } from '@/components/ui/Kicker';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

// ── Types ──────────────────────────────────────────────────────────────
interface Factor {
  label: string;
  value: number;
  tip: string;
}

interface SmoData {
  score: number | null;
  factors: Factor[] | null;
  computedAt: string | null;
  connectedCount: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────
function getGrade(s: number): string {
  if (s >= 80) return 'A';
  if (s >= 60) return 'B';
  if (s >= 40) return 'C';
  if (s >= 20) return 'D';
  return 'F';
}

function getColor(v: number, t: ReturnType<typeof useTokens>): string {
  if (v >= 70) return isGlass(t) ? t.good : isEditorial(t) ? '#22c55e' : t.good;
  if (v >= 40) return isGlass(t) ? t.amber : isEditorial(t) ? t.mustard : t.warn;
  return isGlass(t) ? t.bad : isEditorial(t) ? t.pink : t.bad;
}

// ── Main Screen ──────────────────────────────────────────────────────────
export default function SmoScoreScreen() {
  const t = useTokens();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<SmoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await api.get<SmoData>('/smo');
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

  const handleCompute = useCallback(async () => {
    setComputing(true);
    setError(null);
    try {
      await api.post('/smo/compute', {});
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compute failed');
    } finally {
      setComputing(false);
    }
  }, [fetchData]);

  const fg = isGlass(t) ? t.fg : t.ink;
  const muted = t.muted;
  const accentColor = isGlass(t) ? t.violet : isEditorial(t) ? t.lime : t.accent;

  // SVG gauge
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = data?.score != null ? circumference - (circumference * data.score) / 100 : circumference;

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
        {/* ── Page title + compute button ──────── */}
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
            {'SMO '}
            <Text style={{
              fontFamily: t.fontDisplayItalic,
              color: isGlass(t) ? t.violetSoft : isEditorial(t) ? t.ink : t.accent,
            }}>
              Score
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
            Social media optimization
          </Text>
        </View>

        {error && (
          <View style={{ padding: 12, backgroundColor: 'rgba(239,68,68,0.12)', borderRadius: 12, marginBottom: 16 }}>
            <Text style={{ color: isGlass(t) ? t.bad : '#ef4444', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        {data && data.connectedCount === 0 ? (
          /* ── Empty state ──────────────────────── */
          <ThemedCard padding={40} style={{ alignItems: 'center' }}>
            <View style={{
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.05)' : isEditorial(t) ? t.surfaceAlt : t.surfaceDarker,
              justifyContent: 'center', alignItems: 'center', marginBottom: 20,
            }}>
              <Text style={{ fontSize: 36 }}>*</Text>
            </View>
            <Text style={{
              fontFamily: t.fontDisplay, fontWeight: '700',
              fontSize: 22, color: fg, textAlign: 'center', marginBottom: 8,
            }}>
              Connect a platform
            </Text>
            <Text style={{ fontSize: 14, color: muted, textAlign: 'center', maxWidth: 300 }}>
              Your SMO score analyzes your presence across 6 factors. Connect a platform in Settings to get started.
            </Text>
          </ThemedCard>
        ) : data && (
          <>
            {/* ── Score gauge ──────────────────────── */}
            <ThemedCard padding={28} style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 180, height: 180, marginBottom: 16 }}>
                <Svg viewBox="0 0 160 160" width={180} height={180}>
                  <Defs>
                    <LinearGradient id="smo-grad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor={isGlass(t) ? '#8b5cf6' : isEditorial(t) ? t.ink : '#8098db'} />
                      <Stop offset="100%" stopColor={isGlass(t) ? '#ff71a8' : isEditorial(t) ? t.ink : '#5a78d0'} />
                    </LinearGradient>
                  </Defs>
                  <Circle
                    cx={80} cy={80} r={radius}
                    fill="none"
                    stroke={isGlass(t) ? 'rgba(255,255,255,0.08)' : isEditorial(t) ? t.surfaceAlt : t.surfaceDarker}
                    strokeWidth={8}
                  />
                  {data.score != null && (
                    <Circle
                      cx={80} cy={80} r={radius}
                      fill="none"
                      stroke="url(#smo-grad)"
                      strokeWidth={8}
                      strokeDasharray={`${circumference}`}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      rotation={-90}
                      origin="80,80"
                    />
                  )}
                </Svg>
                {/* Center text */}
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{
                    fontFamily: t.fontDisplay,
                    fontStyle: isEditorial(t) ? 'italic' : 'normal',
                    fontSize: 52, letterSpacing: -2, lineHeight: 52, color: fg,
                  }}>
                    {data.score ?? '--'}
                  </Text>
                  {data.score != null && (
                    <Text style={{
                      fontFamily: isGlass(t) ? t.fontMono : t.fontBodyBold,
                      fontSize: 10, letterSpacing: 1.5, color: muted, marginTop: 4,
                      textTransform: 'uppercase',
                    }}>
                      Grade {getGrade(data.score)}
                    </Text>
                  )}
                </View>
              </View>

              <Text style={{ fontSize: 13, color: muted, textAlign: 'center' }}>
                {data.score != null ? `Top ${100 - data.score}% of creators` : 'Tap Compute to analyze your presence'}
              </Text>

              {data.computedAt && (
                <Text style={{ fontSize: 11, color: muted, marginTop: 8 }}>
                  Last computed {new Date(data.computedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              )}

              {/* Compute button */}
              <Pressable
                onPress={handleCompute}
                disabled={computing}
                style={({ pressed }) => ({
                  marginTop: 20,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: isEditorial(t) ? 2 : 14,
                  opacity: computing ? 0.6 : pressed ? 0.8 : 1,
                  ...(isGlass(t) ? {
                    backgroundColor: t.violet,
                  } : isEditorial(t) ? {
                    backgroundColor: t.ink,
                    borderWidth: 1.5,
                    borderColor: t.ink,
                  } : {
                    ...neumorphicRaisedStyle(t as NeumorphicTheme, 'sm'),
                  }),
                })}
              >
                <Text style={{
                  fontFamily: t.fontBodySemibold,
                  fontSize: 14,
                  color: isGlass(t) ? '#fff' : isEditorial(t) ? t.bg : t.accent,
                  textAlign: 'center',
                }}>
                  {computing ? 'Computing...' : data.score != null ? 'Recompute' : 'Compute Score'}
                </Text>
              </Pressable>
            </ThemedCard>

            {/* ── Factor breakdown ──────────────────── */}
            <Kicker style={{ marginBottom: 12 }}>Factor breakdown</Kicker>
            <ThemedCard padding={20}>
              {data.factors && data.factors.length > 0 ? (
                <View style={{ gap: 18 }}>
                  {data.factors.map((f) => (
                    <View key={f.label}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontFamily: t.fontBodySemibold, color: fg }}>
                          {f.label}
                        </Text>
                        <Text style={{
                          fontFamily: t.fontDisplay, fontSize: 13, fontWeight: '700',
                          color: getColor(f.value, t),
                        }}>
                          {f.value}/100
                        </Text>
                      </View>
                      <View style={{
                        height: 5, borderRadius: 3, overflow: 'hidden',
                        backgroundColor: isGlass(t) ? 'rgba(255,255,255,0.06)' : isEditorial(t) ? t.surfaceAlt : t.surfaceDarker,
                        ...(isNeumorphic(t) ? (Platform.OS === 'ios'
                          ? (t as NeumorphicTheme).shadowOutSm.inner
                          : { borderWidth: 1, borderTopColor: 'rgba(167,173,184,0.3)', borderLeftColor: 'rgba(167,173,184,0.3)', borderBottomColor: 'rgba(255,255,255,0.5)', borderRightColor: 'rgba(255,255,255,0.5)' }
                        ) : {}),
                      }}>
                        <View style={{
                          height: '100%', borderRadius: 3,
                          width: `${f.value}%`,
                          backgroundColor: getColor(f.value, t),
                        }} />
                      </View>
                      <Text style={{ fontSize: 11, color: muted, marginTop: 4, fontFamily: t.fontBody }}>
                        {f.tip}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: muted, textAlign: 'center' }}>
                    Tap "Compute Score" to see your factor breakdown
                  </Text>
                </View>
              )}
            </ThemedCard>
          </>
        )}
      </ScrollView>
    </View>
  );
}
