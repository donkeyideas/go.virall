import { supabase } from './supabase';

// ── Social Profiles ─────────────────────────────────────────────────
export async function getSocialProfiles(orgId: string) {
  const { data } = await supabase
    .from('social_profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });
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
    .order('date', { ascending: false })
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
    .order('date', { ascending: false })
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
  const { data } = await supabase
    .from('scheduled_posts')
    .select('*')
    .eq('organization_id', orgId)
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

// ── Messages ───────────────────────────────────────────────────────
// Go through the Next.js API route (which uses the service role admin
// client) so we can read other participants' profile rows that RLS
// would otherwise block. This mirrors the web DAL in
// src/lib/dal/messages.ts that uses createAdminClient().
import { mobileApi } from './api';

export async function getThreadsForUser(_userId: string) {
  const { data } = await mobileApi<{ data: any[] }>('/api/mobile/messages');
  // API route returns `{ data: [...] }`; mobileApi wraps that again under `data`.
  return data?.data ?? [];
}

export async function getMessagesForThread(threadId: string, limit = 50) {
  const { data } = await mobileApi<{ data: any[] }>(
    `/api/mobile/messages?threadId=${encodeURIComponent(threadId)}&limit=${limit}`,
  );
  return data?.data ?? [];
}

export async function getUnreadCount(userId: string) {
  const [{ data: p1 }, { data: p2 }] = await Promise.all([
    supabase
      .from('message_threads')
      .select('unread_count_1')
      .eq('participant_1', userId),
    supabase
      .from('message_threads')
      .select('unread_count_2')
      .eq('participant_2', userId),
  ]);
  const sum1 = (p1 ?? []).reduce((s: number, r: any) => s + (r.unread_count_1 || 0), 0);
  const sum2 = (p2 ?? []).reduce((s: number, r: any) => s + (r.unread_count_2 || 0), 0);
  return sum1 + sum2;
}

// ── Proposals ──────────────────────────────────────────────────────
export async function getProposals(userId: string) {
  const { data } = await supabase
    .from('proposals')
    .select('*')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getProposalById(id: string) {
  const { data } = await supabase
    .from('proposals')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function getProposalEvents(proposalId: string) {
  const { data } = await supabase
    .from('proposal_events')
    .select('*')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true });
  return data ?? [];
}

// ── Revenue ────────────────────────────────────────────────────────
export async function getRevenueDeals(orgId: string) {
  const { data } = await supabase
    .from('deals')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getPaymentHistory(userId: string) {
  const { data } = await supabase
    .from('platform_payments')
    .select('*')
    .eq('payee_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ── Brand Matches (Opportunities) ──────────────────────────────────
export async function getBrandMatches(userId: string) {
  const { data } = await supabase
    .from('brand_creator_matches')
    .select('*, brand:profiles!brand_creator_matches_brand_profile_id_fkey(id, full_name, avatar_url, company_name, industry)')
    .eq('creator_profile_id', userId)
    .order('match_score', { ascending: false })
    .limit(50);
  return data ?? [];
}

// ── Trust Score ──────────────────────────────────────────────────
// Mirrors web DAL at src/lib/dal/trust.ts — respects is_public flag
// for non-owners. Own profile always returns full data.
export async function getTrustScore(profileId: string) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('trust_scores')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle();

  if (!data) return null;
  if (user?.id === profileId) return data;
  if (!data.is_public) return null;
  return data;
}

export async function getTrustScoreHistory(profileId: string, limit = 30) {
  const { data: { user } } = await supabase.auth.getUser();

  // Non-owners: only return if public
  if (user?.id !== profileId) {
    const { data: ts } = await supabase
      .from('trust_scores')
      .select('is_public')
      .eq('profile_id', profileId)
      .maybeSingle();
    if (!ts?.is_public) return [];
  }

  const { data } = await supabase
    .from('trust_score_history')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// ── Brand-Side Functions ──────────────────────────────────────────
export async function getBrandDeals(orgId: string) {
  const { data } = await supabase
    .from('deals')
    .select('*, deal_deliverables(*)')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getBrandProposals(userId: string) {
  const { data } = await supabase
    .from('proposals')
    .select('*, sender:profiles!proposals_sender_id_fkey(id, full_name, avatar_url, company_name), receiver:profiles!proposals_receiver_id_fkey(id, full_name, avatar_url, company_name)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getBrandPayments(orgId: string) {
  const { data } = await supabase
    .from('platform_payments')
    .select('*')
    .eq('payer_org_id', orgId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getCreatorMatches(brandProfileId: string) {
  const { data } = await supabase
    .from('brand_creator_matches')
    .select('*, creator:profiles!brand_creator_matches_creator_profile_id_fkey(id, full_name, avatar_url, company_name, industry)')
    .eq('brand_profile_id', brandProfileId)
    .order('match_score', { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function searchCreators(query?: string, niche?: string, platform?: string, limit = 20) {
  let q = supabase
    .from('profiles')
    .select('id, full_name, avatar_url, company_name, industry, account_type, created_at')
    .eq('account_type', 'creator')
    .limit(limit);

  if (query) q = q.ilike('full_name', `%${query}%`);
  if (niche) q = q.ilike('industry', `%${niche}%`);

  const { data } = await q;

  if (!data || data.length === 0) return [];

  // Enrich with social stats
  const ids = data.map((p: any) => p.id);
  const { data: socials } = await supabase
    .from('social_profiles')
    .select('organization_id, platform, followers_count, engagement_rate, is_verified')
    .in('organization_id', ids);

  const socialMap = new Map<string, any[]>();
  (socials ?? []).forEach((s: any) => {
    const arr = socialMap.get(s.organization_id) ?? [];
    arr.push(s);
    socialMap.set(s.organization_id, arr);
  });

  return data.map((p: any) => {
    const profiles = socialMap.get(p.id) ?? [];
    const totalFollowers = profiles.reduce((s: number, sp: any) => s + (sp.followers_count || 0), 0);
    const avgEngagement = profiles.length > 0
      ? profiles.reduce((s: number, sp: any) => s + (sp.engagement_rate || 0), 0) / profiles.length
      : 0;
    return {
      ...p,
      totalFollowers,
      avgEngagement,
      platforms: profiles.map((sp: any) => sp.platform),
      isVerified: profiles.some((sp: any) => sp.is_verified),
    };
  });
}

// ── Marketplace ──────────────────────────────────────────────────
export async function getMarketplaceCreators(limit = 20) {
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, company_name, industry, account_type')
    .eq('account_type', 'creator')
    .limit(limit);

  if (!data || data.length === 0) return [];

  const ids = data.map((p: any) => p.id);
  const { data: socials } = await supabase
    .from('social_profiles')
    .select('organization_id, platform, followers_count, engagement_rate, is_verified')
    .in('organization_id', ids);

  const socialMap = new Map<string, any[]>();
  (socials ?? []).forEach((s: any) => {
    const arr = socialMap.get(s.organization_id) ?? [];
    arr.push(s);
    socialMap.set(s.organization_id, arr);
  });

  return data.map((p: any) => {
    const profiles = socialMap.get(p.id) ?? [];
    const totalFollowers = profiles.reduce((s: number, sp: any) => s + (sp.followers_count || 0), 0);
    const avgEngagement = profiles.length > 0
      ? profiles.reduce((s: number, sp: any) => s + (sp.engagement_rate || 0), 0) / profiles.length
      : 0;
    return { ...p, totalFollowers, avgEngagement, platforms: profiles.map((sp: any) => sp.platform) };
  });
}

// ── Trending Topics ────────────────────────────────────────────────
export async function getTrendingTopics(platform?: string, niche?: string, limit = 50) {
  let query = supabase
    .from('trending_topics')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('trend_score', { ascending: false })
    .limit(limit);

  if (platform && platform !== 'all') query = query.eq('platform', platform);
  if (niche) query = query.eq('niche', niche);

  const { data } = await query;
  return data ?? [];
}
