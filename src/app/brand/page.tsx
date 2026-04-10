import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrustScore } from "@/lib/dal/trust";
import { BrandOverviewClient } from "./overview-client";

export const dynamic = "force-dynamic";

export default async function BrandOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_name, full_name, organization_id")
    .eq("id", user.id)
    .single();

  const companyName = profile?.company_name || profile?.full_name || "Your Brand";
  const orgId = profile?.organization_id;

  if (!orgId) {
    return <BrandOverviewClient companyName={companyName} stats={{ activeCampaigns: 0, pendingProposals: 0, activeDeals: 0, totalSpent: 0 }} deals={[]} proposals={[]} notifications={[]} campaigns={[]} trustScore={null} />;
  }

  const [proposalsResult, dealsResult, paymentsResult, notificationsResult, campaignsResult, allProposalsResult, trustScore] = await Promise.all([
    supabase
      .from("proposals")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .eq("status", "pending"),
    admin
      .from("deals")
      .select("id, brand_name, total_value, paid_amount, status, pipeline_stage, created_at, updated_at")
      .or(`organization_id.eq.${orgId},brand_profile_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("platform_payments")
      .select("amount")
      .eq("payer_id", user.id)
      .eq("status", "completed"),
    admin
      .from("notifications")
      .select("id, title, body, type, is_read, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("campaigns")
      .select("id, name, status, start_date, end_date, budget")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("proposals")
      .select("id, title, status, total_amount, proposal_type, sender_id, receiver_id, created_at, updated_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("updated_at", { ascending: false })
      .limit(10),
    getTrustScore(user.id),
  ]);

  const deals = (dealsResult.data ?? []) as Array<{
    id: string; brand_name: string; total_value: number | null;
    paid_amount: number | null; status: string; pipeline_stage: string;
    created_at: string; updated_at: string;
  }>;

  const pendingProposals = proposalsResult.count ?? 0;
  const activeDeals = deals.filter((d) => d.status === "active" || d.status === "negotiation").length;
  const activeCampaigns = (campaignsResult.data ?? []).filter((c: { status: string }) => c.status === "active").length;
  const totalSpent = (paymentsResult.data ?? []).reduce(
    (sum: number, p: { amount: number | null }) => sum + (p.amount ?? 0),
    0
  );

  return (
    <BrandOverviewClient
      companyName={companyName}
      stats={{ activeCampaigns, pendingProposals, activeDeals, totalSpent }}
      deals={deals}
      proposals={(allProposalsResult.data ?? []) as Array<{
        id: string; title: string; status: string; total_amount: number | null;
        proposal_type: string; sender_id: string; receiver_id: string;
        created_at: string; updated_at: string;
      }>}
      notifications={(notificationsResult.data ?? []) as Array<{
        id: string; title: string; body: string; type: string;
        is_read: boolean; created_at: string;
      }>}
      campaigns={(campaignsResult.data ?? []) as Array<{
        id: string; name: string; status: string;
        start_date: string | null; end_date: string | null; budget: number | null;
      }>}
      trustScore={trustScore}
    />
  );
}
