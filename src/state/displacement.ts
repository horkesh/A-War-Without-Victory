/**
 * Phase 21: Population displacement and recruitment integration
 *
 * Deterministic displacement system that tracks population movement
 * and permanently reduces local recruitment capacity.
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementState, FactionId, GameState, MilitiaPoolState, MunicipalityId } from './game_state.js';
import { CANONICAL_FACTIONS } from './game_state.js';

import { buildAdjacencyMapCached, type AdjacencyMap } from '../map/adjacency_map.js';
import { computeFrontEdges } from '../map/front_edges.js';
import { areRbihHrhbAllied, DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN } from '../sim/early_war/alliance_update.js';
import type { EdgeRecord } from '../map/settlements.js';
import { getReceivingCapacityFraction } from './displacement_routing_data.js';
import { DISPLACEMENT_KILLED_FRACTION, getDisplacementKillFraction, getFactionFleeAbroadFraction } from './displacement_loss_constants.js';
import { appendDisplacementEvent, UNKNOWN_CAUSER_BUCKET } from './displacement_event_log.js';
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

// Displacement routing: receiving cap from getReceivingCapacityFraction (Sarajevo lower).
// LOST_POPULATION_FRACTION (20% "lost", all booked as killed Bosniaks when no census) was
// removed 2026-11-13 (SC2): the no-census case now splits by the national 1991 sums and
// uses the same killed / fled-abroad rules as the census path.

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
    routableByFaction: Record<FactionId, number>,
    causedBy: FactionId,
    killedByFaction: Record<FactionId, number>,
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

    // SC3 (displacement attribution lane, 2026-11-13): each people's figures come from that
    // people's own computed counts, never pro rata by displaced. Per people: routed = its
    // routable count, killed = exactly the killed recorded into civilian_casualties, fled
    // abroad = the rest of its loss. So for every caller, civilian_casualties[people].killed
    // equals the killed summed into the aggregates for that people (Engine Invariants).
    // Each figure is spread across the municipality's settlements by population with floors,
    // the last settlement taking the remainder.
    const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
    const spread = (amount: number): number[] => {
        let rem = amount;
        return entries.map((e, i) => {
            const part = i < entries.length - 1 ? Math.floor((amount * e.pop) / totalPop) : rem;
            rem -= part;
            return part;
        });
    };

    for (const fid of factions) {
        const total = byFaction[fid] ?? 0;
        if (total <= 0) continue;
        const routedF = Math.max(0, Math.min(total, routableByFaction[fid] ?? 0));
        const lostF = total - routedF;
        const killedF = Math.max(0, Math.min(lostF, killedByFaction[fid] ?? 0));
        const fledF = lostF - killedF;
        const routedBy = spread(routedF);
        const killedBy = spread(killedF);
        const fledBy = spread(fledF);
        for (let i = 0; i < entries.length; i++) {
            const { osid } = entries[i];
            const routedHere = routedBy[i];
            const killedHere = killedBy[i];
            const fledHere = fledBy[i];
            if (routedHere <= 0 && killedHere <= 0 && fledHere <= 0) continue;
            const causerUnrecorded = causedBy === UNKNOWN_CAUSER_BUCKET;
            appendDisplacementEvent(state, {
                turn,
                origin_mun: munId,
                origin_osid: osid,
                dest_mun: munId,
                ethnicity: fid,
                caused_by: causerUnrecorded ? undefined : causedBy,
                displaced: routedHere,
                killed: killedHere,
                fled_abroad: fledHere,
                settled: 0,
            }, causerUnrecorded ? { causerUnrecorded: true } : undefined);
        }
    }
}

/**
 * SC2 (displacement attribution lane, 2026-11-13): national sums of
 * `data/derived/municipality_population_1991.json` over its 110 municipalities. They fall
 * about 16,940 short of the published 1991 total (4,377,033, Statistički bilten 234),
 * mostly in the Bosniak figure; the shares agree within 0.2 points. Used ONLY when a
 * municipality has no census entry (or no census is loaded), in place of the former
 * "all of it is Bosniak" default. Pinned to the file by
 * tests/state/displacement_attribution.test.ts.
 */
export const NATIONAL_POPULATION_1991_SUMS = {
    total: 4_360_093,
    bosniak: 1_886_276,
    serb: 1_366_013,
    croat: 760_847,
    other: 346_957,
} as const;

/** Reason tag on a step record whose split used the national sums (auditable fallback). */
export const CENSUS_FALLBACK_NATIONAL_REASON = 'census_fallback_national';

/**
 * Split displaced amount by source mun's 1991 ethnic share. Returns { RBiH, RS, HRHB } (other assigned to RBiH).
 * Without a census entry for the municipality, splits by the national sums and reports it.
 */
function splitDisplacedByEthnicityWithSource(
    fromMunId: MunicipalityId,
    amount: number,
    population1991ByMun: MunicipalityPopulation1991Map | undefined
): { split: { RBiH: number; RS: number; HRHB: number }; nationalFallback: boolean } {
    const entry = population1991ByMun?.[fromMunId];
    if (!entry || entry.total <= 0) {
        const n = NATIONAL_POPULATION_1991_SUMS;
        const rs = Math.floor((amount * n.serb) / n.total);
        const hrhb = Math.floor((amount * n.croat) / n.total);
        return { split: { RBiH: amount - rs - hrhb, RS: rs, HRHB: hrhb }, nationalFallback: true };
    }
    return { split: splitByCensusEntry(entry, amount), nationalFallback: false };
}

function splitDisplacedByEthnicity(
    fromMunId: MunicipalityId,
    amount: number,
    population1991ByMun: MunicipalityPopulation1991Map | undefined
): { RBiH: number; RS: number; HRHB: number } {
    return splitDisplacedByEthnicityWithSource(fromMunId, amount, population1991ByMun).split;
}

function splitByCensusEntry(
    entry: { total: number; bosniak: number; serb: number; croat: number },
    amount: number
): { RBiH: number; RS: number; HRHB: number } {
    const total = entry.total;
    const rbih = Math.floor((amount * entry.bosniak) / total);
    const rs = Math.floor((amount * entry.serb) / total);
    const hrhb = Math.floor((amount * entry.croat) / total);
    const other = amount - rbih - rs - hrhb;
    return { RBiH: rbih + other, RS: rs, HRHB: hrhb };
}

/**
 * SC1 (displacement attribution lane, 2026-11-13): the side that caused pressure-path
 * (siege, encirclement, breach) displacement is the PRESSING side, never the side
 * holding the pocket. ICTY attributes siege harm to the besieging force (Galić
 * IT-98-29-T), and the condemnation backstop in `scoring.ts` reads this as the causer.
 *
 * The HOLDER is the side controlling the municipality's settlements (most OSIDs; the
 * pool's side wins a tie it is part of), NOT the pool's side: every pool displaces the
 * whole municipality's population, so keying on the pool would rebook a pocket's people
 * to its own defender (red-team, panel round 1). A causer must be at war with the holder
 * that turn (RBiH-HRHB only after their war starts and while not allied).
 *
 * Where two sides press one pocket (East Mostar 1993-94, Maglaj 1993-94) the cause is
 * shared PRO RATA, never winner-take-all. Weights, first tier that has any:
 *   1. front edges from each enemy faction against the holder's settlements in the municipality;
 *   2. front edges from each enemy faction touching the municipality at all;
 *   3. the municipality's OSIDs held by each enemy faction (a pocket with no front data).
 * Front edges count only when their endpoints use the same ids as `munSettlementIds`
 * (OSIDs); today this path receives legacy-id edges, so tiers 1-2 match nothing and the
 * resolver degrades to tier 3 or the unknown bucket, never to the holder.
 * With none of these the causer is not guessed: the result is the UNKNOWN_CAUSER_BUCKET
 * ("Responsible side not recorded"). The holder is never returned.
 * Deterministic: CANONICAL_FACTIONS order.
 *
 * Known limits (§6 Displacement attribution record): forces that are not a faction (the
 * Abdić APZB around Bihać) count under whichever canonical side holds those settlements;
 * a pocket's own minority leaving under siege had mixed causes the model cannot separate.
 */
export function resolvePressingFactions(
    state: GameState,
    munId: MunicipalityId,
    poolFaction: FactionId,
    munSettlementIds: ReadonlySet<string>,
    frontEdges: ReadonlyArray<{ a: string; b: string; side_a: string | null; side_b: string | null }>
): { holder: FactionId; causers: Array<{ faction: FactionId; weight: number }> } {
    const weights = (counts: Map<FactionId, number>): Array<{ faction: FactionId; weight: number }> =>
        CANONICAL_FACTIONS
            .map((f) => ({ faction: f, weight: counts.get(f) ?? 0 }))
            .filter((w) => w.weight > 0);

    // Who holds the municipality: count its OSIDs by controller.
    const heldInMun = new Map<FactionId, number>();
    const pc = state.political.political_controllers ?? {};
    for (const osid of Object.keys(pc).sort(strictCompare)) {
        const side = pc[osid] ?? null;
        if (side === null || !(CANONICAL_FACTIONS as readonly string[]).includes(side)) continue;
        if (osid.startsWith('op:') && osid.split(':')[1] === munId) {
            heldInMun.set(side, (heldInMun.get(side) ?? 0) + 1);
        }
    }
    let holder: FactionId = poolFaction;
    let holderCount = heldInMun.get(poolFaction) ?? 0;
    for (const f of CANONICAL_FACTIONS) {
        const c = heldInMun.get(f) ?? 0;
        if (c > holderCount) {
            holder = f;
            holderCount = c;
        }
    }

    const turn = state.meta?.turn ?? 0;
    const rbihHrhbAtWar =
        turn >= (state.meta?.rbih_hrhb_war_earliest_turn ?? DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN) &&
        !areRbihHrhbAllied(state);
    const isOther = (side: string | null): side is FactionId => {
        if (side === null || side === holder || !(CANONICAL_FACTIONS as readonly string[]).includes(side)) return false;
        const rbihHrhbPair = (side === 'RBiH' && holder === 'HRHB') || (side === 'HRHB' && holder === 'RBiH');
        return !rbihHrhbPair || rbihHrhbAtWar;
    };

    const againstHolder = new Map<FactionId, number>();
    const touching = new Map<FactionId, number>();
    for (const edge of frontEdges) {
        const aIn = munSettlementIds.has(edge.a);
        const bIn = munSettlementIds.has(edge.b);
        if (!aIn && !bIn) continue;
        if (aIn && edge.side_a === holder && isOther(edge.side_b)) {
            againstHolder.set(edge.side_b, (againstHolder.get(edge.side_b) ?? 0) + 1);
        }
        if (bIn && edge.side_b === holder && isOther(edge.side_a)) {
            againstHolder.set(edge.side_a, (againstHolder.get(edge.side_a) ?? 0) + 1);
        }
        if (isOther(edge.side_a)) touching.set(edge.side_a, (touching.get(edge.side_a) ?? 0) + 1);
        if (isOther(edge.side_b)) touching.set(edge.side_b, (touching.get(edge.side_b) ?? 0) + 1);
    }
    const tier1 = weights(againstHolder);
    if (tier1.length > 0) return { holder, causers: tier1 };
    const tier2 = weights(touching);
    if (tier2.length > 0) return { holder, causers: tier2 };

    const inMun = new Map<FactionId, number>();
    for (const [side, count] of heldInMun) {
        if (isOther(side)) inMun.set(side, count);
    }
    const tier3 = weights(inMun);
    if (tier3.length > 0) return { holder, causers: tier3 };
    return { holder, causers: [{ faction: UNKNOWN_CAUSER_BUCKET, weight: 1 }] };
}

/**
 * Kill fraction for a people displaced by `causer` (P1a). An unrecorded causer is not a
 * faction, so it takes the plain default rather than falling into a faction-specific rate.
 */
function killFractionForCauser(displaced: FactionId, causer: FactionId): number {
    return causer === UNKNOWN_CAUSER_BUCKET ? DISPLACEMENT_KILLED_FRACTION : getDisplacementKillFraction(displaced, causer);
}

/**
 * Split `amount` across causer weights: floor shares in the given order, remainder to
 * the last causer, so the parts always sum to `amount`. Deterministic.
 */
export function splitAmountByCauser(
    amount: number,
    causers: ReadonlyArray<{ faction: FactionId; weight: number }>
): Array<{ faction: FactionId; amount: number }> {
    const total = causers.reduce((s, c) => s + c.weight, 0);
    if (causers.length === 0 || total <= 0) return [];
    let rem = amount;
    return causers.map((c, i) => {
        const part = i < causers.length - 1 ? Math.floor((amount * c.weight) / total) : rem;
        rem -= part;
        return { faction: c.faction, amount: part };
    });
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
    const adjacencyMap = buildAdjacencyMapCached(settlementEdges);
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

            // SC1: the causer is the pressing side, not the pool's (holding) side. It also keys
            // the kill fraction (P1a), whose documented meaning is "X displaced by Y".
            const munSettlementIds = new Set<string>();
            for (const [sid, rec] of settlements.entries()) {
                if ((rec.mun1990_id ?? rec.mun_code) === munId) munSettlementIds.add(sid);
            }
            const causerShares = splitAmountByCauser(
                displacementAmount,
                resolvePressingFactions(state, munId, factionId, munSettlementIds, frontEdges).causers
            );

            lostAmount = 0;
            routedAmount = 0;
            routableByFaction = { RBiH: 0, RS: 0, HRHB: 0 };
            for (const share of causerShares) {
                if (share.amount <= 0) continue;
                // P1a: the kill fraction is keyed on this share's causer. NOTE: when this path
                // is revived, this rate becomes calibration-moving (own lane + panel); it is an
                // expulsion rate, not a model of siege mortality.
                const causerFid: FactionId = share.faction;
                {
                    // SC2: without a census entry the split uses the national sums (tagged),
                    // never "all of it is Bosniak", and goes through the same killed / fled rules.
                    const { split: byFaction, nationalFallback } =
                        splitDisplacedByEthnicityWithSource(munId, share.amount, population1991ByMun);
                    if (nationalFallback && !reasons.includes(CENSUS_FALLBACK_NATIONAL_REASON)) {
                        reasons.push(CENSUS_FALLBACK_NATIONAL_REASON);
                    }
                    const rRBiH = Math.floor(
                        byFaction.RBiH * (1 - killFractionForCauser('RBiH', causerFid)) * (1 - getFactionFleeAbroadFraction('RBiH'))
                    );
                    const rRS = Math.floor(
                        byFaction.RS * (1 - killFractionForCauser('RS', causerFid)) * (1 - getFactionFleeAbroadFraction('RS'))
                    );
                    const rHRHB = Math.floor(
                        byFaction.HRHB * (1 - killFractionForCauser('HRHB', causerFid)) * (1 - getFactionFleeAbroadFraction('HRHB'))
                    );
                    routableByFaction.RBiH += rRBiH;
                    routableByFaction.RS += rRS;
                    routableByFaction.HRHB += rHRHB;
                    const shareRouted = rRBiH + rRS + rHRHB;
                    const shareLost = share.amount - shareRouted;
                    routedAmount += shareRouted;
                    lostAmount += shareLost;

                    // Compute separate killed/fled breakdowns per faction
                    const killedByFac: Record<FactionId, number> = {
                        RBiH: Math.floor(byFaction.RBiH * killFractionForCauser('RBiH', causerFid)),
                        RS: Math.floor(byFaction.RS * killFractionForCauser('RS', causerFid)),
                        HRHB: Math.floor(byFaction.HRHB * killFractionForCauser('HRHB', causerFid)),
                    };
                    const fledByFac: Record<FactionId, number> = {
                        RBiH: Math.floor(byFaction.RBiH * getFactionFleeAbroadFraction('RBiH')),
                        RS: Math.floor(byFaction.RS * getFactionFleeAbroadFraction('RS')),
                        HRHB: Math.floor(byFaction.HRHB * getFactionFleeAbroadFraction('HRHB')),
                    };

                    pushDisplacementEventLogFromMun(state, munId, settlements, byFaction, currentTurn, { RBiH: rRBiH, RS: rRS, HRHB: rHRHB }, causerFid, killedByFac);

                    // Record to civilian_casualties (was missing — only event log was written)
                    for (const fid of CANONICAL_FACTIONS) {
                        if (killedByFac[fid] > 0 || fledByFac[fid] > 0) {
                            recordCivilianDisplacementCasualties(state, fid, killedByFac[fid], fledByFac[fid]);
                        }
                    }
                }
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
