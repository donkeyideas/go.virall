import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user };
}

async function getOrgId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return data?.organization_id ?? null;
}

const STAGE_STATUS_MAP: Record<string, string> = {
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

/** GET — List deals with deliverables */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const { data: deals } = await supabaseAdmin
    .from("deals")
    .select("*")
    .eq("organization_id", orgId)
    .order("updated_at", { ascending: false });

  const dealList = deals ?? [];
  if (dealList.length === 0) return NextResponse.json({ data: [] });

  const dealIds = dealList.map((d: any) => d.id);
  const { data: deliverables } = await supabaseAdmin
    .from("deal_deliverables")
    .select("*")
    .in("deal_id", dealIds)
    .order("created_at", { ascending: true });

  const delMap = new Map<string, any[]>();
  for (const d of deliverables ?? []) {
    const arr = delMap.get(d.deal_id) ?? [];
    arr.push(d);
    delMap.set(d.deal_id, arr);
  }

  const enriched = dealList.map((deal: any) => ({
    ...deal,
    deliverables: delMap.get(deal.id) ?? [],
  }));

  return NextResponse.json({ data: enriched });
}

/** POST — Create a new deal */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { brand_name, contact_email, total_value, pipeline_stage, notes } = body;

  if (!brand_name) {
    return NextResponse.json({ error: "brand_name is required" }, { status: 400 });
  }

  const stage = pipeline_stage || "lead";
  const { data: deal, error } = await supabaseAdmin
    .from("deals")
    .insert({
      organization_id: orgId,
      brand_name,
      contact_email: contact_email || null,
      total_value: total_value || 0,
      paid_amount: 0,
      status: STAGE_STATUS_MAP[stage] || "inquiry",
      pipeline_stage: stage,
      notes: notes || null,
      is_from_platform: false,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create deal: " + error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, dealId: deal.id });
}

/** PUT — Update deal stage or fields */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { dealId, pipeline_stage, brand_name, contact_email, total_value, paid_amount, notes, contract_url } = body;

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  // Verify ownership
  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("organization_id", orgId)
    .single();

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (pipeline_stage) {
    if (!STAGE_STATUS_MAP[pipeline_stage]) {
      return NextResponse.json({ error: "Invalid pipeline stage" }, { status: 400 });
    }
    updateData.pipeline_stage = pipeline_stage;
    updateData.status = STAGE_STATUS_MAP[pipeline_stage];
  }
  if (brand_name !== undefined) updateData.brand_name = brand_name;
  if (contact_email !== undefined) updateData.contact_email = contact_email;
  if (total_value !== undefined) updateData.total_value = total_value;
  if (paid_amount !== undefined) updateData.paid_amount = paid_amount;
  if (notes !== undefined) updateData.notes = notes;
  if (contract_url !== undefined) updateData.contract_url = contract_url;

  const { error } = await supabaseAdmin
    .from("deals")
    .update(updateData)
    .eq("id", dealId);

  if (error) {
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** PATCH — Add or update a deliverable */
export async function PATCH(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { dealId, deliverableId, title, platform, content_type, deadline, status, payment_amount } = body;

  if (!dealId) {
    return NextResponse.json({ error: "dealId is required" }, { status: 400 });
  }

  // Verify deal ownership
  const { data: deal } = await supabaseAdmin
    .from("deals")
    .select("id")
    .eq("id", dealId)
    .eq("organization_id", orgId)
    .single();

  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });

  if (deliverableId) {
    // Update existing
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (platform !== undefined) updateData.platform = platform;
    if (content_type !== undefined) updateData.content_type = content_type;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (status !== undefined) updateData.status = status;
    if (payment_amount !== undefined) updateData.payment_amount = payment_amount;

    const { error } = await supabaseAdmin
      .from("deal_deliverables")
      .update(updateData)
      .eq("id", deliverableId)
      .eq("deal_id", dealId);

    if (error) return NextResponse.json({ error: "Failed to update deliverable" }, { status: 500 });
  } else {
    // Add new
    if (!title) return NextResponse.json({ error: "title is required for new deliverable" }, { status: 400 });

    const { error } = await supabaseAdmin
      .from("deal_deliverables")
      .insert({
        deal_id: dealId,
        title,
        platform: platform || null,
        content_type: content_type || null,
        deadline: deadline || null,
        status: status || "pending",
        payment_amount: payment_amount || 0,
      });

    if (error) return NextResponse.json({ error: "Failed to add deliverable" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/** DELETE — Remove a deal */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { dealId } = body;
  if (!dealId) return NextResponse.json({ error: "dealId is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("deals")
    .delete()
    .eq("id", dealId)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: "Failed to delete deal" }, { status: 500 });

  return NextResponse.json({ success: true });
}
