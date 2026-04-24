import type { ScoreOutput } from './compute';

/**
 * Generate human-readable improvement suggestions ranked by impact.
 */
export function rankImprovements(result: ScoreOutput) {
  return result.improvements.map((imp, i) => ({
    rank: i + 1,
    label: imp.label,
    potentialGain: `+${imp.delta} pts`,
    action: imp.action,
  }));
}
