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
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(authHeader.slice(7));
  if (error || !user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }
  return { user };
}

/** GET — Get AI brand matches for creator */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const { data: matches } = await supabaseAdmin
    .from("brand_creator_matches")
    .select("*, brand:profiles!brand_creator_matches_brand_profile_id_fkey(id, full_name, avatar_url, company_name, industry)")
    .eq("creator_profile_id", auth.user.id)
    .order("match_score", { ascending: false })
    .limit(50);

  return NextResponse.json({ data: matches ?? [] });
}
