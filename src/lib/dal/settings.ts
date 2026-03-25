"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/types";

export async function getUserPreferences(): Promise<UserPreferences | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as UserPreferences) ?? null;
}
