"use server";

import { createClient } from "@/lib/supabase/server";

export async function setAccountType(accountType: "creator" | "brand") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ account_type: accountType })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function getAccountType(): Promise<
  { success: true; data: "creator" | "brand" } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .single();

  if (error) return { error: error.message };

  return { success: true, data: (data?.account_type as "creator" | "brand") ?? "creator" };
}
