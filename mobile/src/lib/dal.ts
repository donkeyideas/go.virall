import { supabase } from './supabase';

// ── Social Profiles ─────────────────────────────────────────────────
export async function getSocialProfiles(orgId: string) {
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getSocialProfileById(id: string) {
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

// ── Social Metrics (time-series) ────────────────────────────────────
export async function getLatestMetrics(profileId: string, limit = 30) {
  const { data } = await supabase
    .from('social_metrics')
    .select('*')
    .eq('social_profile_id', profileId)
    .order('date', { ascending: true })
    .limit(limit);
  return data ?? [];
}

export async function getAllMetricsForOrg(orgId: string, limit = 30) {
  // Get all profiles, then their metrics
  const profiles = await getSocialProfiles(orgId);
  if (profiles.length === 0) return [];

  const ids = profiles.map((p: any) => p.id);
  const { data } = await supabase
    .from('social_metrics')
    .select('*')
    .in('social_profile_id', ids)
    .order('date', { ascending: true })
    .limit(limit * ids.length);
  return data ?? [];
}

// ── Analyses ────────────────────────────────────────────────────────
export async function getLatestAnalysis(profileId: string, type: string) {
  const { data } = await supabase
    .from('social_analyses')
    .select('*')
    .eq('social_profile_id', profileId)
    .eq('analysis_type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function getInsightsForProfile(profileId: string) {
  const { data } = await supabase
    .from('social_analyses')
    .select('*')
    .eq('social_profile_id', profileId)
    .in('analysis_type', ['insights', 'recommendations', 'content_strategy'])
    .order('created_at', { ascending: false })
    .limit(5);
  return data ?? [];
}

export async function getSmoScore(profileId: string) {
  const { data } = await supabase
    .from('social_analyses')
    .select('result')
    .eq('social_profile_id', profileId)
    .eq('analysis_type', 'smo_score')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data?.result ?? null;
}

// ── Deals ───────────────────────────────────────────────────────────
export async function getDeals(orgId: string) {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getDealDeliverables(dealId: string) {
  const { data } = await supabase
    .from('deal_deliverables')
    .select('*')
    .eq('deal_id', dealId)
    .order('deadline', { ascending: true });
  return data ?? [];
}

// ── Scheduled Posts ─────────────────────────────────────────────────
export async function getScheduledPosts(orgId: string) {
  // social_posts doesn't have org_id directly; check if it does or uses author
  const { data } = await supabase
    .from('social_posts')
    .select('*')
    .order('scheduled_at', { ascending: true });
  return data ?? [];
}

// ── Notifications ───────────────────────────────────────────────────
export async function getNotifications(orgId: string, limit = 20) {
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ── User Preferences ────────────────────────────────────────────────
export async function getUserPreferences(userId: string) {
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export async function updateUserPreferences(userId: string, prefs: Record<string, any>) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({ id: userId, ...prefs, updated_at: new Date().toISOString() });
  return { error: error?.message ?? null };
}

// ── Competitors ─────────────────────────────────────────────────────
export async function getCompetitors(profileId: string) {
  const { data } = await supabase
    .from('social_competitors')
    .select('*')
    .eq('social_profile_id', profileId)
    .order('followers_count', { ascending: false });
  return data ?? [];
}

// ── Goals ───────────────────────────────────────────────────────────
export async function getActiveGoal(profileId: string) {
  const { data } = await supabase
    .from('social_goals')
    .select('*')
    .eq('social_profile_id', profileId)
    .eq('is_active', true)
    .single();
  return data;
}

// ── Campaigns ───────────────────────────────────────────────────────
export async function getCampaigns(orgId: string) {
  const { data } = await supabase
    .from('campaigns')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ── AI Interactions (chat history) ──────────────────────────────────
export async function getAIInteractions(orgId: string, limit = 50) {
  const { data } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ── Billing ─────────────────────────────────────────────────────────
export async function getBillingEvents(orgId: string) {
  const { data } = await supabase
    .from('billing_events')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(12);
  return data ?? [];
}
