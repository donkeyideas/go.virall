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

/** GET — Trending topics from cache */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const niche = url.searchParams.get("niche");
  const limit = parseInt(url.searchParams.get("limit") || "50");

  let query = supabaseAdmin
    .from("trending_topics")
    .select("*")
    .gt("expires_at", new Date().toISOString())
    .order("trend_score", { ascending: false })
    .limit(limit);

  if (platform && platform !== "all") query = query.eq("platform", platform);
  if (niche) query = query.eq("niche", niche);

  const { data } = await query;
  return NextResponse.json({ data: data ?? [] });
}

/** POST — AI hashtag recommendations or trend scanning */
export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const { action } = body;

  if (action === "recommend") {
    const { content, platform, niche } = body;
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    try {
      const { getHashtagRecommendations } = await import("@/lib/ai/trend-intelligence");
      const result = await getHashtagRecommendations(content.slice(0, 2000), platform || "instagram", niche || "general");
      return NextResponse.json({ success: true, data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Hashtag recommendation failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === "scan") {
    const { platform, niche } = body;

    try {
      const { scanTrends } = await import("@/lib/ai/trend-intelligence");
      const result = await scanTrends(platform || "instagram", niche || "general");
      return NextResponse.json({ success: true, data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Trend scanning failed";
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Invalid action. Use 'recommend' or 'scan'" }, { status: 400 });
}
