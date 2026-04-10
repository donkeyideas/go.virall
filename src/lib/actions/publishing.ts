"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { aiChat } from "@/lib/ai/provider";
import type { ScheduledPost, SocialPlatform } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CreatePostInput {
  platform: SocialPlatform;
  content: string;
  media_urls?: string[];
  hashtags?: string[];
  scheduled_at?: string;
  social_profile_id?: string | null;
  status?: "draft" | "scheduled";
  metadata?: Record<string, unknown>;
}

interface UpdatePostInput {
  content?: string;
  platform?: SocialPlatform;
  media_urls?: string[];
  hashtags?: string[];
  scheduled_at?: string;
  social_profile_id?: string | null;
  status?: "draft" | "scheduled" | "cancelled";
  metadata?: Record<string, unknown>;
}

interface PostFilters {
  platform?: SocialPlatform;
  status?: ScheduledPost["status"];
  startDate?: string;
  endDate?: string;
}

interface PostingAnalytics {
  totalScheduled: number;
  publishedThisMonth: number;
  avgPerWeek: number;
  drafts: number;
  mostActivePlatform: string | null;
  platformBreakdown: { platform: string; count: number }[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return null;

  return { user, orgId: profile.organization_id as string, admin };
}

// ─── Server Actions ─────────────────────────────────────────────────────────

export async function createPost(data: CreatePostInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { user, orgId, admin } = ctx;

  const status = data.status || "draft";
  if (status === "scheduled" && !data.scheduled_at) {
    return { error: "Scheduled posts require a scheduled_at date." };
  }

  const { data: post, error } = await admin
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      organization_id: orgId,
      platform: data.platform,
      content: data.content,
      media_urls: data.media_urls ?? [],
      hashtags: data.hashtags ?? [],
      scheduled_at: data.scheduled_at || new Date().toISOString(),
      social_profile_id: data.social_profile_id ?? null,
      status,
      ai_optimized: false,
      ai_suggestions: {},
      metadata: data.metadata ?? {},
    })
    .select()
    .single();

  if (error) {
    console.error("[createPost] DB error:", error.message);
    return { error: "Failed to create post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: post as ScheduledPost };
}

export async function updatePost(id: string, data: UpdatePostInput) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  // Verify ownership
  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("id, organization_id, status")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  if (existing.status === "published") {
    return { error: "Cannot edit a published post." };
  }

  const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.content !== undefined) updateFields.content = data.content;
  if (data.platform !== undefined) updateFields.platform = data.platform;
  if (data.media_urls !== undefined) updateFields.media_urls = data.media_urls;
  if (data.hashtags !== undefined) updateFields.hashtags = data.hashtags;
  if (data.scheduled_at !== undefined) updateFields.scheduled_at = data.scheduled_at;
  if (data.social_profile_id !== undefined) updateFields.social_profile_id = data.social_profile_id;
  if (data.status !== undefined) updateFields.status = data.status;
  if (data.metadata !== undefined) updateFields.metadata = data.metadata;

  const { data: updated, error } = await admin
    .from("scheduled_posts")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[updatePost] DB error:", error.message);
    return { error: "Failed to update post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: updated as ScheduledPost };
}

export async function deletePost(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("id, organization_id")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  const { error } = await admin
    .from("scheduled_posts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deletePost] DB error:", error.message);
    return { error: "Failed to delete post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true };
}

export async function getScheduledPosts(filters?: PostFilters) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated.", data: [] as ScheduledPost[] };

  const { orgId, admin } = ctx;

  let query = admin
    .from("scheduled_posts")
    .select("*")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: true });

  if (filters?.platform) {
    query = query.eq("platform", filters.platform);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.startDate) {
    query = query.gte("scheduled_at", filters.startDate);
  }
  if (filters?.endDate) {
    query = query.lte("scheduled_at", filters.endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getScheduledPosts] DB error:", error.message);
    return { error: "Failed to fetch posts.", data: [] as ScheduledPost[] };
  }

  return { success: true, data: (data ?? []) as ScheduledPost[] };
}

export async function getPostsByDate(startDate: string, endDate: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated.", data: [] as ScheduledPost[] };

  const { orgId, admin } = ctx;

  const { data, error } = await admin
    .from("scheduled_posts")
    .select("*")
    .eq("organization_id", orgId)
    .gte("scheduled_at", startDate)
    .lte("scheduled_at", endDate)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("[getPostsByDate] DB error:", error.message);
    return { error: "Failed to fetch posts.", data: [] as ScheduledPost[] };
  }

  return { success: true, data: (data ?? []) as ScheduledPost[] };
}

export async function markAsPublished(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("id, organization_id, status")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  if (existing.status === "published") {
    return { error: "Post is already published." };
  }

  const { data: updated, error } = await admin
    .from("scheduled_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[markAsPublished] DB error:", error.message);
    return { error: "Failed to mark post as published." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: updated as ScheduledPost };
}

export async function cancelPost(id: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("id, organization_id, status")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  if (existing.status === "published") {
    return { error: "Cannot cancel a published post." };
  }

  const { data: updated, error } = await admin
    .from("scheduled_posts")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[cancelPost] DB error:", error.message);
    return { error: "Failed to cancel post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: updated as ScheduledPost };
}

export async function duplicatePost(id: string, scheduledAt?: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { user, orgId, admin } = ctx;

  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  const { data: duplicate, error } = await admin
    .from("scheduled_posts")
    .insert({
      user_id: user.id,
      organization_id: orgId,
      platform: existing.platform,
      content: existing.content,
      media_urls: existing.media_urls ?? [],
      hashtags: existing.hashtags ?? [],
      scheduled_at: scheduledAt || existing.scheduled_at || new Date().toISOString(),
      social_profile_id: existing.social_profile_id,
      status: scheduledAt ? "scheduled" : "draft",
      ai_optimized: false,
      ai_suggestions: existing.ai_suggestions ?? {},
      metadata: { ...(existing.metadata ?? {}), duplicated_from: id },
    })
    .select()
    .single();

  if (error) {
    console.error("[duplicatePost] DB error:", error.message, error.details, error.hint);
    return { error: `Failed to duplicate: ${error.message}` };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: duplicate as ScheduledPost };
}

export async function aiOptimizePost(postId: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const { data: post } = await admin
    .from("scheduled_posts")
    .select("*")
    .eq("id", postId)
    .single();

  if (!post || post.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  const platformLimits: Record<string, number> = {
    instagram: 2200,
    twitter: 280,
    tiktok: 4000,
    linkedin: 3000,
    youtube: 5000,
    threads: 500,
    pinterest: 500,
    twitch: 300,
  };

  const charLimit = platformLimits[post.platform] || 2200;

  const prompt = `You are a social media expert. Optimize the following post for ${post.platform}.

Current content:
"""
${post.content}
"""

Current hashtags: ${(post.hashtags as string[])?.join(" ") || "none"}

Requirements:
1. Rewrite the caption for maximum engagement on ${post.platform} (stay under ${charLimit} characters)
2. Suggest 5-10 relevant hashtags that will increase reach
3. Recommend the best time to post (provide a specific hour in UTC)
4. Add a hook/opening line that grabs attention
5. Include a clear call-to-action

Respond in this exact JSON format:
{
  "optimized_content": "the rewritten caption",
  "suggested_hashtags": ["hashtag1", "hashtag2"],
  "best_posting_time": "14:00 UTC",
  "posting_time_reason": "brief explanation",
  "engagement_tips": ["tip1", "tip2"],
  "estimated_improvement": "brief note on expected performance boost"
}`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 1500,
    timeout: 30000,
    jsonMode: true,
  });

  if (!result) {
    return { error: "No AI provider available. Add an API key in Settings or set DEEPSEEK_API_KEY / OPENAI_API_KEY in your environment." };
  }

  let suggestions: Record<string, unknown> = {};
  try {
    suggestions = JSON.parse(result.text);
  } catch {
    // If JSON parse fails, store raw text
    suggestions = { raw: result.text };
  }

  // Update post with AI suggestions
  const optimizedContent = (suggestions.optimized_content as string) || post.content;
  const suggestedHashtags = (suggestions.suggested_hashtags as string[]) || post.hashtags;

  const { data: updated, error } = await admin
    .from("scheduled_posts")
    .update({
      content: optimizedContent,
      hashtags: suggestedHashtags,
      ai_optimized: true,
      ai_suggestions: suggestions,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .select()
    .single();

  if (error) {
    console.error("[aiOptimizePost] DB error:", error.message);
    return { error: "Failed to save optimized post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: updated as ScheduledPost, suggestions };
}

export async function aiSuggestHashtags(content: string, platform: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const prompt = `You are a social media hashtag expert. Given the following post content for ${platform}, suggest 10-15 highly relevant hashtags that will maximize reach and engagement.

Post content:
"""
${content}
"""

Rules:
- Mix popular hashtags (high volume) with niche hashtags (lower competition)
- Include trending hashtags when relevant
- No spaces in hashtags
- Respond with ONLY a JSON array of strings, e.g. ["hashtag1", "hashtag2"]`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 500,
    timeout: 20000,
    jsonMode: true,
  });

  if (!result) {
    return { error: "No AI provider available. Add an API key in Settings or set DEEPSEEK_API_KEY / OPENAI_API_KEY in your environment." };
  }

  try {
    const hashtags = JSON.parse(result.text);
    if (Array.isArray(hashtags)) {
      return { success: true, data: hashtags as string[] };
    }
    return { error: "Invalid AI response format." };
  } catch {
    return { error: "Failed to parse hashtag suggestions." };
  }
}

export async function aiOptimizeContent(content: string, platform: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const platformLimits: Record<string, number> = {
    instagram: 2200,
    twitter: 280,
    tiktok: 4000,
    linkedin: 3000,
    youtube: 5000,
    threads: 500,
    pinterest: 500,
    twitch: 300,
  };

  const charLimit = platformLimits[platform] || 2200;

  const prompt = `You are a social media copywriting expert. Optimize this post for ${platform}.

Original content:
"""
${content}
"""

Requirements:
- Stay under ${charLimit} characters
- Add an attention-grabbing opening
- Include a clear call-to-action
- Optimize for the ${platform} algorithm and audience
- Keep the core message intact

Respond with ONLY the optimized text, no quotes or explanation.`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 1000,
    timeout: 20000,
  });

  if (!result) {
    return { error: "No AI provider available. Add an API key in Settings or set DEEPSEEK_API_KEY / OPENAI_API_KEY in your environment." };
  }

  return { success: true, data: result.text };
}

export async function getPostingAnalytics(): Promise<{ success?: boolean; error?: string; data?: PostingAnalytics }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  // Get all posts for this org
  const { data: allPosts } = await admin
    .from("scheduled_posts")
    .select("id, platform, status, scheduled_at, published_at, created_at")
    .eq("organization_id", orgId);

  const posts = (allPosts ?? []) as Pick<ScheduledPost, "id" | "platform" | "status" | "scheduled_at" | "published_at" | "created_at">[];

  // Calculate stats
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const totalScheduled = posts.filter((p) => p.status === "scheduled").length;
  const publishedThisMonth = posts.filter(
    (p) => p.status === "published" && p.published_at && p.published_at >= monthStart,
  ).length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  // Posts in last 4 weeks for avg calculation
  const recentPosts = posts.filter((p) => p.created_at >= fourWeeksAgo);
  const avgPerWeek = recentPosts.length > 0 ? Math.round((recentPosts.length / 4) * 10) / 10 : 0;

  // Platform breakdown
  const platformCounts: Record<string, number> = {};
  for (const p of posts) {
    platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
  }

  const platformBreakdown = Object.entries(platformCounts)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count);

  const mostActivePlatform = platformBreakdown.length > 0 ? platformBreakdown[0].platform : null;

  return {
    success: true,
    data: {
      totalScheduled,
      publishedThisMonth,
      avgPerWeek,
      drafts,
      mostActivePlatform,
      platformBreakdown,
    },
  };
}

export async function reschedulePost(id: string, newDate: string) {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const { data: existing } = await admin
    .from("scheduled_posts")
    .select("id, organization_id, status")
    .eq("id", id)
    .single();

  if (!existing || existing.organization_id !== orgId) {
    return { error: "Post not found." };
  }

  if (existing.status === "published") {
    return { error: "Cannot reschedule a published post." };
  }

  const { data: updated, error } = await admin
    .from("scheduled_posts")
    .update({
      scheduled_at: newDate,
      status: "scheduled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[reschedulePost] DB error:", error.message);
    return { error: "Failed to reschedule post." };
  }

  revalidatePath("/dashboard/publish");
  revalidatePath("/dashboard/content");
  return { success: true, data: updated as ScheduledPost };
}

// ─── Media Upload ────────────────────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

export async function uploadPostMedia(
  formData: FormData,
): Promise<{ success?: boolean; url?: string; error?: string }> {
  const ctx = await getAuthContext();
  if (!ctx) return { error: "Not authenticated." };

  const { orgId, admin } = ctx;

  const file = formData.get("file") as File | null;
  if (!file) return { error: "No file provided." };

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Only images are supported (JPEG, PNG, GIF, WebP, AVIF)." };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: "File must be under 10 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${orgId}/${ts}-${rand}.${ext}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const uploadResult = await admin.storage
      .from("post-media")
      .upload(path, uint8, { upsert: false, contentType: file.type });

    if (uploadResult.error) {
      console.error("[uploadPostMedia] Storage error:", uploadResult.error.message);
      return { error: `Upload failed: ${uploadResult.error.message}` };
    }

    const { data: urlData } = admin.storage
      .from("post-media")
      .getPublicUrl(path);

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error("[uploadPostMedia] Crash:", err);
    return { error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
