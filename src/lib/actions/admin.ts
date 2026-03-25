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

  const [profile, socialProfiles, analyses, auditLog] = await Promise.all([
    admin
      .from("profiles")
      .select("*, organizations(name, plan, slug)")
      .eq("id", userId)
      .single(),
    admin
      .from("social_profiles")
      .select("id, platform, handle, followers_count, engagement_rate")
      .eq(
        "organization_id",
        (
          await admin
            .from("profiles")
            .select("organization_id")
            .eq("id", userId)
            .single()
        ).data?.organization_id ?? "",
      )
      .limit(20),
    admin
      .from("social_analyses")
      .select("id, analysis_type, created_at")
      .eq(
        "social_profile_id",
        (
          await admin
            .from("social_profiles")
            .select("id")
            .eq(
              "organization_id",
              (
                await admin
                  .from("profiles")
                  .select("organization_id")
                  .eq("id", userId)
                  .single()
              ).data?.organization_id ?? "",
            )
            .limit(1)
        ).data?.[0]?.id ?? "",
      )
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("audit_log")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Get email from auth
  let email: string | null = null;
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    email = data?.user?.email ?? null;
  } catch {
    /* fallback */
  }

  return {
    profile: profile.data,
    email,
    socialProfiles: socialProfiles.data ?? [],
    recentAnalyses: analyses.data ?? [],
    recentActivity: auditLog.data ?? [],
  };
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
  return { success: true };
}

export async function deletePost(id: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("posts").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/blog");
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
  return { success: true };
}

// ============================================================
// Contact Management
// ============================================================

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
