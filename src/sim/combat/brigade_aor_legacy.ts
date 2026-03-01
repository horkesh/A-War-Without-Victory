/**
 * Legacy brigade AoR helpers — thin API retained from the original 1370-line brigade_aor.ts.
 * The full AoR system (Voronoi BFS, municipality orders, AoR validation, encirclement)
 * was superseded by OSID/ZoC (location_osid + ZoC readiness). §33 of CONSOLIDATED_IMPLEMENTED.
 *
 * These functions still have active callers that read the legacy `brigade_aor` state field
 * populated by `corps_directed_aor.ts`. They will be removed when all consumers migrate
 * to OSID-native equivalents.
 *
 * Deterministic: sorted iteration via strictCompare. No timestamps or RNG.
 */

import type { EdgeRecord, SettlementRecord } from '../../map/settlements.js';
import type {
    FactionId,
    FormationId,
    FormationState,
    GameState,
    MunicipalityId,
    SettlementId
} from '../../state/game_state.js';
import { getLegacyAoR } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { areRbihHrhbAllied } from '../early_war/alliance_update.js';

// ═══════════════════════════════════════════════════════════════════════════
// Front-active detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Identify front-active settlements: settlements on edges where opposing factions meet.
 * A settlement is front-active if it has at least one adjacent settlement controlled by a different faction.
 */
export function identifyFrontActiveSettlements(
    state: GameState,
    edges: EdgeRecord[]
): Set<SettlementId> {
    const pc = state.political_controllers ?? {};
    const frontActive = new Set<SettlementId>();

    for (const edge of edges) {
        const controlA = pc[edge.a];
        const controlB = pc[edge.b];
        if (!controlA || !controlB || controlA === controlB) continue;
        const isRbihHrhbPair =
            (controlA === 'RBiH' && controlB === 'HRHB') || (controlA === 'HRHB' && controlB === 'RBiH');
        if (isRbihHrhbPair) {
            const turn = state.meta?.turn ?? 0;
            const earliestWar = state.meta?.rbih_hrhb_war_earliest_turn ?? 26;
            if (turn < earliestWar || areRbihHrhbAllied(state)) continue;
        }
        frontActive.add(edge.a);
        frontActive.add(edge.b);
    }

    return frontActive;
}

/**
 * Expand front-active set to include limited rear depth.
 * Includes settlements 1 hop behind the front line (controlled by same faction as the front settlement).
 * This provides operational depth for brigades.
 */
export function expandFrontActiveWithDepth(
    frontActive: Set<SettlementId>,
    edges: EdgeRecord[],
    pc: Record<SettlementId, FactionId | null>,
    depth: number = 1
): Set<SettlementId> {
    const expanded = new Set(frontActive);
    // Build adjacency
    const adj = new Map<SettlementId, SettlementId[]>();
    for (const edge of edges) {
        let listA = adj.get(edge.a);
        if (!listA) { listA = []; adj.set(edge.a, listA); }
        listA.push(edge.b);
        let listB = adj.get(edge.b);
        if (!listB) { listB = []; adj.set(edge.b, listB); }
        listB.push(edge.a);
    }

    let current = new Set(frontActive);
    for (let d = 0; d < depth; d++) {
        const next = new Set<SettlementId>();
        const sorted = Array.from(current).sort(strictCompare);
        for (const sid of sorted) {
            const neighbors = adj.get(sid) ?? [];
            const faction = pc[sid];
            for (const n of neighbors) {
                if (!expanded.has(n) && pc[n] === faction) {
                    expanded.add(n);
                    next.add(n);
                }
            }
        }
        current = next;
    }

    return expanded;
}

// ═══════════════════════════════════════════════════════════════════════════
// Municipality helpers (used by corps_directed_aor.ts)
// ═══════════════════════════════════════════════════════════════════════════

export function resolveMunicipalityForSid(
    sid: SettlementId,
    sidToMun: Record<SettlementId, MunicipalityId>
): MunicipalityId {
    return sidToMun[sid] ?? sid;
}

/** Build a settlement→municipality lookup from settlement records + fallback to SID. */
export function buildSidToMunMap(
    settlementIds: Iterable<SettlementId>,
    settlements?: Map<SettlementId, SettlementRecord>
): Record<SettlementId, MunicipalityId> {
    const sidToMun: Record<SettlementId, MunicipalityId> = {};
    if (settlements) {
        for (const [sid, s] of settlements.entries()) {
            sidToMun[sid] = (s.mun1990_id ?? s.mun_code ?? sid) as MunicipalityId;
        }
    }
    for (const sid of settlementIds) {
        if (!(sid in sidToMun)) sidToMun[sid] = sid as MunicipalityId;
    }
    return sidToMun;
}

/** Build municipality adjacency graph from settlement edges and SID→municipality lookup. */
export function buildMunicipalityAdjacency(
    edges: EdgeRecord[],
    sidToMun: Record<SettlementId, MunicipalityId>
): Map<MunicipalityId, Set<MunicipalityId>> {
    const adj = new Map<MunicipalityId, Set<MunicipalityId>>();
    for (const edge of edges) {
        const a = resolveMunicipalityForSid(edge.a, sidToMun);
        const b = resolveMunicipalityForSid(edge.b, sidToMun);
        if (a === b) continue;
        const aSet = adj.get(a) ?? new Set<MunicipalityId>();
        aSet.add(b);
        adj.set(a, aSet);
        const bSet = adj.get(b) ?? new Set<MunicipalityId>();
        bSet.add(a);
        adj.set(b, bSet);
    }
    return adj;
}

// ═══════════════════════════════════════════════════════════════════════════
// Brigade AoR state readers (read legacy brigade_aor field)
// ═══════════════════════════════════════════════════════════════════════════

/** Garrison effectiveness multiplier when brigade is encircled (Phase G). */
export const ENCIRCLED_GARRISON_MULT = 0.8;

export function getBrigadeAoRSettlements(
    state: GameState,
    formationId: FormationId
): SettlementId[] {
    const brigadeAor = getLegacyAoR(state).brigade_aor ?? {};
    const result: SettlementId[] = [];
    for (const [sid, bid] of Object.entries(brigadeAor)) {
        if (bid === formationId) result.push(sid);
    }
    return result.sort(strictCompare);
}

/**
 * Return the settlements actively covered by this brigade this turn.
 * Settlement-level redesign: AoR IS the coverage (1–4 settlements); no separate operational cap.
 */
function getBrigadeOperationalCoverageSettlements(
    state: GameState,
    formationId: FormationId,
    _edges?: EdgeRecord[]
): SettlementId[] {
    return getBrigadeAoRSettlements(state, formationId);
}

/**
 * Compute brigade density: personnel / AoR settlement count.
 * Higher density = more concentrated force = more pressure per edge.
 */
export function computeBrigadeDensity(
    state: GameState,
    formationId: FormationId,
    edges?: EdgeRecord[]
): number {
    const settlements = getBrigadeOperationalCoverageSettlements(state, formationId, edges);
    const formation = state.formations?.[formationId];
    if (!formation) return 0;
    const personnel = formation.personnel ?? 1000;
    return personnel / Math.max(1, settlements.length);
}

/**
 * Garrison strength at a settlement: brigade personnel split across AoR, or militia garrison if no brigade.
 * Phase C: when brigade is packing or unpacking, garrison is 50%.
 */
export function getSettlementGarrison(
    state: GameState,
    sid: SettlementId,
    edges?: EdgeRecord[]
): number {
    const brigadeAor = getLegacyAoR(state).brigade_aor ?? {};
    const formationId = brigadeAor[sid];
    if (formationId) {
        const coveredSettlements = getBrigadeOperationalCoverageSettlements(state, formationId, edges);
        if (coveredSettlements.includes(sid)) {
            const formation = state.formations?.[formationId];
            if (formation) {
                const personnel = formation.personnel ?? 1000;
                let garrison = personnel / Math.max(1, coveredSettlements.length);
                const mov = state.brigade_movement_state?.[formationId]?.status;
                if (mov === 'packing' || mov === 'unpacking') garrison *= 0.5;
                if (state.brigade_encircled?.[formationId]) garrison *= ENCIRCLED_GARRISON_MULT;
                return garrison;
            }
        }
    }
    // Militia garrison; Phase I: reduced by battle damage at this settlement
    const militia = state.militia_garrison?.[sid] ?? 0;
    const damage = Math.min(1, state.battle_damage?.[sid] ?? 0);
    return militia * (1 - damage);
}
