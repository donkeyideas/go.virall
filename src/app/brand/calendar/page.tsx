import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandCalendarClient } from "./BrandCalendarClient";

export const dynamic = "force-dynamic";

export default async function BrandCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = profile?.organization_id;
  if (!orgId) {
    return <BrandCalendarClient dealEvents={[]} currentUserId={user.id} />;
  }

  const admin = createAdminClient();

  // Fetch deals joining proposal dates for campaign window
  const { data: deals } = await admin
    .from("deals")
    .select("id, brand_name, total_value, pipeline_stage, created_at, updated_at, organization_id, proposal_id, proposal:proposals!proposal_id(start_date, end_date)")
    .or(`organization_id.eq.${orgId},brand_profile_id.eq.${user.id}`)
    .in("status", ["active", "inquiry", "negotiation"]);

  // Get creator profiles for avatars
  const creatorOrgIds = [...new Set((deals ?? []).map((d) => d.organization_id))];
  const creatorProfiles: Record<string, { avatar_url: string | null; full_name: string | null }> = {};

  if (creatorOrgIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("organization_id, avatar_url, full_name")
      .in("organization_id", creatorOrgIds)
      .eq("role", "owner");

    for (const p of profiles ?? []) {
      if (p.organization_id) {
        creatorProfiles[p.organization_id] = {
          avatar_url: p.avatar_url,
          full_name: p.full_name,
        };
      }
    }
  }

  const dealEvents = (deals ?? []).map((d: Record<string, unknown>) => {
    const creator = creatorProfiles[d.organization_id as string];
    const proposal = d.proposal as { start_date: string | null; end_date: string | null } | null;
    return {
      id: d.id as string,
      title: creator?.full_name || (d.brand_name as string),
      startDate: proposal?.start_date || (d.created_at as string),
      endDate: proposal?.end_date || (d.updated_at as string),
      value: d.total_value as number | null,
      stage: d.pipeline_stage as string,
      logoUrl: creator?.avatar_url ?? null,
      proposalId: d.proposal_id as string | null,
    };
  });

  return <BrandCalendarClient dealEvents={dealEvents} currentUserId={user.id} />;
}
