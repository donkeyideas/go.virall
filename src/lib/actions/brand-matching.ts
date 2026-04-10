"use server";

import { createClient } from "@/lib/supabase/server";
import {
  generateMatches,
  generateCreatorOpportunities,
  getMatches,
  updateMatchStatus,
  expressInterest,
} from "@/lib/ai/brand-matching";
import type { BrandCreatorMatch } from "@/types";

export async function actionGenerateMatches(): Promise<{
  success?: boolean;
  matches?: BrandCreatorMatch[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  try {
    const matches = await generateMatches(user.id);
    return { success: true, matches };
  } catch (err) {
    console.error("[actionGenerateMatches]", err);
    return { error: "Failed to generate matches. Please try again." };
  }
}

export async function actionGenerateCreatorOpportunities(): Promise<{
  success?: boolean;
  matches?: BrandCreatorMatch[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  try {
    const matches = await generateCreatorOpportunities(user.id);
    return { success: true, matches };
  } catch (err) {
    console.error("[actionGenerateCreatorOpportunities]", err);
    return { error: "Failed to find opportunities. Please try again." };
  }
}

export async function actionGetMatches(
  role: "brand" | "creator",
): Promise<BrandCreatorMatch[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  try {
    return await getMatches(user.id, role);
  } catch {
    return [];
  }
}

export async function actionUpdateMatchStatus(
  matchId: string,
  status: "interested" | "contacted" | "dismissed",
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  return await updateMatchStatus(matchId, status, user.id);
}

export async function actionExpressInterest(
  matchId: string,
): Promise<{ success?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated." };
  }

  return await expressInterest(matchId, user.id);
}
