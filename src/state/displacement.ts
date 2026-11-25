/**
 * Phase 21: Population displacement and recruitment integration
 *
 * Deterministic displacement system that tracks population movement
 * and permanently reduces local recruitment capacity.
 */

import type { SettlementRecord } from '../map/settlements.js';
import type {
    DisplacementState,
    FactionId,
    GameState,
    MilitiaPoolState,
    MunicipalityId,
    NegotiatedEvacuationEpisode,
    NegotiatedEvacuationRecord,
} from './game_state.js';
import { CANONICAL_FACTIONS } from './game_state.js';
import { NEGOTIATED_EVACUATION_CONVOY_MAX, NEGOTIATED_EVACUATION_EPISODE_CAP } from './displacement_loss_constants.js';

import { buildAdjacencyMapCached } from '../map/adjacency_map.js';
import { computeFrontEdges, type FrontEdge } from '../map/front_edges.js';
import { areRbihHrhbAllied, DEFAULT_RBIH_HRHB_WAR_EARLIEST_TURN } from '../sim/early_war/alliance_update.js';
import type { EdgeRecord } from '../map/settlements.js';
import { getReceivingCapacityFraction, POCKET_CROSSINGS, type PocketCrossing } from './displacement_routing_data.js';
import { appendDisplacementEvent, UNKNOWN_CAUSER_BUCKET } from './displacement_event_log.js';
import { getBilateralRoutingOrder, getDynamicHostileShare, type PassThroughDestinationResolver } from './displacement_takeover.js';
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
 * takeover writer books), background outflow from besieged pockets ran about 0.05-0.2% a
 * week: government-held Sarajevo about 0.05-0.1% a week after 1992 (UNCOE S/1994/674/Add.2
 * Annex VI; Tabeau, Galić demographic report 2002). The dormant 5% (and 10% encircled) per
 * week were 50-500 times higher than any source supports.
 * A9 B2 (Historian seat, 2026-11-24): this rate is a steady trickle. It does NOT model the
 * spring 1993 UNHCR convoy evacuations from Srebrenica, which moved several thousand people
 * within a few weeks; no rate of this scale can reproduce a concentrated event like that.
 */
export const UNSUPPLIED_DISPLACEMENT_FRACTION = 0.001;
/**
 * Same rate while encircled. Sources show encirclement traps people rather than draining
 * them (Goražde, Srebrenica, Bihać and East Mostar all grew from refugee inflow), so the
 * two triggers do not add: the rate is the larger of the two, never their sum.
 */
export const ENCIRCLEMENT_DISPLACEMENT_FRACTION = 0.001;
/**
 * A6 (SD9): the siege outflow is computed in integer parts per million, so the weekly
 * fraction of a small pocket (under 1,000 people at 0.001) carries over in
 * `DisplacementState.siege_outflow_carry_by_side` instead of rounding to 0 every week.
 */
export const SIEGE_OUTFLOW_PPM_SCALE = 1_000_000;
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
 * A municipality whose held settlements all lie in a body holding at most POCKET_MAX_SHARE of the
 * side's turn-0 settlements (the side's largest body included, A7) is encircled when
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
 * Whatever finds no capacity is returned unrouted (the caller leaves it in the pocket).
 *
 * A5 (SD7, broader bright-line panel 2026-11-22): only municipalities in `allowed` qualify, those where the
 * side holds a settlement that this turn is supply-reachable AND in the side's main body
 * (`buildSiegeDestinationsBySide`). A besieged pocket with its own supply source is never a destination.
 */
function routeDisplacedPopulation(
    fromMunId: MunicipalityId,
    people: FactionId,
    amount: number,
    displacementState: Record<MunicipalityId, DisplacementState>,
    munControl: Map<MunicipalityId, Set<FactionId>>,
    causer: FactionId,
    allowed: ReadonlySet<MunicipalityId>
): DisplacementRoutingRecord[] {
    const routing: DisplacementRoutingRecord[] = [];
    let remaining = amount;

    const friendly = new Set<MunicipalityId>();
    for (const [targetMunId, factions] of munControl) {
        if (targetMunId !== fromMunId && factions.has(people) && allowed.has(targetMunId)) friendly.add(targetMunId);
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
    /** The people moved, where the row records a group's re-route (A4 `capture_pass_through`). Turn report only. */
    group?: FactionId;
}

/**
 * Displacement step report.
 */
export interface DisplacementStepReport {
    by_municipality: DisplacementRecord[];
    routing: DisplacementRoutingRecord[];
    /**
     * A5 (red-team M1): per pocket and side, this turn's siege leavers (`wanted`), how many found a
     * destination (`routed`) and how many could not leave (`trapped`). A per-turn STOCK: the same people are
     * trapped again next week, so it must never be summed across turns. Turn report only, never GameState,
     * pools or integrity; no player surface reads it yet (registered follow-up). Absent when empty.
     */
    trapped?: DisplacementTrappedRecord[];
    /**
     * A9 P1 (ruling D9): this turn's negotiated-evacuation predicate, one row per separate pocket (municipality
     * and side whose ground there is a body cut off from its main body) and per pocket with an open episode.
     * Turn report only, never GameState. Absent when empty.
     */
    negotiated_evacuation?: NegotiatedEvacuationPredicateRow[];
}

/** One pocket-side row of the A9 P1 convoy predicate (see `DisplacementStepReport.negotiated_evacuation`). */
export interface NegotiatedEvacuationPredicateRow {
    mun_id: MunicipalityId;
    faction_id: FactionId;
    /** (a) B3's test: the side's ground here is a body separate from its main body (no sourced crossing). */
    separate: boolean;
    /** (b) the A5 siege trigger: under front pressure and unsupplied for UNSUPPLIED_PRESSURE_TURNS turns. */
    siege: boolean;
    /** (c) the municipality is at its receiving capacity (§4.3). */
    at_capacity: boolean;
    /** (d) a pressing side took a settlement of the pocket within the last UNSUPPLIED_PRESSURE_TURNS turns. */
    squeeze: boolean;
    /** The pressing side named by `resolvePressingFactions` whose capture gives (d); null when none. */
    besieger: FactionId | null;
    /** Besieger intent: a takeover timer of the besieger against the side's people with people displaced, or the side's people are present here. */
    intent: boolean;
    /** (a)-(d) and intent all hold. */
    open: boolean;
    /** A human RBiH president's refusal stands for this episode. */
    refused: boolean;
    /** The episode has moved NEGOTIATED_EVACUATION_EPISODE_CAP people. */
    cap_reached: boolean;
    /** People moved by this week's convoy (0 when none ran). */
    convoy: number;
    /** People moved this episode, after this week's convoy (0 when no episode). */
    episode_people: number;
}

/** One pocket-side row of the A5 trapped stock (see `DisplacementStepReport.trapped`). */
export interface DisplacementTrappedRecord {
    mun_id: MunicipalityId;
    faction_id: FactionId;
    wanted: number;
    routed: number;
    trapped: number;
}

/**
 * A5 (SD7): per side, the municipalities a siege leaver may go to: those where the side holds a settlement
 * that this turn is supply-reachable for it AND lies in its main territorial body. Membership-only sets.
 */
function buildSiegeDestinationsBySide(
    settlements: Map<string, SettlementRecord>,
    bodies: ReadonlyMap<FactionId, TerritorialBodies>,
    suppliedByFaction: ReadonlyMap<string, ReadonlySet<string>>
): Map<FactionId, Set<MunicipalityId>> {
    const out = new Map<FactionId, Set<MunicipalityId>>();
    for (const side of CANONICAL_FACTIONS) {
        const allowed = new Set<MunicipalityId>();
        const body = bodies.get(side);
        const reachable = suppliedByFaction.get(side);
        if (body && body.main >= 0 && reachable) {
            for (const [sid, b] of body.bodyOf) {
                if (b !== body.main || !reachable.has(sid)) continue;
                const rec = settlements.get(sid);
                const mun = (rec?.mun1990_id ?? rec?.mun_code) as MunicipalityId | undefined;
                if (mun) allowed.add(mun);
            }
        }
        out.set(side, allowed);
    }
    return out;
}

/**
 * A9 P0-A (SD13, 8-seat §6 ruling D4, 2026-11-25): A5's main-body supplied destinations per side, built
 * from this turn's control, operational edges and supply exactly as `updateDisplacement` builds them for
 * the siege route (same territorial bodies, same `buildSiegeDestinationsBySide`). The pocket-fall step
 * routes a fallen pocket's survivors here.
 */
export function buildMainBodySuppliedDestinations(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    settlementEdges: ReadonlyArray<EdgeRecord>,
    suppliedByFaction: ReadonlyMap<string, ReadonlySet<string>>
): Map<FactionId, Set<MunicipalityId>> {
    const pc = state.political.political_controllers ?? {};
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
        neighbourSets.get(e.a)?.add(e.b);
        neighbourSets.get(e.b)?.add(e.a);
    }
    const neighbours = new Map<string, string[]>();
    for (const [k, v] of neighbourSets) neighbours.set(k, [...v].sort(strictCompare));
    const bodies = computeTerritorialBodies(controllerOf, neighbours, rbihHrhbAtWar(state));
    return buildSiegeDestinationsBySide(settlements, bodies, suppliedByFaction);
}

/**
 * A9 P0-A (SD13): route one people's group to `allowed` municipalities their side holds, with the same
 * receiving-capacity rule and route order as the siege path (`routeDisplacedPopulation`). Returns the
 * routing only; the caller books it. Whatever finds no capacity is left out of the returned rows.
 */
export function routeDisplacedWithCapacity(
    state: GameState,
    fromMunId: MunicipalityId,
    people: FactionId,
    amount: number,
    causer: FactionId,
    allowed: ReadonlySet<MunicipalityId>
): DisplacementRoutingRecord[] {
    if (amount <= 0 || allowed.size === 0) return [];
    return routeDisplacedPopulation(
        fromMunId, people, amount, state.displacement.displacement_state ?? {}, buildMunControlFromOsids(state), causer, allowed
    );
}

/**
 * A9 B2/B3 (SD13): the side's territorial bodies linked to a municipality: the bodies of its own settlements
 * there, and any body next to one of the municipality's settlements. One test serves the capture
 * pass-through (B2) and the A5 siege route (B3).
 */
function linkedBodiesInMunicipality(
    body: TerritorialBodies,
    inMun: readonly string[],
    neighbours: ReadonlyMap<string, readonly string[]>
): Set<number> {
    const linked = new Set<number>();
    for (const sid of inMun) {
        const b = body.bodyOf.get(sid);
        if (b !== undefined) linked.add(b);
    }
    for (const sid of inMun) {
        for (const nb of neighbours.get(sid) ?? []) {
            const b = body.bodyOf.get(nb);
            if (b !== undefined) linked.add(b);
        }
    }
    return linked;
}

/**
 * A9 B3 (SD13, 8-seat §6 ruling D10/D10b, 2026-11-25; DISPLACEMENT_MASTER §10.3): may a side's siege leavers
 * from this municipality reach A5's main-body destinations? Yes when the municipality is linked to the
 * main body (the linked-body test above), or when the leavers' own body holds the near end of a sourced
 * crossing (`POCKET_CROSSINGS`, one entry: the Sarajevo airport). Otherwise the pocket is separate and
 * its leavers are trapped (recorded for Ledger line 2 only; no kill, no lever).
 */
function siegeLeaversReachMainBody(
    side: FactionId,
    body: TerritorialBodies | undefined,
    munSids: readonly string[],
    sideSids: readonly string[],
    neighbours: ReadonlyMap<string, readonly string[]>,
    controllerOf: ReadonlyMap<string, FactionId>,
    crossings: readonly PocketCrossing[]
): boolean {
    if (!body || body.main < 0) return false;
    const linked = linkedBodiesInMunicipality(body, munSids, neighbours);
    if (linked.has(body.main)) return true;
    const ownBodies = new Set<number>();
    for (const sid of sideSids) {
        const b = body.bodyOf.get(sid);
        if (b !== undefined) ownBodies.add(b);
    }
    for (const crossing of crossings) {
        if (crossing.side !== side) continue;
        for (const near of crossing.near_settlements) {
            if (controllerOf.get(near) !== side) continue;
            const b = body.bodyOf.get(near);
            if (b !== undefined && ownBodies.has(b)) return true;
        }
    }
    return false;
}

/**
 * A9 B2 (SD13, owner rulings 2-3 of 2026-11-24; the §6 broader panel round 1 A5b shape; DISPLACEMENT_MASTER
 * §10.6): where a group sheltered in a captured municipality may be moved on. The answer is read from the
 * same territorial bodies and supply as the siege route, at the moment the pass-through fires.
 * - The group's side still holds a supplied settlement in the municipality: `null`, the group stays. A
 *   pocket that is still held and supplied is never emptied because the enemy holds most of the municipality.
 * - Otherwise: the municipalities where the side holds a supplied settlement in a body linked to the source
 *   (the body of its own settlements there, or a body next to the municipality's settlements). An empty set
 *   means no reachable destination, and the group stays.
 * - A9 P0-B (D7): when the side holds no settlement in the municipality, any settlement it holds in a linked
 *   body qualifies, supplied or not.
 * Bodies are built once per call of this builder; the caller builds it lazily, on the first pass-through.
 */
export function buildPassThroughDestinationResolver(
    state: GameState,
    settlementEdges: ReadonlyArray<EdgeRecord>,
    suppliedByFaction: ReadonlyMap<string, ReadonlySet<string>>
): PassThroughDestinationResolver {
    const pc = state.political.political_controllers ?? {};
    const controllerOf = new Map<string, FactionId>();
    const osidsByMun = new Map<MunicipalityId, string[]>();
    const munOf = (sid: string): MunicipalityId | undefined => {
        const parts = sid.split(':');
        return parts.length >= 3 && parts[0] === 'op' ? (parts[1] as MunicipalityId) : undefined;
    };
    for (const sid of Object.keys(pc).sort(strictCompare)) {
        const mun = munOf(sid);
        if (!mun) continue;
        const list = osidsByMun.get(mun) ?? [];
        list.push(sid);
        osidsByMun.set(mun, list);
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
    const none: ReadonlySet<string> = new Set<string>();

    return (faction: string, munId: MunicipalityId, linkFrom?: readonly string[]): ReadonlySet<MunicipalityId> | null => {
        const allowed = new Set<MunicipalityId>();
        const side = CANONICAL_FACTIONS.find((f) => f === faction);
        const body = side === undefined ? undefined : bodies.get(side);
        const supplied = suppliedByFaction.get(faction) ?? none;
        if (!body) return allowed;
        const inMun = osidsByMun.get(munId) ?? [];
        for (const sid of inMun) {
            if (body.bodyOf.has(sid) && supplied.has(sid)) return null;
        }
        const linked = linkedBodiesInMunicipality(body, linkFrom ?? inMun, neighbours);
        if (linked.size === 0) return allowed;
        // A9 P0-B (SD13, 8-seat §6 ruling D7, 2026-11-25): when the side holds ZERO ground in the municipality,
        // a destination in a linked body qualifies without the supply requirement (capacity still applies in
        // the router). The step order runs after every control writer, so no group is moved onto ground that
        // falls the same turn. The held-and-supplied `null` above is untouched.
        const holdsGround = inMun.some((sid) => body.bodyOf.has(sid));
        for (const [sid, b] of body.bodyOf) {
            if (!linked.has(b) || (holdsGround && !supplied.has(sid))) continue;
            const mun = munOf(sid);
            if (mun && mun !== munId) allowed.add(mun);
        }
        return allowed;
    };
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
export function splitDisplacedByEthnicityWithSource(
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
    frontEdges: ReadonlyArray<{ a: string; b: string; side_a: string | null; side_b: string | null }>,
    /**
     * DA1 P6 (panel round 1, Red-team and Engine seats): the caller's holder, used as is. The
     * pressure path passes the side whose settlements it is processing, so the resolver can
     * never disagree with it and book a pocket's people to their own defender.
     */
    holderOverride?: FactionId
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
    if (holderOverride === undefined) {
        for (const f of CANONICAL_FACTIONS) {
            const c = heldInMun.get(f) ?? 0;
            if (c > holderCount) {
                holder = f;
                holderCount = c;
            }
        }
    } else {
        holder = holderOverride;
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
 * DA1 (siege displacement lane, 2026-11-13/14): one pass per (municipality, side holding
 * settlements there). It used to run once per militia pool, and every pool displaced the
 * whole municipality's population, so a municipality with three pools was processed three
 * times. Triggers, read from `pressure` (same id space as `settlements`):
 *   - siege: the side's settlements touch an at-war front and none of them is supplied,
 *     for UNSUPPLIED_PRESSURE_TURNS consecutive turns (counter persisted per side in
 *     DisplacementState.unsupplied_pressure_by_side with the turn last counted, so it
 *     survives a save; it used to live in a module cache);
 *   - encirclement: under front pressure and every held settlement lies in a body outside
 *     the side's main territorial body holding at most POCKET_MAX_SHARE of its settlements
 *     at turn 0 (`computeTerritorialBodies`).
 * The side's own people leave at the sourced weekly rate, taken from the population of the
 * settlements it controls; they are routed first (people with nowhere to go stay), booked
 * to the pressing side (`resolvePressingFactions`, holder passed in), none killed and none
 * abroad.
 *
 * Without `pressure`, inputs are derived from `settlementEdges` (fixtures and harnesses).
 */
/**
 * Ledger line 2 (A5): delete this week's write-only "unable to leave" stock from every
 * municipality. Display only; no simulation code reads `unable_to_leave_by_side`.
 */
function clearUnableToLeaveStock(state: GameState): void {
    const all = state.displacement?.displacement_state;
    if (!all) return;
    for (const munId of Object.keys(all)) {
        const entry = all[munId];
        if (entry && entry.unable_to_leave_by_side !== undefined) delete entry.unable_to_leave_by_side;
    }
}

/** Ledger line 2 (A5): record this week's stock for one side; 0 is never stored. */
function writeUnableToLeaveStock(dispState: DisplacementState, side: FactionId, trapped: number, turn: number): void {
    const amount = Math.max(0, Math.floor(trapped));
    if (amount < 1) return;
    (dispState.unable_to_leave_by_side ??= {})[side] = { amount, turn };
}

/**
 * A9 P1 (ruling D9): only a human RBiH president may refuse the evacuations. Bots, staff and headless runs keep
 * the historical default (allow), so a refusal on record is read only while this holds.
 */
function canRefuseNegotiatedEvacuation(state: GameState, side: FactionId): boolean {
    if (side !== 'RBiH') return false;
    if (state.meta?.headless_scenario_auto_control) return false;
    return (state.meta?.player_faction ?? null) === side;
}

/**
 * A9 P1 (ruling D9): the refusal hook. A human RBiH president's decision writes it for one pocket (municipality)
 * while that pocket's evacuation episode is open; the convoy rule then runs no convoy for the rest of the episode.
 * It carries the siege cost (the people stay trapped) and earns nothing. Returns false, writing nothing, when the
 * side may not refuse or no episode is open. Idempotent: the first refusal turn is kept.
 */
export function recordNegotiatedEvacuationRefusal(state: GameState, munId: MunicipalityId, side: FactionId): boolean {
    if (!canRefuseNegotiatedEvacuation(state, side)) return false;
    const episode = state.displacement?.displacement_state?.[munId]?.negotiated_evacuation_by_side?.[side];
    if (!episode) return false;
    if (episode.refused_turn === null) episode.refused_turn = state.meta.turn;
    return true;
}

/** A9 P1 (d): one capture of the window: `from` lost settlement `sid` (in `mun`) to `to`. */
interface RecentCapture {
    sid: string;
    mun: MunicipalityId | undefined;
    from: FactionId;
    to: FactionId;
}

/**
 * A9 P1 (d): the captures of the last UNSUPPLIED_PRESSURE_TURNS turns (this turn and the two before), from the
 * persisted control-change log (`political.control_events`). Setup writes and non-faction controllers are not
 * captures. Sorted (turn, settlement, from, to), so every reader walks them in one order.
 */
function collectRecentCaptures(state: GameState, settlements: Map<string, SettlementRecord>): RecentCapture[] {
    const turn = state.meta.turn;
    const rows: Array<RecentCapture & { turn: number }> = [];
    for (const ev of state.political?.control_events ?? []) {
        if (!ev || ev.mechanism === 'setup_control') continue;
        if (ev.turn > turn || turn - ev.turn >= UNSUPPLIED_PRESSURE_TURNS) continue;
        if (!isCanonicalFaction(ev.from) || !isCanonicalFaction(ev.to) || ev.from === ev.to) continue;
        const rec = settlements.get(ev.settlement_id);
        const parts = ev.settlement_id.split(':');
        const mun = (rec?.mun1990_id ?? rec?.mun_code ?? ev.mun_id ?? (parts[0] === 'op' ? parts[1] : undefined)) as MunicipalityId | undefined;
        rows.push({ turn: ev.turn, sid: ev.settlement_id, mun, from: ev.from, to: ev.to });
    }
    rows.sort((a, b) => a.turn - b.turn || strictCompare(a.sid, b.sid) || strictCompare(a.from, b.from) || strictCompare(a.to, b.to));
    return rows.map(({ sid, mun, from, to }) => ({ sid, mun, from, to }));
}

/**
 * A9 P1 intent: the pairs (people X, besieger P) for which P holds a takeover timer against X's people that has
 * displaced anyone (`cumulative_displaced` > 0), anywhere. Keys `${X}|${P}`.
 */
function collectTakeoverIntentPairs(state: GameState): Set<string> {
    const out = new Set<string>();
    const timers = state.displacement?.hostile_takeover_timers ?? {};
    for (const key of Object.keys(timers).sort(strictCompare)) {
        const t = timers[key];
        if (t && (t.cumulative_displaced ?? 0) > 0) out.add(`${t.from_faction}|${t.to_faction}`);
    }
    return out;
}

/** The people of `side` held in its settlements of a municipality: the siege path's census share. */
function heldPeopleOfSide(
    munId: MunicipalityId,
    side: FactionId,
    dispState: DisplacementState,
    sidePop: number,
    munPop: number,
    population1991ByMun: MunicipalityPopulation1991Map | undefined
): number {
    const remaining = dispState.original_population - dispState.displaced_out - dispState.lost_population;
    if (remaining <= 0) return 0;
    const held = munPop > 0 ? Math.floor((remaining * sidePop) / munPop) : remaining;
    const { split } = splitDisplacedByEthnicityWithSource(munId, held, population1991ByMun);
    return Math.max(0, side === 'RS' ? split.RS : side === 'HRHB' ? split.HRHB : split.RBiH);
}

export function updateDisplacement(
    state: GameState,
    settlements: Map<string, SettlementRecord>,
    settlementEdges: EdgeRecord[],
    population1991ByMun?: MunicipalityPopulation1991Map,
    pressure?: DisplacementPressureInputs,
    /** A9 B3 (D10b): the sourced crossings out of a separate pocket. Routing data; fixtures may pass their own. */
    pocketCrossings: readonly PocketCrossing[] = POCKET_CROSSINGS
): DisplacementStepReport {
    // Ledger line 2 (A5): the "unable to leave" stock is this week's only. Clear it from every
    // municipality before any early return, then rewrite it below (s6_ledger12_ruling.md).
    clearUnableToLeaveStock(state);
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
    const trappedRecords: DisplacementTrappedRecord[] = [];
    const defaultOriginalPopulation = 10000;
    const siegeDestinations = buildSiegeDestinationsBySide(settlements, bodies, inputs.suppliedByFaction);

    // DA1 P6 (panel round 1, Red-team): the pocket share is measured against the side's
    // settlement count at turn 0, so conquering most of a side cannot turn its pockets into
    // "large regions" and switch the siege trigger off. Falls back to the current count.
    const initialTotal = new Map<FactionId, number>();
    for (const [osid, side] of Object.entries(state.political.initial_political_controllers ?? {})) {
        if (settlements.has(osid) && isCanonicalFaction(side)) initialTotal.set(side, (initialTotal.get(side) ?? 0) + 1);
    }

    // A9 P1 (ruling D9): the negotiated-evacuation convoy rule's inputs, read once from state.
    const recentCaptures = collectRecentCaptures(state, settlements);
    const takeoverIntentPairs = collectTakeoverIntentPairs(state);
    const evacuationRows: NegotiatedEvacuationPredicateRow[] = [];
    const evacuationRecords: NegotiatedEvacuationRecord[] = [];

    for (const munId of munIds) {
        const munSids = sidsByMun.get(munId) ?? [];
        if (munSids.length === 0) continue;
        const dispState = getOrInitDisplacementState(state, munId, defaultOriginalPopulation);
        const munPop = munSids.reduce((s, sid) => s + (popOf.get(sid) ?? 0), 0);
        const counters = dispState.unsupplied_pressure_by_side ?? {};
        // A6 (SD9): integer ppm remainder of the siege outflow per side (reset points below).
        const carries = dispState.siege_outflow_carry_by_side ?? {};
        // A9 P1 (b): this turn's consecutive unsupplied-under-pressure count per side (the A5 siege trigger).
        const siegeTurnsBySide = new Map<FactionId, number>();

        // DA1 P6 (Red-team): one pass per side holding settlements here, so a pocket that is
        // a minority of its municipality (Žepa is one of Rogatica's settlements) is still
        // seen, and a besieger taking most of a municipality cannot silence the rest of it.
        for (const side of CANONICAL_FACTIONS) {
            const sideSids = munSids.filter((sid) => controllerOf.get(sid) === side);
            if (sideSids.length === 0) {
                delete counters[side];
                // A6: holder change / enclave fall. A captor never inherits a pre-paid fraction.
                delete carries[side];
                continue;
            }
            const sideSidSet = new Set(sideSids);

            const underPressure = frontEdges.some((e) =>
                (sideSidSet.has(e.a) && e.side_a === side) || (sideSidSet.has(e.b) && e.side_b === side)
            );
            const reachable = inputs.suppliedByFaction.get(side);
            const supplied = sideSids.some((sid) => reachable?.has(sid) === true);
            const body = bodies.get(side);
            const denominator = initialTotal.get(side) ?? body?.total ?? 0;
            // A7 (SD11, broader bright-line panel 2026-11-22): no main-body exemption. The size test against
            // the turn-0 count already excludes any real main body, and a side's last remaining body at or
            // under 15% of its start (whichever is largest now) is a pocket like any other. Inert on today's
            // hands-off runs (log-only probe: the largest body never falls below 39% of its turn-0 count).
            const encircled = underPressure && body !== undefined && body.main >= 0 &&
                sideSids.every((sid) => {
                    const b = body.bodyOf.get(sid);
                    return b !== undefined && body.size[b] <= POCKET_MAX_SHARE * denominator;
                });

            // Persisted per side, with the turn it was last counted: a change of holder or a
            // skipped step starts the count again (Engine seat).
            let unsuppliedTurns = 0;
            if (underPressure && !supplied) {
                const prev = counters[side];
                unsuppliedTurns = prev && prev.last_turn === currentTurn - 1 ? prev.turns + 1 : 1;
                counters[side] = { turns: unsuppliedTurns, last_turn: currentTurn };
            } else {
                delete counters[side];
            }
            siegeTurnsBySide.set(side, unsuppliedTurns);

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
            if (fraction <= 0) {
                // A6: no live trigger this week, so no departure and nothing carried.
                delete carries[side];
                continue;
            }

            const remainingPopulation =
                dispState.original_population - dispState.displaced_out - dispState.lost_population;
            if (remainingPopulation <= 0) {
                // A6: nobody left to carry.
                delete carries[side];
                continue;
            }
            const sidePop = sideSids.reduce((s, sid) => s + (popOf.get(sid) ?? 0), 0);
            const heldRemaining = munPop > 0 ? Math.floor((remainingPopulation * sidePop) / munPop) : remainingPopulation;
            // DA1 P3: only the holder's own people leave under siege. Sources do not attribute a
            // pocket's minority leaving (Serbs leaving government-held Sarajevo or Goražde) to
            // the besieger; those 1992 departures are booked by the takeover writer.
            // SC2: without a census entry the share uses the national sums (tagged).
            const { split: heldByPeople, nationalFallback } =
                splitDisplacedByEthnicityWithSource(munId, heldRemaining, population1991ByMun);
            if (nationalFallback) reasons.push(CENSUS_FALLBACK_NATIONAL_REASON);
            const heldPeople = side === 'RS' ? heldByPeople.RS : side === 'HRHB' ? heldByPeople.HRHB : heldByPeople.RBiH;

            // DA1 P4: the Phase 22 sustainability-collapse multiplier (x1.5) is not read here.
            // `sustainability_state` runs on legacy settlement edges and marks 109 of 110
            // municipalities collapsed every turn of a campaign; no source supports it.
            // A6 (SD9): the sub-person remainder carries as integer ppm, updated here before any
            // further continue, on the attempted outflow (`wanted`), so trapped weeks build no
            // debt and capacity opening later releases no burst. The carry stays in [0, 1e6).
            const ppm = Math.round(fraction * SIEGE_OUTFLOW_PPM_SCALE);
            const total = heldPeople * ppm + (carries[side] ?? 0);
            const wanted = Math.min(Math.floor(total / SIEGE_OUTFLOW_PPM_SCALE), heldPeople);
            const carry = total % SIEGE_OUTFLOW_PPM_SCALE;
            if (carry > 0) carries[side] = carry;
            else delete carries[side];
            if (wanted <= 0) continue;

            // SC1: the causer is the pressing side, never this holder (passed in, not re-derived:
            // Red-team and Engine seats).
            const causers = resolvePressingFactions(state, munId, side, new Set(munSids), frontEdges, side).causers;
            let dominantCauser: FactionId = UNKNOWN_CAUSER_BUCKET;
            let dominantWeight = 0;
            for (const c of causers) {
                if (c.weight > dominantWeight) {
                    dominantCauser = c.faction;
                    dominantWeight = c.weight;
                }
            }

            // Route first. DA1 P6 (panel round 1): people with nowhere to go stay in the pocket,
            // so only the routed count leaves and is booked; nothing is added to lost_population.
            // F4: nobody leaves a besieged pocket for abroad in this model. Srebrenica's 1993 UNHCR
            // evacuations went to Tuzla (Krstić TJ); the July 1995 forcible transfer from Potočari to
            // Kladanj is booked by the takeover writer, not this path. Known limits (understating
            // flight abroad, never the killed): Sarajevo convoy and tunnel leavers often went abroad;
            // Orašje's Sava crossing led to Croatia.
            // A9 B3 (SD13, D10/D10b): only a pocket linked to its side's main body, or one holding the near end
            // of the sourced Sarajevo crossing, routes to A5's destinations. A separate pocket's leavers are
            // trapped: recorded below for Ledger line 2, never moved across the lines.
            const displacementState = state.displacement.displacement_state;
            const reachesMain = siegeLeaversReachMainBody(side, body, munSids, sideSids, neighbours, controllerOf, pocketCrossings);
            const routing = routeDisplacedPopulation(
                munId, side, wanted, displacementState, munControl, dominantCauser,
                reachesMain ? (siegeDestinations.get(side) ?? new Set<MunicipalityId>()) : new Set<MunicipalityId>()
            );
            const displacementAmount = routing.reduce((s, r) => s + r.amount, 0);
            // A5 (red-team M1): record who could not leave, before the no-route continue.
            trappedRecords.push({ mun_id: munId, faction_id: side, wanted, routed: displacementAmount, trapped: wanted - displacementAmount });
            writeUnableToLeaveStock(dispState, side, wanted - displacementAmount, currentTurn);
            if (displacementAmount <= 0) continue;

            const beforeOut = dispState.displaced_out;
            const beforeIn = dispState.displaced_in;
            const beforeLost = dispState.lost_population;
            for (const route of routing) {
                const destState = getOrInitDisplacementState(
                    state,
                    route.to_mun,
                    displacementState[route.to_mun]?.original_population ?? defaultOriginalPopulation
                );
                destState.displaced_in += route.amount;
                if (!destState.displaced_in_by_faction) destState.displaced_in_by_faction = {};
                destState.displaced_in_by_faction[side] = (destState.displaced_in_by_faction[side] ?? 0) + route.amount;
                destState.last_updated_turn = currentTurn;
                routingRecords.push(route);
            }
            dispState.displaced_out += displacementAmount;
            dispState.last_updated_turn = currentTurn;

            // Booked to the pressing side(s), pro rata; people leaving are not killed by leaving
            // (DA1 P3: the expulsion kill rate does not apply; deaths in place from shelling,
            // sniping and starvation are not modelled, register SD6).
            const noKilled: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
            for (const share of splitAmountByCauser(displacementAmount, causers)) {
                if (share.amount <= 0) continue;
                const byFaction: Record<FactionId, number> = { RBiH: 0, RS: 0, HRHB: 0 };
                byFaction[side] = share.amount;
                pushDisplacementEventLogFromMun(state, munId, settlements, byFaction, currentTurn, byFaction, share.faction, noKilled, sideSidSet);
            }

            // Only this side's pool loses manpower: only its people left (Engine seat).
            const reductionRatio = displacementAmount / Math.max(1, remainingPopulation);
            for (const key of poolKeysByMun.get(munId) ?? []) {
                const pool = militiaPools[key];
                if (pool.faction !== side) continue;
                const poolReduction = Math.floor(pool.available * reductionRatio);
                if (poolReduction > 0) {
                    pool.available = Math.max(0, pool.available - poolReduction);
                    pool.updated_turn = currentTurn;
                }
            }

            records.push({
                mun_id: munId,
                faction_id: side,
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

        // A9 P1 (SD13, 8-seat §6 ruling D9, 2026-11-25; DISPLACEMENT_MASTER §3.6): the negotiated-evacuation
        // convoy. After the siege trickle of every side here, so the trickle is unchanged. Per side, in canonical
        // order: the predicate (a)-(d) and the besieger's intent, all from state; the episode; at most one convoy.
        const episodes = dispState.negotiated_evacuation_by_side ?? {};
        for (const side of CANONICAL_FACTIONS) {
            const sideSids = munSids.filter((sid) => controllerOf.get(sid) === side);
            if (sideSids.length === 0) {
                delete episodes[side];
                continue;
            }
            const body = bodies.get(side);
            // (a) B3's test: no link to the main body and no sourced crossing.
            const separate = !siegeLeaversReachMainBody(side, body, munSids, sideSids, neighbours, controllerOf, pocketCrossings);
            let episode: NegotiatedEvacuationEpisode | undefined = episodes[side];
            if (!separate && !episode) continue;

            // (d) the squeeze: a pressing side took a settlement of the pocket (in this municipality, or next to
            // the pocket's own bodies) from this side within the window.
            const pocketBodies = new Set<number>();
            for (const sid of sideSids) {
                const b = body?.bodyOf.get(sid);
                if (b !== undefined) pocketBodies.add(b);
            }
            const squeezers = new Set<FactionId>();
            for (const cap of recentCaptures) {
                if (cap.from !== side || squeezers.has(cap.to)) continue;
                const ofPocket = cap.mun === munId || (neighbours.get(cap.sid) ?? []).some((nb) => {
                    const b = controllerOf.get(nb) === side ? body?.bodyOf.get(nb) : undefined;
                    return b !== undefined && pocketBodies.has(b);
                });
                if (ofPocket) squeezers.add(cap.to);
            }
            // The besieger: the pressing sides `resolvePressingFactions` names, by weight (ties in canonical
            // order), that took ground of the pocket; the first one with intent, else the first one.
            const causers = resolvePressingFactions(state, munId, side, new Set(munSids), frontEdges, side).causers
                .filter((c) => c.faction !== UNKNOWN_CAUSER_BUCKET && squeezers.has(c.faction))
                .map((c, i) => ({ ...c, i }))
                .sort((a, b) => b.weight - a.weight || a.i - b.i);
            const presentShare = getDynamicHostileShare(munId, side, dispState, population1991ByMun) > 0;
            const hasIntent = (p: FactionId): boolean => takeoverIntentPairs.has(`${side}|${p}`) || presentShare;
            const besieger = causers.find((c) => hasIntent(c.faction))?.faction ?? causers[0]?.faction ?? null;
            const squeeze = besieger !== null;
            const intent = besieger !== null && hasIntent(besieger);

            // (b) the A5 siege trigger; (c) the municipality at its receiving capacity (§4.3).
            const siege = (siegeTurnsBySide.get(side) ?? 0) >= UNSUPPLIED_PRESSURE_TURNS;
            const current = dispState.original_population + dispState.displaced_in - dispState.displaced_out - dispState.lost_population;
            const atCapacity = current >= Math.floor(dispState.original_population * getReceivingCapacityFraction(munId));
            const open = separate && siege && atCapacity && squeeze && intent;

            // The episode closes when the squeeze ends; a new squeeze is a new episode.
            if (!squeeze) {
                delete episodes[side];
                episode = undefined;
            } else if (open && !episode) {
                episode = { opened_turn: currentTurn, convoys: 0, people: 0, last_convoy_turn: null, refused_turn: null };
                episodes[side] = episode;
            }
            const refused = episode !== undefined && episode.refused_turn !== null && canRefuseNegotiatedEvacuation(state, side);

            // The convoy: at most one a week, at most NEGOTIATED_EVACUATION_CONVOY_MAX people and what is left of
            // the episode cap, to the side's supplied main body only (A5's destinations), within receiving
            // capacity. Sheltered people board first, then residents. Only people with a place to go board: the
            // rest stay in the pocket, so people leaving = people arriving (no kill, no flight abroad, no overflow).
            let convoy = 0;
            if (open && episode && besieger !== null && !refused && episode.last_convoy_turn !== currentTurn &&
                episode.people < NEGOTIATED_EVACUATION_EPISODE_CAP) {
                const sheltered = Math.max(0, Math.floor(dispState.displaced_in_by_faction?.[side] ?? 0));
                const sidePop = sideSids.reduce((s, sid) => s + (popOf.get(sid) ?? 0), 0);
                const residents = heldPeopleOfSide(munId, side, dispState, sidePop, munPop, population1991ByMun);
                const load = Math.min(NEGOTIATED_EVACUATION_CONVOY_MAX, NEGOTIATED_EVACUATION_EPISODE_CAP - episode.people, sheltered + residents);
                const routing = load > 0
                    ? routeDisplacedPopulation(munId, side, load, state.displacement.displacement_state, munControl, besieger,
                        siegeDestinations.get(side) ?? new Set<MunicipalityId>())
                    : [];
                for (const route of routing) {
                    const destState = getOrInitDisplacementState(
                        state, route.to_mun, state.displacement.displacement_state[route.to_mun]?.original_population ?? defaultOriginalPopulation
                    );
                    destState.displaced_in += route.amount;
                    const destByFaction = (destState.displaced_in_by_faction ??= {});
                    destByFaction[side] = (destByFaction[side] ?? 0) + route.amount;
                    destState.last_updated_turn = currentTurn;
                    routingRecords.push({ ...route, reason: 'negotiated_evacuation' });
                    convoy += route.amount;
                }
                if (convoy > 0) {
                    const fromSheltered = Math.min(sheltered, convoy);
                    const fromResidents = convoy - fromSheltered;
                    if (fromSheltered > 0) {
                        dispState.displaced_in = Math.max(0, dispState.displaced_in - fromSheltered);
                        const byFaction = dispState.displaced_in_by_faction;
                        if (byFaction) {
                            const rest = (byFaction[side] ?? 0) - fromSheltered;
                            if (rest > 0) byFaction[side] = rest;
                            else delete byFaction[side];
                        }
                    }
                    dispState.displaced_out += fromResidents;
                    dispState.last_updated_turn = currentTurn;
                    episode.convoys += 1;
                    episode.people += convoy;
                    episode.last_convoy_turn = currentTurn;
                    evacuationRecords.push({
                        turn: currentTurn, mun_id: munId, side, besieger, people: convoy, from_sheltered: fromSheltered,
                        from_residents: fromResidents, convoy: episode.convoys, episode_people: episode.people,
                        reason: 'negotiated_evacuation',
                    });
                }
            }

            evacuationRows.push({
                mun_id: munId, faction_id: side, separate, siege, at_capacity: atCapacity, squeeze, besieger, intent, open,
                refused, cap_reached: episode !== undefined && episode.people >= NEGOTIATED_EVACUATION_EPISODE_CAP,
                convoy, episode_people: episode?.people ?? 0,
            });
        }
        if (Object.keys(episodes).length > 0) dispState.negotiated_evacuation_by_side = episodes;
        else delete dispState.negotiated_evacuation_by_side;

        if (Object.keys(counters).length > 0) dispState.unsupplied_pressure_by_side = counters;
        else delete dispState.unsupplied_pressure_by_side;
        if (Object.keys(carries).length > 0) dispState.siege_outflow_carry_by_side = carries;
        else delete dispState.siege_outflow_carry_by_side;
    }

    records.sort((a, b) => strictCompare(a.mun_id, b.mun_id) || strictCompare(String(a.faction_id), String(b.faction_id)));
    routingRecords.sort((a, b) => {
        const fromCmp = strictCompare(a.from_mun, b.from_mun);
        if (fromCmp !== 0) return fromCmp;
        const toCmp = strictCompare(a.to_mun, b.to_mun);
        if (toCmp !== 0) return toCmp;
        return a.amount - b.amount;
    });

    // Enforce recruitment ceilings after all displacement updates
    enforceRecruitmentCeilings(state);

    trappedRecords.sort((a, b) => strictCompare(a.mun_id, b.mun_id) || strictCompare(a.faction_id, b.faction_id));
    // A9 P1: the convoy records are display only (append, keep sorted; nothing in the sim reads them).
    if (evacuationRecords.length > 0) {
        const list = (state.displacement.negotiated_evacuation_records ??= []);
        list.push(...evacuationRecords);
        list.sort((a, b) => a.turn - b.turn || strictCompare(a.mun_id, b.mun_id) || strictCompare(a.side, b.side));
    }
    const report: DisplacementStepReport = { by_municipality: records, routing: routingRecords };
    if (trappedRecords.length > 0) report.trapped = trappedRecords;
    if (evacuationRows.length > 0) report.negotiated_evacuation = evacuationRows;
    return report;
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
