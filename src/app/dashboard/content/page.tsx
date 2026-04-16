import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResults, getCachedContentResults } from "@/lib/dal/analyses";
import { getTrendingTopics } from "@/lib/ai/trend-intelligence";
import { ContentHubClient } from "./ContentHubClient";
import type { ScheduledPost, SocialProfile } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function ContentPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const tab = params.tab || "ai-studio";

  if (tab === "ai-studio") {
    const profiles = await getSocialProfiles();
    const ids = profiles.map((p) => p.id);
    const [cachedInsights, cachedContent] = await Promise.all([
      getCachedResults(ids, "insights"),
      getCachedContentResults(ids),
    ]);
    return (
      <Suspense>
        <ContentHubClient
          activeTab="ai-studio"
          profiles={profiles}
          cachedInsights={cachedInsights}
          cachedContent={cachedContent}
        />
      </Suspense>
    );
  }

  if (tab === "hashtags") {
    const initialTopics = await getTrendingTopics(undefined, undefined, 50);
    return (
      <Suspense>
        <ContentHubClient activeTab="hashtags" initialTopics={initialTopics} />
      </Suspense>
    );
  }

  // Default: publish tab
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) redirect("/welcome");

  const [postsResult, socialProfilesResult, dealsResult] = await Promise.all([
    admin
      .from("scheduled_posts")
      .select("*")
      .eq("organization_id", orgId)
      .order("scheduled_at", { ascending: true }),
    admin
      .from("social_profiles")
      .select("*")
      .eq("organization_id", orgId)
      .order("platform", { ascending: true }),
    admin
      .from("deals")
      .select("id, brand_name, total_value, pipeline_stage, created_at, updated_at, brand_profile_id, proposal_id, contact_email, notes, paid_amount, brand_profile:profiles!brand_profile_id(brand_logo_url), proposal:proposals!proposal_id(start_date, end_date), deliverables:deal_deliverables(id, status)")
      .eq("organization_id", orgId)
      .in("status", ["active", "inquiry", "negotiation"]),
  ]);

  const posts = (postsResult.data ?? []) as ScheduledPost[];
  const publishProfiles = (socialProfilesResult.data ?? []) as SocialProfile[];

  // Build deal events — use proposal dates if available, fallback to created_at/updated_at
  const dealEvents = (dealsResult.data ?? []).map((d: Record<string, unknown>) => {
    const brandProfile = Array.isArray(d.brand_profile) ? d.brand_profile[0] as { brand_logo_url: string | null } | undefined : d.brand_profile as { brand_logo_url: string | null } | null;
    const proposal = Array.isArray(d.proposal) ? d.proposal[0] as { start_date: string | null; end_date: string | null } | undefined : d.proposal as { start_date: string | null; end_date: string | null } | null;
    const deliverables = Array.isArray(d.deliverables) ? d.deliverables as { id: string; status: string }[] : [];
    return {
      id: d.id as string,
      title: d.brand_name as string,
      startDate: (proposal?.start_date || d.created_at) as string,
      endDate: (proposal?.end_date || d.updated_at) as string,
      value: d.total_value as number | null,
      stage: d.pipeline_stage as string,
      logoUrl: brandProfile?.brand_logo_url ?? null,
      proposalId: d.proposal_id as string | null,
      contactEmail: d.contact_email as string | null,
      notes: d.notes as string | null,
      paidAmount: d.paid_amount as number | null,
      deliverablesCount: deliverables.length,
      completedDeliverables: deliverables.filter((dl) => dl.status === "approved").length,
    };
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const publishStats = {
    total: posts.length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter(
      (p) =>
        p.status === "published" &&
        p.published_at &&
        p.published_at >= monthStart &&
        p.published_at <= monthEnd,
    ).length,
    drafts: posts.filter((p) => p.status === "draft").length,
  };

  return (
    <Suspense>
      <ContentHubClient
        activeTab="publish"
        currentUserId={user.id}
        posts={posts}
        publishProfiles={publishProfiles}
        publishStats={publishStats}
        dealEvents={dealEvents}
      />
    </Suspense>
  );
}
