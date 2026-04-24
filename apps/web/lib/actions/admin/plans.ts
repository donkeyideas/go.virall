'use server';

import { createAdminClient } from '@govirall/db/admin';
import { requireAdmin, writeAuditLog } from './index';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type PlanRow = {
  tier: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  stripePriceMonthly: string | null;
  stripePriceYearly: string | null;
  tagline: string;
  features: string[];
  maxPlatforms: number;
  maxAnalyses: number;
  maxContentGens: number;
  maxAiMessages: number;
  isActive: boolean;
  sortOrder: number;
};

/* ------------------------------------------------------------------ */
/*  Public (no admin required)                                         */
/* ------------------------------------------------------------------ */

export async function getPublicPlans(): Promise<PlanRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data) return [];

  return data.map(mapRow);
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD                                                         */
/* ------------------------------------------------------------------ */

export async function getPlans(): Promise<PlanRow[]> {
  const { admin } = await requireAdmin();
  const { data } = await admin
    .from('subscription_plans')
    .select('*')
    .order('sort_order', { ascending: true });

  return (data ?? []).map(mapRow);
}

export async function updatePlan(
  tier: string,
  updates: {
    name?: string;
    priceMonthly?: number;
    priceYearly?: number;
    tagline?: string;
    features?: string[];
    maxPlatforms?: number;
    maxAnalyses?: number;
    maxContentGens?: number;
    maxAiMessages?: number;
    isActive?: boolean;
    sortOrder?: number;
  },
) {
  const { user, admin } = await requireAdmin();

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.priceMonthly !== undefined) row.price_monthly = updates.priceMonthly;
  if (updates.priceYearly !== undefined) row.price_yearly = updates.priceYearly;
  if (updates.tagline !== undefined) row.tagline = updates.tagline;
  if (updates.features !== undefined) row.features = updates.features;
  if (updates.maxPlatforms !== undefined) row.max_platforms = updates.maxPlatforms;
  if (updates.maxAnalyses !== undefined) row.max_analyses = updates.maxAnalyses;
  if (updates.maxContentGens !== undefined) row.max_content_gens = updates.maxContentGens;
  if (updates.maxAiMessages !== undefined) row.max_ai_messages = updates.maxAiMessages;
  if (updates.isActive !== undefined) row.is_active = updates.isActive;
  if (updates.sortOrder !== undefined) row.sort_order = updates.sortOrder;

  const { error } = await admin
    .from('subscription_plans')
    .update(row)
    .eq('tier', tier);

  if (error) return { error: error.message };

  await writeAuditLog(admin, user.id, 'update_plan', 'subscription_plan', tier, updates as Record<string, unknown>);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function mapRow(r: Record<string, unknown>): PlanRow {
  return {
    tier: r.tier as string,
    name: r.name as string,
    priceMonthly: r.price_monthly as number,
    priceYearly: r.price_yearly as number,
    stripePriceMonthly: r.stripe_price_monthly as string | null,
    stripePriceYearly: r.stripe_price_yearly as string | null,
    tagline: r.tagline as string,
    features: r.features as string[],
    maxPlatforms: r.max_platforms as number,
    maxAnalyses: r.max_analyses as number,
    maxContentGens: r.max_content_gens as number,
    maxAiMessages: r.max_ai_messages as number,
    isActive: r.is_active as boolean,
    sortOrder: r.sort_order as number,
  };
}
