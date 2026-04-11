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
    try { return JSON.parse(result.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  if (typeof result === 'object' && result.raw && typeof result.raw === 'string') {
    try { return JSON.parse(result.raw.replace(/```json\s*/g, '').replace(/```/g, '').trim()); } catch { return null; }
  }
  return result;
}

export default function NetworkScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkData, setNetworkData] = useState<any>(null);

  useEffect(() => { trackEvent('page_view', 'network'); }, []);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    // Load social profiles for the org
    const { data: profiles } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id)
      .order('followers_count', { ascending: false });

    if (!profiles || profiles.length === 0) {
      setNetworkData(null);
      return;
    }

    const profileIds = profiles.map((p: any) => p.id);

    // Load network analysis from social_analyses table
    const { data } = await supabase
      .from('social_analyses')
      .select('*')
      .in('social_profile_id', profileIds)
      .eq('analysis_type', 'network')
      .order('created_at', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      setNetworkData(parseResult(data[0].result));
    } else {
      setNetworkData(null);
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

  const network = networkData?.network || networkData;
  const connections: any[] = network?.connections || network?.key_connections || [];
  const collaborations: any[] = network?.collaborations || network?.collaboration_opportunities || [];
  const communityStrength = network?.communityStrength ?? network?.community_strength ?? null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Network Insights</SectionTitle>

      {!networkData ? (
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No network analysis data. Run an analysis from the Overview.
          </Text>
        </Card>
      ) : (
        <>
          {/* Community Strength */}
          {communityStrength !== null && (
            <>
              <SectionTitle>Community Strength</SectionTitle>
              <Card>
                <Text style={[styles.scoreValue, { color: colors.primary }]}>
                  {typeof communityStrength === 'object'
                    ? (communityStrength.score ?? communityStrength.overall ?? 'N/A')
                    : communityStrength}
                </Text>
                <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>
                  {typeof communityStrength === 'object' && communityStrength.label
                    ? communityStrength.label
                    : 'Overall Strength'}
                </Text>
              </Card>
            </>
          )}

          {/* Connections */}
          {connections.length > 0 && (
            <>
              <SectionTitle>Key Connections</SectionTitle>
              {connections.map((conn: any, i: number) => {
                const name = typeof conn === 'string' ? conn : conn.name || conn.handle || conn.title || '';
                const desc = typeof conn === 'object' ? conn.description || conn.reason || '' : '';
                return (
                  <Card key={i}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{name}</Text>
                    {desc ? (
                      <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{desc}</Text>
                    ) : null}
                  </Card>
                );
              })}
            </>
          )}

          {/* Collaboration Opportunities */}
          {collaborations.length > 0 && (
            <>
              <SectionTitle>Collaboration Opportunities</SectionTitle>
              {collaborations.map((collab: any, i: number) => {
                const title = typeof collab === 'string' ? collab : collab.title || collab.name || collab.opportunity || '';
                const desc = typeof collab === 'object' ? collab.description || collab.details || '' : '';
                return (
                  <Card key={i}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{title}</Text>
                    {desc ? (
                      <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{desc}</Text>
                    ) : null}
                  </Card>
                );
              })}
            </>
          )}

          {/* Fallback if parsed data has no recognized keys */}
          {connections.length === 0 && collaborations.length === 0 && communityStrength === null && (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Network data is available but could not be displayed. Try running a new analysis.
              </Text>
            </Card>
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
  scoreValue: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  scoreLabel: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  itemDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
