import { createAdminClient } from '@govirall/db/admin';
import { AIClient } from './ai-client';

export default async function AdminAiPage() {
  const admin = createAdminClient();

  /* Fetch all content_generations for aggregation + last 50 for the table */
  const [genRes, recentRes] = await Promise.all([
    admin
      .from('content_generations')
      .select('ai_provider, content_type, tokens_used, cost_cents'),
    admin
      .from('content_generations')
      .select('id, content_type, ai_provider, tokens_used, cost_cents, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const allGens = genRes.data ?? [];
  const recentRows = recentRes.data ?? [];

  /* ---------- Provider breakdown ---------- */
  const providerMap: Record<string, { calls: number; tokens: number; costCents: number }> = {};
  for (const g of allGens) {
    const p = g.ai_provider ?? 'unknown';
    if (!providerMap[p]) providerMap[p] = { calls: 0, tokens: 0, costCents: 0 };
    providerMap[p].calls++;
    providerMap[p].tokens += g.tokens_used ?? 0;
    providerMap[p].costCents += Number(g.cost_cents) || 0;
  }
  const providers = Object.entries(providerMap).map(([provider, stats]) => ({
    provider,
    ...stats,
  }));

  /* ---------- Content type breakdown ---------- */
  const typeMap: Record<string, { calls: number; tokens: number; costCents: number }> = {};
  for (const g of allGens) {
    const t = g.content_type ?? 'unknown';
    if (!typeMap[t]) typeMap[t] = { calls: 0, tokens: 0, costCents: 0 };
    typeMap[t].calls++;
    typeMap[t].tokens += g.tokens_used ?? 0;
    typeMap[t].costCents += Number(g.cost_cents) || 0;
  }
  const contentTypes = Object.entries(typeMap)
    .map(([contentType, stats]) => ({ contentType, ...stats }))
    .sort((a, b) => b.calls - a.calls);

  /* ---------- Totals ---------- */
  const totalCalls = allGens.length;
  const totalTokens = allGens.reduce((s, g) => s + (g.tokens_used ?? 0), 0);
  const totalCostCents = allGens.reduce((s, g) => s + (Number(g.cost_cents) || 0), 0);

  /* ---------- Recent calls ---------- */
  const recentCalls = recentRows.map((r) => ({
    id: r.id as string,
    contentType: r.content_type as string,
    provider: (r.ai_provider ?? 'unknown') as string,
    tokens: (r.tokens_used ?? 0) as number,
    costCents: (Number(r.cost_cents) || 0) as number,
    createdAt: r.created_at as string,
  }));

  return (
    <AIClient
      providers={providers}
      contentTypes={contentTypes}
      recentCalls={recentCalls}
      totalCalls={totalCalls}
      totalTokens={totalTokens}
      totalCostCents={totalCostCents}
    />
  );
}
