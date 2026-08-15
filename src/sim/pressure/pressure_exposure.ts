/**
 * Pressure Exposure Helper
 * 
 * Computes per-entity (settlement SID) pressure exposure from state.front_pressure.
 * Deterministic: stable ordering, half-split attribution for edge pressure.
 * 
 * This is used as a proxy for "local exhaustion" until a true per-entity exhaustion model exists.
 */

import type { FrontEdge } from '../../map/front_edges.js';
import type { AttackResolutionOsidReport } from '../combat/attack_resolution_types.js';
import type {
    CollapseCombatIncidenceWindowRow,
    CollapseCombatIncidenceWindowState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

export type EntityId = string; // Settlement SID

const COMBAT_INCIDENCE_WINDOW_TURNS = 2;

function parseCanonicalMunicipalityId(targetOsid: string): string | null {
    const parts = targetOsid.split(':');
    if (parts.length < 3 || parts[0] !== 'op' || !parts[1] || !parts[2]) {
        return null;
    }
    return parts[1];
}

function compareCombatWindowRows(
    a: CollapseCombatIncidenceWindowRow,
    b: CollapseCombatIncidenceWindowRow
): number {
    if (a.turn !== b.turn) return a.turn - b.turn;
    const byTarget = strictCompare(a.target_osid, b.target_osid);
    return byTarget !== 0 ? byTarget : strictCompare(a.battle_id, b.battle_id);
}

function addExposure(exposure: Map<EntityId, number>, entityId: EntityId, amount: number): void {
    exposure.set(entityId, (exposure.get(entityId) ?? 0) + amount);
}

export interface CombatIncidenceWindowAdvanceResult {
    exposure_by_entity: Map<EntityId, number>;
    window: CollapseCombatIncidenceWindowState;
}

/**
 * Advance the symmetric two-turn municipality combat-incidence window.
 *
 * Current battles add one direct exposure at their target. For each distinct
 * attacked target, battle rows at other targets in the same municipality from
 * the current or preceding two turns contribute 0.5 each. Later combat
 * retroactively credits earlier targets without multiplying the support by the
 * receiving target's own number of direct rows.
 */
export function advanceCombatIncidenceExposureWindow(
    priorWindow: CollapseCombatIncidenceWindowState | undefined,
    currentTurn: number,
    report: Pick<AttackResolutionOsidReport, 'battles'> | undefined
): CombatIncidenceWindowAdvanceResult {
    const minTurn = currentTurn - COMBAT_INCIDENCE_WINDOW_TURNS;
    const priorRows = (priorWindow?.rows ?? [])
        .filter((row) => Number.isInteger(row?.turn)
            && row.turn >= minTurn
            && row.turn <= currentTurn
            && typeof row.battle_id === 'string'
            && row.battle_id.trim().length > 0
            && typeof row.target_osid === 'string'
            && parseCanonicalMunicipalityId(row.target_osid) !== null)
        .map((row) => ({
            turn: row.turn,
            battle_id: row.battle_id,
            target_osid: row.target_osid,
        }))
        .sort(compareCombatWindowRows);

    const currentRows: CollapseCombatIncidenceWindowRow[] = (report?.battles ?? [])
        .filter((battle) => typeof battle?.battle_id === 'string'
            && battle.battle_id.trim().length > 0
            && typeof battle.target_osid === 'string'
            && parseCanonicalMunicipalityId(battle.target_osid) !== null)
        .map((battle) => ({
            turn: currentTurn,
            battle_id: battle.battle_id,
            target_osid: battle.target_osid,
        }))
        .sort(compareCombatWindowRows);

    const exposure = new Map<EntityId, number>();
    const priorCounts = new Map<EntityId, number>();
    const currentCounts = new Map<EntityId, number>();
    for (const row of priorRows) {
        priorCounts.set(row.target_osid, (priorCounts.get(row.target_osid) ?? 0) + 1);
    }
    for (const row of currentRows) {
        currentCounts.set(row.target_osid, (currentCounts.get(row.target_osid) ?? 0) + 1);
    }

    const currentTargets = [...currentCounts.keys()].sort(strictCompare);
    const priorTargets = [...priorCounts.keys()].sort(strictCompare);
    for (const currentTarget of currentTargets) {
        const currentCount = currentCounts.get(currentTarget) ?? 0;
        addExposure(exposure, currentTarget, currentCount);
        const municipalityId = parseCanonicalMunicipalityId(currentTarget);
        if (!municipalityId) continue;

        for (const priorTarget of priorTargets) {
            if (priorTarget === currentTarget) continue;
            if (parseCanonicalMunicipalityId(priorTarget) !== municipalityId) continue;
            const priorCount = priorCounts.get(priorTarget) ?? 0;
            addExposure(exposure, currentTarget, 0.5 * priorCount);
            addExposure(exposure, priorTarget, 0.5 * currentCount);
        }
    }

    for (let i = 0; i < currentTargets.length; i++) {
        const target = currentTargets[i];
        const municipalityId = parseCanonicalMunicipalityId(target);
        if (!municipalityId) continue;
        for (let j = i + 1; j < currentTargets.length; j++) {
            const peerTarget = currentTargets[j];
            if (parseCanonicalMunicipalityId(peerTarget) !== municipalityId) continue;
            addExposure(exposure, target, 0.5 * (currentCounts.get(peerTarget) ?? 0));
            addExposure(exposure, peerTarget, 0.5 * (currentCounts.get(target) ?? 0));
        }
    }

    const orderedExposure = new Map<EntityId, number>();
    for (const entityId of [...exposure.keys()].sort(strictCompare)) {
        orderedExposure.set(entityId, exposure.get(entityId) ?? 0);
    }

    return {
        exposure_by_entity: orderedExposure,
        window: { rows: [...priorRows, ...currentRows].sort(compareCombatWindowRows) },
    };
}

/**
 * Compute local-collapse exposure from resolved combat incidence.
 *
 * Each resolved OSID battle contributes exactly one exposure unit to its
 * defender-side `target_osid`. Quiet or missing reports contribute nothing.
 * Casualties, outcome, attacker count, and frontage geometry deliberately do
 * not affect this measurement-first D-selection signal.
 */
export function computeCombatIncidenceExposureByEntity(
    report: Pick<AttackResolutionOsidReport, 'battles'> | undefined
): Map<EntityId, number> {
    const exposure = new Map<EntityId, number>();
    if (!Array.isArray(report?.battles) || report.battles.length === 0) {
        return exposure;
    }

    const battles = report.battles
        .filter((battle) => typeof battle?.target_osid === 'string' && battle.target_osid.trim().length > 0)
        .map((battle) => ({ battle_id: battle.battle_id, target_osid: battle.target_osid }))
        .sort((a, b) => {
            const byTarget = strictCompare(a.target_osid, b.target_osid);
            return byTarget !== 0 ? byTarget : strictCompare(a.battle_id, b.battle_id);
        });

    for (const battle of battles) {
        exposure.set(battle.target_osid, (exposure.get(battle.target_osid) ?? 0) + 1);
    }

    return exposure;
}

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
