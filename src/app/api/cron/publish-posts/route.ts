import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron endpoint for auto-publishing scheduled posts.
 *
 * This endpoint finds posts where scheduled_at <= NOW and status = 'scheduled',
 * and marks them as needing publication. Actual publishing to social platforms
 * requires API integrations (Instagram Graph API, Twitter API, etc.) which will
 * be added in a future phase. For now, posts are logged and their metadata is
 * updated to indicate they are ready for manual publishing.
 *
 * Protected by CRON_SECRET environment variable.
 *
 * Expected to be called every 5 minutes by a cron service (Vercel Cron, etc.)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[publish-posts cron] CRON_SECRET not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  try {
    // Find all posts that should have been published by now
    const { data: duePosts, error: fetchError } = await admin
      .from("scheduled_posts")
      .select("id, user_id, organization_id, platform, content, scheduled_at, social_profile_id")
      .eq("status", "scheduled")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("[publish-posts cron] Failed to fetch due posts:", fetchError.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!duePosts || duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No posts due for publishing",
        processed: 0,
      });
    }

    console.log(`[publish-posts cron] Found ${duePosts.length} post(s) due for publishing`);

    const results: { id: string; platform: string; status: string }[] = [];

    for (const post of duePosts) {
      try {
        // In the future, this is where we would call the platform's API:
        //
        // if (post.platform === "instagram") {
        //   await publishToInstagram(post);
        // } else if (post.platform === "twitter") {
        //   await publishToTwitter(post);
        // }
        //
        // For now, we update the metadata to flag that the post is ready
        // for manual publishing, and keep it in "scheduled" status.

        // Fetch existing metadata to merge (avoid overwriting user data)
        const { data: existing } = await admin
          .from("scheduled_posts")
          .select("metadata")
          .eq("id", post.id)
          .single();

        const mergedMetadata = {
          ...((existing?.metadata as Record<string, unknown>) ?? {}),
          cron_checked_at: now,
          manual_publish_needed: true,
          publish_reminder: `This post was scheduled for ${post.scheduled_at}. Please publish it manually to ${post.platform} and then mark it as published.`,
        };

        const { error: updateError } = await admin
          .from("scheduled_posts")
          .update({
            metadata: mergedMetadata,
            updated_at: now,
          })
          .eq("id", post.id);

        if (updateError) {
          console.error(`[publish-posts cron] Failed to update post ${post.id}:`, updateError.message);
          results.push({ id: post.id, platform: post.platform, status: "error" });
        } else {
          console.log(
            `[publish-posts cron] Flagged post ${post.id} (${post.platform}) for manual publishing`,
          );
          results.push({ id: post.id, platform: post.platform, status: "flagged" });
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[publish-posts cron] Error processing post ${post.id}:`, errMsg);
        results.push({ id: post.id, platform: post.platform, status: "error" });
      }
    }

    // Create notifications for organizations with due posts
    const orgIds = [...new Set(duePosts.map((p) => p.organization_id))];
    for (const orgId of orgIds) {
      const orgPosts = duePosts.filter((p) => p.organization_id === orgId);
      try {
        await admin.from("notifications").insert({
          organization_id: orgId,
          title: "Posts Ready to Publish",
          body: `You have ${orgPosts.length} post(s) scheduled for now. Visit the Publish page to manually publish them and mark them as complete.`,
          type: "publishing",
          is_read: false,
        });
      } catch {
        // Non-critical: notification creation failure should not block the cron
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${duePosts.length} post(s)`,
      processed: duePosts.length,
      results,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[publish-posts cron] Unexpected error:", errMsg);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
