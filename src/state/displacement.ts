/**
 * Phase 21: Population displacement and recruitment integration
 *
 * Deterministic displacement system that tracks population movement
 * and permanently reduces local recruitment capacity.
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementState, FactionId, GameState, MilitiaPoolState, MunicipalityId } from './game_state.js';
import { CANONICAL_FACTIONS } from './game_state.js';

import { buildAdjacencyMap, type AdjacencyMap } from '../map/adjacency_map.js';
import { computeFrontEdges } from '../map/front_edges.js';
import type { EdgeRecord } from '../map/settlements.js';
import { getReceivingCapacityFraction } from './displacement_routing_data.js';
import { DISPLACEMENT_KILLED_FRACTION, getDisplacementKillFraction, getFactionFleeAbroadFraction } from './displacement_loss_constants.js';
import { appendDisplacementEvent } from './displacement_event_log.js';
import { recordCivilianDisplacementCasualties } from './displacement_state_utils.js';
import { computeFrontBreaches, type FrontBreach } from './front_breaches.js';
import { LARGE_URBAN_MUN_IDS } from './large_urban_mun_data.js';
import { strictCompare } from './validateGameState.js';
import {
    getFactionAlignedPopulationShare,
    type MunicipalityPopulation1991Map
} from './population_share.js';
import { computeSupplyReachability } from './supply_reachability.js';

// Displacement trigger constants
const UNSUPPLIED_PRESSURE_TURNS = 3; // N consecutive turns without supply
const UNSUPPLIED_DISPLACEMENT_FRACTION = 0.05; // 5% per turn after N turns
const ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.10; // 10% per turn when encircled
const BREACH_PERSISTENCE_TURNS = 2; // M turns of breaches
const BREACH_DISPLACEMENT_FRACTION = 0.03; // 3% per turn when breaches persist

// Displacement routing constants (receiving cap from getReceivingCapacityFraction; Sarajevo lower)
const LOST_POPULATION_FRACTION = 0.20; // 20% of displaced population becomes lost (when no 1991 census)

// Ethnicity-based loss: imported from displacement_loss_constants.ts (single source of truth)
const FLEE_ABROAD_FRACTION_RS = 0.30; // Serbs: 30% of displaced leave BiH (Serbia to flee to)
const FLEE_ABROAD_FRACTION_HRHB = 0.25; // Croats: 25% leave BiH (Croatia to flee to)
const FLEE_ABROAD_FRACTION_RBIH = 0; // Bosniaks: no external state to flee to

// Phase 22: Sustainability collapse displacement multiplier
const COLLAPSE_DISPLACEMENT_MULTIPLIER = 1.5; // 50% increase when municipality is collapsed

/**
 * Build municipality → controlling faction set from OSID-keyed political_controllers.
 * OSID format: "op:municipality:slug". Returns map of munId → Set of factions with ≥1 OSID.
 */
function buildMunControlFromOsids(state: GameState): Map<MunicipalityId, Set<FactionId>> {
    const result = new Map<MunicipalityId, Set<FactionId>>();
    const pc = state.political.political_controllers;
    if (!pc || typeof pc !== 'object') return result;
    for (const [key, value] of Object.entries(pc)) {
        if (!key.startsWith('op:') || !value) continue;
        const parts = key.split(':');
        if (parts.length < 2) continue;
        const munId = parts[1] as MunicipalityId;
        const faction: FactionId = value;
        let set = result.get(munId);
        if (!set) { set = new Set(); result.set(munId, set); }
        set.add(faction);
    }
    return result;
}

/**
 * Check if a municipality has any OSIDs controlled by the given faction.
 */
function isMunControlledByFaction(
    munId: MunicipalityId,
    factionId: FactionId,
    munControl: Map<MunicipalityId, Set<FactionId>>
): boolean {
    return munControl.get(munId)?.has(factionId) ?? false;
}

/**
 * Check if a municipality has a path to another friendly municipality via OSID adjacency.
 * Uses OSID-keyed political_controllers for control checks.
 */
function isMunicipalityEncircledOsid(
    munId: MunicipalityId,
    factionId: FactionId,
    munControl: Map<MunicipalityId, Set<FactionId>>
): boolean {
    // If faction doesn't control any OSID in this municipality, it's not "their" municipality to be encircled
    if (!isMunControlledByFaction(munId, factionId, munControl)) return false;
    // Check if any adjacent municipality is also controlled by this faction
    for (const [otherMun, factions] of munControl) {
        if (otherMun !== munId && factions.has(factionId)) return false;
    }
    // No other municipality controlled by this faction — truly isolated
    return true;
}

/**
 * Displacement update record per municipality.
 */
export interface DisplacementRecord {
    mun_id: MunicipalityId;
    faction_id: FactionId | null;
    original_population: number;
    displaced_out_before: number;
    displaced_out_after: number;
    displaced_in_before: number;
    displaced_in_after: number;
    lost_population_before: number;
    lost_population_after: number;
    displacement_this_turn: number;
    reason: string[];
}

/**
 * Displacement routing record.
 */
export interface DisplacementRoutingRecord {
    from_mun: MunicipalityId;
    to_mun: MunicipalityId;
    amount: number;
    reason: string;
}

/**
 * Displacement step report.
 */
export interface DisplacementStepReport {
    by_municipality: DisplacementRecord[];
    routing: DisplacementRoutingRecord[];
}

/**
 * Track unsupplied pressure state per municipality.
 * This is a transient state that tracks consecutive unsupplied turns.
 */
interface MunicipalityPressureState {
    mun_id: MunicipalityId;
    faction_id: FactionId;
    unsupplied_consecutive_turns: number;
    last_checked_turn: number;
}

/**
 * Module-level cache for tracking pressure state across turns.
 *
 * DETERMINISM NOTE: This cache persists across function calls within a single
 * process. For deterministic simulation, call resetDisplacementPressureCache()
 * at simulation start to ensure clean state.
 *
 * The cache tracks consecutive unsupplied turns per municipality per faction.
 * It is automatically updated during displacement computation and does not
 * need to be serialized - it reconstructs from turn-by-turn execution.
 */
const pressureStateCache = new Map<string, MunicipalityPressureState>();

/**
 * Reset the displacement pressure state cache.
 * Call this at simulation initialization to ensure deterministic behavior
 * across multiple simulation runs within the same process.
 */
export function resetDisplacementPressureCache(): void {
    pressureStateCache.clear();
}

/**
 * Get or initialize displacement state for a municipality.
 */
function getOrInitDisplacementState(
    state: GameState,
    munId: MunicipalityId,
    originalPopulation: number
): DisplacementState {
    if (!state.displacement.displacement_state) {
        state.displacement.displacement_state = {};
    }

    const existing = state.displacement.displacement_state[munId];
    if (existing) {
        return existing;
    }

    const newState: DisplacementState = {
        mun_id: munId,
        original_population: originalPopulation,
        displaced_out: 0,
        displaced_in: 0,
        lost_population: 0,
        last_updated_turn: state.meta.turn
    };

    state.displacement.displacement_state[munId] = newState;
    return newState;
}

/**
 * Check if a municipality is under pressure (has active front segments).
 */
function isMunicipalityUnderPressure(
    munId: MunicipalityId,
    settlements: Map<string, SettlementRecord>,
    state: GameState,
    frontEdges: ReturnType<typeof computeFrontEdges>
): boolean {
    // Find all settlements in this municipality
    const munSettlements: string[] = [];
    for (const [sid, settlement] of settlements.entries()) {
        if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
            munSettlements.push(sid);
        }
    }

    if (munSettlements.length === 0) return false;

    // Check if any settlement in the municipality is part of an active front edge
    const munSettlementSet = new Set(munSettlements);
    for (const edge of frontEdges) {
        const seg = state.military.front_segments[edge.edge_id];
        const isActive = seg && typeof seg === 'object' && seg.active === true;
        if (!isActive) continue;

        if (munSettlementSet.has(edge.a) || munSettlementSet.has(edge.b)) {
            return true;
        }
    }

    return false;
}

/**
 * Check if a municipality is supplied for a faction.
 */
function isMunicipalitySupplied(
    factionId: FactionId,
    munId: MunicipalityId,
    settlements: Map<string, SettlementRecord>,
    reachableSettlements: Set<string>
): boolean {
    // Find all settlements in this municipality
    const munSettlements: string[] = [];
    for (const [sid, settlement] of settlements.entries()) {
        if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
            munSettlements.push(sid);
        }
    }

    // Sort deterministically
    munSettlements.sort();

    // Check if at least one settlement in the municipality is reachable
    for (const sid of munSettlements) {
        if (reachableSettlements.has(sid)) {
            return true;
        }
    }

    return false;
}


/**
 * Count breaches affecting a municipality.
 */
function countBreachesAffectingMunicipality(
    munId: MunicipalityId,
    settlements: Map<string, SettlementRecord>,
    breaches: FrontBreach[],
    frontEdges: ReturnType<typeof computeFrontEdges>
): number {
    // Find all settlements in this municipality
    const munSettlements: string[] = [];
    for (const [sid, settlement] of settlements.entries()) {
        if ((settlement.mun1990_id ?? settlement.mun_code) === munId) {
            munSettlements.push(sid);
        }
    }

    if (munSettlements.length === 0) return 0;

    const munSettlementSet = new Set(munSettlements);

    // Build edge_id to front edge map
    const edgeMap = new Map<string, typeof frontEdges[0]>();
    for (const edge of frontEdges) {
        edgeMap.set(edge.edge_id, edge);
    }

    // Count breaches where the edge involves a settlement in this municipality
    let count = 0;
    for (const breach of breaches) {
        const edge = edgeMap.get(breach.edge_id);
        if (!edge) continue;

        if (munSettlementSet.has(edge.a) || munSettlementSet.has(edge.b)) {
            count += 1;
        }
    }

    return count;
}


/**
 * Route displaced population to friendly municipalities.
 */
function routeDisplacedPopulation(
    fromMunId: MunicipalityId,
    factionId: FactionId,
    amount: number,
    displacementState: Record<MunicipalityId, DisplacementState>,
    munControl: Map<MunicipalityId, Set<FactionId>>
): DisplacementRoutingRecord[] {
    const routing: DisplacementRoutingRecord[] = [];
    let remaining = amount;

    // Find all friendly municipalities (controlled by this faction), sorted alphabetically for determinism
    const candidateMuns: MunicipalityId[] = [];

    for (const [targetMunId, factions] of munControl) {
        if (targetMunId === fromMunId) continue;
        if (!factions.has(factionId)) continue;
        candidateMuns.push(targetMunId);
    }

    const urbanMunSet = new Set<MunicipalityId>(LARGE_URBAN_MUN_IDS as readonly MunicipalityId[]);

    candidateMuns.sort(strictCompare);

    const virtualDisplacedIn: Partial<Record<MunicipalityId, number>> = {};

    function availableAt(targetMunId: MunicipalityId): number {
        const targetState = displacementState[targetMunId];
        const targetOriginal = targetState?.original_population ?? 10000;
        const current =
            targetOriginal +
            (targetState?.displaced_in ?? 0) +
            (virtualDisplacedIn[targetMunId] ?? 0) -
            (targetState?.displaced_out ?? 0) -
            (targetState?.lost_population ?? 0);
        const capacity = Math.floor(targetOriginal * getReceivingCapacityFraction(targetMunId));
        return Math.max(0, capacity - current);
    }

    function fillFromCandidates(candidates: MunicipalityId[]): void {
        for (const munId of candidates) {
            if (remaining <= 0) break;
            const targetAvailable = availableAt(munId);
            if (targetAvailable <= 0) continue;
            const routed = Math.min(remaining, targetAvailable);
            if (routed <= 0) continue;
            virtualDisplacedIn[munId] = (virtualDisplacedIn[munId] ?? 0) + routed;
            routing.push({
                from_mun: fromMunId,
                to_mun: munId,
                amount: routed,
                reason: 'friendly_supplied'
            });
            remaining -= routed;
        }
    }

    fillFromCandidates(candidateMuns);
    if (remaining > 0) {
        fillFromCandidates(candidateMuns.filter((m) => urbanMunSet.has(m)));
    }

    return routing;
}

/** One-time displacement fraction for control flip when no 1991 census. */
export const EARLY_WAR_DISPLACEMENT_FRACTION_NO_CENSUS = 0.15;

/**
 * Push municipal displacement to displacement_event_log so UI can show exact per-OSID out/lost/in.
 * Distributes by population share (from settlement properties). byFaction = total displaced per faction; lostAmount = total lost (killed+fled); routed = total - lost.
 */
function pushDisplacementEventLogFromMun(
    state: GameState,
    munId: MunicipalityId,
    settlements: Map<string, SettlementRecord>,
    byFaction: Record<FactionId, number>,
    turn: number,
    lostAmount: number = 0,
    causedBy?: FactionId,
    killedByFaction?: Record<FactionId, number>,
    fledByFaction?: Record<FactionId, number>,
): void {
    const entries = Array.from(settlements.entries())
        .filter(([, rec]) => (rec.mun1990_id ?? rec.mun_code) === munId)
        .map(([sid, rec]) => {
            const pop = typeof (rec.properties as { population_total?: number } | undefined)?.population_total === 'number'
                ? Math.max(0, (rec.properties as { population_total: number }).population_total)
                : 1;
            return { osid: sid, pop };
        })
        .sort((a, b) => strictCompare(a.osid, b.osid));
    if (entries.length === 0) return;

    const totalPop = entries.reduce((s, e) => s + e.pop, 0) || 1;
    const totalDisplaced = (byFaction.RBiH ?? 0) + (byFaction.RS ?? 0) + (byFaction.HRHB ?? 0);
    if (!state.displacement.displacement_event_log) state.displacement.displacement_event_log = [];
    if (totalDisplaced <= 0) return;

    const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
    const lostByFaction: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
    let lostRem = lostAmount;
    for (let i = 0; i < factions.length; i++) {
        const f = factions[i];
        const total = byFaction[f] ?? 0;
        lostByFaction[f] = i < factions.length - 1
            ? Math.floor((lostAmount * total) / totalDisplaced)
            : Math.max(0, lostRem);
        lostRem -= lostByFaction[f];
    }

    for (const fid of factions) {
        const total = byFaction[fid] ?? 0;
        const lostF = lostByFaction[fid] ?? 0;
        const routedF = Math.max(0, total - lostF);
        if (total <= 0 && lostF <= 0) continue;
        let routedRem = routedF;
        let lostRemF = lostF;
        for (let i = 0; i < entries.length; i++) {
            const { osid, pop } = entries[i];
            const share = pop / totalPop;
            const routedHere = i < entries.length - 1 ? Math.floor(routedF * share) : routedRem;
            const lostHere = i < entries.length - 1 ? Math.floor(lostF * share) : lostRemF;
            routedRem -= routedHere;
            lostRemF -= lostHere;
            if (routedHere <= 0 && lostHere <= 0) continue;
            // When separate killed/fled breakdowns are provided, use them.
            // Otherwise fall back to legacy behavior (all lost → killed).
            const factionKilled = killedByFaction?.[fid] ?? 0;
            const factionFled = fledByFaction?.[fid] ?? 0;
            const factionLostTotal = factionKilled + factionFled;
            let killedHere: number;
            let fledHere: number;
            if (factionLostTotal > 0) {
                killedHere = lostHere > 0 ? Math.round(lostHere * factionKilled / factionLostTotal) : 0;
                fledHere = lostHere - killedHere;
            } else {
                killedHere = lostHere;
                fledHere = 0;
            }
            appendDisplacementEvent(state, {
                turn,
                origin_mun: munId,
                origin_osid: osid,
                dest_mun: munId,
                ethnicity: fid,
                caused_by: causedBy,
                displaced: routedHere,
                killed: killedHere,
                fled_abroad: fledHere,
                settled: 0,
            });
        }
    }
}

/** Minimal shape for control-flip displacement apply. */
export interface EarlyWarDisplacementFlipInfo {
    mun_id: MunicipalityId;
    from_faction: FactionId | null;
    to_faction: FactionId;
}

export interface PhaseIDisplacementHooksInfo {
    by_mun: Array<{ mun_id: MunicipalityId; initiated_turn: number }>;
}

/**
 * Apply one-time displacement for muns that flipped and had displacement initiated this turn.
 * Mutates state.displacement.displacement_state; uses same routing and killed/fled-abroad rules when census provided.
 */
export function applyDisplacementFromFlips(
    state: GameState,
    turn: number,
    flips: EarlyWarDisplacementFlipInfo[],
    hooksByMun: PhaseIDisplacementHooksInfo['by_mun'],
    _settlements: Map<string, SettlementRecord>,
    _adjacencyMap: AdjacencyMap,
    population1991ByMun?: MunicipalityPopulation1991Map
): DisplacementStepReport {
    const defaultOriginalPopulation = 10000;
    const records: DisplacementRecord[] = [];
    const routingRecords: DisplacementRoutingRecord[] = [];
    const flipByMun = new Map<MunicipalityId, EarlyWarDisplacementFlipInfo>();
    for (const f of flips) {
        flipByMun.set(f.mun_id, f);
    }
    const munsInitiatedThisTurn = hooksByMun.filter((m) => m.initiated_turn === turn).map((m) => m.mun_id);
    munsInitiatedThisTurn.sort(strictCompare);
    const mc = buildMunControlFromOsids(state);

    for (const munId of munsInitiatedThisTurn) {
        const flip = flipByMun.get(munId);
        if (!flip || flip.from_faction === null) continue;

        const fromFaction = flip.from_faction;
        const dispState = getOrInitDisplacementState(
            state,
            munId,
            state.displacement.displacement_state?.[munId]?.original_population ?? defaultOriginalPopulation
        );
        const remainingPopulation =
            dispState.original_population - dispState.displaced_out - dispState.lost_population;
        if (remainingPopulation <= 0) continue;

        const share = getFactionAlignedPopulationShare(
            munId,
            fromFaction,
            population1991ByMun,
            EARLY_WAR_DISPLACEMENT_FRACTION_NO_CENSUS
        );
        const displacementAmount = Math.min(
            Math.floor(dispState.original_population * share),
            remainingPopulation
        );
        if (displacementAmount <= 0) continue;

        const byFactionForLog = population1991ByMun
            ? splitDisplacedByEthnicity(munId, displacementAmount, population1991ByMun)
            : { RBiH: displacementAmount, RS: 0, HRHB: 0 };
        let lostAmount: number;
        let routedAmount: number;
        let routableByFaction: { RBiH: number; RS: number; HRHB: number } | undefined;

        if (population1991ByMun) {
            const byFaction = splitDisplacedByEthnicity(munId, displacementAmount, population1991ByMun);
            const toFaction = flip.to_faction;
            const rRBiH = Math.floor(
                byFaction.RBiH * (1 - getDisplacementKillFraction('RBiH', toFaction)) * (1 - getFactionFleeAbroadFraction('RBiH'))
            );
            const rRS = Math.floor(
                byFaction.RS * (1 - getDisplacementKillFraction('RS', toFaction)) * (1 - getFactionFleeAbroadFraction('RS'))
            );
            const rHRHB = Math.floor(
                byFaction.HRHB * (1 - getDisplacementKillFraction('HRHB', toFaction)) * (1 - getFactionFleeAbroadFraction('HRHB'))
            );
            routableByFaction = { RBiH: rRBiH, RS: rRS, HRHB: rHRHB };
            routedAmount = rRBiH + rRS + rHRHB;
            lostAmount = displacementAmount - routedAmount;

            const killedByFac: Record<FactionId, number> = {
                RBiH: Math.floor(byFaction.RBiH * getDisplacementKillFraction('RBiH', toFaction)),
                RS: Math.floor(byFaction.RS * getDisplacementKillFraction('RS', toFaction)),
                HRHB: Math.floor(byFaction.HRHB * getDisplacementKillFraction('HRHB', toFaction)),
            };
            const fledByFac: Record<FactionId, number> = {
                RBiH: Math.floor(byFaction.RBiH * getFactionFleeAbroadFraction('RBiH')),
                RS: Math.floor(byFaction.RS * getFactionFleeAbroadFraction('RS')),
                HRHB: Math.floor(byFaction.HRHB * getFactionFleeAbroadFraction('HRHB')),
            };

            pushDisplacementEventLogFromMun(state, munId, _settlements, byFactionForLog, turn, lostAmount, toFaction, killedByFac, fledByFac);
            for (const fid of CANONICAL_FACTIONS) {
                if (killedByFac[fid] > 0 || fledByFac[fid] > 0) {
                    recordCivilianDisplacementCasualties(state, fid, killedByFac[fid], fledByFac[fid]);
                }
            }
        } else {
            lostAmount = Math.floor(displacementAmount * LOST_POPULATION_FRACTION);
            routedAmount = displacementAmount - lostAmount;
            pushDisplacementEventLogFromMun(state, munId, _settlements, byFactionForLog, turn, lostAmount, flip.to_faction);
            recordCivilianDisplacementCasualties(state, 'RBiH', lostAmount, 0);
        }

        const beforeOut = dispState.displaced_out;
        const beforeIn = dispState.displaced_in;
        const beforeLost = dispState.lost_population;
        // displaced_out = only actually-routed; lost_population = killed + fled + unrouted
        dispState.lost_population += lostAmount;
        dispState.last_updated_turn = turn;

        if (routedAmount > 0) {
            const displacementState = state.displacement.displacement_state;
            if (!displacementState) {
                throw new Error('Displacement state failed to initialize before routing');
            }
            const routing = routeDisplacedPopulation(
                munId,
                fromFaction,
                routedAmount,
                displacementState,
                mc
            );
            const totalRoutable = routableByFaction
                ? routableByFaction.RBiH + routableByFaction.RS + routableByFaction.HRHB
                : routedAmount;
            for (const route of routing) {
                const destState = getOrInitDisplacementState(
                    state,
                    route.to_mun,
                    displacementState[route.to_mun]?.original_population ?? defaultOriginalPopulation
                );
                destState.displaced_in += route.amount;
                destState.last_updated_turn = turn;
                if (population1991ByMun && routableByFaction && totalRoutable > 0) {
                    if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                    const df = destState.displaced_in_by_faction;
                    const rRBiH = Math.floor((route.amount * routableByFaction.RBiH) / totalRoutable);
                    const rRS = Math.floor((route.amount * routableByFaction.RS) / totalRoutable);
                    const rHRHB = route.amount - rRBiH - rRS;
                    if (rRBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + rRBiH;
                    if (rRS > 0) df['RS'] = (df['RS'] ?? 0) + rRS;
                    if (rHRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + rHRHB;
                } else if (population1991ByMun) {
                    const byFaction = splitDisplacedByEthnicity(route.from_mun, route.amount, population1991ByMun);
                    if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                    const df = destState.displaced_in_by_faction;
                    if (byFaction.RBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + byFaction.RBiH;
                    if (byFaction.RS > 0) df['RS'] = (df['RS'] ?? 0) + byFaction.RS;
                    if (byFaction.HRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + byFaction.HRHB;
                }
                routingRecords.push(route);
            }
            const totalRouted = routing.reduce((sum, r) => sum + r.amount, 0);
            dispState.displaced_out += totalRouted;
            const unRouted = routedAmount - totalRouted;
            if (unRouted > 0) {
                dispState.lost_population += unRouted;
            }
        }

        const militiaPools = state.military.militia_pools as Record<string, MilitiaPoolState> | undefined;
        if (militiaPools && remainingPopulation > 0) {
            const poolKey = `${munId}:${fromFaction}`;
            const pool = militiaPools[poolKey];
            if (pool && typeof pool === 'object') {
                const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
                const poolReduction = Math.floor(pool.available * reductionRatio);
                if (poolReduction > 0) {
                    pool.available = Math.max(0, pool.available - poolReduction);
                    pool.updated_turn = turn;
                }
            }
        }

        records.push({
            mun_id: munId,
            faction_id: fromFaction,
            original_population: dispState.original_population,
            displaced_out_before: beforeOut,
            displaced_out_after: dispState.displaced_out,
            displaced_in_before: beforeIn,
            displaced_in_after: dispState.displaced_in,
            lost_population_before: beforeLost,
            lost_population_after: dispState.lost_population,
            displacement_this_turn: displacementAmount,
            reason: ['phase_i_flip']
        });
    }

    records.sort((a, b) => strictCompare(a.mun_id, b.mun_id));
    routingRecords.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        return strictCompare(a.to_mun, b.to_mun);
    });
    return { by_municipality: records, routing: routingRecords };
}

/**
 * Split displaced amount by source mun's 1991 ethnic share. Returns { RBiH, RS, HRHB } (other assigned to RBiH).
 */
function splitDisplacedByEthnicity(
    fromMunId: MunicipalityId,
    amount: number,
    population1991ByMun: MunicipalityPopulation1991Map
): { RBiH: number; RS: number; HRHB: number } {
    const entry = population1991ByMun[fromMunId];
    if (!entry || entry.total <= 0)
        return { RBiH: amount, RS: 0, HRHB: 0 };
    const total = entry.total;
    const rbih = Math.floor((amount * entry.bosniak) / total);
    const rs = Math.floor((amount * entry.serb) / total);
    const hrhb = Math.floor((amount * entry.croat) / total);
    const other = amount - rbih - rs - hrhb;
    return { RBiH: rbih + other, RS: rs, HRHB: hrhb };
}

/**
 * Update population displacement for all municipalities.
 * When population1991ByMun is provided, displaced_in at each destination is split by source mun's 1991 ethnicity (displaced_in_by_faction) so pool population can add to the correct faction's pool.
 */
export function updateDisplacement(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    settlementEdges: EdgeRecord[],
    population1991ByMun?: MunicipalityPopulation1991Map
): DisplacementStepReport {
    const currentTurn = state.meta.turn;
    const militiaPools = state.military.militia_pools as Record<MunicipalityId, MilitiaPoolState> | undefined;

    if (!militiaPools || typeof militiaPools !== 'object') {
        return { by_municipality: [], routing: [] };
    }

    // Compute derived state
    const adjacencyMap = buildAdjacencyMap(settlementEdges);
    const supplyReport = computeSupplyReachability(state, adjacencyMap);
    const frontEdges = computeFrontEdges(state, settlementEdges);
    const breaches = computeFrontBreaches(state, frontEdges);
    const munControl = buildMunControlFromOsids(state);

    // Build reachable sets by faction
    const reachableByFaction = new Map<FactionId, Set<string>>();
    for (const f of supplyReport.factions) {
        reachableByFaction.set(f.faction_id, new Set(f.reachable_controlled));
    }

    // Track breach persistence (simplified: count breaches this turn)
    const breachCountByMun = new Map<MunicipalityId, number>();
    const poolKeysSorted = Object.keys(militiaPools).sort();
    for (const key of poolKeysSorted) {
        const pool = militiaPools[key];
        if (!pool || typeof pool !== 'object') continue;
        const factionId = pool.faction;
        if (!factionId || typeof factionId !== 'string') continue;
        const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;

        const count = countBreachesAffectingMunicipality(munId, settlements, breaches, frontEdges);
        breachCountByMun.set(munId, count);
    }

    const records: DisplacementRecord[] = [];
    const routingRecords: DisplacementRoutingRecord[] = [];

    // Process each militia pool (key may be mun_id or "mun_id:faction")
    for (const key of poolKeysSorted) {
        const pool = militiaPools[key];
        if (!pool || typeof pool !== 'object') continue;

        const factionId = pool.faction;
        if (factionId === null || factionId === undefined) continue; // only process pools with faction
        if (typeof factionId !== 'string') continue;

        const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;

        // Get or initialize displacement state
        // Use a default original population if not set (can be initialized from census data later)
        const defaultOriginalPopulation = 10000;
        const dispState = getOrInitDisplacementState(state, munId, defaultOriginalPopulation);

        // Check conditions
        const underPressure = isMunicipalityUnderPressure(munId, settlements, state, frontEdges);
        const reachableSettlements = reachableByFaction.get(factionId) ?? new Set<string>();
        const supplied = isMunicipalitySupplied(factionId, munId, settlements, reachableSettlements);
        const encircled = isMunicipalityEncircledOsid(munId, factionId, munControl);
        const breachCount = breachCountByMun.get(munId) ?? 0;

        // Phase 22: Check if municipality is collapsed (sustainability collapse)
        const sustState = state.displacement.sustainability_state?.[munId];
        const isCollapsed = sustState?.collapsed ?? false;

        // Calculate displacement amount
        const remainingPopulation =
            dispState.original_population - dispState.displaced_out - dispState.lost_population;
        let displacementAmount = 0;
        const reasons: string[] = [];

        // Trigger 1: Sustained pressure without supply
        if (underPressure && !supplied) {
            // Track consecutive unsupplied turns
            const cacheKey = `${munId}:${factionId}`;
            const cached = pressureStateCache.get(cacheKey);
            const consecutiveTurns =
                cached && cached.last_checked_turn === currentTurn - 1
                    ? cached.unsupplied_consecutive_turns + 1
                    : 1;

            pressureStateCache.set(cacheKey, {
                mun_id: munId,
                faction_id: factionId,
                unsupplied_consecutive_turns: consecutiveTurns,
                last_checked_turn: currentTurn
            });

            if (consecutiveTurns >= UNSUPPLIED_PRESSURE_TURNS) {
                const fraction = UNSUPPLIED_DISPLACEMENT_FRACTION;
                const amount = Math.floor(remainingPopulation * fraction);
                displacementAmount += amount;
                reasons.push(`unsupplied_pressure_${consecutiveTurns}_turns`);
            }
        } else {
            // Reset cache if supplied or not under pressure
            const cacheKey = `${munId}:${factionId}`;
            pressureStateCache.delete(cacheKey);
        }

        // Trigger 2: Encirclement
        if (encircled) {
            const fraction = ENCIRCLEMENT_DISPLACEMENT_FRACTION;
            const amount = Math.floor(remainingPopulation * fraction);
            displacementAmount += amount;
            reasons.push('encircled');
        }

        // Trigger 3: Breach persistence
        if (breachCount >= BREACH_PERSISTENCE_TURNS) {
            const fraction = BREACH_DISPLACEMENT_FRACTION;
            const amount = Math.floor(remainingPopulation * fraction);
            displacementAmount += amount;
            reasons.push(`breaches_${breachCount}`);
        }

        // Phase 22: Sustainability collapse amplifies displacement
        if (isCollapsed) {
            displacementAmount = Math.floor(displacementAmount * COLLAPSE_DISPLACEMENT_MULTIPLIER);
            reasons.push('sustainability_collapsed');
        }

        // Cap displacement to remaining population
        displacementAmount = Math.min(displacementAmount, remainingPopulation);

        if (displacementAmount > 0) {
            let lostAmount: number;
            let routedAmount: number;
            let routableByFaction: { RBiH: number; RS: number; HRHB: number } | undefined;

            if (population1991ByMun) {
                const byFaction = splitDisplacedByEthnicity(munId, displacementAmount, population1991ByMun);
                const controllerFid: FactionId = factionId;
                const rRBiH = Math.floor(
                    byFaction.RBiH * (1 - getDisplacementKillFraction('RBiH', controllerFid)) * (1 - getFactionFleeAbroadFraction('RBiH'))
                );
                const rRS = Math.floor(
                    byFaction.RS * (1 - getDisplacementKillFraction('RS', controllerFid)) * (1 - getFactionFleeAbroadFraction('RS'))
                );
                const rHRHB = Math.floor(
                    byFaction.HRHB * (1 - getDisplacementKillFraction('HRHB', controllerFid)) * (1 - getFactionFleeAbroadFraction('HRHB'))
                );
                routableByFaction = { RBiH: rRBiH, RS: rRS, HRHB: rHRHB };
                routedAmount = rRBiH + rRS + rHRHB;
                lostAmount = displacementAmount - routedAmount;

                // Compute separate killed/fled breakdowns per faction
                const killedByFac: Record<FactionId, number> = {
                    RBiH: Math.floor(byFaction.RBiH * getDisplacementKillFraction('RBiH', controllerFid)),
                    RS: Math.floor(byFaction.RS * getDisplacementKillFraction('RS', controllerFid)),
                    HRHB: Math.floor(byFaction.HRHB * getDisplacementKillFraction('HRHB', controllerFid)),
                };
                const fledByFac: Record<FactionId, number> = {
                    RBiH: Math.floor(byFaction.RBiH * getFactionFleeAbroadFraction('RBiH')),
                    RS: Math.floor(byFaction.RS * getFactionFleeAbroadFraction('RS')),
                    HRHB: Math.floor(byFaction.HRHB * getFactionFleeAbroadFraction('HRHB')),
                };

                pushDisplacementEventLogFromMun(state, munId, settlements, byFaction, currentTurn, lostAmount, controllerFid, killedByFac, fledByFac);

                // Record to civilian_casualties (was missing — only event log was written)
                for (const fid of CANONICAL_FACTIONS) {
                    if (killedByFac[fid] > 0 || fledByFac[fid] > 0) {
                        recordCivilianDisplacementCasualties(state, fid, killedByFac[fid], fledByFac[fid]);
                    }
                }
            } else {
                lostAmount = Math.floor(displacementAmount * LOST_POPULATION_FRACTION);
                routedAmount = displacementAmount - lostAmount;
                pushDisplacementEventLogFromMun(state, munId, settlements, { RBiH: displacementAmount, RS: 0, HRHB: 0 }, currentTurn, lostAmount, factionId);
                // Record to civilian_casualties for non-ethnic-split path
                recordCivilianDisplacementCasualties(state, 'RBiH', lostAmount, 0);
            }

            // Update displacement state
            const beforeOut = dispState.displaced_out;
            const beforeIn = dispState.displaced_in;
            const beforeLost = dispState.lost_population;

            // displaced_out = only actually-routed amount; lost_population = killed + fled + unrouted
            dispState.lost_population += lostAmount;
            dispState.last_updated_turn = currentTurn;

            // Reduce militia pool available proportionally (but not committed)
            const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
            const poolReduction = Math.floor(pool.available * reductionRatio);
            if (poolReduction > 0) {
                pool.available = Math.max(0, pool.available - poolReduction);
                pool.updated_turn = currentTurn;
            }

            // Route displaced population
            if (routedAmount > 0) {
                const displacementState = state.displacement.displacement_state;
                if (!displacementState) {
                    throw new Error('Displacement state failed to initialize before routing');
                }
                const routing = routeDisplacedPopulation(
                    munId,
                    factionId,
                    routedAmount,
                    displacementState,
                    munControl
                );

                const totalRoutable = routableByFaction
                    ? routableByFaction.RBiH + routableByFaction.RS + routableByFaction.HRHB
                    : routedAmount;

                for (const route of routing) {
                    const destState = getOrInitDisplacementState(
                        state,
                        route.to_mun,
                        displacementState[route.to_mun]?.original_population ?? defaultOriginalPopulation
                    );
                    destState.displaced_in += route.amount;
                    destState.last_updated_turn = currentTurn;

                    if (population1991ByMun && routableByFaction && totalRoutable > 0) {
                        if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                        const df = destState.displaced_in_by_faction;
                        const rRBiH = Math.floor((route.amount * routableByFaction.RBiH) / totalRoutable);
                        const rRS = Math.floor((route.amount * routableByFaction.RS) / totalRoutable);
                        const rHRHB = route.amount - rRBiH - rRS;
                        if (rRBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + rRBiH;
                        if (rRS > 0) df['RS'] = (df['RS'] ?? 0) + rRS;
                        if (rHRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + rHRHB;
                    } else if (population1991ByMun) {
                        const byFaction = splitDisplacedByEthnicity(route.from_mun, route.amount, population1991ByMun);
                        if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                        const df = destState.displaced_in_by_faction;
                        if (byFaction.RBiH > 0) df['RBiH'] = (df['RBiH'] ?? 0) + byFaction.RBiH;
                        if (byFaction.RS > 0) df['RS'] = (df['RS'] ?? 0) + byFaction.RS;
                        if (byFaction.HRHB > 0) df['HRHB'] = (df['HRHB'] ?? 0) + byFaction.HRHB;
                    }

                    routingRecords.push(route);
                }

                const totalRouted = routing.reduce((sum, r) => sum + r.amount, 0);
                dispState.displaced_out += totalRouted;
                const unRouted = routedAmount - totalRouted;
                if (unRouted > 0) {
                    dispState.lost_population += unRouted;
                }
            }

            records.push({
                mun_id: munId,
                faction_id: factionId,
                original_population: dispState.original_population,
                displaced_out_before: beforeOut,
                displaced_out_after: dispState.displaced_out,
                displaced_in_before: beforeIn,
                displaced_in_after: dispState.displaced_in,
                lost_population_before: beforeLost,
                lost_population_after: dispState.lost_population,
                displacement_this_turn: displacementAmount,
                reason: reasons
            });
        }
    }

    // Sort records deterministically
    records.sort((a, b) => strictCompare(a.mun_id, b.mun_id));
    routingRecords.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        return strictCompare(a.to_mun, b.to_mun);
    });

    // Enforce recruitment ceilings after all displacement updates
    enforceRecruitmentCeilings(state);

    return { by_municipality: records, routing: routingRecords };
}

/**
 * Enforce recruitment ceiling based on displacement.
 * After displacement, the effective recruitment capacity is:
 * original_population - displaced_out - lost_population
 * where displaced_out = actually routed to other muns, lost_population = killed + fled_abroad + unrouted.
 * This reduces militia pool available if it exceeds the ceiling.
 */
export function enforceRecruitmentCeilings(state: GameState): void {
    const militiaPools = state.military.militia_pools as Record<MunicipalityId, MilitiaPoolState> | undefined;
    if (!militiaPools || typeof militiaPools !== 'object') return;
    if (!state.displacement.displacement_state || typeof state.displacement.displacement_state !== 'object') return;

    const currentTurn = state.meta.turn;

    for (const [key, pool] of Object.entries(militiaPools)) {
        if (!pool || typeof pool !== 'object') continue;

        const munId = typeof pool.mun_id === 'string' ? pool.mun_id : key;
        const dispState = state.displacement.displacement_state[munId];
        if (!dispState) continue; // No displacement state means no ceiling enforcement needed

        // Calculate effective recruitment ceiling
        const effectiveCeiling =
            dispState.original_population - dispState.displaced_out - dispState.lost_population;

        // Current total pool size
        const currentTotal = pool.available + pool.committed;

        // If total exceeds ceiling, reduce available (but not committed)
        if (currentTotal > effectiveCeiling) {
            const excess = currentTotal - effectiveCeiling;
            pool.available = Math.max(0, pool.available - excess);
            pool.updated_turn = currentTurn;
        }
    }
}
