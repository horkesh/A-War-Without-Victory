/**
 * Phase E Step 4: AoR (Area of Responsibility) instantiation.
 * AoRs emerge from sustained spatial dominance and pressure gradients; they are soft, overlapping zones
 * that affect pressure diffusion and command friction but do NOT flip control or authority.
 * 
 * Per ROADMAP Phase E §3 and Systems Manual §2.1:
 * - AoRs created when sustained brigade-level adjacency and opposing contact exist
 * - AoRs apply only to front-active settlements (where opposing pressure is eligible)
 * - AoR assignment never creates or overrides political control (Engine Invariants §9.8)
 * - Overlapping allowed; reversible when conditions change
 * 
 * Scope: Spatial & Interaction only (no Phase O concepts).
 */


import type { FactionId, GameState, PhaseEAorMembership, PhaseEAorMembershipEntry } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getEligiblePressureEdges, toEdgeId, type PressureEdge } from './pressure_eligibility.js';


/** Minimum consecutive turns with pressure-eligible edges for AoR to emerge (sustained condition). */
const AOR_EMERGENCE_PERSIST_TURNS = 3;

/** Minimum pressure gradient (absolute value) for AoR to form on an edge. */
const AOR_MIN_PRESSURE_THRESHOLD = 5;

/**
 * Derive AoR membership from sustained spatial dominance and pressure gradients.
 * Returns PhaseEAorMembership (derived; not serialized per Engine Invariants §13.1).
 * 
 * Rules:
 * - AoRs emerge only when pressure-eligible edges have sustained opposing control for >= AOR_EMERGENCE_PERSIST_TURNS
 * - Each formation (brigade) may have influence over edges where its faction has control on one endpoint
 * - Influence weight derived from pressure gradient and front segment persistence (active_streak)
 * - Overlapping allowed: multiple formations may have influence on same edge
 * - Reversible: if conditions weaken (pressure drops, active_streak resets), AoR dissolves
 * 
 * @param state - Game state (read-only for AoR derivation)
 * @param edges - Settlement adjacency edges (contact graph)
 * @returns PhaseEAorMembership (by_formation: formation_id → edge_ids, influence_weight)
 */
export function deriveAoRMembership(
    state: GameState,
    edges: ReadonlyArray<{ a: string; b: string }>
): PhaseEAorMembership {
    const result: PhaseEAorMembership = { by_formation: {} };

    // Phase E only runs in phase_ii
    if (state.meta?.phase !== 'phase_ii') {
        return result;
    }

    const eligible = getEligiblePressureEdges(state, edges);
    if (eligible.length === 0) {
        return result;
    }

    const fp = state.front_pressure ?? {};
    const segments = state.front_segments ?? {};
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};

    // Filter eligible edges to those with sustained pressure (active_streak >= AOR_EMERGENCE_PERSIST_TURNS)
    // and sufficient pressure gradient (|value| >= AOR_MIN_PRESSURE_THRESHOLD)
    const sustainedEdges: Array<{ edge_id: string; a: string; b: string; pressure: number; streak: number }> = [];
    for (const e of eligible) {
        const eid = toEdgeId(e.a, e.b);
        const pressureRec = (fp as Record<string, { value?: number }>)[eid];
        const segmentRec = (segments as Record<string, { active_streak?: number }>)[eid];
        const pressure = Math.abs(pressureRec?.value ?? 0);
        const streak = segmentRec?.active_streak ?? 0;

        if (streak >= AOR_EMERGENCE_PERSIST_TURNS && pressure >= AOR_MIN_PRESSURE_THRESHOLD) {
            sustainedEdges.push({ edge_id: eid, a: e.a, b: e.b, pressure, streak });
        }
    }

    if (sustainedEdges.length === 0) {
        return result;
    }

    // Build faction → edges map (edges where faction has control on at least one endpoint)
    const factionEdges = new Map<FactionId, Set<string>>();
    for (const e of sustainedEdges) {
        const ctrlA = pc[e.a];
        const ctrlB = pc[e.b];
        if (ctrlA && ctrlA !== null) {
            if (!factionEdges.has(ctrlA)) factionEdges.set(ctrlA, new Set());
            factionEdges.get(ctrlA)!.add(e.edge_id);
        }
        if (ctrlB && ctrlB !== null) {
            if (!factionEdges.has(ctrlB)) factionEdges.set(ctrlB, new Set());
            factionEdges.get(ctrlB)!.add(e.edge_id);
        }
    }

    // For each formation (brigade), assign AoR edges where formation's faction has influence
    // Influence weight: normalized by pressure and streak (higher = more influence)
    const formationIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formationIds) {
        const formation = formations[fid];
        if (!formation || formation.status !== 'active') continue;
        const faction = formation.faction;
        if (!faction) continue;

        const edgesForFaction = factionEdges.get(faction);
        if (!edgesForFaction || edgesForFaction.size === 0) continue;

        const edgeList = [...edgesForFaction].sort(strictCompare);

        // Compute influence weight: average of (pressure / 100) and (streak / 10), clamped to [0, 1]
        let totalWeight = 0;
        let count = 0;
        for (const eid of edgeList) {
            const e = sustainedEdges.find((x) => x.edge_id === eid);
            if (!e) continue;
            const pressureWeight = Math.min(1, e.pressure / 100);
            const streakWeight = Math.min(1, e.streak / 10);
            const weight = (pressureWeight + streakWeight) / 2;
            totalWeight += weight;
            count += 1;
        }
        const avgWeight = count > 0 ? totalWeight / count : 0;
        const influenceWeight = Math.max(0, Math.min(1, avgWeight));

        const entry: PhaseEAorMembershipEntry = {
            formation_id: fid,
            edge_ids: edgeList,
            influence_weight: influenceWeight
        };

        result.by_formation[fid] = entry;
    }

    return result;
}

/**
 * Check if a settlement is front-active (has at least one pressure-eligible edge).
 * Front-active settlements require AoR assignment; rear settlements do not.
 * 
 * @param settlementId - Settlement SID
 * @param eligibleEdges - Pressure-eligible edges
 * @returns true if settlement is on at least one eligible edge
 */
export function isSettlementFrontActive(
    settlementId: string,
    eligibleEdges: ReadonlyArray<PressureEdge>
): boolean {
    return eligibleEdges.some((e) => e.a === settlementId || e.b === settlementId);
}

/**
 * Get all front-active settlements (settlements on at least one pressure-eligible edge).
 * 
 * @param eligibleEdges - Pressure-eligible edges
 * @returns Set of settlement IDs that are front-active
 */
export function getFrontActiveSettlements(
    eligibleEdges: ReadonlyArray<PressureEdge>
): Set<string> {
    const result = new Set<string>();
    for (const e of eligibleEdges) {
        result.add(e.a);
        result.add(e.b);
    }
    return result;
}
