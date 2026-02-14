/**
 * JNA Ghost Brigade Degradation — auto-degrade and dissolve JNA legacy formations.
 *
 * JNA ghost brigades are RS formations tagged `jna_legacy` with a `dissolve:N` tag
 * indicating the turn at which they fully dissolve. Starting 4 turns before dissolution,
 * personnel degrade by 25% per turn. At dissolve turn, status → 'inactive'.
 *
 * Deterministic: iterates formations in sorted order, no randomness.
 */

import type { GameState } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

export interface JNAGhostDegradationReport {
  /** Number of jna_legacy formations processed. */
  formations_checked: number;
  /** Formations that had personnel degraded this turn. */
  degraded: { id: string; personnel_before: number; personnel_after: number }[];
  /** Formations dissolved (set to inactive) this turn. */
  dissolved: string[];
}

/**
 * Parse the dissolve turn from a formation's tags.
 * Looks for a tag matching `dissolve:N` and returns N, or null if not found.
 */
function parseDissolveTurn(tags: string[]): number | null {
  for (const tag of tags) {
    if (tag.startsWith('dissolve:')) {
      const n = parseInt(tag.slice(9), 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  }
  return null;
}

/**
 * Run JNA ghost brigade degradation for the current turn.
 * For each active formation tagged `jna_legacy`:
 *   - If turn >= dissolve_week: set status to 'inactive', personnel to 0
 *   - If turn >= dissolve_week - 4: reduce personnel by 25% (floor)
 */
export function runJNAGhostDegradation(state: GameState): JNAGhostDegradationReport {
  const turn = state.meta.turn;
  const formations = state.formations ?? {};
  const formationIds = Object.keys(formations).sort(strictCompare);

  const report: JNAGhostDegradationReport = {
    formations_checked: 0,
    degraded: [],
    dissolved: [],
  };

  for (const fid of formationIds) {
    const f = formations[fid];
    if (!f || f.status !== 'active') continue;
    const tags = f.tags ?? [];
    if (!tags.includes('jna_legacy')) continue;

    report.formations_checked++;

    const dissolveTurn = parseDissolveTurn(tags);
    if (dissolveTurn === null) continue;

    if (turn >= dissolveTurn) {
      // Dissolve: set inactive
      f.status = 'inactive';
      f.personnel = 0;
      report.dissolved.push(fid);
    } else if (turn >= dissolveTurn - 4) {
      // Degrade: reduce personnel by 25% per turn
      const before = f.personnel ?? 0;
      const after = Math.floor(before * 0.75);
      f.personnel = after;
      report.degraded.push({ id: fid, personnel_before: before, personnel_after: after });
    }
  }

  return report;
}
