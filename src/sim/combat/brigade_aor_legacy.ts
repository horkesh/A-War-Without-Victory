/**
 * Legacy brigade AoR helpers — thin API retained from the original 1370-line brigade_aor.ts.
 * The full AoR system (Voronoi BFS, municipality orders, AoR validation, encirclement)
 * was superseded by OSID/corps sectors (location_osid + sector-line defense). §33 of CONSOLIDATED_IMPLEMENTED.
 *
 * These functions still have active callers that read the legacy `brigade_aor` state field
 * populated by `corps_directed_aor.ts`. They will be removed when all consumers migrate
 * to OSID-native equivalents.
 *
 * Deterministic: sorted iteration via strictCompare. No timestamps or RNG.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type {
    FormationId,
    GameState,
    SettlementId
} from '../../state/game_state.js';
import { getLegacyAoR } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    areRbihHrhbAllied,
    DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN,
} from '../early_war/alliance_update.js';

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
    const pc = state.political.political_controllers ?? {};
    const frontActive = new Set<SettlementId>();

    for (const edge of edges) {
        const controlA = pc[edge.a];
        const controlB = pc[edge.b];
        if (!controlA || !controlB || controlA === controlB) continue;
        const isRbihHrhbPair =
            (controlA === 'RBiH' && controlB === 'HRHB') || (controlA === 'HRHB' && controlB === 'RBiH');
        if (isRbihHrhbPair) {
            const turn = state.meta?.turn ?? 0;
            const earliestWar = state.meta?.rbih_hrhb_war_earliest_turn
                ?? DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN;
            if (turn < earliestWar || areRbihHrhbAllied(state)) continue;
        }
        frontActive.add(edge.a);
        frontActive.add(edge.b);
    }

    return frontActive;
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
    const formation = state.military.formations?.[formationId];
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
            const formation = state.military.formations?.[formationId];
            if (formation) {
                const personnel = formation.personnel ?? 1000;
                let garrison = personnel / Math.max(1, coveredSettlements.length);
                const mov = state.military.brigade_movement_state?.[formationId]?.status;
                if (mov === 'packing' || mov === 'unpacking') garrison *= 0.5;
                if (state.military.brigade_encircled?.[formationId]) garrison *= ENCIRCLED_GARRISON_MULT;
                return garrison;
            }
        }
    }
    // Militia garrison; Peace phase: reduced by battle damage at this settlement
    const militia = state.military.militia_garrison?.[sid] ?? 0;
    const damage = Math.min(1, state.military.battle_damage?.[sid] ?? 0);
    return militia * (1 - damage);
}
