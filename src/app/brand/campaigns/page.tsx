import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandCampaignsClient } from "./BrandCampaignsClient";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();

  // Get user's org
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return <BrandCampaignsClient campaigns={[]} />;
  }

  const orgId = profile.organization_id;

  // Backfill: find accepted proposals involving this brand that don't have campaigns yet
  const [sentResult, receivedResult] = await Promise.all([
    admin
      .from("proposals")
      .select("id, title, description, total_amount, start_date, end_date")
      .eq("sender_id", user.id)
      .eq("status", "accepted"),
    admin
      .from("proposals")
      .select("id, title, description, total_amount, start_date, end_date")
      .eq("receiver_id", user.id)
      .eq("status", "accepted"),
  ]);

  // Deduplicate by proposal id
  const allAccepted = new Map<string, (typeof sentResult.data extends (infer T)[] | null ? T : never)>();
  for (const p of sentResult.data ?? []) allAccepted.set(p.id, p);
  for (const p of receivedResult.data ?? []) allAccepted.set(p.id, p);

  if (allAccepted.size > 0) {
    const { data: existingCampaigns } = await admin
      .from("campaigns")
      .select("name")
      .eq("organization_id", orgId);

    const existingNames = new Set((existingCampaigns ?? []).map((c) => c.name));
    const missing = [...allAccepted.values()].filter((p) => !existingNames.has(p.title));

    if (missing.length > 0) {
      await admin.from("campaigns").insert(
        missing.map((p) => ({
          organization_id: orgId,
          name: p.title,
          status: "active" as const,
          start_date: p.start_date ?? null,
          end_date: p.end_date ?? null,
          budget: p.total_amount ?? null,
          notes: p.description ?? null,
        })),
      );
    }
  }

  // Clean up duplicate campaigns (keep oldest by id)
  const { data: allCampaigns } = await admin
    .from("campaigns")
    .select("id, name")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: true });

  if (allCampaigns && allCampaigns.length > 0) {
    const seen = new Set<string>();
    const dupeIds: string[] = [];
    for (const c of allCampaigns) {
      if (seen.has(c.name)) {
        dupeIds.push(c.id);
      } else {
        seen.add(c.name);
      }
    }
    if (dupeIds.length > 0) {
      await admin.from("campaigns").delete().in("id", dupeIds);
    }
  }

  const { data: campaigns } = await admin
    .from("campaigns")
    .select("id, name, status, start_date, end_date, budget, notes")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <BrandCampaignsClient
      campaigns={
        (campaigns ?? []) as Array<{
          id: string;
          name: string;
          status: "draft" | "active" | "paused" | "completed";
          start_date: string | null;
          end_date: string | null;
          budget: number | null;
          notes: string | null;
        }>
      }
    />
  );
}
