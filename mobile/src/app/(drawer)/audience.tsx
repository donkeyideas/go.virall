import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { trackEvent } from '../../lib/track';

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

export default function AudienceScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [audienceData, setAudienceData] = useState<any>(null);

  useEffect(() => { trackEvent('page_view', 'audience'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Get social profiles for this org
    const { data: profiles } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id);

    if (!profiles || profiles.length === 0) return;

    const profileIds = profiles.map((p: any) => p.id);

    // Fetch latest audience analysis
    const { data } = await supabase
      .from('social_analyses')
      .select('*')
      .in('social_profile_id', profileIds)
      .eq('analysis_type', 'audience')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setAudienceData(parseResult(data[0].result));
    } else {
      setAudienceData(null);
    }
  }, [organization?.id]);

  useEffect(() => {
    if (organization?.id) {
      setLoading(true);
      loadData().finally(() => setLoading(false));
    }
  }, [loadData, organization?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Extract audience fields from parsed data
  const audience = audienceData?.audience || audienceData || {};
  const ageRanges: any[] = audience.ageRanges ?? audience.age_ranges ?? audience.demographics?.ageRanges ?? audience.demographics?.age_ranges ?? [];
  const genderSplit = audience.genderSplit ?? audience.gender_split ?? audience.demographics?.genderSplit ?? audience.demographics?.gender_split ?? null;
  const topLocations: any[] = audience.topLocations ?? audience.top_locations ?? audience.locations ?? audience.topCities ?? audience.top_cities ?? [];
  const interests: any[] = audience.interests ?? audience.topInterests ?? audience.top_interests ?? [];

  const hasData = audienceData && (ageRanges.length > 0 || genderSplit || topLocations.length > 0 || interests.length > 0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Audience Insights</SectionTitle>

      {!hasData ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No audience insights yet. Run an analysis from the Overview.
          </Text>
        </Card>
      ) : (
        <>
          {/* Age Ranges */}
          {ageRanges.length > 0 && (
            <>
              <SectionTitle>Age Ranges</SectionTitle>
              <Card>
                {ageRanges.map((item: any, i: number) => {
                  const range = typeof item === 'string' ? item : item.range || item.label || item.age || '';
                  const pct = typeof item === 'object' ? item.percentage || item.pct || item.percent || null : null;
                  return (
                    <View key={i} style={audStyles.demographicRow}>
                      <Text style={[audStyles.demographicLabel, { color: colors.text }]}>{range}</Text>
                      {pct !== null && (
                        <>
                          <View style={[audStyles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                            <View
                              style={[
                                audStyles.barFill,
                                { width: `${Math.min(Number(pct), 100)}%`, backgroundColor: colors.primary },
                              ]}
                            />
                          </View>
                          <Text style={[audStyles.demographicPct, { color: colors.primary }]}>
                            {pct}%
                          </Text>
                        </>
                      )}
                    </View>
                  );
                })}
              </Card>
            </>
          )}

          {/* Gender Split */}
          {genderSplit && (
            <>
              <SectionTitle>Gender Split</SectionTitle>
              <Card>
                {typeof genderSplit === 'object' ? (
                  Object.entries(genderSplit).map(([gender, pct]: [string, any], i: number) => (
                    <View key={i} style={audStyles.demographicRow}>
                      <Text style={[audStyles.demographicLabel, { color: colors.text }]}>
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </Text>
                      <View style={[audStyles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                        <View
                          style={[
                            audStyles.barFill,
                            { width: `${Math.min(Number(pct), 100)}%`, backgroundColor: colors.accent },
                          ]}
                        />
                      </View>
                      <Text style={[audStyles.demographicPct, { color: colors.accent }]}>
                        {pct}%
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={[audStyles.genderText, { color: colors.text }]}>
                    {String(genderSplit)}
                  </Text>
                )}
              </Card>
            </>
          )}

          {/* Top Locations */}
          {topLocations.length > 0 && (
            <>
              <SectionTitle>Top Locations</SectionTitle>
              <Card>
                {topLocations.map((loc: any, i: number) => {
                  const name = typeof loc === 'string' ? loc : loc.name || loc.city || loc.location || loc.country || '';
                  const pct = typeof loc === 'object' ? loc.percentage || loc.pct || loc.percent || null : null;
                  return (
                    <View key={i} style={audStyles.locationRow}>
                      <Text style={[audStyles.locationName, { color: colors.text }]}>{name}</Text>
                      {pct !== null && (
                        <Text style={[audStyles.locationPct, { color: colors.textSecondary }]}>
                          {pct}%
                        </Text>
                      )}
                    </View>
                  );
                })}
              </Card>
            </>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <>
              <SectionTitle>Interests</SectionTitle>
              {interests.map((interest: any, i: number) => {
                const name = typeof interest === 'string' ? interest : interest.name || interest.label || interest.interest || '';
                const pct = typeof interest === 'object' ? interest.percentage || interest.pct || interest.percent || null : null;
                return (
                  <Card key={i}>
                    <View style={audStyles.interestRow}>
                      <Text style={[audStyles.interestName, { color: colors.text }]}>{name}</Text>
                      {pct !== null && (
                        <Text style={[audStyles.interestPct, { color: colors.primary }]}>
                          {pct}%
                        </Text>
                      )}
                    </View>
                    {pct !== null && (
                      <View style={[audStyles.barTrack, { backgroundColor: colors.surfaceLight }]}>
                        <View
                          style={[
                            audStyles.barFill,
                            { width: `${Math.min(Number(pct), 100)}%`, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                    )}
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, paddingBottom: 100, gap: Spacing.lg },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: FontSize.md, textAlign: 'center', lineHeight: 22 },
});

const audStyles = StyleSheet.create({
  demographicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    gap: Spacing.sm,
  },
  demographicLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    width: 60,
  },
  demographicPct: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    width: 42,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.sm,
  },
  genderText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  locationName: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  locationPct: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  interestRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  interestName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  interestPct: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
