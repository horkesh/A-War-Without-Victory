/**
 * Phase E: Pressure eligibility (Roadmap Phase E, Step 1).
 * Determines who receives/applies pressure and where it can flow.
 * Phase 3A-aligned: eligibility weights and hard gating; no geometry.
 * Scope: Spatial & Interaction only (no Phase O concepts).
 */

import { strictCompare } from '../../state/validateGameState.js';
import type { GameState, FactionId } from '../../state/game_state.js';

export type SettlementId = string;

/** Edge shape for eligibility (contact graph / adjacency). */
export interface PressureEdge {
  a: SettlementId;
  b: SettlementId;
}

/**
 * Whether pressure may flow across edge (a, b) per Phase 3A-style rules.
 * Hard gating: both settlements must have political control state; pressure flows
 * where opposing control meets (front edge). No geometry; uses contact/adjacency only.
 *
 * @param state - Current game state
 * @param edge - Settlement pair (a, b)
 * @param _factionId - Optional faction context (reserved for future per-faction gating)
 */
export function isPressureEligible(
  state: GameState,
  edge: PressureEdge,
  _factionId?: FactionId
): boolean {
  const pc = state.political_controllers ?? {};
  const a = edge.a;
  const b = edge.b;
  const ctrlA = pc[a];
  const ctrlB = pc[b];
  // Both settlements must be present in political control map
  if (!Object.prototype.hasOwnProperty.call(pc, a) || !Object.prototype.hasOwnProperty.call(pc, b)) {
    return false;
  }
  // Hard gate: exhaustion collapse would make ineligible; scaffold has no per-settlement collapse yet
  // Stub: future E_collapse / cohesion checks go here (Phase 3A §4.2)
  // Opposing control: pressure flows across front edges (different non-null controller)
  if (ctrlA === null || ctrlB === null) {
    return false;
  }
  return ctrlA !== ctrlB;
}

/**
 * Build normalized edge id (deterministic: smaller sid first).
 */
export function toEdgeId(a: string, b: string): string {
  return strictCompare(a, b) <= 0 ? `${a}__${b}` : `${b}__${a}`;
}

/**
 * Collect eligible edges from a list of settlement edges, in stable order.
 * All iterations use strictCompare for deterministic output.
 */
export function getEligiblePressureEdges(
  state: GameState,
  edges: ReadonlyArray<{ a: string; b: string }>,
  factionId?: FactionId
): PressureEdge[] {
  const out: PressureEdge[] = [];
  const seen = new Set<string>();
  const sorted = [...edges].sort((x, y) => {
    const idX = toEdgeId(x.a, x.b);
    const idY = toEdgeId(y.a, y.b);
    return strictCompare(idX, idY);
  });
  for (const e of sorted) {
    const id = toEdgeId(e.a, e.b);
    if (seen.has(id)) continue;
    seen.add(id);
    if (isPressureEligible(state, { a: e.a, b: e.b }, factionId)) {
      out.push(strictCompare(e.a, e.b) <= 0 ? { a: e.a, b: e.b } : { a: e.b, b: e.a });
    }
  }
  return out;
}
