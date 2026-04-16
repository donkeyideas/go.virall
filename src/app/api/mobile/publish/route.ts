import { NextRequest, NextResponse } from "next/server";
import {
  supabaseAdmin,
  authenticateRequest,
  getAuthContext,
} from "../_shared/auth";

async function getOrgId(userId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();
  return data?.organization_id ?? null;
}

/** GET — List scheduled posts */
export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const url = new URL(req.url);
  const platform = url.searchParams.get("platform");
  const status = url.searchParams.get("status");

  let query = supabaseAdmin
    .from("scheduled_posts")
    .select("*")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: true });

  if (platform) query = query.eq("platform", platform);
  if (status) query = query.eq("status", status);

  const { data } = await query;

  // Compute stats
  const posts = data ?? [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const stats = {
    total: posts.length,
    scheduled: posts.filter((p: any) => p.status === "scheduled").length,
    published: posts.filter((p: any) => p.status === "published" && p.published_at >= monthStart).length,
    drafts: posts.filter((p: any) => p.status === "draft").length,
  };

  return NextResponse.json({ data: posts, stats });
}

/** POST — Create a scheduled post */
export async function POST(req: NextRequest) {
  const authResult = await getAuthContext(req);
  if ("error" in authResult) return authResult.error;
  const { ctx } = authResult;

  const body = await req.json();
  const { platform, content, hashtags, scheduled_at, social_profile_id, status, media_urls } = body;

  if (!platform || !content?.trim()) {
    return NextResponse.json({ error: "platform and content are required" }, { status: 400 });
  }

  // B6: Enforce cross_platform_publishing feature flag (superadmins bypass)
  if (!ctx.isSuperadmin && !ctx.limits.cross_platform_publishing) {
    return NextResponse.json(
      {
        error: `Scheduled publishing is a Business plan feature. Upgrade to continue.`,
        planLimitReached: true,
        limit: "cross_platform_publishing",
        upgradeUrl: "/dashboard/billing",
      },
      { status: 403 },
    );
  }

  const orgId = ctx.orgId;

  const postStatus = status || "draft";
  if (postStatus === "scheduled" && !scheduled_at) {
    return NextResponse.json({ error: "scheduled_at is required for scheduled posts" }, { status: 400 });
  }

  const { data: post, error } = await supabaseAdmin
    .from("scheduled_posts")
    .insert({
      user_id: ctx.user.id,
      organization_id: orgId,
      platform,
      content: content.trim(),
      hashtags: hashtags ?? [],
      scheduled_at: scheduled_at || new Date().toISOString(),
      social_profile_id: social_profile_id || null,
      status: postStatus,
      media_urls: media_urls ?? [],
      ai_optimized: false,
      ai_suggestions: {},
      metadata: {},
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create post: " + error.message }, { status: 500 });

  return NextResponse.json({ success: true, data: post });
}

/** PUT — Update a scheduled post */
export async function PUT(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { postId, ...fields } = body;

  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  // Verify ownership
  const { data: existing } = await supabaseAdmin
    .from("scheduled_posts")
    .select("id, status")
    .eq("id", postId)
    .eq("organization_id", orgId)
    .single();

  if (!existing) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (existing.status === "published") {
    return NextResponse.json({ error: "Cannot edit published posts" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const allowedFields = ["platform", "content", "hashtags", "scheduled_at", "social_profile_id", "status", "media_urls"];
  for (const key of allowedFields) {
    if (fields[key] !== undefined) updateData[key] = fields[key];
  }

  const { data: updated, error } = await supabaseAdmin
    .from("scheduled_posts")
    .update(updateData)
    .eq("id", postId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update post" }, { status: 500 });

  return NextResponse.json({ success: true, data: updated });
}

/** DELETE — Remove a scheduled post */
export async function DELETE(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if ("error" in auth) return auth.error;

  const orgId = await getOrgId(auth.user.id);
  if (!orgId) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const body = await req.json();
  const { postId } = body;
  if (!postId) return NextResponse.json({ error: "postId is required" }, { status: 400 });

  const { error } = await supabaseAdmin
    .from("scheduled_posts")
    .delete()
    .eq("id", postId)
    .eq("organization_id", orgId);

  if (error) return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });

  return NextResponse.json({ success: true });
}
