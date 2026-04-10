/**
 * Go Virall — Monthly Report Generator.
 * Comprehensive monthly performance newsletter with charts,
 * top content, revenue summary, and AI strategy brief.
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
  progressBar,
  barChart,
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

interface MonthlyProfileData {
  profileId: string;
  platform: string;
  handle: string;
  displayName: string;
  startFollowers: number;
  endFollowers: number;
  startEngagement: number;
  endEngagement: number;
  avgLikes: number;
  avgComments: number;
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

interface AQSChange {
  currentScore: number;
  currentGrade: string;
  previousScore: number | null;
}

interface GoalProgress {
  objective: string;
  targetValue: number;
  currentValue: number;
  targetDays: number;
  daysElapsed: number;
}

// ─── Data Fetchers ──────────────────────────────────────────────────────────

async function getUserData(userId: string) {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, organization_id, niche")
    .eq("id", userId)
    .single();

  if (!profile?.organization_id) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email ?? null;

  const { data: org } = await admin
    .from("organizations")
    .select("name, plan")
    .eq("id", profile.organization_id)
    .single();

  return {
    name: profile.full_name || "Creator",
    email,
    orgId: profile.organization_id as string,
    orgName: org?.name || "My Dashboard",
    plan: org?.plan || "free",
    niche: (profile as Record<string, unknown>).niche as string | null,
  };
}

async function getMonthlyProfileData(orgId: string): Promise<MonthlyProfileData[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, platform, handle, display_name, followers_count, engagement_rate, avatar_url")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return [];

  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

  const results: MonthlyProfileData[] = [];

  for (const p of profiles) {
    // End of period (most recent in last 30 days)
    const { data: endMetrics } = await admin
      .from("social_metrics")
      .select("followers, engagement_rate, avg_likes, avg_comments")
      .eq("social_profile_id", p.id)
      .gte("date", monthAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1);

    // Start of period (earliest in 30-60 days ago, or oldest in last 30 days)
    const { data: startMetrics } = await admin
      .from("social_metrics")
      .select("followers, engagement_rate")
      .eq("social_profile_id", p.id)
      .gte("date", twoMonthsAgo.toISOString().split("T")[0])
      .lt("date", monthAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(1);

    const endFollowers = endMetrics?.[0]?.followers ?? p.followers_count ?? 0;
    const startFollowers = startMetrics?.[0]?.followers ?? endFollowers;
    const endEngagement = endMetrics?.[0]?.engagement_rate ?? p.engagement_rate ?? 0;
    const startEngagement = startMetrics?.[0]?.engagement_rate ?? endEngagement;

    results.push({
      profileId: p.id,
      platform: p.platform,
      handle: p.handle,
      displayName: p.display_name || p.handle,
      startFollowers,
      endFollowers,
      startEngagement,
      endEngagement,
      avgLikes: endMetrics?.[0]?.avg_likes ?? 0,
      avgComments: endMetrics?.[0]?.avg_comments ?? 0,
      avatarUrl: p.avatar_url,
    });
  }

  return results;
}

async function getTopPosts(orgId: string, limit: number = 5): Promise<TopPost[]> {
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

  allPosts.sort((a, b) => (b.likesCount + b.commentsCount) - (a.likesCount + a.commentsCount));
  return allPosts.slice(0, limit);
}

async function getAQSChange(orgId: string): Promise<AQSChange | null> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return null;

  const profileIds = profiles.map((p: { id: string }) => p.id);

  // Get latest AQS
  const { data: latestAqs } = await admin
    .from("audience_quality_scores")
    .select("overall_score, grade, created_at")
    .in("social_profile_id", profileIds)
    .order("created_at", { ascending: false })
    .limit(1);

  if (!latestAqs || latestAqs.length === 0) return null;

  // Get AQS from ~30 days ago
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data: previousAqs } = await admin
    .from("audience_quality_scores")
    .select("overall_score")
    .in("social_profile_id", profileIds)
    .lte("created_at", monthAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  return {
    currentScore: latestAqs[0].overall_score ?? 0,
    currentGrade: latestAqs[0].grade ?? "N/A",
    previousScore: previousAqs?.[0]?.overall_score ?? null,
  };
}

async function getMonthlyRevenue(orgId: string): Promise<{
  totalEarned: number;
  dealsCompleted: number;
  pipelineValue: number;
  newDeals: number;
}> {
  const admin = createAdminClient();
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  // Completed deals this month
  const { data: completedDeals } = await admin
    .from("deals")
    .select("paid_amount, total_value")
    .eq("organization_id", orgId)
    .eq("status", "completed")
    .gte("updated_at", monthAgo.toISOString());

  const totalEarned = (completedDeals ?? []).reduce((sum: number, d: { paid_amount: number | null }) => sum + (d.paid_amount || 0), 0);
  const dealsCompleted = completedDeals?.length ?? 0;

  // New deals this month
  const { count: newDeals } = await admin
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .gte("created_at", monthAgo.toISOString());

  // Active pipeline value
  const { data: activeDealValues } = await admin
    .from("deals")
    .select("total_value")
    .eq("organization_id", orgId)
    .in("status", ["inquiry", "negotiation", "active"]);

  const pipelineValue = (activeDealValues ?? []).reduce((sum: number, d: { total_value: number | null }) => sum + (d.total_value || 0), 0);

  return {
    totalEarned,
    dealsCompleted,
    pipelineValue,
    newDeals: newDeals ?? 0,
  };
}

async function getCompetitorBenchmarks(orgId: string): Promise<string[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p: { id: string }) => p.id);

  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);

  const { data: insights } = await admin
    .from("competitor_insights")
    .select("title, description, priority")
    .in("social_profile_id", profileIds)
    .gte("created_at", monthAgo.toISOString())
    .eq("priority", "high")
    .order("created_at", { ascending: false })
    .limit(3);

  return (insights ?? []).map(
    (i: { title: string; description: string }) => `${i.title}: ${i.description}`,
  );
}

async function getGoalProgress(orgId: string): Promise<GoalProgress[]> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("social_profiles")
    .select("id, followers_count")
    .eq("organization_id", orgId);

  if (!profiles || profiles.length === 0) return [];

  const profileIds = profiles.map((p: { id: string; followers_count: number }) => p.id);

  const { data: goals } = await admin
    .from("social_goals")
    .select("social_profile_id, primary_objective, target_value, target_days, created_at")
    .in("social_profile_id", profileIds)
    .eq("is_active", true);

  if (!goals || goals.length === 0) return [];

  return goals.map((g: { social_profile_id: string; primary_objective: string; target_value: number; target_days: number; created_at: string }) => {
    const matchingProfile = profiles.find((p: { id: string; followers_count: number }) => p.id === g.social_profile_id);
    const currentValue = matchingProfile?.followers_count ?? 0;
    const createdAt = new Date(g.created_at);
    const daysElapsed = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

    return {
      objective: g.primary_objective || "grow_followers",
      targetValue: g.target_value || 0,
      currentValue,
      targetDays: g.target_days || 90,
      daysElapsed,
    };
  });
}

// ─── AI Strategy Brief ─────────────────────────────────────────────────────

async function generateStrategyBrief(
  profileData: MonthlyProfileData[],
  topPosts: TopPost[],
  revenue: { totalEarned: number; dealsCompleted: number; pipelineValue: number },
  niche: string | null,
  competitorHighlights: string[],
): Promise<string> {
  const profileSummaries = profileData
    .map(
      (p) =>
        `${p.platform}/@${p.handle}: ${formatNumber(p.startFollowers)} -> ${formatNumber(p.endFollowers)} followers (${p.endFollowers >= p.startFollowers ? "+" : ""}${formatNumber(p.endFollowers - p.startFollowers)}), Engagement: ${formatPercent(p.startEngagement)} -> ${formatPercent(p.endEngagement)}`,
    )
    .join("\n");

  const topPostSummaries = topPosts
    .slice(0, 5)
    .map(
      (p) =>
        `[${p.platform}] "${p.caption?.slice(0, 60) || "N/A"}" — ${formatNumber(p.likesCount)} likes, ${formatNumber(p.commentsCount)} comments`,
    )
    .join("\n");

  const prompt = `You are a senior social media strategist writing a monthly performance brief for a content creator.

CREATOR NICHE: ${niche || "General/lifestyle"}

MONTHLY PERFORMANCE:
${profileSummaries}

TOP POSTS:
${topPostSummaries || "No post data available"}

REVENUE: $${revenue.totalEarned} earned, ${revenue.dealsCompleted} deals completed, $${revenue.pipelineValue} in pipeline

COMPETITOR HIGHLIGHTS:
${competitorHighlights.length > 0 ? competitorHighlights.join("\n") : "No competitor data available"}

Write exactly 3 paragraphs (each 2-3 sentences):
1. **Month in Review**: Summarize their overall performance — what went well and what needs attention.
2. **Key Opportunities**: Based on their data, what specific opportunities should they pursue next month?
3. **Strategic Recommendations**: Actionable next steps for growth, content, and monetization.

Be specific, data-driven, and encouraging but honest. Reference actual numbers from the data.

IMPORTANT: Respond with ONLY the 3 paragraphs, separated by newlines. No headers, no bullets, no markdown.`;

  const response = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 768,
    timeout: 45000,
  });

  if (!response) {
    return "This month showed steady progress across your connected profiles. Continue focusing on consistent posting and engaging with your community to maintain momentum.\n\nLook for collaboration opportunities with creators in your niche to expand your reach. Cross-platform content repurposing can help you maximize the value of your top-performing posts.\n\nFor next month, prioritize engagement over follower count. Respond to comments within the first hour, experiment with new content formats, and consider leveraging trending audio/topics for increased visibility.";
  }

  return response.text.trim();
}

// ─── HTML Generator ─────────────────────────────────────────────────────────

export async function generateMonthlyReport(userId: string): Promise<{
  html: string;
  email: string | null;
  userName: string;
} | null> {
  // 1. Get user data
  const userData = await getUserData(userId);
  if (!userData || !userData.email) return null;

  // 2. Fetch all data in parallel
  const [profileData, topPosts, aqsChange, revenue, competitorHighlights, goalProgress] =
    await Promise.all([
      getMonthlyProfileData(userData.orgId),
      getTopPosts(userData.orgId, 5),
      getAQSChange(userData.orgId),
      getMonthlyRevenue(userData.orgId),
      getCompetitorBenchmarks(userData.orgId),
      getGoalProgress(userData.orgId),
    ]);

  // Skip if no social profiles
  if (profileData.length === 0) return null;

  // 3. Generate AI strategy brief
  const strategyBrief = await generateStrategyBrief(
    profileData,
    topPosts,
    revenue,
    userData.niche,
    competitorHighlights,
  );

  // 4. Calculate aggregate stats
  const totalEndFollowers = profileData.reduce((sum, p) => sum + p.endFollowers, 0);
  const totalStartFollowers = profileData.reduce((sum, p) => sum + p.startFollowers, 0);
  const monthlyGrowth = totalEndFollowers - totalStartFollowers;
  const avgEndEngagement =
    profileData.reduce((sum, p) => sum + p.endEngagement, 0) / profileData.length;
  const avgStartEngagement =
    profileData.reduce((sum, p) => sum + p.startEngagement, 0) / profileData.length;

  // 5. Date range
  const now = new Date();
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);
  const reportDateRange = dateRange(monthAgo, now);
  const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // 6. Build HTML
  let html = "";

  // ── Header Card ──
  html += contentCard(`
    <p style="margin:0 0 4px 0;font-size:13px;color:${COLORS.accent};text-transform:uppercase;letter-spacing:1px;font-weight:700;">Monthly Report</p>
    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:800;color:${COLORS.primaryText};">
      Your ${escapeHtml(monthName)} Recap
    </h1>
    <p style="margin:0;font-size:14px;color:${COLORS.secondaryText};line-height:1.5;">
      Hey ${escapeHtml(userData.name.split(" ")[0])}, here's your comprehensive performance report for <strong style="color:${COLORS.primaryText};">${reportDateRange}</strong>.
      Let's dive into the numbers and strategize for the month ahead.
    </p>
  `);

  // ── Key Metrics Overview ──
  html += sectionHeader("Key Metrics");
  const followerTrend = trendFromDelta(totalEndFollowers, totalStartFollowers);
  const engagementTrend = trendFromDelta(avgEndEngagement, avgStartEngagement);

  html += statCard("Total Followers", formatNumber(totalEndFollowers), followerTrend);

  html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    ${compactStat("Monthly Growth", (monthlyGrowth >= 0 ? "+" : "") + formatNumber(monthlyGrowth), followerTrend)}
    <td style="width:8px;"></td>
    ${compactStat("Avg Engagement", formatPercent(avgEndEngagement), engagementTrend)}
    <td style="width:8px;"></td>
    ${compactStat("Profiles", String(profileData.length))}
  </tr>
</table>`;

  // ── Follower Growth by Platform (bar chart) ──
  html += sectionHeader("Follower Growth by Platform", "30-day change across all connected profiles");

  const chartItems = profileData.map((p) => {
    const growth = p.endFollowers - p.startFollowers;
    const platformColors: Record<string, string> = {
      instagram: "#E1306C",
      tiktok: "#00F2EA",
      youtube: "#FF0000",
      twitter: "#1DA1F2",
      linkedin: "#0A66C2",
      threads: "#A78BFA",
      pinterest: "#E60023",
      twitch: "#9146FF",
    };
    return {
      label: `@${p.handle}`,
      value: Math.max(0, growth),
      color: platformColors[p.platform] || COLORS.purple,
    };
  });

  if (chartItems.some((item) => item.value > 0)) {
    html += contentCard(barChart(chartItems));
  }

  // ── Per-Platform Detail ──
  html += sectionHeader("Platform Details");
  for (const pd of profileData) {
    const growth = pd.endFollowers - pd.startFollowers;
    const growthPct = pd.startFollowers > 0 ? ((growth / pd.startFollowers) * 100).toFixed(1) : "0.0";
    const fTrend = trendFromDelta(pd.endFollowers, pd.startFollowers);
    const eTrend = trendFromDelta(pd.endEngagement, pd.startEngagement);

    html += contentCard(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="vertical-align:middle;padding-bottom:12px;">
            ${platformBadge(pd.platform)}
            <span style="margin-left:8px;font-size:16px;font-weight:700;color:${COLORS.primaryText};">@${escapeHtml(pd.handle)}</span>
          </td>
        </tr>
        <tr>
          <td>
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                ${compactStat("Followers", formatNumber(pd.endFollowers), fTrend)}
                <td style="width:8px;"></td>
                ${compactStat("Growth", `${growth >= 0 ? "+" : ""}${growthPct}%`)}
                <td style="width:8px;"></td>
                ${compactStat("Engagement", formatPercent(pd.endEngagement), eTrend)}
              </tr>
            </table>
          </td>
        </tr>
        ${pd.avgLikes > 0 || pd.avgComments > 0 ? `
        <tr>
          <td style="padding-top:8px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                ${compactStat("Avg Likes", formatNumber(pd.avgLikes))}
                <td style="width:8px;"></td>
                ${compactStat("Avg Comments", formatNumber(pd.avgComments))}
              </tr>
            </table>
          </td>
        </tr>` : ""}
      </table>
    `);
  }

  // ── Top 5 Performing Posts ──
  if (topPosts.length > 0) {
    html += sectionHeader("Top Performing Content", "Your best posts this month ranked by engagement");
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

  // ── AQS Changes ──
  if (aqsChange) {
    html += sectionHeader("Audience Quality Score");
    const previousLabel = aqsChange.previousScore !== null ? ` (was ${aqsChange.previousScore})` : "";
    const aqsTrend =
      aqsChange.previousScore !== null
        ? trendFromDelta(aqsChange.currentScore, aqsChange.previousScore)
        : undefined;
    const gradeColor =
      aqsChange.currentGrade === "A" || aqsChange.currentGrade === "A+"
        ? COLORS.green
        : aqsChange.currentGrade.startsWith("B")
          ? COLORS.purpleLight
          : aqsChange.currentGrade.startsWith("C")
            ? COLORS.yellow
            : COLORS.red;

    html += statCard(`AQS Score${previousLabel}`, `${aqsChange.currentScore}/100`, aqsTrend);
    html += contentCard(
      `<p style="margin:0;font-size:14px;color:${COLORS.secondaryText};line-height:1.5;">
        Your audience quality grade: <strong style="color:${gradeColor};font-size:18px;">${escapeHtml(aqsChange.currentGrade)}</strong>
        ${
          aqsChange.previousScore !== null
            ? aqsChange.currentScore > aqsChange.previousScore
              ? `<br/>Up from ${aqsChange.previousScore} last month. Your audience quality is improving.`
              : aqsChange.currentScore < aqsChange.previousScore
                ? `<br/>Down from ${aqsChange.previousScore} last month. Consider focusing on organic growth.`
                : `<br/>Stable from last month. Keep your current growth strategy going.`
            : ""
        }
      </p>`,
    );
  }

  // ── Revenue Summary ──
  if (revenue.totalEarned > 0 || revenue.newDeals > 0 || revenue.pipelineValue > 0) {
    html += sectionHeader("Revenue & Deals", "Your monetization performance this month");

    html += statCard("Total Earned", formatCurrency(revenue.totalEarned * 100));

    html += `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      ${compactStat("Deals Completed", String(revenue.dealsCompleted))}
      <td style="width:8px;"></td>
      ${compactStat("New Deals", String(revenue.newDeals))}
      <td style="width:8px;"></td>
      ${compactStat("Pipeline Value", formatCurrency(revenue.pipelineValue * 100))}
    </tr>
  </table>`;
  }

  // ── Competitor Benchmarking ──
  if (competitorHighlights.length > 0) {
    html += sectionHeader("Competitor Benchmarking", "Key movements from your competitive landscape");
    html += contentCard(
      competitorHighlights
        .map(
          (h) =>
            `<div style="margin-bottom:10px;padding-left:12px;border-left:3px solid ${COLORS.accent};">
              <p style="margin:0;font-size:13px;color:${COLORS.primaryText};line-height:1.5;">${escapeHtml(h)}</p>
            </div>`,
        )
        .join(""),
    );
  }

  // ── Goal Progress ──
  if (goalProgress.length > 0) {
    html += sectionHeader("Goal Progress");
    for (const goal of goalProgress) {
      const objectiveLabels: Record<string, string> = {
        grow_followers: "Follower Growth",
        increase_engagement: "Increase Engagement",
        monetize: "Monetization",
        build_brand: "Brand Building",
        drive_traffic: "Drive Traffic",
      };
      const label = objectiveLabels[goal.objective] || goal.objective;
      const pct =
        goal.targetValue > 0
          ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
          : 0;
      const daysRemaining = Math.max(0, goal.targetDays - goal.daysElapsed);

      html += contentCard(`
        <p style="margin:0 0 8px 0;font-size:15px;font-weight:600;color:${COLORS.primaryText};">${escapeHtml(label)}</p>
        <p style="margin:0 0 8px 0;font-size:12px;color:${COLORS.secondaryText};">
          ${formatNumber(goal.currentValue)} / ${formatNumber(goal.targetValue)} &middot; ${daysRemaining} days remaining
        </p>
        ${progressBar(pct, pct >= 75 ? COLORS.green : pct >= 40 ? COLORS.yellow : COLORS.accent)}
      `);
    }
  }

  // ── AI Strategy Brief ──
  html += sectionHeader("AI Strategy Brief", "Personalized analysis and recommendations from Go Virall AI");

  const paragraphs = strategyBrief.split("\n").filter((p) => p.trim());
  const briefHtml = paragraphs
    .map(
      (p, i) =>
        `<p style="margin:${i === 0 ? "0" : "16px 0 0 0"};font-size:14px;color:${COLORS.primaryText};line-height:1.7;">${escapeHtml(p.trim())}</p>`,
    )
    .join("");

  html += contentCard(
    `<div style="border-left:3px solid ${COLORS.purple};padding-left:16px;">
      ${briefHtml}
    </div>`,
  );

  html += divider();

  // ── CTA ──
  html += ctaButton("View Full Dashboard", "https://govirall.com/dashboard");

  html += contentCard(`
    <p style="margin:0;font-size:13px;color:${COLORS.secondaryText};text-align:center;line-height:1.5;">
      Want more detailed insights? Upgrade your plan for real-time competitor tracking, unlimited AI analyses, and advanced audience quality scoring.
    </p>
    <div style="text-align:center;margin-top:12px;">
      <a href="https://govirall.com/dashboard/settings" style="color:${COLORS.linkBlue};font-size:13px;text-decoration:underline;">Explore Plans</a>
    </div>
  `);

  // 7. Wrap in email layout
  const fullHtml = emailWrapper(
    html,
    `Your ${monthName} Go Virall monthly report — ${monthlyGrowth >= 0 ? "+" : ""}${formatNumber(monthlyGrowth)} followers, ${formatCurrency(revenue.totalEarned * 100)} earned`,
  );

  return {
    html: fullHtml,
    email: userData.email,
    userName: userData.name,
  };
}
