"use server";

import { createClient } from "@/lib/supabase/server";

interface TrackEventInput {
  eventType: string;
  screen?: string;
  metadata?: Record<string, unknown>;
}

export async function trackEvent(input: TrackEventInput): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Get organization
  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  await supabase.from("user_events").insert({
    user_id: user.id,
    organization_id: member?.organization_id ?? null,
    event_type: input.eventType,
    screen: input.screen ?? null,
    metadata: input.metadata ?? null,
  });
}
