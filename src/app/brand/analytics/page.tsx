import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandAnalyticsClient } from "./BrandAnalyticsClient";

export const dynamic = "force-dynamic";

export default async function BrandAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id;

  if (!orgId) {
    return <BrandAnalyticsClient deals={[]} campaigns={[]} proposals={[]} />;
  }

  const [dealsResult, campaignsResult, proposalsResult] = await Promise.all([
    admin
      .from("deals")
      .select("id, brand_name, total_value, paid_amount, status, pipeline_stage, created_at, updated_at")
      .or(`organization_id.eq.${orgId},brand_profile_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
    admin
      .from("campaigns")
      .select("id, name, status, budget, start_date, end_date, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    admin
      .from("proposals")
      .select("id, title, status, total_amount, proposal_type, created_at, updated_at")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <BrandAnalyticsClient
      deals={(dealsResult.data ?? []) as Array<{
        id: string;
        brand_name: string;
        total_value: number | null;
        paid_amount: number | null;
        status: string;
        pipeline_stage: string;
        created_at: string;
        updated_at: string;
      }>}
      campaigns={(campaignsResult.data ?? []) as Array<{
        id: string;
        name: string;
        status: string;
        budget: number | null;
        start_date: string | null;
        end_date: string | null;
        created_at: string;
      }>}
      proposals={(proposalsResult.data ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        total_amount: number | null;
        proposal_type: string;
        created_at: string;
        updated_at: string;
      }>}
    />
  );
}
