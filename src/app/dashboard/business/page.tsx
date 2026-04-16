import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDeals } from "@/lib/actions/deals";
import { getProposals } from "@/lib/actions/proposals";
import { getMatches } from "@/lib/ai/brand-matching";
import { getSocialProfiles } from "@/lib/dal/profiles";
import { getCachedResultsBatch } from "@/lib/dal/analyses";
import {
  getRevenueStats,
  getRevenueBySources,
  getMonthlyRevenue,
  getDealRevenue,
  getPaymentHistory,
  getRevenueForecast,
} from "@/lib/dal/revenue";
import { BusinessHubClient } from "./BusinessHubClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function BusinessPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();
  const accountType = (profile?.account_type as "creator" | "brand") ?? "creator";

  const params = await searchParams;
  const tab = params.tab || "deals";

  // Only fetch data for the active tab
  if (tab === "deals") {
    const result = await getDeals();
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="deals"
          deals={result.data ?? []}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  if (tab === "proposals") {
    const result = await getProposals();
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="proposals"
          proposals={result.data ?? []}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  if (tab === "opportunities") {
    const matches = await getMatches(user.id, accountType);
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="opportunities"
          initialMatches={matches}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  if (tab === "monetization") {
    const profiles = await getSocialProfiles();
    const ids = profiles.map((p) => p.id);
    const batch = await getCachedResultsBatch(ids, [
      "earnings_forecast",
      "campaign_ideas",
    ]);
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="monetization"
          profiles={profiles}
          monetizationCache={{
            revenue: batch.earnings_forecast,
            campaigns: batch.campaign_ideas,
          }}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  if (tab === "revenue") {
    const [stats, sources, monthly, deals, payments, forecast] =
      await Promise.all([
        getRevenueStats(),
        getRevenueBySources(),
        getMonthlyRevenue(12),
        getDealRevenue(),
        getPaymentHistory(),
        getRevenueForecast(),
      ]);
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="revenue"
          revenueStats={stats}
          revenueSources={sources}
          monthlyRevenue={monthly}
          dealRevenue={deals}
          payments={payments}
          revenueForecast={forecast}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  if (tab === "goals") {
    const profiles = await getSocialProfiles();
    return (
      <Suspense>
        <BusinessHubClient
          activeTab="goals"
          goalsProfiles={profiles}
          currentUserId={user.id}
          accountType={accountType}
        />
      </Suspense>
    );
  }

  // Fallback to deals
  const result = await getDeals();
  return (
    <Suspense>
      <BusinessHubClient
        activeTab="deals"
        deals={result.data ?? []}
        currentUserId={user.id}
      />
    </Suspense>
  );
}
