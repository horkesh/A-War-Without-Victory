/**
 * Peace phase settlement-level control change (wave + holdout cleanup).
 *
 * Replaces municipality-level bulk flips with settlement-by-settlement resolution:
 * - Wave phase: when a municipality is overrun, settlements with favorable demographics flip immediately;
 *   settlements with hostile-majority populations become "holdouts" requiring formation presence to clear.
 * - Cleanup phase: each turn, formations can clear 1-2 holdout settlements per brigade.
 *   Holdouts without supply connection surrender after 4 turns.
 *
 * Deterministic: settlements processed in sorted SID order. No randomness.
 */

import type { CanonicalToOperationalMap } from '../../data/operational_data.js';
import type { EdgeRecord, SettlementRecord } from '../../map/settlements.js';
import type {
    FactionId,
    GameState,
    MunicipalityId,
    SettlementId
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/** Resolve control key: OSID when map present, else SID. */
function controlKey(sid: string, co?: CanonicalToOperationalMap): string {
    return co?.[sid] ?? sid;
}

// --- Constants ---

/** Ethnic composition threshold: settlement flips in wave if attacker's ethnicity >= this share. */
const WAVE_FLIP_ETHNIC_THRESHOLD = 0.30;

/** Holdout resistance base from hostile population share. */
const HOLDOUT_RESISTANCE_BASE_FACTOR = 100;

const ORG_DEFENSE_BONUS = {
    rbih_to_control_controlled: 0.4,
    rbih_paramilitary: 0.3,
    rbih_party_penetration: 0.2,
    rs_paramilitary: 0.3,
    rs_party_penetration: 0.2,
    rs_jna_presence: 0.4,
    hrhb_paramilitary: 0.3,
    hrhb_party_penetration: 0.2,
    police_loyalty: 0.2,
} as const;

/**
 * Deterministic holdout scaling: larger population settlements persist longer.
 * Piecewise table is intentionally steep to distinguish hamlets vs towns/cities.
 */
function holdoutPopulationFactor(population: number): number {
    if (population < 500) return 0.3;
    if (population < 2000) return 0.6;
    if (population < 10000) return 1.0;
    if (population < 30000) return 1.8;
    return 2.5;
}

/** Deterministic holdout scaling: proximity/supply context (more edges = more connected, harder to isolate). */
function holdoutProximityFactor(degree: number): number {
    if (degree <= 0) return 1;
    return 1 + Math.min(0.5, degree / 20);
}

function getOrgDefenseBonus(
    state: GameState,
    munId: MunicipalityId,
    holdoutFaction: FactionId
): number {
    const op = state.municipalities?.[munId]?.organizational_penetration;
    if (!op || holdoutFaction == null) return 0;
    let bonus = 0;
    if (op.police_loyalty === 'loyal') bonus += ORG_DEFENSE_BONUS.police_loyalty;
    if (holdoutFaction === 'RBiH') {
        if (op.to_control === 'controlled') bonus += ORG_DEFENSE_BONUS.rbih_to_control_controlled;
        if ((op.patriotska_liga ?? 0) > 0) bonus += ORG_DEFENSE_BONUS.rbih_paramilitary;
        if ((op.sda_penetration ?? 0) > 50) bonus += ORG_DEFENSE_BONUS.rbih_party_penetration;
    } else if (holdoutFaction === 'RS') {
        if ((op.paramilitary_rs ?? 0) > 0) bonus += ORG_DEFENSE_BONUS.rs_paramilitary;
        if ((op.sds_penetration ?? 0) > 50) bonus += ORG_DEFENSE_BONUS.rs_party_penetration;
        if (op.jna_presence === true) bonus += ORG_DEFENSE_BONUS.rs_jna_presence;
    } else if (holdoutFaction === 'HRHB') {
        if ((op.paramilitary_hrhb ?? 0) > 0) bonus += ORG_DEFENSE_BONUS.hrhb_paramilitary;
        if ((op.hdz_penetration ?? 0) > 50) bonus += ORG_DEFENSE_BONUS.hrhb_party_penetration;
    }
    return bonus;
}

/** Maximum holdout settlements a single brigade can clear per turn. */
const MAX_CLEANUP_PER_BRIGADE = 2;

/** Turns of isolation after which a holdout surrenders automatically. */
const HOLDOUT_ISOLATION_SURRENDER_TURNS = 4;

/** Resistance threshold below which cleanup succeeds. */
const CLEANUP_RESISTANCE_THRESHOLD = 50;

// --- Ethnicity mapping ---

/** Map faction to primary ethnicity key in settlement census data. */
function factionToEthnicity(faction: FactionId): string {
    if (faction === 'RS') return 'serb';
    if (faction === 'RBiH') return 'bosniak';
    if (faction === 'HRHB') return 'croat';
    return 'other';
}

/** Get ethnic share for a faction in a settlement's demographic composition. */
function getEthnicShare(
    settlementData: { ethnicity?: { composition?: Record<string, number> } },
    faction: FactionId
): number {
    const key = factionToEthnicity(faction);
    return settlementData?.ethnicity?.composition?.[key] ?? 0;
}

// --- Settlement adjacency helpers ---

/** Build settlement → set of adjacent settlement IDs. */
export function buildSettlementAdjacency(edges: EdgeRecord[]): Map<SettlementId, Set<SettlementId>> {
    const adj = new Map<SettlementId, Set<SettlementId>>();
    for (const edge of edges) {
        let setA = adj.get(edge.a);
        if (!setA) { setA = new Set(); adj.set(edge.a, setA); }
        setA.add(edge.b);
        let setB = adj.get(edge.b);
        if (!setB) { setB = new Set(); adj.set(edge.b, setB); }
        setB.add(edge.a);
    }
    return adj;
}

/** Check if a holdout settlement has supply connection (BFS to any same-faction non-holdout settlement). */
function hasSupplyConnection(
    sid: SettlementId,
    holdoutFaction: FactionId,
    state: GameState,
    settlementAdj: Map<SettlementId, Set<SettlementId>>
): boolean {
    const pc = state.political_controllers;
    if (!pc) return false;
    const holdouts = state.settlement_holdouts ?? {};

    // BFS from sid through same-faction-controlled settlements
    const visited = new Set<SettlementId>();
    const queue: SettlementId[] = [sid];
    visited.add(sid);

    while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = settlementAdj.get(current);
        if (!neighbors) continue;
        for (const neighbor of neighbors) {
            if (visited.has(neighbor)) continue;
            visited.add(neighbor);
            const controller = pc[neighbor];
            if (controller !== holdoutFaction) continue;
            // Found a non-holdout settlement controlled by the holdout faction = supply connection
            const holdoutState = holdouts[neighbor];
            if (!holdoutState || !holdoutState.holdout) return true;
            // It's also a holdout, continue BFS through it
            queue.push(neighbor);
        }
    }
    return false;
}

// --- Types ---

export interface SettlementFlipEvent {
    turn: number;
    settlement_id: SettlementId;
    from: FactionId | null;
    to: FactionId;
    mechanism: 'wave_flip' | 'holdout_created' | 'holdout_cleared' | 'holdout_surrendered';
    mun_id: MunicipalityId | null;
}

export interface WaveFlipResult {
    /** Settlements that flipped to the new controller. */
    flipped: SettlementId[];
    /** Settlements that became holdouts (hostile-majority, not immediately flipped). */
    holdouts: SettlementId[];
    /** All events generated. */
    events: SettlementFlipEvent[];
}

// --- Wave phase ---

/** Optional context for holdout resistance scaling (population + proximity). Deterministic. */
export interface HoldoutScalingContext {
    sidToPopulation?: Map<SettlementId, number>;
    sidToDegree?: Map<SettlementId, number>;
}

/**
 * Apply wave-phase settlement control for a municipality being overrun.
 * Settlements with attacker's ethnicity >= threshold flip immediately.
 * Settlements with hostile majority become holdouts.
 * Holdout resistance scales by population and proximity (degree) when context provided.
 */
export function applyWaveFlip(
    state: GameState,
    munId: MunicipalityId,
    newController: FactionId,
    previousController: FactionId | null,
    settlementsByMun: Map<MunicipalityId, SettlementId[]>,
    settlementData: Map<string, { ethnicity?: { composition?: Record<string, number> }; population?: number }>,
    turn: number,
    scalingContext?: HoldoutScalingContext,
    canonicalToOperational?: CanonicalToOperationalMap
): WaveFlipResult {
    const result: WaveFlipResult = { flipped: [], holdouts: [], events: [] };
    const sids = settlementsByMun.get(munId);
    if (!sids?.length) return result;

    const pc = state.political_controllers;
    if (!pc) return result;
    if (!state.settlement_holdouts) {
        (state as GameState).settlement_holdouts = {};
    }
    const holdouts = state.settlement_holdouts!;

    for (const sid of sids) {
        const key = controlKey(sid, canonicalToOperational);
        const currentController = pc[key];
        // Skip settlements already controlled by new controller
        if (currentController === newController) continue;
        // Skip settlements already contested by the same occupying faction.
        if (holdouts[sid]?.holdout && holdouts[sid].occupying_faction === newController) continue;

        const data = settlementData.get(sid);
        const attackerEthnicShare = getEthnicShare(data ?? {}, newController);
        const defenderEthnicShare = previousController ? getEthnicShare(data ?? {}, previousController) : 0;

        // Wave flip condition is intentionally conservative:
        // attacker must clear the threshold AND have at least parity versus defender share.
        if (
            attackerEthnicShare >= WAVE_FLIP_ETHNIC_THRESHOLD &&
            attackerEthnicShare >= defenderEthnicShare
        ) {
            // Flip this settlement (write by OSID when operational map present)
            (pc as Record<string, FactionId | null>)[key] = newController;
            result.flipped.push(sid);
            result.events.push({
                turn,
                settlement_id: sid,
                from: currentController,
                to: newController,
                mechanism: 'wave_flip',
                mun_id: munId
            });
            // Clear any existing holdout state
            if (holdouts[sid]) {
                delete holdouts[sid];
            }
        } else {
            // Hostile majority: create holdout
            const hostileShare = defenderEthnicShare > 0 ? defenderEthnicShare : (1 - attackerEthnicShare);
            let resistance = Math.round(hostileShare * HOLDOUT_RESISTANCE_BASE_FACTOR);
            // Deterministic scaling: population + proximity (degree)
            const pop = scalingContext?.sidToPopulation?.get(sid) ?? data?.population ?? 0;
            const degree = scalingContext?.sidToDegree?.get(sid) ?? 0;
            const holdoutFaction = currentController ?? previousController ?? 'RBiH';
            const orgDefenseBonus = getOrgDefenseBonus(state, munId, holdoutFaction);
            resistance = Math.round(
                resistance
                * holdoutPopulationFactor(pop)
                * holdoutProximityFactor(degree)
                * (1 + orgDefenseBonus)
            );
            holdouts[sid] = {
                holdout: true,
                holdout_faction: holdoutFaction,
                occupying_faction: newController,
                holdout_resistance: resistance,
                holdout_since_turn: turn,
                isolated_turns: 0
            };
            // Keep existing control until holdout is cleared/surrenders by military action.
            result.holdouts.push(sid);
            result.events.push({
                turn,
                settlement_id: sid,
                from: currentController,
                to: currentController ?? previousController ?? 'RBiH',
                mechanism: 'holdout_created',
                mun_id: munId
            });
        }
    }

    return result;
}

// --- Cleanup phase ---

/**
 * Process holdout cleanup each turn.
 * Brigades/militia in adjacent controlled settlements can clear holdouts.
 * Isolated holdouts surrender after HOLDOUT_ISOLATION_SURRENDER_TURNS.
 */
export function processHoldoutCleanup(
    state: GameState,
    turn: number,
    edges: EdgeRecord[],
    settlements: Map<string, SettlementRecord>,
    canonicalToOperational?: CanonicalToOperationalMap
): SettlementFlipEvent[] {
    const events: SettlementFlipEvent[] = [];
    const holdouts = state.settlement_holdouts;
    if (!holdouts) return events;
    const pc = state.political_controllers;
    if (!pc) return events;

    const settlementAdj = buildSettlementAdjacency(edges);

    // Build sid → mun lookup
    const sidToMun = new Map<string, MunicipalityId>();
    for (const [sid, rec] of settlements.entries()) {
        sidToMun.set(sid, (rec.mun1990_id ?? rec.mun_code) as MunicipalityId);
    }

    // Track cleanup capacity per brigade (max 2 per brigade per turn)
    const brigadeCleanupCount = new Map<string, number>();

    // Process holdouts in deterministic order
    const holdoutSids = Object.keys(holdouts).sort(strictCompare);

    for (const sid of holdoutSids) {
        const holdout = holdouts[sid];
        if (!holdout?.holdout) continue;

        const occupyingFaction = holdout.occupying_faction ?? null;
        if (!occupyingFaction) continue;

        // Check isolation: does the holdout faction still have supply connection?
        const hasSupply = hasSupplyConnection(sid, holdout.holdout_faction, state, settlementAdj);
        if (!hasSupply) {
            holdout.isolated_turns = (holdout.isolated_turns ?? 0) + 1;
        } else {
            holdout.isolated_turns = 0;
        }

        // Auto-surrender from isolation
        if (holdout.isolated_turns >= HOLDOUT_ISOLATION_SURRENDER_TURNS) {
            delete holdouts[sid];
            events.push({
                turn,
                settlement_id: sid,
                from: holdout.holdout_faction,
                to: occupyingFaction,
                mechanism: 'holdout_surrendered',
                mun_id: sidToMun.get(sid) ?? null
            });
            (pc as Record<string, FactionId | null>)[controlKey(sid, canonicalToOperational)] = occupyingFaction;
            continue;
        }

        // Try cleanup by adjacent formations
        const neighbors = settlementAdj.get(sid);
        if (!neighbors) continue;

        // Find formations that can clear this holdout
        let cleared = false;
        const formations = state.formations ?? {};
        const formationIds = Object.keys(formations).sort(strictCompare);

        for (const fid of formationIds) {
            if (cleared) break;
            const formation = formations[fid];
            if (!formation || formation.faction !== occupyingFaction) continue;
            if (formation.status !== 'active') continue;
            const kind = formation.kind ?? 'brigade';
            if (kind !== 'brigade' && kind !== 'militia') continue;
            if ((formation.personnel ?? 0) < 100) continue;

            // Check if this brigade has capacity left
            const used = brigadeCleanupCount.get(fid) ?? 0;
            if (used >= MAX_CLEANUP_PER_BRIGADE) continue;

            // Check if this formation is in an adjacent or same municipality
            const formationMun = getFormationMunFromTags(formation.tags);
            const holdoutMun = sidToMun.get(sid);

            // Formation must be adjacent: either same mun or has HQ in an adjacent settlement
            let canReach = false;
            if (formationMun && holdoutMun && formationMun === holdoutMun) {
                canReach = true;
            } else if (formation.hq_sid) {
                canReach = neighbors.has(formation.hq_sid) || formation.hq_sid === sid;
            }
            if (!canReach && formationMun) {
                // Check if formation's mun has settlements adjacent to holdout
                for (const neighbor of neighbors) {
                    const neighborMun = sidToMun.get(neighbor);
                    if (neighborMun === formationMun && pc[controlKey(neighbor, canonicalToOperational)] === occupyingFaction) {
                        canReach = true;
                        break;
                    }
                }
            }

            if (!canReach) continue;

            // Compute cleanup strength vs resistance
            const strength = (formation.personnel ?? 1000) * ((formation.cohesion ?? 60) / 100);
            if (strength > holdout.holdout_resistance * CLEANUP_RESISTANCE_THRESHOLD / 100) {
                // Cleared!
                delete holdouts[sid];
                brigadeCleanupCount.set(fid, used + 1);
                cleared = true;
                events.push({
                    turn,
                    settlement_id: sid,
                    from: holdout.holdout_faction,
                    to: occupyingFaction,
                    mechanism: 'holdout_cleared',
                    mun_id: holdoutMun ?? null
                });
                (pc as Record<string, FactionId | null>)[controlKey(sid, canonicalToOperational)] = occupyingFaction;
            } else {
                // Reduce resistance (gradual wearing down)
                holdout.holdout_resistance = Math.max(0, holdout.holdout_resistance - Math.floor(strength / 10));
            }
        }
    }

    return events;
}

/** Extract mun ID from formation tags (e.g. 'mun:sarajevo' → 'sarajevo'). */
function getFormationMunFromTags(tags?: string[]): MunicipalityId | null {
    if (!tags) return null;
    for (const tag of tags) {
        if (tag.startsWith('mun:')) return tag.slice(4) as MunicipalityId;
    }
    return null;
}
