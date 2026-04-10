/**
 * Go Virall — Weekly Report Generator.
 * Gathers performance data for a user's social profiles and generates
 * a professional HTML email with stats, trends, and AI content ideas.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { aiChat } from "@/lib/ai/provider";
import {
  emailWrapper,
  sectionHeader,
  statCard,
  compactStat,
  contentCard,
  ctaButton,
  postCard,
  numberedItem,
  divider,
  formatNumber,
  formatPercent,
  formatCurrency,
  trendFromDelta,
  dateRange,
  COLORS,
  escapeHtml,
  platformBadge,
} from "./templates";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ProfileMetrics {
  profileId: string;
  platform: string;
  handle: string;
  displayName: string;
  currentFollowers: number;
  previousFollowers: number;
  currentEngagement: number;
  previousEngagement: number;
  avatarUrl: string | null;
}

interface TopPost {
  caption: string;
  likesCount: number;
  commentsCount: number;
  imageUrl?: string;
  platform: string;
  timestamp?: string;
}

interface CompetitorInsight {
  title: string;
  description: string;
  priority: string;
}

interface DealSummary {
  newDeals: number;
  paymentsReceived: number;
  totalPipeline: number;
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function getUserData(userId: string) {
  const admin = createAdminClient();

  // Get user profile and org
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, organization_id, niche")
    .eq("id", userId)
    .single();

  if (!profile?.organization_id) return null;

  // Get user email from auth
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  return {
    name: profile.full_name || "Creator",
    email,
    orgId: profile.organization_id as string,
    niche: (profile as Record<string, unknown>).niche as string | null,
  };
}

async function getProfileMetrics(orgId: string): Promise<ProfileMetrics[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform, handle, display_name, followers_count, engagement_rate, avatar_url")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return [];

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const results: ProfileMetrics[] = [];

  for (const p of profiles) {
    // Current week metrics (most recent entry in last 7 days)
    const { data: currentMetrics } = await admin
      .from("social_metrics")
      .select("followers, engagement_rate")
      .eq("social_profile_id", p.id)
      .gte("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1);

    // Previous week metrics (most recent entry 8-14 days ago)
    const { data: prevMetrics } = await admin
      .from("social_metrics")
      .select("followers, engagement_rate")
      .eq("social_profile_id", p.id)
      .gte("date", twoWeeksAgo.toISOString().split("T")[0])
      .lt("date", weekAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1);

    const currentFollowers = currentMetrics?.[0]?.followers ?? p.followers_count ?? 0;
    const previousFollowers = prevMetrics?.[0]?.followers ?? currentFollowers;
    const currentEngagement = currentMetrics?.[0]?.engagement_rate ?? p.engagement_rate ?? 0;
    const previousEngagement = prevMetrics?.[0]?.engagement_rate ?? currentEngagement;

    results.push({
      profileId: p.id,
      platform: p.platform,
      handle: p.handle,
      displayName: p.display_name || p.handle,
      currentFollowers,
      previousFollowers,
      currentEngagement,
      previousEngagement,
      avatarUrl: p.avatar_url,
    });
  }

  return results;
}

async function getTopPosts(orgId: string, limit: number = 3): Promise<TopPost[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform, recent_posts")
    .eq("organization_id", orgId);

  if (!profiles) return [];

  const allPosts: TopPost[] = [];

  for (const profile of profiles) {
    const recentPosts = (profile.recent_posts ?? []) as Array<{
      caption?: string;
      likesCount?: number;
      commentsCount?: number;
      imageUrl?: string;
      timestamp?: string;
    }>;

    for (const post of recentPosts) {
      allPosts.push({
        caption: post.caption || "",
        likesCount: post.likesCount || 0,
        commentsCount: post.commentsCount || 0,
        imageUrl: post.imageUrl,
        platform: profile.platform,
        timestamp: post.timestamp,
      });
    }
  }

  // Sort by total engagement (likes + comments) and return top N
  allPosts.sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount));
  return allPosts.slice(0, limit);
}

async function getCompetitorInsights(orgId: string): Promise<CompetitorInsight[]> {
  const admin = createAdminClient();

  // Get all social profile IDs for this org
  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p: { id: string }) => p.id);

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const { data: insights } = await admin
    .from("competitor_insights")
    .select("title, description, priority")
    .in("social_profile_id", profileIds)
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(5);

  return (insights ?? []) as CompetitorInsight[];
}

async function getAudienceQualityScore(orgId: string): Promise<{ score: number; grade: string } | null> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return null;

  const profileIds = profiles.map((p: { id: string }) => p.id);

  const { data: aqsData } = await admin
    .from("audience_quality_scores")
    .select("overall_score, grade")
    .in("social_profile_id", profileIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!aqsData || aqsData.length === 0) return null;

  return {
    score: aqsData[0].overall_score ?? 0,
    grade: aqsData[0].grade ?? "N/A",
  };
}

async function getDealSummary(orgId: string): Promise<DealSummary> {
  const admin = createAdminClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // New deals this week
  const { count: newDeals } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", weekAgo.toISOString());

  // Payments received this week (deals marked paid recently)
  const { data: paidDeals } = await admin
    .from("deals")
    .select("paid_amount")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .gte("updated_at", weekAgo.toISOString());

  const paymentsReceived = (paidDeals ?? []).reduce((sum: number, d: { paid_amount: number | null }) => sum + (d.paid_amount || 0), 0);

  // Total pipeline value (active deals)
  const { data: activeDealValues } = await admin
    .from("deals")
    .select("total_value")
    .eq("organization_id", orgId)
    .in("status", ["inquiry", "negotiation", "active"]);

  const totalPipeline = (activeDealValues ?? []).reduce((sum: number, d: { total_value: number | null }) => sum + (d.total_value || 0), 0);

  return {
    newDeals: newDeals ?? 0,
    paymentsReceived,
    totalPipeline,
  };
}

// ─── AI Content Ideas ───────────────────────────────────────────────────────

async function generateContentIdeas(
  profileMetrics: ProfileMetrics[],
  topPosts: TopPost[],
  niche: string | null,
): Promise<string[]> {
  const profileSummaries = profileMetrics
    .map(
      (p) =>
        `${p.platform}/@${p.handle}: ${formatNumber(p.currentFollowers)} followers, ${formatPercent(p.currentEngagement)} engagement`,
    )
    .join("\n");

  const topPostSummaries = topPosts
    .map(
      (p) =>
        `[${p.platform}] "${p.caption?.slice(0, 80) || "N/A"}" — ${formatNumber(p.likesCount)} likes, ${formatNumber(p.commentsCount)} comments`,
    )
    .join("\n");

  const prompt = `You are a top-tier social media strategist for a content creator.

CREATOR PROFILES:
${profileSummaries}

NICHE: ${niche || "General/lifestyle"}

TOP PERFORMING POSTS THIS WEEK:
${topPostSummaries || "No recent post data available"}

Based on their performance data, niche, and what's currently trending in their space, generate exactly 3 specific, actionable content ideas for NEXT WEEK. Each idea should:
1. Be specific (not generic like "post more")
2. Reference their platform(s) and audience
3. Include a hook or angle
4. Be achievable in one week

Respond with a JSON array of 3 strings. Each string is one content idea (1-2 sentences max).
Example: ["Idea 1 text here", "Idea 2 text here", "Idea 3 text here"]

IMPORTANT: Respond ONLY with the JSON array. No markdown, no explanation.`;

  const response = await aiChat(prompt, {
    temperature: 0.8,
    maxTokens: 512,
    timeout: 30000,
    jsonMode: true,
  });

  if (!response) {
    return [
      "Create a behind-the-scenes reel showing your creative process — authenticity drives engagement.",
      "Post a carousel breaking down a trending topic in your niche with actionable takeaways.",
      "Go live for a Q&A session to boost algorithm visibility and deepen community connection.",
    ];
  }

  try {
    let parsed: string[];
    try {
      parsed = JSON.parse(response.text.trim());
    } catch {
      const match = response.text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("No JSON array found");
      parsed = JSON.parse(match[0]);
    }
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3).map((s) => String(s));
    }
  } catch {
    // Fall through to defaults
  }

  return [
    "Create a behind-the-scenes reel showing your creative process — authenticity drives engagement.",
    "Post a carousel breaking down a trending topic in your niche with actionable takeaways.",
    "Go live for a Q&A session to boost algorithm visibility and deepen community connection.",
  ];
}

// ─── HTML Generator ─────────────────────────────────────────────────────────

export async function generateWeeklyReport(userId: string): Promise<{
  html: string;
  email: string | null;
  userName: string;
} | null> {
  // 1. Get user data
  const userData = await getUserData(userId);
  if (!userData || !userData.email) return null;

  // 2. Fetch all data in parallel
  const [profileMetrics, topPosts, competitorInsights, aqsData, dealSummary] = await Promise.all([
    getProfileMetrics(userData.orgId),
    getTopPosts(userData.orgId, 3),
    getCompetitorInsights(userData.orgId),
    getAudienceQualityScore(userData.orgId),
    getDealSummary(userData.orgId),
  ]);

  // Skip if no social profiles connected
  if (profileMetrics.length === 0) return null;

  // 3. Generate AI content ideas
  const contentIdeas = await generateContentIdeas(profileMetrics, topPosts, userData.niche);

  // 4. Calculate aggregate stats
  const totalFollowers = profileMetrics.reduce((sum, p) => sum + p.currentFollowers, 0);
  const totalPreviousFollowers = profileMetrics.reduce((sum, p) => sum + p.previousFollowers, 0);
  const avgEngagement =
    profileMetrics.reduce((sum, p) => sum + p.currentEngagement, 0) / profileMetrics.length;
  const prevAvgEngagement =
    profileMetrics.reduce((sum, p) => sum + p.previousEngagement, 0) / profileMetrics.length;
  const followerGrowth = totalFollowers - totalPreviousFollowers;

  // 5. Build date range
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const reportDateRange = dateRange(weekAgo, now);

  // 6. Build HTML sections
  let html = "";

  // ── Greeting ──
  html += contentCard(`
    <p style="margin:0 0 4px 0;font-size:13px;color:${COLORS.secondaryText};text-transform:uppercase;letter-spacing:1px;font-weight:600;">Weekly Report</p>
    <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:${COLORS.primaryText};">
      Hey ${escapeHtml(userData.name.split(" ")[0])} 👋
    </h1>
    <p style="margin:0;font-size:14px;color:${COLORS.secondaryText};line-height:1.5;">
      Here's your performance summary for <strong style="color:${COLORS.primaryText};">${reportDateRange}</strong>. Let's see how you did this week.
    </p>
  `);

  // ── Follower & Engagement Overview ──
  html += sectionHeader("Performance Overview");

  // Stats row: Total Followers | Growth | Avg Engagement
  const followerTrend = trendFromDelta(totalFollowers, totalPreviousFollowers);
  const engagementTrend = trendFromDelta(avgEngagement, prevAvgEngagement);

  html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    ${compactStat("Total Followers", formatNumber(totalFollowers), followerTrend)}
    <td style="width:8px;"></td>
    ${compactStat("Growth", (followerGrowth >= 0 ? "+" : "") + formatNumber(followerGrowth), followerTrend)}
    <td style="width:8px;"></td>
    ${compactStat("Avg Engagement", formatPercent(avgEngagement), engagementTrend)}
  </tr>
</table>`;

  // ── Per-Platform Breakdown ──
  if (profileMetrics.length > 1) {
    html += sectionHeader("Platform Breakdown");
    for (const pm of profileMetrics) {
      const trend = trendFromDelta(pm.currentFollowers, pm.previousFollowers);
      const engTrend = trendFromDelta(pm.currentEngagement, pm.previousEngagement);
      html += contentCard(`
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              ${platformBadge(pm.platform)}
              <span style="margin-left:8px;font-size:15px;font-weight:600;color:${COLORS.primaryText};">@${escapeHtml(pm.handle)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-top:12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  ${compactStat("Followers", formatNumber(pm.currentFollowers), trend)}
                  <td style="width:8px;"></td>
                  ${compactStat("Engagement", formatPercent(pm.currentEngagement), engTrend)}
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `);
    }
  }

  // ── Top Performing Content ──
  if (topPosts.length > 0) {
    html += sectionHeader("Top Performing Content", "Your best posts this week by engagement");
    for (const post of topPosts) {
      html += postCard({
        caption: post.caption,
        likes: post.likesCount,
        comments: post.commentsCount,
        imageUrl: post.imageUrl,
        platform: post.platform,
      });
    }
  }

  // ── Competitor Insights ──
  if (competitorInsights.length > 0) {
    html += sectionHeader("Competitor Movements");
    html += contentCard(
      competitorInsights
        .map((ci) => {
          const priorityColor =
            ci.priority === "high" ? COLORS.red : ci.priority === "medium" ? COLORS.yellow : COLORS.green;
          return `<div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid ${COLORS.border};">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${priorityColor};margin-right:6px;vertical-align:middle;"></span>
            <span style="font-size:14px;font-weight:600;color:${COLORS.primaryText};">${escapeHtml(ci.title)}</span>
            <p style="margin:4px 0 0 14px;font-size:13px;color:${COLORS.secondaryText};line-height:1.4;">${escapeHtml(ci.description)}</p>
          </div>`;
        })
        .join(""),
    );
  }

  // ── AQS Score ──
  if (aqsData) {
    html += sectionHeader("Audience Quality");
    const gradeColor =
      aqsData.grade === "A" || aqsData.grade === "A+"
        ? COLORS.green
        : aqsData.grade.startsWith("B")
          ? COLORS.purpleLight
          : aqsData.grade.startsWith("C")
            ? COLORS.yellow
            : COLORS.red;

    html += statCard(
      "Audience Quality Score",
      `${aqsData.score}/100`,
      { direction: aqsData.score >= 70 ? "up" : aqsData.score >= 50 ? "flat" : "down", value: `Grade: ${aqsData.grade}` },
    );
    // Override the trend color to the grade color via a follow-up card note
    html += contentCard(
      `<p style="margin:0;font-size:13px;color:${COLORS.secondaryText};">Your audience quality grade is <strong style="color:${gradeColor};font-size:16px;">${escapeHtml(aqsData.grade)}</strong>. ${
        aqsData.score >= 70
          ? "Great job! Your audience is highly authentic."
          : aqsData.score >= 50
            ? "Room for improvement — focus on organic growth to boost this score."
            : "Consider auditing your audience — high bot/inactive follower counts lower your score."
      }</p>`,
    );
  }

  // ── Deals & Revenue ──
  if (dealSummary.newDeals > 0 || dealSummary.paymentsReceived > 0 || dealSummary.totalPipeline > 0) {
    html += sectionHeader("Deals & Revenue");
    html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      ${compactStat("New Deals", String(dealSummary.newDeals))}
      <td style="width:8px;"></td>
      ${compactStat("Payments Received", formatCurrency(dealSummary.paymentsReceived * 100))}
      <td style="width:8px;"></td>
      ${compactStat("Pipeline Value", formatCurrency(dealSummary.totalPipeline * 100))}
    </tr>
  </table>`;
  }

  // ── AI Content Ideas ──
  html += sectionHeader("Content Ideas for Next Week", "AI-powered suggestions based on your performance");
  for (let i = 0; i < contentIdeas.length; i++) {
    const parts = contentIdeas[i].split(/[:\u2014\u2013](.+)/);
    const title = parts.length > 1 ? parts[0].trim() : `Idea ${i + 1}`;
    const description = parts.length > 1 ? parts[1].trim() : contentIdeas[i];
    html += numberedItem(i + 1, title, description);
  }

  html += divider();

  // ── CTA ──
  html += ctaButton("View Full Dashboard", "https://govirall.com/dashboard");

  // 7. Wrap in email layout
  const fullHtml = emailWrapper(
    html,
    `Your Go Virall weekly report for ${reportDateRange} — ${followerGrowth >= 0 ? "+" : ""}${formatNumber(followerGrowth)} followers this week`,
  );

  return {
    html: fullHtml,
    email: userData.email,
    userName: userData.name,
  };
}
