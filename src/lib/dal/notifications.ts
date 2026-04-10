"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Notification } from "@/types";

export async function getNotifications(
  limit = 20,
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Notification[];
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);

  return count ?? 0;
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  revalidatePath("/dashboard");
  revalidatePath("/brand");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("is_read", false);

  revalidatePath("/dashboard");
  revalidatePath("/brand");
}
