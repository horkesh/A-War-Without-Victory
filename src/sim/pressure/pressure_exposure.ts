/**
 * Pressure Exposure Helper
 * 
 * Computes per-entity (settlement SID) pressure exposure from state.front_pressure.
 * Deterministic: stable ordering, half-split attribution for edge pressure.
 * 
 * This is used as a proxy for "local exhaustion" until a true per-entity exhaustion model exists.
 */

import type { FrontEdge } from '../../map/front_edges.js';
import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type EntityId = string; // Settlement SID

/**
 * Parse edge ID (format: "a__b" where a < b) into [a, b] pair.
 */
function parseEdgeId(edgeId: string): [string, string] | null {
    const idx = edgeId.indexOf('__');
    if (idx <= 0 || idx === edgeId.length - 2) return null;
    const a = edgeId.slice(0, idx);
    const b = edgeId.slice(idx + 2);
    return a && b ? [a, b] : null;
}

/**
 * Compute pressure exposure per entity (settlement SID) from state.front_pressure.
 * 
 * For each edge with pressure p:
 * - Split p/2 to each endpoint (a, b)
 * - Sum exposures per entity
 * 
 * Deterministic: stable sorted edge iteration, stable entity ordering.
 * 
 * @param state Game state (reads state.front_pressure)
 * @param derivedFrontEdges Optional front edges for validation (if provided, only count edges that exist in front_edges)
 * @returns Map from EntityId (settlement SID) to pressure exposure (non-negative)
 */
export function computePressureExposureByEntity(
    state: GameState,
    derivedFrontEdges?: FrontEdge[]
): Map<EntityId, number> {
    const exposure = new Map<EntityId, number>();

    const fp = state.military.front_pressure;
    if (!fp || typeof fp !== 'object') {
        return exposure;
    }

    // Build set of valid edge IDs if front edges provided (for validation)
    const validEdgeIds = derivedFrontEdges
        ? new Set(derivedFrontEdges.map(e => e.edge_id))
        : null;

    // Get all pressure-bearing edges in stable sorted order
    const edgeIds = Object.keys(fp)
        .filter((k) => {
            // Skip if not in valid front edges (if provided)
            if (validEdgeIds && !validEdgeIds.has(k)) return false;

            const v = (fp as Record<string, { value?: unknown }>)[k];
            return v && typeof v === 'object' && typeof (v as { value: number }).value === 'number';
        })
        .sort(strictCompare);

    for (const edgeId of edgeIds) {
        const rec = (fp as Record<string, { value: number }>)[edgeId];
        const p = Math.abs(rec?.value ?? 0);
        if (p <= 0) continue;

        // Parse edge endpoints
        const pair = parseEdgeId(edgeId);
        if (!pair) continue;
        const [a, b] = pair;

        // Half-split attribution (deterministic, matches Phase 3A harness default)
        const halfP = p / 2;
        exposure.set(a, (exposure.get(a) ?? 0) + halfP);
        exposure.set(b, (exposure.get(b) ?? 0) + halfP);
    }

    return exposure;
}

/**
 * COLLAPSE PHASE IV-b D1 — OSID-native exposure adapter (scope doc §A.3 Option 2 + M1).
 * Spec: docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_OSID_SUBSTRATE_SCOPE.md
 * §6 review: docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md
 *
 * Sibling of computePressureExposureByEntity for OSID-native scenarios, where the
 * settlement-level `front_pressure` is structurally empty (life-lesson: "canonical and
 * operational edge universes must be bridged explicitly"). Iterates the live OSID front
 * topology `state.military.war_front_edges_osid` (edge endpoints a/b are OSIDs; edge_id
 * is `a__b`, so the same parseEdgeId half-split applies) and attributes an M1 UNIFORM
 * presence magnitude: 1.0 per active OSID front edge, half-split (0.5) per endpoint.
 * Exposure(osid) = 0.5 × (number of hostile OSID front edges touching that OSID) — the
 * besieged-pocket signal. The magnitude model is the single tunable for later phases
 * (M2/BFS-isolation is a Phase IV-c refinement; Option 3 / war_front_pressure_osid is
 * FORBIDDEN without a fresh §6 review — review Condition 4).
 *
 * NOT YET WIRED: Phase 3C still calls the settlement variant (D2 is the wire-in step,
 * gated on owner re-floor sign-off). Return shape matches the settlement variant
 * (Map<EntityId, number>) so the D2 dispatch is a small branch at the 3C call site.
 *
 * §6 NOTE (review Condition 1): protected enclave OSIDs (getEnclaveDefForOsid) DO appear
 * in this exposure output BY DESIGN — the ratified #368 model is guard-by-exclusion at
 * the Phase 3D WRITE (G1), not guard-by-never-evaluating. Only collapse_damage /
 * capacity_modifiers / will_not_recover are §6-protected; upstream local_strain /
 * Tier-1 eligibility entries on enclaves are expected and are NOT a guard breach.
 *
 * Deterministic: transient/derived only (no persisted state), sorted edge iteration via
 * strictCompare, input-order invariant, no RNG/clock.
 */
export function computePressureExposureByEntityOsid(state: GameState): Map<EntityId, number> {
    const exposure = new Map<EntityId, number>();

    const edges = state.military.war_front_edges_osid;
    if (!Array.isArray(edges) || edges.length === 0) {
        return exposure;
    }

    // M1 uniform presence magnitude per active OSID front edge.
    const M1_UNIFORM_EDGE_MAGNITUDE = 1.0;

    // Stable sorted, de-duplicated edge iteration (input-order invariant).
    const edgeIds = [...new Set(
        edges
            .map(e => e?.edge_id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )].sort(strictCompare);

    for (const edgeId of edgeIds) {
        const pair = parseEdgeId(edgeId);
        if (!pair) continue;
        const [a, b] = pair;

        // Half-split attribution, mirroring the settlement variant above.
        const halfP = M1_UNIFORM_EDGE_MAGNITUDE / 2;
        exposure.set(a, (exposure.get(a) ?? 0) + halfP);
        exposure.set(b, (exposure.get(b) ?? 0) + halfP);
    }

    return exposure;
}
