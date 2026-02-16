/**
 * Browser-safe legitimacy utility functions.
 *
 * These are pure GameState readers that do NOT depend on Node.js modules
 * (node:fs, node:path). They are extracted from legitimacy.ts so they can
 * be safely imported in browser bundles (warroom, Electron renderer).
 *
 * The main `updateLegitimacyState()` remains in legitimacy.ts because it
 * requires Node.js-based data loaders (political_control_init, municipality_population).
 */

import type { GameState } from './game_state.js';

export const DEMOGRAPHIC_WEIGHT = 0.4;
export const INSTITUTIONAL_WEIGHT = 0.3;
export const COERCION_PENALTY_INCREMENT = 0.2;
export const COERCION_DECAY_RATE = 0.01;
export const STABILITY_BONUS_RATE = 0.01;
export const STABILITY_BONUS_CAP = 0.3;
export const RECRUITMENT_LEGITIMACY_MIN = 0.5;

/**
 * Compute per-faction average legitimacy score across controlled settlements.
 * Pure state reader — no I/O, no Node.js dependencies.
 * Returns faction ID → average legitimacy (0–1 scale); defaults to 0.5 for factions with no data.
 */
export function getFactionLegitimacyAverages(state: GameState): Record<string, number> {
  const totals: Record<string, { sum: number; count: number }> = {};
  for (const faction of state.factions) {
    totals[faction.id] = { sum: 0, count: 0 };
  }
  const controllers = state.political_controllers ?? {};
  const settlements = state.settlements ?? {};
  for (const [sid, controller] of Object.entries(controllers)) {
    if (!controller) continue;
    const leg = settlements[sid]?.legitimacy_state?.legitimacy_score;
    if (typeof leg !== 'number') continue;
    const bucket = totals[controller];
    if (!bucket) continue;
    bucket.sum += leg;
    bucket.count += 1;
  }
  const averages: Record<string, number> = {};
  for (const [fid, agg] of Object.entries(totals)) {
    averages[fid] = agg.count > 0 ? agg.sum / agg.count : 0.5;
  }
  return averages;
}
