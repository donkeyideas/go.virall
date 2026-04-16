import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  authenticateRequest,
  getAuthContext,
  getMonthlyUsage,
  logUsageEvent,
  planLimitResponse,
  isWithinLimit,
} from "../_shared/auth";

// Status transition state machine
const ALLOWED_TRANSITIONS: Record<string, Record<string, string[]>> = {
  draft:       { sender: ["pending", "cancelled"] },
  pending:     { sender: ["cancelled"], receiver: ["accepted", "declined", "negotiating"] },
  negotiating: { sender: ["cancelled"], receiver: ["accepted", "declined"] },
};

async function getOrCreateThread(userId1: string, userId2: string) {
  const [p1, p2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const { data: existing } = await supabaseAdmin
    .from("message_threads")
    .select("id")
    .eq("participant_1", p1)
    .eq("participant_2", p2)
    .single();

  if (existing) return existing.id;

  const { data: created } = await supabaseAdmin
    .from("message_threads")
    .insert({ participant_1: p1, participant_2: p2, last_message_at: new Date().toISOString() })
    .select("id")
    .single();

  return created?.id ?? null;
}

/** GET — List proposals for user */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;
  const userId = auth.user.id;

  const url = new URL(req.url);
  const filter = url.searchParams.get("filter"); // "sent" | "received" | null
  const statusFilter = url.searchParams.get("status");
  const proposalId = url.searchParams.get("id");

  // Single proposal detail
  if (proposalId) {
    const { data: proposal } = await supabaseAdmin
      .from("proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (!proposal || (proposal.sender_id !== userId && proposal.receiver_id !== userId)) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const { data: events } = await supabaseAdmin
      .from("proposal_events")
      .select("*")
      .eq("proposal_id", proposalId)
      .order("created_at", { ascending: true });

    // Enrich profiles
    const profileIds = [...new Set([proposal.sender_id, proposal.receiver_id])];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, account_type, company_name")
      .in("id", profileIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return NextResponse.json({
      data: {
        ...proposal,
        sender: profileMap.get(proposal.sender_id) ?? null,
        receiver: profileMap.get(proposal.receiver_id) ?? null,
        events: events ?? [],
      },
    });
  }

  // List proposals
  let query = supabaseAdmin.from("proposals").select("*");

  if (filter === "sent") {
    query = query.eq("sender_id", userId);
  } else if (filter === "received") {
    query = query.eq("receiver_id", userId);
  } else {
    query = query.or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
  }

  if (statusFilter) query = query.eq("status", statusFilter);
  query = query.order("created_at", { ascending: false });

  const { data: proposals } = await query;
  const proposalList = proposals ?? [];

  // Enrich profiles
  const allIds = new Set<string>();
  proposalList.forEach((p: any) => { allIds.add(p.sender_id); allIds.add(p.receiver_id); });
  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, full_name, avatar_url, account_type, company_name")
    .in("id", [...allIds]);

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const enriched = proposalList.map((p: any) => ({
    ...p,
    sender: profileMap.get(p.sender_id) ?? null,
    receiver: profileMap.get(p.receiver_id) ?? null,
  }));

  return NextResponse.json({ data: enriched });
}

/** POST — Create a proposal */
export async function POST(req: NextRequest) {
  const authResult = await getAuthContext(req);
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;
  const auth = { user: ctx.user };

  const body = await req.json();
  const {
    receiver_id, title, description, proposal_type, deliverables,
    total_amount, currency, payment_type, start_date, end_date, status, notes,
  } = body;

  if (!receiver_id || !title) {
    return NextResponse.json({ error: "receiver_id and title are required" }, { status: 400 });
  }

  // B6: Enforce max_proposals_per_month limit (superadmins bypass)
  if (!ctx.isSuperadmin) {
    const usage = await getMonthlyUsage(ctx.orgId, "proposal_created");
    if (!isWithinLimit(usage, ctx.limits.max_proposals_per_month)) {
      return planLimitResponse(
        "max_proposals_per_month",
        ctx.plan,
        usage,
        ctx.limits.max_proposals_per_month,
      );
    }
  }

  // Validate receiver exists
  const { data: receiver } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("id", receiver_id)
    .single();
  if (!receiver) return NextResponse.json({ error: "Receiver not found" }, { status: 404 });

  const deliverablesList = deliverables ?? [];
  const computedAmount = total_amount ?? deliverablesList.reduce((s: number, d: any) => s + (d.amount || 0), 0);
  const proposalStatus = status || "pending";

  let threadId: string | null = null;
  if (proposalStatus === "pending") {
    threadId = await getOrCreateThread(auth.user.id, receiver_id);
    if (threadId) {
      await supabaseAdmin.from("direct_messages").insert({
        thread_id: threadId,
        sender_id: auth.user.id,
        content: `Sent a proposal: "${title}"`,
        message_type: "proposal",
        metadata: {},
      });
      await supabaseAdmin.from("message_threads").update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `Sent a proposal: "${title}"`.slice(0, 120),
      }).eq("id", threadId);
    }
  }

  const { data: proposal, error } = await supabaseAdmin
    .from("proposals")
    .insert({
      sender_id: auth.user.id,
      receiver_id,
      thread_id: threadId,
      title,
      description: description || null,
      proposal_type: proposal_type || "creator_to_brand",
      deliverables: deliverablesList,
      total_amount: computedAmount,
      currency: currency || "USD",
      payment_type: payment_type || "fixed",
      start_date: start_date || null,
      end_date: end_date || null,
      status: proposalStatus,
      revision_count: 0,
      notes: notes || null,
      attachments: [],
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create proposal: " + error.message }, { status: 500 });
  }

  await supabaseAdmin.from("proposal_events").insert({
    proposal_id: proposal.id,
    actor_id: auth.user.id,
    event_type: proposalStatus === "draft" ? "created_draft" : "sent",
    details: {},
  });

  // B6: Log usage event for plan-limit tracking
  if (!ctx.isSuperadmin) {
    await logUsageEvent(ctx.orgId, auth.user.id, "proposal_created", {
      proposal_id: proposal.id,
    });
  }

  return NextResponse.json({ success: true, proposalId: proposal.id });
}

/** PUT — Update proposal status */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { proposalId, status, counterOffer } = body;

  if (!proposalId || !status) {
    return NextResponse.json({ error: "proposalId and status are required" }, { status: 400 });
  }

  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  const userId = auth.user.id;
  if (proposal.sender_id !== userId && proposal.receiver_id !== userId) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Counter-offer is a special case
  if (status === "negotiating" && counterOffer) {
    if (!["pending", "negotiating"].includes(proposal.status)) {
      return NextResponse.json({ error: "Cannot counter-offer in current status" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      status: "negotiating",
      revision_count: (proposal.revision_count || 0) + 1,
      counter_offer: counterOffer,
      updated_at: new Date().toISOString(),
    };
    if (counterOffer.deliverables) updateData.deliverables = counterOffer.deliverables;
    if (counterOffer.total_amount) updateData.total_amount = counterOffer.total_amount;
    if (counterOffer.payment_type) updateData.payment_type = counterOffer.payment_type;
    if (counterOffer.start_date) updateData.start_date = counterOffer.start_date;
    if (counterOffer.end_date) updateData.end_date = counterOffer.end_date;

    await supabaseAdmin.from("proposals").update(updateData).eq("id", proposalId);

    await supabaseAdmin.from("proposal_events").insert({
      proposal_id: proposalId,
      actor_id: userId,
      event_type: "counter_offer",
      details: { counter_offer: counterOffer, revision_count: updateData.revision_count },
    });

    if (proposal.thread_id) {
      await supabaseAdmin.from("direct_messages").insert({
        thread_id: proposal.thread_id,
        sender_id: userId,
        content: `Counter-offered on proposal: "${proposal.title}"`,
        message_type: "proposal",
        metadata: {},
      });
    }

    return NextResponse.json({ success: true });
  }

  // Standard status transition
  const role = userId === proposal.sender_id ? "sender" : "receiver";
  const transitions = ALLOWED_TRANSITIONS[proposal.status];
  if (!transitions) {
    return NextResponse.json({ error: `Cannot change status from ${proposal.status}` }, { status: 400 });
  }

  const allowed = transitions[role] ?? [];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: `Cannot change to ${status} as ${role}` }, { status: 400 });
  }

  await supabaseAdmin.from("proposals").update({
    status,
    updated_at: new Date().toISOString(),
  }).eq("id", proposalId);

  await supabaseAdmin.from("proposal_events").insert({
    proposal_id: proposalId,
    actor_id: userId,
    event_type: status,
    details: {},
  });

  if (proposal.thread_id) {
    const messages: Record<string, string> = {
      accepted: `Accepted proposal: "${proposal.title}"`,
      declined: `Declined proposal: "${proposal.title}"`,
      cancelled: `Cancelled proposal: "${proposal.title}"`,
    };
    if (messages[status]) {
      await supabaseAdmin.from("direct_messages").insert({
        thread_id: proposal.thread_id,
        sender_id: userId,
        content: messages[status],
        message_type: "system",
        metadata: {},
      });
    }
  }

  return NextResponse.json({ success: true });
}

/** PATCH — Convert accepted proposal to deal */
export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { proposalId } = body;
  if (!proposalId) return NextResponse.json({ error: "proposalId is required" }, { status: 400 });

  const { data: proposal } = await supabaseAdmin
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  if (proposal.status !== "accepted") {
    return NextResponse.json({ error: "Proposal must be accepted first" }, { status: 400 });
  }
  if (proposal.deal_id) {
    return NextResponse.json({ error: "Already converted to deal" }, { status: 400 });
  }

  const userId = auth.user.id;
  const brandId = proposal.proposal_type === "brand_to_creator" ? proposal.sender_id : proposal.receiver_id;

  const [{ data: brandProfile }, { data: userProfile }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, company_name, organization_id").eq("id", brandId).single(),
    supabaseAdmin.from("profiles").select("organization_id").eq("id", userId).single(),
  ]);

  if (!userProfile?.organization_id) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  const { data: deal, error } = await supabaseAdmin
    .from("deals")
    .insert({
      organization_id: userProfile.organization_id,
      brand_name: brandProfile?.company_name || brandProfile?.full_name || "Brand",
      contact_email: null,
      total_value: proposal.total_amount || 0,
      paid_amount: 0,
      status: "active",
      pipeline_stage: "contracted",
      is_from_platform: true,
      proposal_id: proposalId,
      thread_id: proposal.thread_id,
      brand_profile_id: brandId,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });

  // Map proposal deliverables to deal deliverables
  const deliverables = proposal.deliverables ?? [];
  if (deliverables.length > 0) {
    const delRows = deliverables.map((d: any) => ({
      deal_id: deal.id,
      title: `${d.content_type || "Content"} on ${d.platform || "Platform"}`,
      platform: d.platform || null,
      content_type: d.content_type || null,
      deadline: d.deadline || null,
      status: "pending",
      payment_amount: d.amount || 0,
    }));
    await supabaseAdmin.from("deal_deliverables").insert(delRows);
  }

  await supabaseAdmin.from("proposals").update({ deal_id: deal.id }).eq("id", proposalId);
  await supabaseAdmin.from("proposal_events").insert({
    proposal_id: proposalId,
    actor_id: userId,
    event_type: "converted_to_deal",
    details: { deal_id: deal.id },
  });

  return NextResponse.json({ success: true, dealId: deal.id });
}
