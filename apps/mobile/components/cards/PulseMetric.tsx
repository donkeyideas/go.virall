import React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import { useTokens, isGlass, isEditorial, isNeumorphic } from '@/lib/theme';
import { NeumorphicView } from '@/components/ui/NeumorphicView';

export interface PulseStat {
  label: string;
  value: string;
  delta?: string;
  deltaVariant?: 'good' | 'flat' | 'bad';
}

interface Props {
  stats: PulseStat[];
}

// ── Glassmorphic: horizontal scrolling pills ──────────────────────────
function GlassPulse({ stats, t }: { stats: PulseStat[]; t: any }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
      decelerationRate="fast"
      snapToInterval={150}
    >
      {stats.map((s) => (
        <View key={s.label} style={{
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 20,
          paddingVertical: 12,
          paddingHorizontal: 14,
          minWidth: 130,
        }}>
          <Text style={{
            color: t.muted, fontSize: 9, fontFamily: t.fontMono,
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4,
          }}>
            {s.label}
          </Text>
          <Text style={{
            color: t.fg, fontSize: 20, fontFamily: t.fontDisplayItalic,
            letterSpacing: -0.5,
          }}>
            {s.value}
          </Text>
          {s.delta && (
            <Text style={{
              color: s.deltaVariant === 'good' ? t.good : s.deltaVariant === 'bad' ? t.bad : t.muted,
              fontSize: 10, fontFamily: t.fontMono, marginTop: 2,
            }}>
              {s.delta}
            </Text>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// ── Neon Editorial: 2×2 grid inside solid ink stripe ──────────────────
function EditorialPulse({ stats, t }: { stats: PulseStat[]; t: any }) {
  return (
    <View style={{ marginHorizontal: 0 }}>
      <View style={{
        backgroundColor: t.ink,
        paddingVertical: 2,
        paddingHorizontal: 20,
      }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {stats.slice(0, 4).map((s, i) => (
            <View key={s.label} style={{
              width: '50%',
              paddingVertical: 14,
              paddingHorizontal: 12,
              borderRightWidth: i % 2 === 0 ? 1 : 0,
              borderBottomWidth: i < 2 ? 1 : 0,
              borderColor: 'rgba(244,236,222,0.15)',
            }}>
              <Text style={{
                color: t.lime, fontSize: 9, fontFamily: t.fontMono,
                textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4,
              }}>
                {s.label}
              </Text>
              <Text style={{
                color: t.bg, fontSize: 20, fontFamily: t.fontDisplayItalic,
                letterSpacing: -0.5,
              }}>
                {s.value}
              </Text>
              {s.delta && (
                <Text style={{
                  color: s.deltaVariant === 'good' ? t.lime
                    : s.deltaVariant === 'bad' ? t.pink
                    : 'rgba(244,236,222,0.5)',
                  fontSize: 10, fontFamily: t.fontMono, marginTop: 2,
                }}>
                  {s.delta}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Neumorphic: 4-cell segmented grid inside inset tray ───────────────
function NeumorphicPulse({ stats, t }: { stats: PulseStat[]; t: any }) {
  return (
    <View style={{ marginHorizontal: 20 }}>
      {/* Inset tray */}
      <NeumorphicView inset borderRadius={22} padding={8}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {stats.slice(0, 4).map((s, i) => {
            const isActive = i === 0;
            return (
              <View key={s.label} style={{ flex: 1 }}>
                {isActive ? (
                  <NeumorphicView inset borderRadius={16} padding={10}>
                    <View style={{ alignItems: 'center' }}>
                      <Text numberOfLines={1} style={{
                        color: t.muted, fontSize: 9, fontFamily: t.fontBodyExtraBold,
                        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
                      }}>
                        {s.label}
                      </Text>
                      <Text style={{
                        color: t.accent,
                        fontSize: 18, fontFamily: t.fontDisplayItalic,
                        letterSpacing: -0.4,
                      }}>
                        {s.value}
                      </Text>
                      {s.delta && (
                        <Text style={{
                          color: s.deltaVariant === 'good' ? t.good : s.deltaVariant === 'bad' ? t.bad : t.muted,
                          fontSize: 9, fontFamily: t.fontBodyBold, marginTop: 3,
                        }}>
                          {s.delta}
                        </Text>
                      )}
                    </View>
                  </NeumorphicView>
                ) : (
                  <NeumorphicView elevation="sm" borderRadius={16} padding={10}>
                    <View style={{ alignItems: 'center' }}>
                      <Text numberOfLines={1} style={{
                        color: t.muted, fontSize: 9, fontFamily: t.fontBodyExtraBold,
                        textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4,
                      }}>
                        {s.label}
                      </Text>
                      <Text style={{
                        color: t.ink,
                        fontSize: 18, fontFamily: t.fontDisplayItalic,
                        letterSpacing: -0.4,
                      }}>
                        {s.value}
                      </Text>
                      {s.delta && (
                        <Text style={{
                          color: s.deltaVariant === 'good' ? t.good : s.deltaVariant === 'bad' ? t.bad : t.muted,
                          fontSize: 9, fontFamily: t.fontBodyBold, marginTop: 3,
                        }}>
                          {s.delta}
                        </Text>
                      )}
                    </View>
                  </NeumorphicView>
                )}
              </View>
            );
          })}
        </View>
      </NeumorphicView>
    </View>
  );
}

export function PulseStats({ stats }: Props) {
  const t = useTokens();

  if (isGlass(t)) return <GlassPulse stats={stats} t={t} />;
  if (isEditorial(t)) return <EditorialPulse stats={stats} t={t} />;
  return <NeumorphicPulse stats={stats} t={t} />;
}
