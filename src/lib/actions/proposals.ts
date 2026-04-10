"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { Proposal, ProposalStatus, ProposalDeliverable } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// ─── Create Proposal ─────────────────────────────────────────────────────────

export interface CreateProposalInput {
  receiver_id: string;
  title: string;
  description?: string;
  proposal_type: "brand_to_creator" | "creator_to_brand";
  deliverables: ProposalDeliverable[];
  total_amount?: number;
  currency?: string;
  payment_type: "fixed" | "per_deliverable" | "revenue_share" | "product_only";
  start_date?: string;
  end_date?: string;
  notes?: string;
  status?: "draft" | "pending";
}

export async function createProposal(data: CreateProposalInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  // Validate receiver exists
  const { data: receiver } = await admin
    .from("profiles")
    .select("id, full_name")
    .eq("id", data.receiver_id)
    .single();

  if (!receiver) return { error: "Recipient not found." };

  // Calculate total from deliverables if not provided
  const totalAmount =
    data.total_amount ??
    data.deliverables.reduce((sum, d) => sum + (d.amount ?? 0), 0);

  const status = data.status ?? "pending";

  // Auto-create a message thread between sender and receiver
  let threadId: string | null = null;

  // Get sender profile for message display
  const { data: senderProfileForMsg } = await admin
    .from("profiles")
    .select("full_name, company_name, account_type")
    .eq("id", user.id)
    .single();
  const senderDisplayName =
    senderProfileForMsg?.company_name || senderProfileForMsg?.full_name || "Someone";

  if (status === "pending") {
    // Normalize participant order (smaller UUID = participant_1)
    const [p1, p2] =
      user.id < data.receiver_id
        ? [user.id, data.receiver_id]
        : [data.receiver_id, user.id];

    // Check if a thread already exists between the two users
    const { data: existingThread } = await admin
      .from("message_threads")
      .select("id")
      .eq("participant_1", p1)
      .eq("participant_2", p2)
      .maybeSingle();

    if (existingThread) {
      threadId = existingThread.id;
    } else {
      const { data: newThread, error: threadErr } = await admin
        .from("message_threads")
        .insert({
          participant_1: p1,
          participant_2: p2,
          last_message_preview: `New proposal: ${data.title}`,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (threadErr) {
        console.error("Thread creation error:", threadErr);
      } else {
        threadId = newThread?.id ?? null;
      }
    }
  }

  // Create the proposal first so we have its ID for the message metadata
  const { data: proposal, error } = await admin
    .from("proposals")
    .insert({
      sender_id: user.id,
      receiver_id: data.receiver_id,
      thread_id: threadId,
      title: data.title,
      description: data.description ?? null,
      proposal_type: data.proposal_type,
      deliverables: data.deliverables,
      total_amount: totalAmount,
      currency: data.currency ?? "USD",
      payment_type: data.payment_type,
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      status,
      revision_count: 0,
      notes: data.notes ?? null,
      attachments: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("Proposal creation error:", error);
    return { error: "Failed to create proposal." };
  }

  // Send proposal message in the thread (now we have proposal.id)
  if (status === "pending" && threadId) {
    const [p1] =
      user.id < data.receiver_id
        ? [user.id, data.receiver_id]
        : [data.receiver_id, user.id];
    const isP1 = user.id === p1;
    const unreadField = isP1 ? "unread_count_2" : "unread_count_1";

    await admin.from("direct_messages").insert({
      thread_id: threadId,
      sender_id: user.id,
      content: `${senderDisplayName} sent a proposal: "${data.title}"`,
      message_type: "proposal",
      metadata: {
        proposal_id: proposal.id,
        title: data.title,
        amount: totalAmount,
        currency: data.currency ?? "USD",
        sender_name: senderDisplayName,
      },
    });

    await admin
      .from("message_threads")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `New proposal: ${data.title} — $${totalAmount.toLocaleString()}`,
        [unreadField]: 1,
      })
      .eq("id", threadId);
  }

  // Log proposal event
  await admin.from("proposal_events").insert({
    proposal_id: proposal.id,
    actor_id: user.id,
    event_type: status === "draft" ? "created_draft" : "sent",
    details: { title: data.title, total_amount: totalAmount },
  });

  // Send notification to the receiver
  if (status === "pending") {
    // Get sender profile for the notification text
    const { data: senderProfile } = await admin
      .from("profiles")
      .select("full_name, company_name, account_type, organization_id")
      .eq("id", user.id)
      .single();

    const senderName =
      senderProfile?.company_name || senderProfile?.full_name || "Someone";

    // Get receiver's organization_id for the notification
    const { data: receiverProfile } = await admin
      .from("profiles")
      .select("organization_id")
      .eq("id", data.receiver_id)
      .single();

    if (receiverProfile?.organization_id) {
      await admin.from("notifications").insert({
        organization_id: receiverProfile.organization_id,
        title: "New Proposal Received",
        body: `${senderName} sent you a proposal: "${data.title}" — $${totalAmount.toLocaleString()}`,
        type: "proposal_received",
        is_read: false,
      });
    }
  }

  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard/business");
  revalidatePath("/brand/proposals");
  return { success: true, proposalId: proposal.id };
}

// ─── Find Proposal by Thread ─────────────────────────────────────────────────

export async function findProposalIdByThread(threadId: string): Promise<string | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("proposals")
    .select("id")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}

// ─── Get Proposals (with filters) ───────────────────────────────────────────

export interface ProposalFilter {
  status?: ProposalStatus;
  type?: "sent" | "received";
}

export async function getProposals(filter?: ProposalFilter) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated.", data: [] as Proposal[] };

  const admin = createAdminClient();

  let query = admin
    .from("proposals")
    .select("*")
    .order("updated_at", { ascending: false });

  // Filter by sent/received or get both
  if (filter?.type === "sent") {
    query = query.eq("sender_id", user.id);
  } else if (filter?.type === "received") {
    query = query.eq("receiver_id", user.id);
  } else {
    query = query.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
  }

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  const { data: proposals, error } = await query;

  if (error) {
    console.error("Get proposals error:", error);
    return { error: "Failed to fetch proposals.", data: [] as Proposal[] };
  }

  if (!proposals || proposals.length === 0) {
    return { data: [] as Proposal[] };
  }

  // Collect unique user IDs for sender/receiver profiles
  const userIds = new Set<string>();
  for (const p of proposals) {
    userIds.add(p.sender_id);
    userIds.add(p.receiver_id);
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, account_type, company_name")
    .in("id", Array.from(userIds));

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null; avatar_url: string | null; account_type: string; company_name: string | null }) => [p.id, p]),
  );

  const enriched: Proposal[] = proposals.map((p) => ({
    ...p,
    sender: profileMap.get(p.sender_id) ?? undefined,
    receiver: profileMap.get(p.receiver_id) ?? undefined,
  }));

  return { data: enriched };
}

// ─── Get Single Proposal ────────────────────────────────────────────────────

export async function getProposal(id: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: proposal, error } = await admin
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proposal) {
    return { error: "Proposal not found." };
  }

  // Verify the user is either sender or receiver
  if (proposal.sender_id !== user.id && proposal.receiver_id !== user.id) {
    return { error: "You do not have access to this proposal." };
  }

  // Enrich with profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, account_type, company_name")
    .in("id", [proposal.sender_id, proposal.receiver_id]);

  const profileMap = new Map(
    (profiles ?? []).map((p: { id: string; full_name: string | null; avatar_url: string | null; account_type: string; company_name: string | null }) => [p.id, p]),
  );

  // Get events
  const { data: events } = await admin
    .from("proposal_events")
    .select("*")
    .eq("proposal_id", id)
    .order("created_at", { ascending: true });

  const enriched: Proposal & { events?: unknown[] } = {
    ...proposal,
    sender: profileMap.get(proposal.sender_id) ?? undefined,
    receiver: profileMap.get(proposal.receiver_id) ?? undefined,
    events: events ?? [],
  };

  return { data: enriched };
}

// ─── Update Proposal Status ────────────────────────────────────────────────

export async function updateProposalStatus(id: string, status: ProposalStatus) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (!proposal) return { error: "Proposal not found." };

  // Authorization: who can do what
  const isSender = proposal.sender_id === user.id;
  const isReceiver = proposal.receiver_id === user.id;

  if (!isSender && !isReceiver) {
    return { error: "You do not have access to this proposal." };
  }

  // Validate allowed transitions
  const allowedTransitions: Record<string, { sender: ProposalStatus[]; receiver: ProposalStatus[] }> = {
    draft: { sender: ["pending", "cancelled"], receiver: [] },
    pending: { sender: ["cancelled"], receiver: ["accepted", "declined", "negotiating"] },
    negotiating: { sender: ["cancelled"], receiver: ["accepted", "declined"] },
    accepted: { sender: [], receiver: [] },
    declined: { sender: [], receiver: [] },
    cancelled: { sender: [], receiver: [] },
    expired: { sender: [], receiver: [] },
  };

  const allowed = isSender
    ? allowedTransitions[proposal.status]?.sender ?? []
    : allowedTransitions[proposal.status]?.receiver ?? [];

  if (!allowed.includes(status)) {
    return { error: `Cannot transition from "${proposal.status}" to "${status}".` };
  }

  const { error } = await admin
    .from("proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Update proposal status error:", error);
    return { error: "Failed to update proposal status." };
  }

  // Log event
  await admin.from("proposal_events").insert({
    proposal_id: id,
    actor_id: user.id,
    event_type: status,
    details: { previous_status: proposal.status },
  });

  // Send thread message about the status change
  if (proposal.thread_id) {
    await admin.from("direct_messages").insert({
      thread_id: proposal.thread_id,
      sender_id: user.id,
      content: `Proposal "${proposal.title}" was ${status}.`,
      message_type: "system",
      metadata: { proposal_id: id, new_status: status },
    });
  }

  // Send notification to the other party
  const recipientId = isSender ? proposal.receiver_id : proposal.sender_id;
  const { data: actorProfile } = await admin
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", user.id)
    .single();
  const { data: recipientProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", recipientId)
    .single();

  if (recipientProfile?.organization_id) {
    const actorName = actorProfile?.company_name || actorProfile?.full_name || "Someone";
    const statusLabels: Record<string, string> = {
      accepted: "accepted",
      declined: "declined",
      cancelled: "cancelled",
      negotiating: "wants to negotiate",
    };
    await admin.from("notifications").insert({
      organization_id: recipientProfile.organization_id,
      title: `Proposal ${statusLabels[status] ?? status}`,
      body: `${actorName} ${statusLabels[status] ?? status} the proposal: "${proposal.title}"`,
      type: `proposal_${status}`,
      is_read: false,
    });
  }

  // Auto-convert to deal when accepted
  if (status === "accepted") {
    // Create deals for BOTH parties so each org can see it

    // Determine brand and creator based on proposal type
    const brandId =
      proposal.proposal_type === "brand_to_creator"
        ? proposal.sender_id
        : proposal.receiver_id;
    const creatorId =
      proposal.proposal_type === "brand_to_creator"
        ? proposal.receiver_id
        : proposal.sender_id;

    const { data: brandProfile } = await admin
      .from("profiles")
      .select("id, full_name, company_name, organization_id")
      .eq("id", brandId)
      .single();

    const { data: creatorProfile } = await admin
      .from("profiles")
      .select("id, full_name, company_name, organization_id")
      .eq("id", creatorId)
      .single();

    const deliverables = (proposal.deliverables ?? []) as ProposalDeliverable[];

    // Create deal under the creator's organization
    if (creatorProfile?.organization_id) {
      const { data: deal } = await admin
        .from("deals")
        .insert({
          organization_id: creatorProfile.organization_id,
          brand_name: brandProfile?.company_name ?? brandProfile?.full_name ?? "Unknown Brand",
          contact_email: null,
          status: "active",
          pipeline_stage: "contracted" as const,
          total_value: proposal.total_amount,
          paid_amount: 0,
          notes: proposal.description,
          proposal_id: id,
          thread_id: proposal.thread_id,
          brand_profile_id: brandId,
          is_from_platform: true,
        })
        .select("id")
        .single();

      if (deal) {
        // Create deal deliverables
        if (deliverables.length > 0) {
          await admin.from("deal_deliverables").insert(
            deliverables.map((d) => ({
              deal_id: deal.id,
              title: `${d.content_type} on ${d.platform}`,
              platform: d.platform,
              content_type: d.content_type,
              deadline: d.deadline,
              status: "pending" as const,
              payment_amount: d.amount,
            })),
          );
        }

        // Update proposal with deal_id
        await admin
          .from("proposals")
          .update({ deal_id: deal.id, updated_at: new Date().toISOString() })
          .eq("id", id);

        // Log event
        await admin.from("proposal_events").insert({
          proposal_id: id,
          actor_id: user.id,
          event_type: "converted_to_deal",
          details: { deal_id: deal.id },
        });
      }
    }

    // Auto-create campaign under the brand's organization
    if (brandProfile?.organization_id) {
      const { error: campaignError } = await admin.from("campaigns").insert({
        organization_id: brandProfile.organization_id,
        name: proposal.title,
        status: "active",
        start_date: proposal.start_date ?? null,
        end_date: proposal.end_date ?? null,
        budget: proposal.total_amount ?? null,
        notes: proposal.description ?? null,
      });
      if (campaignError) {
        console.error("[updateProposalStatus] campaign insert failed:", campaignError);
      }
    } else {
      console.warn("[updateProposalStatus] brand has no organization_id, skipping campaign creation for proposal:", id);
    }
  }

  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/deals");
  revalidatePath("/brand/proposals");
  revalidatePath("/brand/deals");
  revalidatePath("/brand/campaigns");
  return { success: true };
}

// ─── Counter Proposal ───────────────────────────────────────────────────────

export interface CounterOfferInput {
  deliverables?: ProposalDeliverable[];
  total_amount?: number;
  payment_type?: "fixed" | "per_deliverable" | "revenue_share" | "product_only";
  notes?: string;
  start_date?: string;
  end_date?: string;
}

export async function counterProposal(id: string, counterOffer: CounterOfferInput) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (!proposal) return { error: "Proposal not found." };

  // Only the receiver (or sender during negotiation) can counter
  if (proposal.receiver_id !== user.id && proposal.sender_id !== user.id) {
    return { error: "You do not have access to this proposal." };
  }

  if (!["pending", "negotiating"].includes(proposal.status)) {
    return { error: "Cannot counter a proposal that is not pending or in negotiation." };
  }

  const updates: Record<string, unknown> = {
    status: "negotiating" as ProposalStatus,
    counter_offer: counterOffer,
    revision_count: (proposal.revision_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  };

  // If counter includes new deliverables, update them
  if (counterOffer.deliverables) {
    updates.deliverables = counterOffer.deliverables;
  }
  if (counterOffer.total_amount !== undefined) {
    updates.total_amount = counterOffer.total_amount;
  }
  if (counterOffer.payment_type) {
    updates.payment_type = counterOffer.payment_type;
  }
  if (counterOffer.start_date) {
    updates.start_date = counterOffer.start_date;
  }
  if (counterOffer.end_date) {
    updates.end_date = counterOffer.end_date;
  }

  const { error } = await admin.from("proposals").update(updates).eq("id", id);

  if (error) {
    console.error("Counter proposal error:", error);
    return { error: "Failed to submit counter offer." };
  }

  // Log event
  await admin.from("proposal_events").insert({
    proposal_id: id,
    actor_id: user.id,
    event_type: "counter_offer",
    details: {
      counter_offer: counterOffer,
      revision_count: (proposal.revision_count ?? 0) + 1,
    },
  });

  // Send thread message
  if (proposal.thread_id) {
    await admin.from("direct_messages").insert({
      thread_id: proposal.thread_id,
      sender_id: user.id,
      content: `Counter offer submitted for "${proposal.title}".`,
      message_type: "proposal",
      metadata: { proposal_id: id, counter_offer: counterOffer },
    });
  }

  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard/business");
  return { success: true };
}

// ─── Convert Proposal to Deal ───────────────────────────────────────────────

export async function convertToDeal(proposalId: string) {
  const user = await getAuthUser();
  if (!user) return { error: "Not authenticated." };

  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { error: "Proposal not found." };

  if (proposal.status !== "accepted") {
    return { error: "Only accepted proposals can be converted to deals." };
  }

  if (proposal.deal_id) {
    return { error: "This proposal has already been converted to a deal." };
  }

  // Determine brand info based on proposal type
  const brandId =
    proposal.proposal_type === "brand_to_creator"
      ? proposal.sender_id
      : proposal.receiver_id;

  const { data: brandProfile } = await admin
    .from("profiles")
    .select("id, full_name, company_name, organization_id")
    .eq("id", brandId)
    .single();

  // Get organization_id from the current user's profile
  const { data: userProfile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  const orgId = userProfile?.organization_id;
  if (!orgId) return { error: "No organization found for current user." };

  // Create the deal
  const { data: deal, error: dealError } = await admin
    .from("deals")
    .insert({
      organization_id: orgId,
      brand_name: brandProfile?.company_name ?? brandProfile?.full_name ?? "Unknown Brand",
      contact_email: null,
      status: "active",
      pipeline_stage: "contracted" as const,
      total_value: proposal.total_amount,
      paid_amount: 0,
      notes: proposal.description,
      proposal_id: proposalId,
      thread_id: proposal.thread_id,
      brand_profile_id: brandId,
      is_from_platform: true,
    })
    .select("id")
    .single();

  if (dealError || !deal) {
    console.error("Deal creation error:", dealError);
    return { error: "Failed to create deal." };
  }

  // Create deal deliverables from proposal deliverables
  const deliverables = (proposal.deliverables ?? []) as ProposalDeliverable[];
  if (deliverables.length > 0) {
    const dealDeliverables = deliverables.map((d) => ({
      deal_id: deal.id,
      title: `${d.content_type} on ${d.platform}`,
      platform: d.platform,
      content_type: d.content_type,
      deadline: d.deadline,
      status: "pending" as const,
      payment_amount: d.amount,
    }));

    await admin.from("deal_deliverables").insert(dealDeliverables);
  }

  // Update proposal with deal_id reference
  await admin
    .from("proposals")
    .update({ deal_id: deal.id, updated_at: new Date().toISOString() })
    .eq("id", proposalId);

  // Log event
  await admin.from("proposal_events").insert({
    proposal_id: proposalId,
    actor_id: user.id,
    event_type: "converted_to_deal",
    details: { deal_id: deal.id },
  });

  revalidatePath("/dashboard/proposals");
  revalidatePath("/dashboard/business");
  revalidatePath("/dashboard/deals");
  return { success: true, dealId: deal.id };
}
