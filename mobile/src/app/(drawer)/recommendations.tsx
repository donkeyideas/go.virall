import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../contexts/theme-context';
import { useAuth } from '../../contexts/auth-context';
import { supabase } from '../../lib/supabase';
import { Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Card } from '../../components/ui/Card';
import { SectionTitle } from '../../components/ui/SectionTitle';
import { Pill } from '../../components/ui/Pill';

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

export default function RecommendationsScreen() {
  const { colors } = useTheme();
  const { organization } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!organization?.id) return;

    const { data: profs } = await supabase
      .from('social_profiles')
      .select('id')
      .eq('organization_id', organization.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!profs || profs.length === 0) return;

    const profileId = profs[0].id;

    const { data } = await supabase
      .from('social_analyses')
      .select('*')
      .eq('social_profile_id', profileId)
      .eq('analysis_type', 'insights')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (data) {
      const parsed = parseResult(data.result);
      const items = parsed?.insights || parsed?.recommendations || [];
      setInsights(Array.isArray(items) ? items : []);
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

  if (insights.length === 0) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Card>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No data available. Run this analysis from the web dashboard.
          </Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      <SectionTitle>Recommendations</SectionTitle>
      {insights.map((item: any, i: number) => {
        const title: string = item.title || item.headline || `Insight ${i + 1}`;
        const insightText: string = item.insight || item.description || item.summary || '';
        const priority: string = item.priority || item.level || '';
        const actionItem: string =
          item.actionItem || item.action_item || item.action || item.next_step || '';

        return (
          <Card key={i} style={styles.insightCard}>
            <Text style={[styles.insightTitle, { color: colors.primary }]}>{title}</Text>

            {insightText ? (
              <Text style={[styles.insightText, { color: colors.textSecondary }]}>
                {insightText}
              </Text>
            ) : null}

            {priority ? (
              <View style={styles.pillRow}>
                <Pill label={priority.charAt(0).toUpperCase() + priority.slice(1)} active />
              </View>
            ) : null}

            {actionItem ? (
              <Text style={[styles.actionText, { color: colors.textMuted }]}>{actionItem}</Text>
            ) : null}
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 100,
    gap: Spacing.lg,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  insightCard: {
    marginBottom: Spacing.sm,
  },
  insightTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  insightText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
