"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteContent, Post } from "@/types";

// ============================================================
// Public data fetching — used by marketing pages (server-side)
// ============================================================

export async function getHomepageContent(): Promise<SiteContent[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_content")
    .select("*")
    .eq("page", "home")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as SiteContent[];
}

export async function getPublishedPosts(
  limit = 20,
  offset = 0,
): Promise<Post[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("*")
    .eq("status", "published")
    .eq("type", "blog")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return (data ?? []) as Post[];
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();
  return (data as Post) ?? null;
}
