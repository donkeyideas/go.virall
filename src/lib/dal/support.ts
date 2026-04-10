"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ContactSubmission } from "@/types";

export async function getBrandSupportMessages(
  userId: string,
): Promise<ContactSubmission[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("contact_submissions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as ContactSubmission[];
}

export async function getUnreadSupportReplyCount(
  userId: string,
): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("admin_reply", "is", null)
    .eq("brand_read", false);

  return count ?? 0;
}
