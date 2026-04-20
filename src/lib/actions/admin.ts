"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/dal/admin";
import { revalidatePath } from "next/cache";

// ============================================================
// User & Org Management
// ============================================================

export async function getUserDetails(userId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  // 1. Fetch profile with org join
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return { error: "User not found" };

  // 2. Fetch auth data (email, provider, last sign-in)
  let email: string | null = null;
  let provider = "email";
  let lastSignIn: string | null = null;
  try {
    const { data: authData } = await admin.auth.admin.getUserById(userId);
    email = authData?.user?.email ?? null;
    provider = authData?.user?.app_metadata?.provider ?? "email";
    lastSignIn = authData?.user?.last_sign_in_at ?? null;
  } catch {
    /* fallback */
  }

  // 3. Fetch organization (if exists)
  let organization = null;
  if (profile.organization_id) {
    const { data: orgData } = await admin
      .from("organizations")
      .select("*")
      .eq("id", profile.organization_id)
      .single();
    organization = orgData;
  }

  // 4. Fetch related data in parallel
  const orgId = profile.organization_id ?? "";
  const [
    socialProfiles,
    analysesResult,
    auditLog,
    userPrefs,
    membersResult,
    dealsResult,
    billingEvents,
  ] = await Promise.all([
    admin
      .from("social_profiles")
      .select("id, platform, handle, followers_count, engagement_rate, verified, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("social_analyses")
      .select("id, analysis_type, ai_provider, tokens_used, cost_cents, created_at, social_profile_id")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("audit_log")
      .select("id, action, resource_type, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single(),
    orgId
      ? admin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
      : Promise.resolve({ count: 0 }),
    orgId
      ? admin
          .from("deals")
          .select("id, brand_name, status, total_value, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    orgId
      ? admin
          .from("billing_events")
          .select("id, event_type, amount_cents, created_at")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
  ]);

  // 5. Compute usage stats
  const profileCount = socialProfiles.data?.length ?? 0;
  const analysisCount = analysesResult.data?.length ?? 0;
  const memberCount = membersResult.count ?? 0;
  const dealCount = dealsResult.data?.length ?? 0;

  return {
    data: {
      profile: {
        ...profile,
        email,
        provider,
        lastSignIn,
      },
      organization,
      usage: {
        socialProfiles: profileCount,
        analyses: analysisCount,
        members: memberCount,
        deals: dealCount,
      },
      socialProfiles: socialProfiles.data ?? [],
      recentAnalyses: analysesResult.data ?? [],
      recentActivity: auditLog.data ?? [],
      billingEvents: billingEvents.data ?? [],
      deals: dealsResult.data ?? [],
      userPreferences: userPrefs.data,
    },
  };
}

export async function toggleCompAccount(userId: string, enabled: boolean) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("profiles")
    .update({ comp_account: enabled })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

export async function getOrgDetails(orgId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const [org, members, socialProfiles, deals, campaigns] = await Promise.all([
    admin.from("organizations").select("*").eq("id", orgId).single(),
    admin
      .from("profiles")
      .select("id, full_name, role, system_role, created_at")
      .eq("organization_id", orgId),
    admin
      .from("social_profiles")
      .select("id, platform, handle, followers_count, engagement_rate")
      .eq("organization_id", orgId),
    admin
      .from("deals")
      .select("id, brand_name, status, total_value, created_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
    admin
      .from("campaigns")
      .select("id, name, status, start_date, end_date, budget")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    organization: org.data,
    members: members.data ?? [],
    socialProfiles: socialProfiles.data ?? [],
    deals: deals.data ?? [],
    campaigns: campaigns.data ?? [],
  };
}

export async function deleteOrganization(orgId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("organizations")
    .delete()
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/admin/orgs");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateUserRole(userId: string, systemRole: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const validRoles = ["user", "admin", "superadmin"];
  if (!validRoles.includes(systemRole)) {
    return { error: "Invalid role." };
  }

  const { error } = await admin
    .from("profiles")
    .update({ system_role: systemRole })
    .eq("id", userId);

  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  // Delete profile (cascades to related data via FK)
  await admin.from("profiles").delete().eq("id", userId);

  // Delete auth user
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateOrgPlan(orgId: string, plan: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const planProfiles: Record<string, number> = {
    free: 1,
    pro: 3,
    business: 10,
    enterprise: -1,
  };

  const maxProfiles = planProfiles[plan];
  if (maxProfiles === undefined) return { error: "Invalid plan." };

  const { error } = await admin
    .from("organizations")
    .update({ plan, max_social_profiles: maxProfiles === -1 ? 999 : maxProfiles })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/admin/orgs");
  revalidatePath("/admin/billing");
  return { success: true };
}

// ============================================================
// Content CRUD — Posts
// ============================================================

export async function createPost(data: {
  title: string;
  content: string;
  type?: string;
  excerpt?: string;
  cover_image?: string;
  tags?: string[];
  status?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const slug = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { error } = await admin.from("posts").insert({
    title: data.title,
    slug,
    content: data.content,
    type: data.type ?? "blog",
    excerpt: data.excerpt ?? null,
    cover_image: data.cover_image ?? null,
    tags: data.tags ?? [],
    status: data.status ?? "draft",
    published_at: data.status === "published" ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

export async function updatePost(
  id: string,
  data: {
    title?: string;
    content?: string;
    excerpt?: string;
    cover_image?: string;
    tags?: string[];
    status?: string;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const update: Record<string, unknown> = { ...data, updated_at: new Date().toISOString() };
  if (data.status === "published" && !update.published_at) {
    update.published_at = new Date().toISOString();
  }

  const { error } = await admin.from("posts").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

export async function deletePost(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("posts").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  return { success: true };
}

// ============================================================
// Content CRUD — Changelog
// ============================================================

export async function createChangelogEntry(data: {
  title: string;
  description: string;
  type?: string;
  is_published?: boolean;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("changelog_entries").insert({
    title: data.title,
    description: data.description,
    type: data.type ?? "improvement",
    is_published: data.is_published ?? false,
    published_at: data.is_published ? new Date().toISOString() : null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/changelog");
  return { success: true };
}

export async function updateChangelogEntry(
  id: string,
  data: { title?: string; description?: string; type?: string; is_published?: boolean },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const update: Record<string, unknown> = { ...data };
  if (data.is_published && !update.published_at) {
    update.published_at = new Date().toISOString();
  }

  const { error } = await admin.from("changelog_entries").update(update).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/changelog");
  return { success: true };
}

export async function deleteChangelogEntry(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("changelog_entries").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/changelog");
  return { success: true };
}

// ============================================================
// Content CRUD — Roadmap
// ============================================================

export async function createRoadmapItem(data: {
  title: string;
  description?: string;
  status?: string;
  category?: string;
  target_date?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("roadmap_items").insert({
    title: data.title,
    description: data.description ?? null,
    status: data.status ?? "planned",
    category: data.category ?? null,
    target_date: data.target_date ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/roadmap");
  return { success: true };
}

export async function updateRoadmapItem(
  id: string,
  data: { title?: string; description?: string; status?: string; category?: string; target_date?: string },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const update: Record<string, unknown> = { ...data };
  if (data.status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  const { error } = await admin.from("roadmap_items").update(update).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/roadmap");
  return { success: true };
}

export async function deleteRoadmapItem(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("roadmap_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/roadmap");
  return { success: true };
}

// ============================================================
// Content CRUD — Jobs
// ============================================================

export async function createJob(data: {
  title: string;
  description: string;
  department?: string;
  location?: string;
  type?: string;
  requirements?: string;
  salary_range?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("job_listings").insert({
    title: data.title,
    description: data.description,
    department: data.department ?? null,
    location: data.location ?? null,
    type: data.type ?? "full-time",
    requirements: data.requirements ?? null,
    salary_range: data.salary_range ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/careers");
  return { success: true };
}

export async function updateJob(
  id: string,
  data: {
    title?: string;
    description?: string;
    department?: string;
    location?: string;
    type?: string;
    requirements?: string;
    salary_range?: string;
    is_active?: boolean;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("job_listings")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/careers");
  return { success: true };
}

export async function deleteJob(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("job_listings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/careers");
  return { success: true };
}

// ============================================================
// Content CRUD — Email Templates
// ============================================================

export async function createEmailTemplate(data: {
  name: string;
  subject: string;
  body_html: string;
  variables?: string[];
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("email_templates").insert({
    name: data.name,
    subject: data.subject,
    body_html: data.body_html,
    variables: data.variables ?? [],
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/email-templates");
  return { success: true };
}

export async function updateEmailTemplate(
  id: string,
  data: {
    name?: string;
    subject?: string;
    body_html?: string;
    variables?: string[];
    is_active?: boolean;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("email_templates")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/email-templates");
  return { success: true };
}

export async function deleteEmailTemplate(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("email_templates").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/email-templates");
  return { success: true };
}

// ============================================================
// Content CRUD — Social Posts
// ============================================================

export async function createSocialPost(data: {
  platform: string;
  content: string;
  media_url?: string;
  scheduled_at?: string;
  status?: string;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("social_posts").insert({
    platform: data.platform,
    content: data.content,
    media_url: data.media_url ?? null,
    scheduled_at: data.scheduled_at ?? null,
    status: data.status ?? "draft",
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/social-posts");
  return { success: true };
}

export async function updateSocialPost(
  id: string,
  data: {
    platform?: string;
    content?: string;
    media_url?: string;
    scheduled_at?: string;
    status?: string;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("social_posts").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/social-posts");
  return { success: true };
}

export async function deleteSocialPost(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("social_posts").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/social-posts");
  return { success: true };
}

// ============================================================
// Content CRUD — Site Content
// ============================================================

export async function updateSiteContent(
  id: string,
  data: { content?: Record<string, unknown>; sort_order?: number; is_active?: boolean },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("site_content")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}

export async function createSiteContent(data: {
  page: string;
  section: string;
  content: Record<string, unknown>;
  sort_order?: number;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("site_content").insert({
    page: data.page,
    section: data.section,
    content: data.content,
    sort_order: data.sort_order ?? 0,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSiteContent(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("site_content").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}

export async function seedHomepageContent() {
  await requireAdmin();
  const admin = createAdminClient();

  // Check if content already exists for page="home"
  const { count } = await admin
    .from("site_content")
    .select("id", { count: "exact", head: true })
    .eq("page", "home");

  if ((count ?? 0) > 0) {
    return { error: "Homepage content already exists. Delete existing content first." };
  }

  const { HOMEPAGE_DEFAULTS } = await import("@/lib/content/defaults");

  const rows = Object.entries(HOMEPAGE_DEFAULTS).map(
    ([section, { content, sort_order }]) => ({
      page: "home",
      section,
      content,
      sort_order,
      is_active: true,
    }),
  );

  const { error } = await admin.from("site_content").insert(rows);
  if (error) return { error: error.message };

  revalidatePath("/admin/content");
  revalidatePath("/");
  return { success: true };
}

// ============================================================
// AI Blog Generation
// ============================================================

export async function generateBlogWithAI(
  title: string,
  type: "blog" | "guide" = "blog",
  backlink?: string,
): Promise<{ error: string } | { content: string; excerpt: string; tags: string[] }> {
  await requireAdmin();

  if (!title.trim()) return { error: "Title is required." };

  const { aiChat } = await import("@/lib/ai/provider");

  const backlinkInstruction = backlink
    ? `\n\nIMPORTANT — Backlink Integration:\nNaturally weave this URL into the content with a contextually relevant, keyword-rich anchor text: ${backlink}\nFormat it as: <a href="${backlink}" target="_blank" rel="dofollow">descriptive anchor text</a>\nMake it read naturally — do NOT force it.`
    : "";

  const typeLabel = type === "guide" ? "comprehensive guide" : "blog post";

  const prompt = `You are an expert content writer for Go Virall, a social intelligence platform that helps influencers and creators grow their social media presence with data-driven strategies and smart insights.

Write a high-quality, SEO-optimized ${typeLabel} titled: "${title}"

Requirements:
1. Output ONLY clean HTML — no markdown, no code fences, no preamble
2. Use proper HTML tags: <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <a>, <blockquote>
3. Do NOT use <h1> (the title is rendered separately)
4. Target length: 1500-2500 words
5. Write in an engaging, authoritative tone suitable for social media creators and influencers
6. Include 3-5 internal links to Go Virall pages (use these paths: /features, /pricing, /blog, /#how-it-works, /#platforms, /#faq)
7. Include 2-4 external links to authoritative sources (e.g., HubSpot, Sprout Social, Hootsuite, Later, Buffer)
8. Use subheadings (<h2>, <h3>) to break up content for scannability
9. Include actionable tips, statistics where relevant, and real-world examples
10. Optimize for featured snippets with clear, concise answers to common questions${backlinkInstruction}

After the HTML content, add this EXACT separator and metadata:

---METADATA---
EXCERPT: [Write a compelling 150-160 character meta description]
TAGS: [3-5 comma-separated relevant tags]`;

  const result = await aiChat(prompt, {
    temperature: 0.7,
    maxTokens: 4096,
    timeout: 300_000, // 5 minutes
  });

  if (!result?.text) {
    return { error: "AI generation failed. Check that an AI provider key is configured." };
  }

  let content = result.text;
  let excerpt = "";
  let tags: string[] = [];

  // Parse metadata section
  const metaSplit = content.split("---METADATA---");
  if (metaSplit.length >= 2) {
    content = metaSplit[0].trim();
    const meta = metaSplit[1];
    const excerptMatch = meta.match(/EXCERPT:\s*(.+)/i);
    if (excerptMatch) excerpt = excerptMatch[1].trim();
    const tagsMatch = meta.match(/TAGS:\s*(.+)/i);
    if (tagsMatch) {
      tags = tagsMatch[1]
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }

  // Clean up any markdown that leaked through
  content = content
    .replace(/```html?\n?/g, "")
    .replace(/```\n?/g, "")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .trim();

  return { content, excerpt, tags };
}

/**
 * Generate a blog title using AI that fits the Go Virall platform.
 */
export async function generateBlogTitle(
  type: "blog" | "guide" = "blog",
): Promise<{ title: string } | { error: string }> {
  await requireAdmin();

  const { aiChat } = await import("@/lib/ai/provider");

  const prompt = `You are a content strategist for Go Virall, a social intelligence platform for influencers and creators.

Generate ONE compelling ${type === "guide" ? "guide" : "blog post"} title.

The title must be relevant to one of these topics:
- Social media analytics and data-driven growth
- Creator economy trends and monetization
- Influencer marketing strategies
- Content strategy and optimization
- Platform-specific growth (Instagram, TikTok, YouTube, LinkedIn, X/Twitter)
- Personal branding for creators
- Cross-platform content strategies
- AI-powered social intelligence
- Brand-creator collaborations and deals
- Audience engagement and community building

Rules:
- Make it compelling, specific, and actionable
- Use a mix of styles: how-to, listicles, data-backed, provocative questions, trend pieces
- Target 8-14 words
- Do NOT use generic filler — be specific and punchy
- Do NOT wrap in quotes

Return ONLY the title text, nothing else.`;

  try {
    const result = await aiChat(prompt, { maxTokens: 100, timeout: 30_000 });
    if (!result?.text) return { error: "AI returned an empty response. Check that an AI provider key is configured." };
    const title = result.text
      .replace(/^["']|["']$/g, "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    if (!title) return { error: "AI returned an empty title." };
    return { title };
  } catch {
    return { error: "Title generation failed. Please try again." };
  }
}

// ============================================================
// Pricing Plan CRUD
// ============================================================

export async function createPricingPlan(data: {
  id: string;
  name: string;
  account_type: "creator" | "brand";
  price_monthly: number;
  max_social_profiles?: number;
  description?: string;
  stripe_price_id?: string;
  sort_order?: number;
  features?: Record<string, unknown>;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("pricing_plans").insert({
    id: data.id,
    name: data.name,
    account_type: data.account_type,
    price_monthly: data.price_monthly,
    max_social_profiles: data.max_social_profiles ?? 0,
    description: data.description ?? null,
    stripe_price_id: data.stripe_price_id ?? null,
    sort_order: data.sort_order ?? 0,
    features: data.features ?? {},
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/subscriptions");
  return { success: true };
}

export async function updatePricingPlan(
  id: string,
  data: {
    name?: string;
    price_monthly?: number;
    max_social_profiles?: number;
    description?: string;
    stripe_price_id?: string;
    is_active?: boolean;
    sort_order?: number;
    features?: Record<string, unknown>;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("pricing_plans")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/subscriptions");
  revalidatePath("/brand/settings");
  revalidatePath("/dashboard/settings");
  return { success: true };
}

export async function deletePricingPlan(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("pricing_plans").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/subscriptions");
  return { success: true };
}

// ============================================================
// Contact Management
// ============================================================

// ============================================================
// API Key Management
// ============================================================

export async function upsertApiKey(
  provider: string,
  data: {
    api_key?: string;
    display_name?: string;
    base_url?: string;
    is_active?: boolean;
    config?: Record<string, unknown>;
  },
) {
  await requireAdmin();
  const admin = createAdminClient();

  // Check if provider exists
  const { data: existing } = await admin
    .from("platform_api_configs")
    .select("id")
    .eq("provider", provider)
    .single();

  if (existing) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.api_key !== undefined) update.api_key = data.api_key;
    if (data.display_name !== undefined) update.display_name = data.display_name;
    if (data.base_url !== undefined) update.base_url = data.base_url;
    if (data.is_active !== undefined) update.is_active = data.is_active;
    if (data.config !== undefined) update.config = data.config;

    const { error } = await admin
      .from("platform_api_configs")
      .update(update)
      .eq("provider", provider);

    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("platform_api_configs").insert({
      provider,
      display_name: data.display_name ?? provider,
      api_key: data.api_key ?? null,
      base_url: data.base_url ?? null,
      is_active: data.is_active ?? true,
      config: data.config ?? {},
    });

    if (error) return { error: error.message };
  }

  revalidatePath("/admin/api");
  return { success: true };
}

export async function rotateApiKey(provider: string, newKey: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_api_configs")
    .update({ api_key: newKey, updated_at: new Date().toISOString() })
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/admin/api");
  return { success: true };
}

export async function toggleApiProvider(provider: string, isActive: boolean) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_api_configs")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/admin/api");
  return { success: true };
}

export async function deleteApiProvider(provider: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("platform_api_configs")
    .delete()
    .eq("provider", provider);

  if (error) return { error: error.message };

  revalidatePath("/admin/api");
  return { success: true };
}

export async function updateContactStatus(id: string, status: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const validStatuses = ["new", "read", "replied", "archived"];
  if (!validStatuses.includes(status)) return { error: "Invalid status." };

  const { error } = await admin
    .from("contact_submissions")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/contacts");
  return { success: true };
}

export async function replyToContact(id: string, reply: string) {
  await requireAdmin();
  if (!reply.trim()) return { error: "Reply cannot be empty." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("contact_submissions")
    .update({
      admin_reply: reply.trim(),
      admin_reply_at: new Date().toISOString(),
      status: "replied",
      brand_read: false,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/contacts");
  return { success: true };
}
