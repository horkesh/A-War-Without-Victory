/**
 * Phase 21: Population displacement and recruitment integration
 *
 * Deterministic displacement system that tracks population movement
 * and permanently reduces local recruitment capacity.
 */

import type { SettlementRecord } from '../map/settlements.js';
import type { DisplacementState, FactionId, GameState, MilitiaPoolState, MunicipalityId } from './game_state.js';
import { CANONICAL_FACTIONS } from './game_state.js';

import { buildAdjacencyMapCached } from '../map/adjacency_map.js';
import { computeFrontEdges, type FrontEdge } from '../map/front_edges.js';
import { areRbihHrhbAllied, DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN } from '../sim/early_war/alliance_update.js';
import type { EdgeRecord } from '../map/settlements.js';
import { getReceivingCapacityFraction } from './displacement_routing_data.js';
import { appendDisplacementEvent, UNKNOWN_CAUSER_BUCKET } from './displacement_event_log.js';
import { getBilateralRoutingOrder } from './displacement_takeover.js';
import { recordCivilianDisplacementCasualties } from './displacement_state_utils.js';
import { strictCompare } from './validateGameState.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { computeSupplyReachability } from './supply_reachability.js';

// Pressure-path triggers (siege and encirclement). Dormant until the siege displacement
// lane (DA1, 2026-11-13) fed them the campaign's own OSID front and supply.
/** Consecutive turns under front pressure without supply before the siege trigger fires. */
export const UNSUPPLIED_PRESSURE_TURNS = 3;
/**
 * Share of the holder's own people leaving per turn (week) once the siege trigger fires.
 * DA1 P3 calibration (Historian seat, 2026-11-13): after the 1992 departures (which the
 * takeover writer books), outflow from besieged pockets ran about 0.05-0.2% a week:
 * Srebrenica's 8,000-9,000 UNHCR evacuees of spring 1993 (Krstić TJ ¶19) average about
 * 0.1% a week over the siege; government-held Sarajevo about 0.05-0.1% a week after 1992
 * (UNCOE S/1994/674/Add.2 Annex VI; Tabeau, Galić demographic report 2002). The dormant
 * 5% (and 10% encircled) per week were 50-500 times higher than any source supports.
 */
export const UNSUPPLIED_DISPLACEMENT_FRACTION = 0.001;
/**
 * Same rate while encircled. Sources show encirclement traps people rather than draining
 * them (Goražde, Srebrenica, Bihać and East Mostar all grew from refugee inflow), so the
 * two triggers do not add: the rate is the larger of the two, never their sum.
 */
export const ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.001;
/**
 * DA1 P5: a cut-off body counts as an encircled POCKET only when it holds at most this
 * share of its side's settlements. The besieged pockets of the war are small: Sarajevo,
 * Goražde, Srebrenica, Žepa, the Bihać pocket (about 8% of RBiH-held settlements), and the
 * HVO's Lašva valley, Kiseljak, Žepče and Orašje pockets in 1993-94. A front that splits
 * a side's territory into two large regions is not a siege: during the 1993 Croat-Bosniak
 * war the simulation cuts the Tuzla region (about 30% of RBiH-held settlements) off from
 * central Bosnia, which historically stayed linked through Kladanj and Olovo.
 */
export const POCKET_MAX_SHARE = 0.15;
// The breach trigger (3% per turn after persistent front breaches) was removed in DA1: it
// read `front_pressure`, which no campaign writes (legacy edge keys), and capture-driven
// displacement already has one writer, `displacement_takeover.ts`.

// Displacement routing: receiving cap from getReceivingCapacityFraction (Sarajevo lower).
// LOST_POPULATION_FRACTION (20% "lost", all booked as killed Bosniaks when no census) was
// removed 2026-11-13 (SC2): the no-census case now splits by the national 1991 sums and
// uses the same killed / fled-abroad rules as the census path.

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
 * What the pressure path reads about the front and supply, in the SAME id space as the
 * `settlements` passed to `updateDisplacement` (OSIDs in a campaign).
 *
 * DA1 (2026-11-13): the war step used to hand OSID settlements together with legacy `S…`
 * edges, so the path found 0 front edges every turn, its legacy supply BFS reached no
 * settlement, and it never fired. The war step now builds these from the operational
 * graph (`computeFrontEdgesOsid`, `computeSupplyReachabilityOsid`).
 */
export interface DisplacementPressureInputs {
    /** Current front edges (an edge present this turn is an active front). */
    frontEdges: ReadonlyArray<FrontEdge>;
    /** Per faction: the controlled settlement ids reachable from its supply sources. */
    suppliedByFaction: ReadonlyMap<string, ReadonlySet<string>>;
}

/**
 * Inputs derived from `settlementEdges` alone, for callers without operational data (unit
 * fixtures, legacy CLI harnesses). Only meaningful when the edges use the same ids as
 * the controllers and settlements.
 */
function pressureInputsFromEdges(state: GameState, settlementEdges: EdgeRecord[]): DisplacementPressureInputs {
    const supply = computeSupplyReachability(state, buildAdjacencyMapCached(settlementEdges));
    const supplied = new Map<string, ReadonlySet<string>>();
    for (const f of supply.factions) supplied.set(f.faction_id, new Set(f.reachable_controlled));
    return { frontEdges: computeFrontEdges(state, settlementEdges), suppliedByFaction: supplied };
}

function isCanonicalFaction(side: unknown): side is FactionId {
    return typeof side === 'string' && (CANONICAL_FACTIONS as readonly string[]).includes(side);
}

function rbihHrhbAtWar(state: GameState): boolean {
    const turn = state.meta?.turn ?? 0;
    return turn >= (state.meta?.rbih_hrhb_war_earliest_turn ?? DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN) && !areRbihHrhbAllied(state);
}

/** Per faction: body index of each held settlement, the main body, own-settlement count per body. */
interface TerritorialBodies {
    bodyOf: Map<string, number>;
    main: number;
    size: number[];
    total: number;
}

/**
 * Per faction: which connected body of its territory each settlement it holds belongs to,
 * and which body is its main one (the most settlements; ties go to the body found first
 * in id order). Bodies connect through the faction's own settlements and, while RBiH and
 * HRHB are not at war, through the ally's (as supply transit does).
 *
 * A municipality whose held settlements all lie outside the main body is encircled when
 * it is also under front pressure: Sarajevo, Goražde, Srebrenica, Žepa and the Bihać
 * pocket for RBiH; the Lašva valley pocket for HRHB once the Croat-Bosniak war starts.
 * (The old test, "the faction holds no other municipality", could never fire.)
 */
function computeTerritorialBodies(
    controllerOf: ReadonlyMap<string, FactionId>,
    neighbours: ReadonlyMap<string, readonly string[]>,
    atWarRbihHrhb: boolean
): Map<FactionId, TerritorialBodies> {
    const ids = [...controllerOf.keys()].sort(strictCompare);
    const result = new Map<FactionId, TerritorialBodies>();
    for (const faction of CANONICAL_FACTIONS) {
        const passable = (side: FactionId | undefined): boolean => {
            if (side === undefined) return false;
            if (side === faction) return true;
            const pair = (side === 'RBiH' && faction === 'HRHB') || (side === 'HRHB' && faction === 'RBiH');
            return pair && !atWarRbihHrhb;
        };
        const bodyOf = new Map<string, number>();
        const ownCount: number[] = [];
        const visited = new Set<string>();
        for (const start of ids) {
            if (visited.has(start) || controllerOf.get(start) !== faction) continue;
            const body = ownCount.length;
            ownCount.push(0);
            const queue = [start];
            visited.add(start);
            while (queue.length > 0) {
                const cur = queue.shift()!;
                if (controllerOf.get(cur) === faction) {
                    bodyOf.set(cur, body);
                    ownCount[body] += 1;
                }
                for (const nb of neighbours.get(cur) ?? []) {
                    if (visited.has(nb) || !passable(controllerOf.get(nb))) continue;
                    visited.add(nb);
                    queue.push(nb);
                }
            }
        }
        let main = -1;
        for (let b = 0; b < ownCount.length; b++) {
            if (main < 0 || ownCount[b] > ownCount[main]) main = b;
        }
        const total = ownCount.reduce((s, n) => s + n, 0);
        result.set(faction, { bodyOf, main, size: ownCount, total });
    }
    return result;
}

/**
 * The side holding a municipality: the one controlling most of its settlements. Ties go
 * to the earlier side in canonical order. Null when nobody controls any of them.
 */
export function resolveMunicipalityHolder(heldInMun: ReadonlyMap<FactionId, number>): FactionId | null {
    let holder: FactionId | null = null;
    let best = 0;
    for (const f of CANONICAL_FACTIONS) {
        const c = heldInMun.get(f) ?? 0;
        if (c > best) {
            holder = f;
            best = c;
        }
    }
    return holder;
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
 * Route one people's displaced to municipalities their own side holds, with capacity.
 * Order: the takeover writer's route for this origin, people and causer
 * (`getBilateralRoutingOrder`), then the remaining held municipalities in id order.
 * Whatever finds no capacity is returned unrouted (the caller books it as lost).
 */
function routeDisplacedPopulation(
    fromMunId: MunicipalityId,
    people: FactionId,
    amount: number,
    displacementState: Record<MunicipalityId, DisplacementState>,
    munControl: Map<MunicipalityId, Set<FactionId>>,
    causer: FactionId
): DisplacementRoutingRecord[] {
    const routing: DisplacementRoutingRecord[] = [];
    let remaining = amount;

    const friendly = new Set<MunicipalityId>();
    for (const [targetMunId, factions] of munControl) {
        if (targetMunId !== fromMunId && factions.has(people)) friendly.add(targetMunId);
    }
    const preferred = (causer === UNKNOWN_CAUSER_BUCKET
        ? getBilateralRoutingOrder(fromMunId, people)
        : getBilateralRoutingOrder(fromMunId, people, causer)
    ).filter((m) => friendly.has(m));
    const preferredSet = new Set(preferred);
    const order = [...preferred, ...[...friendly].filter((m) => !preferredSet.has(m)).sort(strictCompare)];

    for (const munId of order) {
        if (remaining <= 0) break;
        const targetState = displacementState[munId];
        const targetOriginal = targetState?.original_population ?? 10000;
        const current =
            targetOriginal +
            (targetState?.displaced_in ?? 0) -
            (targetState?.displaced_out ?? 0) -
            (targetState?.lost_population ?? 0);
        const capacity = Math.floor(targetOriginal * getReceivingCapacityFraction(munId));
        const routed = Math.min(remaining, Math.max(0, capacity - current));
        if (routed <= 0) continue;
        routing.push({ from_mun: fromMunId, to_mun: munId, amount: routed, reason: 'friendly_supplied' });
        remaining -= routed;
    }
    return routing;
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
    /** When set, spread only across these settlements (the holder's, for the pressure path). */
    onlySids?: ReadonlySet<string>,
): void {
    const entries = Array.from(settlements.entries())
        .filter(([sid, rec]) => (rec.mun1990_id ?? rec.mun_code) === munId && (!onlySids || onlySids.has(sid)))
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
 * Update population displacement from siege and encirclement (the pressure path).
 *
 * DA1 (siege displacement lane, 2026-11-13): ONE pass per municipality, for the side
 * holding it (`resolveMunicipalityHolder`). It used to run once per militia pool, and
 * every pool displaced the whole municipality's population, so a municipality with three
 * pools was processed three times. Triggers, read from `pressure` (same id space as
 * `settlements`):
 *   - siege: the holder's settlements touch an at-war front and none of them is supplied,
 *     for UNSUPPLIED_PRESSURE_TURNS consecutive turns (counter persisted on the
 *     municipality's DisplacementState as `unsupplied_pressure_turns`, so it survives a
 *     save; it used to live in a module cache);
 *   - encirclement: under front pressure and every held settlement lies outside the
 *     holder's main territorial body (`computeTerritorialBodies`).
 * The amount is taken from the population of the settlements the holder controls (by
 * settlement population), booked to the pressing side (`resolvePressingFactions`), and
 * each people is routed to municipalities its own side holds.
 *
 * Without `pressure`, inputs are derived from `settlementEdges` (fixtures and harnesses).
 */
export function updateDisplacement(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    settlementEdges: EdgeRecord[],
    population1991ByMun?: MunicipalityPopulation1991Map,
    pressure?: DisplacementPressureInputs
): DisplacementStepReport {
    const currentTurn = state.meta.turn;
    const militiaPools = state.military.militia_pools as Record<string, MilitiaPoolState> | undefined;

    if (!militiaPools || typeof militiaPools !== 'object') {
        return { by_municipality: [], routing: [] };
    }

    const inputs = pressure ?? pressureInputsFromEdges(state, settlementEdges);
    const frontEdges = inputs.frontEdges;
    const munControl = buildMunControlFromOsids(state);
    const pc = state.political.political_controllers ?? {};

    // Settlements by municipality (sorted), their controller and population.
    const sidsByMun = new Map<MunicipalityId, string[]>();
    const popOf = new Map<string, number>();
    for (const [sid, rec] of settlements.entries()) {
        const mun = (rec.mun1990_id ?? rec.mun_code) as MunicipalityId;
        const list = sidsByMun.get(mun) ?? [];
        list.push(sid);
        sidsByMun.set(mun, list);
        const p = (rec.properties as { population_total?: unknown } | undefined)?.population_total;
        popOf.set(sid, typeof p === 'number' && Number.isFinite(p) ? Math.max(0, p) : 1);
    }
    for (const list of sidsByMun.values()) list.sort(strictCompare);

    const controllerOf = new Map<string, FactionId>();
    for (const sid of [...settlements.keys()].sort(strictCompare)) {
        const side = pc[sid];
        if (isCanonicalFaction(side)) controllerOf.set(sid, side);
    }
    const neighbourSets = new Map<string, Set<string>>();
    for (const e of settlementEdges) {
        if (e.a === e.b) continue;
        if (!neighbourSets.has(e.a)) neighbourSets.set(e.a, new Set());
        if (!neighbourSets.has(e.b)) neighbourSets.set(e.b, new Set());
        neighbourSets.get(e.a)!.add(e.b);
        neighbourSets.get(e.b)!.add(e.a);
    }
    const neighbours = new Map<string, string[]>();
    for (const [k, v] of neighbourSets) neighbours.set(k, [...v].sort(strictCompare));
    const bodies = computeTerritorialBodies(controllerOf, neighbours, rbihHrhbAtWar(state));

    // Municipalities with at least one pool, once each, in id order.
    const poolKeysSorted = Object.keys(militiaPools).sort(strictCompare);
    const poolKeysByMun = new Map<MunicipalityId, string[]>();
    for (const key of poolKeysSorted) {
        const pool = militiaPools[key];
        if (!pool || typeof pool !== 'object' || typeof pool.faction !== 'string') continue;
        const munId = (typeof pool.mun_id === 'string' ? pool.mun_id : key) as MunicipalityId;
        const list = poolKeysByMun.get(munId) ?? [];
        list.push(key);
        poolKeysByMun.set(munId, list);
    }
    const munIds = [...poolKeysByMun.keys()].sort(strictCompare);

    const records: DisplacementRecord[] = [];
    const routingRecords: DisplacementRoutingRecord[] = [];
    const defaultOriginalPopulation = 10000;

    for (const munId of munIds) {
        const munSids = sidsByMun.get(munId) ?? [];
        if (munSids.length === 0) continue;

        const heldInMun = new Map<FactionId, number>();
        for (const sid of munSids) {
            const side = controllerOf.get(sid);
            if (side) heldInMun.set(side, (heldInMun.get(side) ?? 0) + 1);
        }
        const holder = resolveMunicipalityHolder(heldInMun);
        if (!holder) continue;
        const holderSids = munSids.filter((sid) => controllerOf.get(sid) === holder);
        const holderSidSet = new Set(holderSids);

        const dispState = getOrInitDisplacementState(state, munId, defaultOriginalPopulation);

        // Conditions, for the holder only.
        const underPressure = frontEdges.some((e) =>
            (holderSidSet.has(e.a) && e.side_a === holder) || (holderSidSet.has(e.b) && e.side_b === holder)
        );
        const reachable = inputs.suppliedByFaction.get(holder);
        const supplied = holderSids.some((sid) => reachable?.has(sid) === true);
        const body = bodies.get(holder);
        const encircled = underPressure && body !== undefined && body.main >= 0 &&
            holderSids.every((sid) => {
                const b = body.bodyOf.get(sid);
                return b !== undefined && b !== body.main && body.size[b] <= POCKET_MAX_SHARE * body.total;
            });

        let unsuppliedTurns = 0;
        if (underPressure && !supplied) {
            unsuppliedTurns = (dispState.unsupplied_pressure_turns ?? 0) + 1;
            dispState.unsupplied_pressure_turns = unsuppliedTurns;
        } else if (dispState.unsupplied_pressure_turns !== undefined) {
            delete dispState.unsupplied_pressure_turns;
        }

        const reasons: string[] = [];
        let fraction = 0;
        if (unsuppliedTurns >= UNSUPPLIED_PRESSURE_TURNS) {
            fraction = Math.max(fraction, UNSUPPLIED_DISPLACEMENT_FRACTION);
            reasons.push(`unsupplied_pressure_${unsuppliedTurns}_turns`);
        }
        if (encircled) {
            fraction = Math.max(fraction, ENCIRCLEMENT_DISPLACEMENT_FRACTION);
            reasons.push('encircled');
        }
        if (fraction <= 0) continue;

        const remainingPopulation =
            dispState.original_population - dispState.displaced_out - dispState.lost_population;
        if (remainingPopulation <= 0) continue;
        const munPop = munSids.reduce((s, sid) => s + (popOf.get(sid) ?? 0), 0);
        const holderPop = holderSids.reduce((s, sid) => s + (popOf.get(sid) ?? 0), 0);
        const heldRemaining = munPop > 0 ? Math.floor((remainingPopulation * holderPop) / munPop) : remainingPopulation;
        // DA1 P3: only the holder's own people leave under siege. Sources do not attribute a
        // pocket's minority leaving (Serbs leaving government-held Sarajevo or Goražde) to
        // the besieger; those 1992 departures are booked by the takeover writer.
        // SC2: without a census entry the share uses the national sums (tagged).
        const { split: heldByPeople, nationalFallback } =
            splitDisplacedByEthnicityWithSource(munId, heldRemaining, population1991ByMun);
        if (nationalFallback) reasons.push(CENSUS_FALLBACK_NATIONAL_REASON);
        const heldPeople = heldByPeople[holder as 'RBiH' | 'RS' | 'HRHB'] ?? 0;

        // DA1 P4: the Phase 22 sustainability-collapse multiplier (x1.5) is no longer read
        // here. `sustainability_state` runs on legacy settlement edges and marks 109 of 110
        // municipalities collapsed every turn of a campaign, so the multiplier applied to
        // every firing and no source supports it.
        const displacementAmount = Math.min(Math.floor(heldPeople * fraction), heldPeople);
        if (displacementAmount <= 0) continue;

        // SC1: the causer is the pressing side, not the holder.
        const causerShares = splitAmountByCauser(
            displacementAmount,
            resolvePressingFactions(state, munId, holder, new Set(munSids), frontEdges).causers
        );

        let lostAmount = 0;
        const routableByPeople: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
        let dominantCauser: FactionId = causerShares[0]?.faction ?? UNKNOWN_CAUSER_BUCKET;
        let dominantAmount = -1;
        for (const share of causerShares) {
            if (share.amount <= 0) continue;
            if (share.amount > dominantAmount) {
                dominantCauser = share.faction;
                dominantAmount = share.amount;
            }
            const causerFid: FactionId = share.faction;
            // DA1 P3: people leaving a siege are not killed by leaving; the expulsion kill rate
            // (P1a) does not apply. Deaths in place from shelling, sniping and starvation are
            // a separate quantity this path does not model.
            // F4: nobody leaves a besieged pocket for abroad (Srebrenica's 1993 and 1995
            // evacuations went to Tuzla and Kladanj, Krstić TJ; Sarajevo after mid-1992), so
            // every departure here is routed to own-side territory.
            const byFaction: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
            byFaction[holder] = share.amount;
            const routable: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
            const killedByFac: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
            const fledByFac: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
            routable[holder] = share.amount;
            routableByPeople[holder] += routable[holder];
            lostAmount += share.amount - (routable.RBiH + routable.RS + routable.HRHB);

            pushDisplacementEventLogFromMun(state, munId, settlements, byFaction, currentTurn, routable, causerFid, killedByFac, holderSidSet);
            if (fledByFac[holder] > 0) {
                recordCivilianDisplacementCasualties(state, holder, 0, fledByFac[holder]);
            }
        }

        const beforeOut = dispState.displaced_out;
        const beforeIn = dispState.displaced_in;
        const beforeLost = dispState.lost_population;
        dispState.lost_population += lostAmount;
        dispState.last_updated_turn = currentTurn;

        // Every pool in the municipality loses the same share of its available manpower.
        const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
        for (const key of poolKeysByMun.get(munId) ?? []) {
            const pool = militiaPools[key];
            const poolReduction = Math.floor(pool.available * reductionRatio);
            if (poolReduction > 0) {
                pool.available = Math.max(0, pool.available - poolReduction);
                pool.updated_turn = currentTurn;
            }
        }

        // Route each people to municipalities its own side holds.
        const displacementState = state.displacement.displacement_state;
        for (const people of CANONICAL_FACTIONS) {
            const amount = routableByPeople[people];
            if (amount <= 0) continue;
            const routing = routeDisplacedPopulation(munId, people, amount, displacementState, munControl, dominantCauser);
            let routedTotal = 0;
            for (const route of routing) {
                const destState = getOrInitDisplacementState(
                    state,
                    route.to_mun,
                    displacementState[route.to_mun]?.original_population ?? defaultOriginalPopulation
                );
                destState.displaced_in += route.amount;
                if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                destState.displaced_in_by_faction[people] = (destState.displaced_in_by_faction[people] ?? 0) + route.amount;
                destState.last_updated_turn = currentTurn;
                routedTotal += route.amount;
                routingRecords.push(route);
            }
            dispState.displaced_out += routedTotal;
            if (amount > routedTotal) dispState.lost_population += amount - routedTotal;
        }

        records.push({
            mun_id: munId,
            faction_id: holder,
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

    records.sort((a, b) => strictCompare(a.mun_id, b.mun_id));
    routingRecords.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        const toCmp = strictCompare(a.to_mun, b.to_mun);
        if (toCmp !== 0) return toCmp;
        return a.amount - b.amount;
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
