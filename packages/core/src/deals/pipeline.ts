/**
 * Deal pipeline stage logic and transitions.
 */

export type DealStage =
  | 'lead'
  | 'outreach'
  | 'negotiation'
  | 'contract'
  | 'production'
  | 'review'
  | 'live'
  | 'done'
  | 'lost';

const STAGE_ORDER: DealStage[] = [
  'lead',
  'outreach',
  'negotiation',
  'contract',
  'production',
  'review',
  'live',
  'done',
];

export const STAGE_LABELS: Record<DealStage, string> = {
  lead: 'Lead',
  outreach: 'Outreach',
  negotiation: 'Negotiation',
  contract: 'Contract',
  production: 'Production',
  review: 'Review',
  live: 'Live',
  done: 'Done',
  lost: 'Lost',
};

/**
 * Returns the allowed stages a deal can transition to from its current stage.
 * Rules:
 * - Can always move forward one step
 * - Can skip forward (e.g., lead -> contract if fast-tracked)
 * - Can move back one step
 * - Can always mark as "lost" from any stage
 * - "done" and "lost" can be reverted to the previous active stage
 */
export function allowedTransitions(current: DealStage): DealStage[] {
  if (current === 'done') return ['live', 'lost'];
  if (current === 'lost') return ['lead', 'outreach'];

  const idx = STAGE_ORDER.indexOf(current);
  const transitions: DealStage[] = [];

  // Back one step
  if (idx > 0) transitions.push(STAGE_ORDER[idx - 1]);

  // Forward steps
  for (let i = idx + 1; i < STAGE_ORDER.length; i++) {
    transitions.push(STAGE_ORDER[i]);
  }

  // Always allow lost
  transitions.push('lost');

  return transitions;
}

/**
 * Checks if a stage transition is valid.
 */
export function isValidTransition(from: DealStage, to: DealStage): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}

/**
 * Pipeline summary for revenue page.
 */
export function computePipelineSummary(
  deals: Array<{ stage: DealStage; value: number }>,
) {
  const byStage: Record<DealStage, { count: number; value: number }> = {} as Record<DealStage, { count: number; value: number }>;

  for (const stage of [...STAGE_ORDER, 'lost' as DealStage]) {
    byStage[stage] = { count: 0, value: 0 };
  }

  for (const deal of deals) {
    byStage[deal.stage].count++;
    byStage[deal.stage].value += deal.value;
  }

  const activeDeals = deals.filter((d) => d.stage !== 'done' && d.stage !== 'lost');
  const totalPipeline = activeDeals.reduce((sum, d) => sum + d.value, 0);

  const wonDeals = deals.filter((d) => d.stage === 'done');
  const totalRevenue = wonDeals.reduce((sum, d) => sum + d.value, 0);

  return {
    byStage,
    totalPipeline,
    totalRevenue,
    activeCount: activeDeals.length,
    wonCount: wonDeals.length,
    lostCount: byStage.lost.count,
  };
}
