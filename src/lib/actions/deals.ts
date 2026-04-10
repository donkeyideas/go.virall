"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type {
  Deal,
  DealPipelineStage,
  DealDeliverable,
  DeliverableSubmission,
  DealClosureOutcomeType,
  DealClosureOutcome,
} from "@/types";
import { detectPlatform, fetchOEmbedData } from "@/lib/oembed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function getUserOrgId(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return data?.organization_id ?? null;
}

// ─── Get Deals ──────────────────────────────────────────────────────────────

export async function getDeals(orgId?: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated.", data: [] as (Deal & { deliverables?: DealDeliverable[] })[] };

  const admin = createAdminClient();
  const resolvedOrgId = orgId ?? (await getUserOrgId(user.id));

  if (!resolvedOrgId) {
    return { error: "No organization found.", data: [] as (Deal & { deliverables?: DealDeliverable[] })[] };
  }

  // Query deals where user is the org owner OR the brand/creator on the deal
  const { data: deals, error } = await admin
    .from("deals")
    .select("*")
    .or(`organization_id.eq.${resolvedOrgId},brand_profile_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Get deals error:", error);
    return { error: "Failed to fetch deals.", data: [] as (Deal & { deliverables?: DealDeliverable[] })[] };
  }

  if (!deals || deals.length === 0) {
    return { data: [] as (Deal & { deliverables?: DealDeliverable[] })[] };
  }

  // Fetch all deliverables for these deals
  const dealIds = deals.map((d) => d.id);
  const { data: allDeliverables } = await admin
    .from("deal_deliverables")
    .select("*")
    .in("deal_id", dealIds)
    .order("created_at", { ascending: true });

  const deliverablesByDeal = new Map<string, DealDeliverable[]>();
  for (const d of allDeliverables ?? []) {
    const existing = deliverablesByDeal.get(d.deal_id) ?? [];
    existing.push(d as DealDeliverable);
    deliverablesByDeal.set(d.deal_id, existing);
  }

  // Fetch brand/creator profile logos for deal avatars
  const profileIds = [...new Set(deals.map((d) => d.brand_profile_id).filter(Boolean))] as string[];
  const logoMap = new Map<string, string | null>();
  if (profileIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, brand_logo_url, avatar_url")
      .in("id", profileIds);
    for (const p of profiles ?? []) {
      logoMap.set(p.id, p.brand_logo_url ?? p.avatar_url ?? null);
    }
  }

  const enriched = deals.map((deal) => ({
    ...deal,
    deliverables: deliverablesByDeal.get(deal.id) ?? [],
    brand_logo_url: deal.brand_profile_id ? (logoMap.get(deal.brand_profile_id) ?? null) : null,
  })) as (Deal & { deliverables: DealDeliverable[]; brand_logo_url: string | null })[];

  return { data: enriched };
}

// ─── Get Single Deal ────────────────────────────────────────────────────────

export async function getDeal(id: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !deal) {
    return { error: "Deal not found." };
  }

  // Verify access: org owner OR brand on the deal
  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId && deal.brand_profile_id !== user.id) {
    return { error: "You do not have access to this deal." };
  }

  // Get deliverables
  const { data: deliverables } = await admin
    .from("deal_deliverables")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: true });

  return {
    data: {
      ...deal,
      deliverables: (deliverables ?? []) as DealDeliverable[],
    } as Deal & { deliverables: DealDeliverable[] },
  };
}

// ─── Create Deal ────────────────────────────────────────────────────────────

export interface CreateDealInput {
  brand_name: string;
  contact_email?: string;
  total_value?: number;
  notes?: string;
  pipeline_stage?: DealPipelineStage;
}

export async function createDeal(data: CreateDealInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const orgId = await getUserOrgId(user.id);
  if (!orgId) return { error: "No organization found." };

  const admin = createAdminClient();

  const { data: deal, error } = await admin
    .from("deals")
    .insert({
      organization_id: orgId,
      brand_name: data.brand_name,
      contact_email: data.contact_email ?? null,
      status: "inquiry" as const,
      pipeline_stage: data.pipeline_stage ?? ("lead" as const),
      total_value: data.total_value ?? null,
      paid_amount: 0,
      notes: data.notes ?? null,
      is_from_platform: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create deal error:", error);
    return { error: "Failed to create deal." };
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/business");
  return { success: true, dealId: deal.id };
}

// ─── Update Deal Stage ──────────────────────────────────────────────────────

export async function updateDealStage(id: string, stage: DealPipelineStage) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!deal) return { error: "Deal not found." };

  // Verify org ownership
  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId) {
    return { error: "You do not have access to this deal." };
  }

  // Map pipeline stage to deal status
  const stageToStatus: Record<DealPipelineStage, Deal["status"]> = {
    lead: "inquiry",
    outreach: "inquiry",
    negotiating: "negotiation",
    contracted: "active",
    in_progress: "active",
    delivered: "active",
    invoiced: "active",
    paid: "completed",
    completed: "completed",
  };

  const { error } = await admin
    .from("deals")
    .update({
      pipeline_stage: stage,
      status: stageToStatus[stage],
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Update deal stage error:", error);
    return { error: "Failed to update deal stage." };
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Update Deal Status (legacy compat) ─────────────────────────────────────

export async function updateDealStatus(dealId: string, status: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("organization_id")
    .eq("id", dealId)
    .single();

  if (!deal) return { error: "Deal not found." };

  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId) {
    return { error: "You do not have access to this deal." };
  }

  const { error } = await admin
    .from("deals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", dealId);

  if (error) return { error: "Failed to update deal." };

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Update Deal ────────────────────────────────────────────────────────────

export interface UpdateDealInput {
  brand_name?: string;
  contact_email?: string;
  total_value?: number;
  paid_amount?: number;
  notes?: string;
  contract_url?: string;
}

export async function updateDeal(id: string, data: UpdateDealInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("organization_id")
    .eq("id", id)
    .single();

  if (!deal) return { error: "Deal not found." };

  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId) {
    return { error: "You do not have access to this deal." };
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.brand_name !== undefined) updates.brand_name = data.brand_name;
  if (data.contact_email !== undefined) updates.contact_email = data.contact_email;
  if (data.total_value !== undefined) updates.total_value = data.total_value;
  if (data.paid_amount !== undefined) updates.paid_amount = data.paid_amount;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.contract_url !== undefined) updates.contract_url = data.contract_url;

  const { error } = await admin.from("deals").update(updates).eq("id", id);

  if (error) {
    console.error("Update deal error:", error);
    return { error: "Failed to update deal." };
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/revenue");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Add Deliverable ────────────────────────────────────────────────────────

export interface AddDeliverableInput {
  title: string;
  platform?: string;
  content_type?: string;
  deadline?: string;
  status?: DealDeliverable["status"];
  payment_amount?: number;
}

export async function addDeliverable(dealId: string, data: AddDeliverableInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deal } = await admin
    .from("deals")
    .select("organization_id")
    .eq("id", dealId)
    .single();

  if (!deal) return { error: "Deal not found." };

  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId) {
    return { error: "You do not have access to this deal." };
  }

  const { error } = await admin.from("deal_deliverables").insert({
    deal_id: dealId,
    title: data.title,
    platform: data.platform ?? null,
    content_type: data.content_type ?? null,
    deadline: data.deadline ?? null,
    status: data.status ?? "pending",
    payment_amount: data.payment_amount ?? null,
  });

  if (error) {
    console.error("Add deliverable error:", error);
    return { error: "Failed to add deliverable." };
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Update Deliverable ─────────────────────────────────────────────────────

export interface UpdateDeliverableInput {
  title?: string;
  platform?: string;
  content_type?: string;
  deadline?: string;
  status?: DealDeliverable["status"];
  payment_amount?: number;
}

export async function updateDeliverable(id: string, data: UpdateDeliverableInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  // Get deliverable to find deal
  const { data: deliverable } = await admin
    .from("deal_deliverables")
    .select("deal_id")
    .eq("id", id)
    .single();

  if (!deliverable) return { error: "Deliverable not found." };

  // Verify org ownership via deal
  const { data: deal } = await admin
    .from("deals")
    .select("organization_id")
    .eq("id", deliverable.deal_id)
    .single();

  if (!deal) return { error: "Deal not found." };

  const orgId = await getUserOrgId(user.id);
  if (deal.organization_id !== orgId) {
    return { error: "You do not have access to this deliverable." };
  }

  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.platform !== undefined) updates.platform = data.platform;
  if (data.content_type !== undefined) updates.content_type = data.content_type;
  if (data.deadline !== undefined) updates.deadline = data.deadline;
  if (data.status !== undefined) updates.status = data.status;
  if (data.payment_amount !== undefined) updates.payment_amount = data.payment_amount;

  const { error } = await admin
    .from("deal_deliverables")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("Update deliverable error:", error);
    return { error: "Failed to update deliverable." };
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Helper: verify deal access for both parties ────────────────────────────

async function verifyDealAccess(dealId: string, userId: string, admin: ReturnType<typeof createAdminClient>): Promise<{ error: string } | { deal: { id: string; organization_id: string; brand_profile_id: string | null; brand_name: string; is_from_platform: boolean }; orgId: string | null; isCreator: boolean; isBrand: boolean }> {
  const { data: deal } = await admin
    .from("deals")
    .select("id, organization_id, brand_profile_id, brand_name, is_from_platform")
    .eq("id", dealId)
    .single();

  if (!deal) return { error: "Deal not found." };

  const orgId = await getUserOrgId(userId);
  const isCreator = deal.organization_id === orgId;
  const isBrand = deal.brand_profile_id === userId;

  if (!isCreator && !isBrand) return { error: "You do not have access to this deal." };

  return { deal, orgId, isCreator, isBrand };
}

// ─── Submit Deliverable (Creator submits URL for review) ────────────────────

export async function submitDeliverable(
  deliverableId: string,
  url: string,
  note?: string,
): Promise<{ success: true; submissionId: string } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  // Validate URL
  try {
    new URL(url);
  } catch {
    return { error: "Invalid URL. Please enter a valid link." };
  }

  const admin = createAdminClient();

  // Get deliverable → deal
  const { data: deliverable } = await admin
    .from("deal_deliverables")
    .select("id, deal_id, title")
    .eq("id", deliverableId)
    .single();

  if (!deliverable) return { error: "Deliverable not found." };

  const access = await verifyDealAccess(deliverable.deal_id, user.id, admin);
  if ("error" in access) return { error: access.error };

  // Detect platform + fetch oEmbed data
  const platformDetected = detectPlatform(url);
  const oembedData = await fetchOEmbedData(url);

  // Insert submission record
  const { data: submission, error: subErr } = await admin
    .from("deliverable_submissions")
    .insert({
      deliverable_id: deliverableId,
      submitted_by: user.id,
      url,
      platform_detected: platformDetected,
      oembed_data: oembedData,
      note: note ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (subErr) {
    console.error("Submit deliverable error:", subErr);
    return { error: "Failed to submit deliverable." };
  }

  // Update the deliverable itself
  await admin
    .from("deal_deliverables")
    .update({
      submission_url: url,
      submitted_at: new Date().toISOString(),
      status: "submitted",
      revision_comment: null,
    })
    .eq("id", deliverableId);

  // Notify the brand
  if (access.deal.brand_profile_id) {
    const { data: brandProfile } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", access.deal.brand_profile_id)
      .single();

    if (brandProfile?.organization_id) {
      const { data: creatorProfile } = await admin
        .from("profiles")
        .select("full_name, company_name")
        .eq("id", user.id)
        .single();
      const creatorName = creatorProfile?.full_name || creatorProfile?.company_name || "Creator";

      await admin.from("notifications").insert({
        organization_id: brandProfile.organization_id,
        title: "Deliverable Submitted",
        body: `${creatorName} submitted deliverable: "${deliverable.title}" for ${access.deal.brand_name}`,
        type: "deliverable_submitted",
        is_read: false,
      });
    }
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  revalidatePath("/brand/deals");
  return { success: true, submissionId: submission.id };
}

// ─── Review Deliverable (Brand approves or requests revision) ───────────────

export async function reviewDeliverable(
  deliverableId: string,
  action: "approve" | "request_revision",
  comment?: string,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  if (action === "request_revision" && !comment?.trim()) {
    return { error: "Please provide a comment explaining what needs to change." };
  }

  const admin = createAdminClient();

  // Get deliverable → deal
  const { data: deliverable } = await admin
    .from("deal_deliverables")
    .select("id, deal_id, title")
    .eq("id", deliverableId)
    .single();

  if (!deliverable) return { error: "Deliverable not found." };

  const access = await verifyDealAccess(deliverable.deal_id, user.id, admin);
  if ("error" in access) return { error: access.error };

  if (!access.isBrand) {
    return { error: "Only the brand can review deliverables." };
  }

  const now = new Date().toISOString();
  const newStatus = action === "approve" ? "approved" : "revision";
  const submissionStatus = action === "approve" ? "approved" : "revision_requested";

  // Update the deliverable
  await admin
    .from("deal_deliverables")
    .update({
      status: newStatus,
      reviewed_at: now,
      reviewed_by: user.id,
      revision_comment: action === "request_revision" ? comment : null,
    })
    .eq("id", deliverableId);

  // Update the latest submission
  const { data: latestSub } = await admin
    .from("deliverable_submissions")
    .select("id")
    .eq("deliverable_id", deliverableId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestSub) {
    await admin
      .from("deliverable_submissions")
      .update({
        status: submissionStatus,
        reviewer_id: user.id,
        review_comment: comment ?? null,
        reviewed_at: now,
      })
      .eq("id", latestSub.id);
  }

  // Notify the creator
  const { data: brandProfile } = await admin
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", user.id)
    .single();
  const brandName = brandProfile?.company_name || brandProfile?.full_name || "Brand";

  await admin.from("notifications").insert({
    organization_id: access.deal.organization_id,
    title: action === "approve" ? "Deliverable Approved" : "Revision Requested",
    body:
      action === "approve"
        ? `${brandName} approved your deliverable: "${deliverable.title}"`
        : `${brandName} requested a revision for: "${deliverable.title}" — ${comment}`,
    type: action === "approve" ? "deliverable_approved" : "deliverable_revision",
    is_read: false,
  });

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  revalidatePath("/brand/deals");
  return { success: true };
}

// ─── Get Deliverable Submissions (audit trail) ──────────────────────────────

export async function getDeliverableSubmissions(
  deliverableId: string,
): Promise<{ data: DeliverableSubmission[] } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: deliverable } = await admin
    .from("deal_deliverables")
    .select("deal_id")
    .eq("id", deliverableId)
    .single();

  if (!deliverable) return { error: "Deliverable not found." };

  const access = await verifyDealAccess(deliverable.deal_id, user.id, admin);
  if ("error" in access) return { error: access.error };

  const { data: submissions, error } = await admin
    .from("deliverable_submissions")
    .select("*")
    .eq("deliverable_id", deliverableId)
    .order("created_at", { ascending: false });

  if (error) return { error: "Failed to fetch submissions." };

  const userIds = [...new Set((submissions ?? []).map((s) => s.submitted_by))];
  const { data: profiles } = userIds.length > 0
    ? await admin.from("profiles").select("id, full_name, avatar_url").in("id", userIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const enriched = (submissions ?? []).map((s) => ({
    ...s,
    submitter: profileMap.get(s.submitted_by) ?? undefined,
  })) as DeliverableSubmission[];

  return { data: enriched };
}

// ─── Submit Closure Outcome (Honor System) ──────────────────────────────────

export async function submitClosureOutcome(
  dealId: string,
  outcome: DealClosureOutcomeType,
  notes?: string,
): Promise<{ success: true; matched: boolean; disputed: boolean } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const accessResult = await verifyDealAccess(dealId, user.id, admin);
  if ("error" in accessResult) return { error: accessResult.error };
  const access = accessResult;

  if (!access.deal.is_from_platform) {
    return { error: "Deal closure is only available for platform deals." };
  }

  const { data: fullDeal } = await admin
    .from("deals")
    .select("pipeline_stage, closure_status")
    .eq("id", dealId)
    .single();

  if (!fullDeal) return { error: "Deal not found." };

  const closableStages = ["delivered", "invoiced", "paid", "completed"];
  if (!closableStages.includes(fullDeal.pipeline_stage)) {
    return { error: "Deal must be in delivered, invoiced, paid, or completed stage to close." };
  }

  if (fullDeal.closure_status === "matched" || fullDeal.closure_status === "stale") {
    return { error: "This deal is already closed." };
  }

  const { data: existing } = await admin
    .from("deal_closure_outcomes")
    .select("id")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return { error: "You have already submitted an outcome. Use update to change it during the dispute window." };
  }

  const { error: insertErr } = await admin.from("deal_closure_outcomes").insert({
    deal_id: dealId,
    user_id: user.id,
    outcome,
    notes: notes ?? null,
  });

  if (insertErr) {
    console.error("Submit closure outcome error:", insertErr);
    return { error: "Failed to submit outcome." };
  }

  // Check if other party has submitted
  const { data: otherOutcome } = await admin
    .from("deal_closure_outcomes")
    .select("*")
    .eq("deal_id", dealId)
    .neq("user_id", user.id)
    .maybeSingle();

  let matched = false;
  let disputed = false;

  // Helper to get other party's org
  async function getOtherOrgId() {
    if (access.isCreator && access.deal.brand_profile_id) {
      const { data } = await admin.from("profiles").select("organization_id").eq("id", access.deal.brand_profile_id).single();
      return data?.organization_id ?? null;
    }
    return access.deal.organization_id;
  }

  if (otherOutcome) {
    if (otherOutcome.outcome === outcome) {
      matched = true;
      await admin.from("deal_closure_outcomes").update({ is_locked: true }).eq("deal_id", dealId);
      await admin.from("deals").update({
        closure_status: "matched",
        final_outcome: outcome,
        closed_at: new Date().toISOString(),
        status: "completed",
        pipeline_stage: "completed",
        updated_at: new Date().toISOString(),
      }).eq("id", dealId);

      const outcomeLbl = outcome.replace(/_/g, " ");
      const otherOrgId = await getOtherOrgId();
      for (const targetOrgId of [access.deal.organization_id, otherOrgId]) {
        if (targetOrgId) {
          await admin.from("notifications").insert({
            organization_id: targetOrgId,
            title: "Deal Closed",
            body: `Deal "${access.deal.brand_name}" closed. Outcome: ${outcomeLbl}`,
            type: "deal_closure_matched",
            is_read: false,
          });
        }
      }
    } else {
      disputed = true;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 7);

      await admin.from("deals").update({
        closure_status: "disputed",
        dispute_deadline: deadline.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", dealId);

      const otherOrgId = await getOtherOrgId();
      for (const targetOrgId of [access.deal.organization_id, otherOrgId]) {
        if (targetOrgId) {
          await admin.from("notifications").insert({
            organization_id: targetOrgId,
            title: "Deal Outcome Disputed",
            body: `Outcomes don't match for "${access.deal.brand_name}". 7-day resolution window.`,
            type: "deal_closure_disputed",
            is_read: false,
          });
        }
      }
    }
  } else {
    // First to submit
    await admin.from("deals").update({
      closure_status: "pending_closure",
      updated_at: new Date().toISOString(),
    }).eq("id", dealId);

    const { data: myProfile } = await admin.from("profiles").select("full_name, company_name").eq("id", user.id).single();
    const myName = myProfile?.company_name || myProfile?.full_name || "Someone";

    const otherOrgId = await getOtherOrgId();
    if (otherOrgId) {
      await admin.from("notifications").insert({
        organization_id: otherOrgId,
        title: "Deal Outcome Report",
        body: `${myName} reported the outcome for "${access.deal.brand_name}". Please confirm your outcome.`,
        type: "deal_closure_submitted",
        is_read: false,
      });
    }
  }

  // Recalculate trust scores when outcomes match or dispute
  if (matched || disputed) {
    const { calculateTrustScore } = await import("@/lib/trust-score");
    // Recalculate for both parties
    const creatorProfileId = access.isCreator ? user.id : null;
    const brandProfileId = access.deal.brand_profile_id;
    if (creatorProfileId) calculateTrustScore(creatorProfileId).catch(() => {});
    if (brandProfileId) calculateTrustScore(brandProfileId).catch(() => {});
    // If current user is brand, recalculate creator's score too
    if (!access.isCreator) {
      const { data: creatorOrg } = await admin
        .from("organizations")
        .select("profiles(id)")
        .eq("id", access.deal.organization_id)
        .single();
      const profiles = (creatorOrg as unknown as { profiles: { id: string }[] })?.profiles;
      if (profiles?.[0]?.id) calculateTrustScore(profiles[0].id).catch(() => {});
    }
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  revalidatePath("/brand/deals");
  return { success: true, matched, disputed };
}

// ─── Get Closure Outcomes ───────────────────────────────────────────────────

export async function getClosureOutcomes(
  dealId: string,
): Promise<
  | { myOutcome: DealClosureOutcome | null; otherOutcome: DealClosureOutcome | null; canSeeOther: boolean }
  | { error: string }
> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const access = await verifyDealAccess(dealId, user.id, admin);
  if ("error" in access) return { error: access.error };

  const { data: outcomes } = await admin
    .from("deal_closure_outcomes")
    .select("*")
    .eq("deal_id", dealId);

  const myOutcome = (outcomes ?? []).find((o) => o.user_id === user.id) as DealClosureOutcome | undefined ?? null;
  const otherOutcome = (outcomes ?? []).find((o) => o.user_id !== user.id) as DealClosureOutcome | undefined ?? null;

  // Anti-gaming: only reveal other's outcome after you submit yours
  const canSeeOther = myOutcome !== null;

  return {
    myOutcome,
    otherOutcome: canSeeOther ? otherOutcome : null,
    canSeeOther,
  };
}

// ─── Update Closure Outcome (during dispute window) ─────────────────────────

export async function updateClosureOutcome(
  dealId: string,
  outcome: DealClosureOutcomeType,
  notes?: string,
): Promise<{ success: true } | { error: string }> {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const access = await verifyDealAccess(dealId, user.id, admin);
  if ("error" in access) return { error: access.error };

  const { data: deal } = await admin
    .from("deals")
    .select("closure_status, dispute_deadline")
    .eq("id", dealId)
    .single();

  if (!deal) return { error: "Deal not found." };

  if (deal.closure_status !== "disputed" && deal.closure_status !== "pending_closure") {
    return { error: "You can only update outcomes during the dispute or pending window." };
  }

  if (deal.dispute_deadline && new Date(deal.dispute_deadline) < new Date()) {
    return { error: "The dispute resolution window has expired." };
  }

  const { data: existing } = await admin
    .from("deal_closure_outcomes")
    .select("id, is_locked")
    .eq("deal_id", dealId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return { error: "No outcome found to update." };
  if (existing.is_locked) return { error: "Outcome is locked and cannot be changed." };

  await admin
    .from("deal_closure_outcomes")
    .update({ outcome, notes: notes ?? null, submitted_at: new Date().toISOString() })
    .eq("id", existing.id);

  // Re-check if outcomes now match
  const { data: otherOutcome } = await admin
    .from("deal_closure_outcomes")
    .select("outcome")
    .eq("deal_id", dealId)
    .neq("user_id", user.id)
    .maybeSingle();

  if (otherOutcome && otherOutcome.outcome === outcome) {
    await admin.from("deal_closure_outcomes").update({ is_locked: true }).eq("deal_id", dealId);
    await admin.from("deals").update({
      closure_status: "matched",
      final_outcome: outcome,
      closed_at: new Date().toISOString(),
      status: "completed",
      pipeline_stage: "completed",
      updated_at: new Date().toISOString(),
    }).eq("id", dealId);
  }

  revalidatePath("/dashboard/deals");
  revalidatePath("/dashboard/business");
  revalidatePath("/brand/deals");
  return { success: true };
}
