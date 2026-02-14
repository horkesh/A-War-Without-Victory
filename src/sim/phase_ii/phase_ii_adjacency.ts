/**
 * Shared Phase II helpers: adjacency from edges (Set-based) and faction brigades.
 * Used by bot_corps_ai, bot_brigade_ai, and brigade_aor for deterministic iteration.
 *
 * Deterministic: sorted keys, no randomness.
 */

import type { GameState, FactionId, FormationState, SettlementId } from '../../state/game_state.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Build adjacency map from edge list: each settlement -> set of neighbor SIDs.
 * Used by bot AI and AoR rebalancing for front/neighbor checks.
 */
export function buildAdjacencyFromEdges(
  edges: EdgeRecord[]
): Map<SettlementId, Set<SettlementId>> {
  const adj = new Map<SettlementId, Set<SettlementId>>();
  for (const e of edges) {
    if (!e?.a || !e?.b) continue;
    let setA = adj.get(e.a);
    if (!setA) {
      setA = new Set();
      adj.set(e.a, setA);
    }
    setA.add(e.b);
    let setB = adj.get(e.b);
    if (!setB) {
      setB = new Set();
      adj.set(e.b, setB);
    }
    setB.add(e.a);
  }
  return adj;
}

/**
 * Get all active brigades for a faction, sorted by formation ID.
 */
export function getFactionBrigades(state: GameState, faction: FactionId): FormationState[] {
  const formations = state.formations ?? {};
  const result: FormationState[] = [];
  for (const id of Object.keys(formations).sort(strictCompare)) {
    const f = formations[id];
    if (!f || f.faction !== faction || f.status !== 'active') continue;
    if ((f.kind ?? 'brigade') !== 'brigade') continue;
    result.push(f);
  }
  return result;
}
