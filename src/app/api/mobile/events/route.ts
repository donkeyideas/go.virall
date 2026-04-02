import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json();
  const { eventType, screen, metadata } = body;

  if (!eventType) {
    return NextResponse.json(
      { error: "eventType is required" },
      { status: 400 },
    );
  }

  // Get organization
  const { data: member } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  await supabaseAdmin.from("user_events").insert({
    user_id: user.id,
    organization_id: member?.organization_id ?? null,
    event_type: eventType,
    screen: screen ?? null,
    metadata: metadata ?? null,
  });

  return NextResponse.json({ success: true });
}
