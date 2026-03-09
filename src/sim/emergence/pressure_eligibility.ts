/**
 * Phase E: Pressure eligibility (Roadmap Phase E, Step 1).
 * Determines who receives/applies pressure and where it can flow.
 * Phase 3A-aligned: eligibility weights and hard gating; no geometry.
 * Scope: Spatial & Interaction only (no Phase O concepts).
 */

import type { CanonicalToOperationalMap } from '../../data/operational_data.js';
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type SettlementId = string;

/** Edge shape for eligibility (contact graph / adjacency). */
export interface PressureEdge {
    a: SettlementId;
    b: SettlementId;
}

/**
 * Resolve a settlement ID to the key used in political_controllers.
 * When political_controllers is OSID-keyed (War phase after promotePoliticalControllersToOsid)
 * and the provided id is a canonical SID (does not start with "op:"), the SID must be
 * mapped to its OSID via canonicalToOperational before the lookup succeeds.
 * Falls back to the id itself when the map is absent or the id is not found in it.
 */
function resolveControlKey(id: string, pc: Record<string, unknown>, canonicalToOperational?: CanonicalToOperationalMap): string {
    // If the id is already in pc (SID-keyed state or OSID edge in OSID-keyed state), use as-is.
    if (Object.prototype.hasOwnProperty.call(pc, id)) {
        return id;
    }
    // If a SID→OSID map is provided and the id is a canonical SID, resolve to OSID.
    if (canonicalToOperational && !id.startsWith('op:')) {
        const osid = canonicalToOperational[id];
        if (osid !== undefined) {
            return osid;
        }
    }
    // Fall through: return id unchanged (lookup will fail, producing correct false result).
    return id;
}

/**
 * Whether pressure may flow across edge (a, b) per Phase 3A-style rules.
 * Hard gating: both settlements must have political control state; pressure flows
 * where opposing control meets (front edge). No geometry; uses contact/adjacency only.
 *
 * Fix (System C OSID key mismatch): state.political_controllers is OSID-keyed after War phase
 * initialization (promotePoliticalControllersToOsid), but edges from the canonical settlement
 * graph carry SID endpoints (e.g. "S100013"). When canonicalToOperational is provided, SID
 * endpoints are resolved to their OSIDs before the political_controllers lookup, so the
 * eligibility check correctly reflects actual control boundaries.
 *
 * @param state - Current game state
 * @param edge - Settlement pair (a, b); endpoints may be SIDs or OSIDs
 * @param _factionId - Optional faction context (reserved for future per-faction gating)
 * @param canonicalToOperational - Optional SID→OSID map; supply when political_controllers
 *   is OSID-keyed and edge endpoints are canonical SIDs
 */
export function isPressureEligible(
    state: GameState,
    edge: PressureEdge,
    _factionId?: FactionId,
    canonicalToOperational?: CanonicalToOperationalMap
): boolean {
    const pc = state.political.political_controllers ?? {};
    const keyA = resolveControlKey(edge.a, pc as Record<string, unknown>, canonicalToOperational);
    const keyB = resolveControlKey(edge.b, pc as Record<string, unknown>, canonicalToOperational);
    // Both settlements must be present in political control map
    if (!Object.prototype.hasOwnProperty.call(pc, keyA) || !Object.prototype.hasOwnProperty.call(pc, keyB)) {
        return false;
    }
    const ctrlA = pc[keyA];
    const ctrlB = pc[keyB];
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
 *
 * @param canonicalToOperational - Optional SID→OSID map; pass when political_controllers is
 *   OSID-keyed and the provided edges carry canonical SID endpoints.
 */
export function getEligiblePressureEdges(
    state: GameState,
    edges: ReadonlyArray<{ a: string; b: string }>,
    factionId?: FactionId,
    canonicalToOperational?: CanonicalToOperationalMap
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
        if (isPressureEligible(state, { a: e.a, b: e.b }, factionId, canonicalToOperational)) {
            out.push(strictCompare(e.a, e.b) <= 0 ? { a: e.a, b: e.b } : { a: e.b, b: e.a });
        }
    }
    return out;
}
