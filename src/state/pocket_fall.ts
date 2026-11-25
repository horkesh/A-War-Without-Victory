/**
 * A9 P0-A (SD13): the pocket-fall step. 8-seat §6 ruling D1-D7 (2026-11-25), with the orchestrator's
 * ruling on the originals branch (matured takeover timers do not block; a per-side booked-once marker).
 *
 * When a side X holds ZERO settlements in a municipality M and the B2 pass-through resolver gives X's
 * people no destination, the people X still has there are taken: X's sheltered stock and, only where M
 * contains a settlement of one of X's `ENCLAVE_DEFINITIONS` enclaves and no live or dormant takeover
 * timer for X's people exists in M, X's original residents (booked once). Killed are booked only at such
 * an enclave fall, by one sourced ratio; a negotiated fall (authored flag) books killed as "not
 * recorded". Survivors go to X's main-body supplied municipalities within capacity; the overflow fled
 * abroad. One aggregate record per fall (`displacement.pocket_fall_records`, display only).
 *
 * Sensitive history: aggregates only, attributed to the captor's forces. Nothing here feeds a score,
 * capital, condemnation input, the displacement event log, humanitarian aggregates, civilian casualties,
 * origin/destination arrivals (reconstitution Path B) or any militia pool. Formations are never touched.
 *
 * Where the resolver DOES give X a destination (D7), only the sheltered stock is moved there, within
 * capacity, with no kill, no flight abroad, no evacuation booking and no record.
 *
 * Stateless trigger: the step reads this turn's control only. Deterministic: municipalities in
 * `strictCompare` order, sides in CANONICAL_FACTIONS order.
 */

import type { EdgeRecord, SettlementRecord } from '../map/settlements.js';
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from '../sim/combat/enclave_resilience.js';
import {
    buildMainBodySuppliedDestinations,
    buildPassThroughDestinationResolver,
    resolveMunicipalityHolder,
    routeDisplacedWithCapacity,
    splitDisplacedByEthnicityWithSource,
    type DisplacementRoutingRecord,
} from './displacement.js';
import { ASSAULTED_POCKET_FALL_KILL_RATIO } from './displacement_loss_constants.js';
import { getOrInitDisplacementState } from './displacement_state_utils.js';
import type { PassThroughDestinationResolver } from './displacement_takeover.js';
import {
    CANONICAL_FACTIONS,
    type DisplacementState,
    type FactionId,
    type GameState,
    type MunicipalityId,
    type PocketFallRecord,
} from './game_state.js';
import type { MunicipalityPopulation1991Map } from './population_share.js';
import { strictCompare } from './validateGameState.js';

export { ASSAULTED_POCKET_FALL_KILL_RATIO } from './displacement_loss_constants.js';
export type { PocketFallRecord } from './game_state.js';

/**
 * Authored flag (`state.military.event_flags`) that makes the Žepa fall a negotiated evacuation. Set only
 * by event data (`zepa_falls_1995` in data/scenarios/events/war_1995.json), never computed.
 */
export const POCKET_FALL_NEGOTIATED_FLAG = 'zepa_negotiated_evacuation';

/** The enclave whose fall the negotiated flag describes. */
const NEGOTIATED_ENCLAVE_ID = 'zepa';

/** Turn report of the step. Never GameState. */
export interface PocketFallStepReport {
    /** One row per firing (the same rows appended to `pocket_fall_records`), for the firing census. */
    firings: PocketFallRecord[];
    /** D7 same-body moves of a sheltered stock (no record, no kill). */
    same_body_moves: DisplacementRoutingRecord[];
}

function munOfOsid(sid: string): MunicipalityId | undefined {
    const parts = sid.split(':');
    return parts.length >= 3 && parts[0] === 'op' ? parts[1] : undefined;
}

/** Does M contain a settlement of one of `side`'s ENCLAVE_DEFINITIONS enclaves (optionally one id)? */
function containsOwnEnclaveSettlement(osidsInMun: readonly string[], side: FactionId, enclaveId?: string): boolean {
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (enclave.faction !== side) continue;
        if (enclaveId !== undefined && enclave.id !== enclaveId) continue;
        if (osidsInMun.some((sid) => osidBelongsToEnclave(sid, enclave))) return true;
    }
    return false;
}

/** A takeover timer for `side`'s people in M that is still pending (not matured) or dormant. */
function hasBlockingTakeoverTimer(state: GameState, munId: MunicipalityId, side: FactionId): boolean {
    const timers = state.displacement.hostile_takeover_timers ?? {};
    for (const key of Object.keys(timers).sort(strictCompare)) {
        const t = timers[key];
        if (!t || t.mun_id !== munId || t.from_faction !== side) continue;
        if (t.dormant_since_turn !== undefined || t.matured_turn === undefined) return true;
    }
    return false;
}

/**
 * X's original residents taken at a pocket fall (ruling D1b/D2 with the orchestrator's corrections).
 * 0 unless M contains a settlement of an X enclave, no pending or dormant takeover timer for X's people
 * exists in M, and X's originals here were never booked. Otherwise X's 1991 census share of M's
 * remaining residents (original - out - lost), by the siege path's census split, floored.
 */
export function originalsStock(
    state: GameState,
    munId: MunicipalityId,
    side: FactionId,
    entry: DisplacementState,
    osidsInMun: readonly string[],
    population1991ByMun: MunicipalityPopulation1991Map | undefined
): number {
    if (!containsOwnEnclaveSettlement(osidsInMun, side)) return 0;
    if (hasBlockingTakeoverTimer(state, munId, side)) return 0;
    if (entry.pocket_fall_originals_booked_by_side?.[side] !== undefined) return 0;
    const remaining = Math.max(0, Math.floor(entry.original_population - entry.displaced_out - entry.lost_population));
    if (remaining <= 0) return 0;
    const { split } = splitDisplacedByEthnicityWithSource(munId, remaining, population1991ByMun);
    const share = side === 'RS' ? split.RS : side === 'HRHB' ? split.HRHB : split.RBiH;
    return Math.max(0, Math.floor(share));
}

/** Book routed rows at their destinations (sheltered arrivals of `people`). No event, no pool. */
function bookArrivals(state: GameState, routing: readonly DisplacementRoutingRecord[], people: FactionId, turn: number): number {
    let total = 0;
    for (const route of routing) {
        if (route.amount <= 0) continue;
        const dest = getOrInitDisplacementState(
            state, route.to_mun, state.displacement.displacement_state?.[route.to_mun]?.original_population ?? 10000
        );
        dest.displaced_in += route.amount;
        const byFaction = (dest.displaced_in_by_faction ??= {});
        byFaction[people] = (byFaction[people] ?? 0) + route.amount;
        dest.last_updated_turn = turn;
        total += route.amount;
    }
    return total;
}

/** Remove `amount` of `people`'s sheltered stock from M (the key is deleted at 0). */
function removeSheltered(entry: DisplacementState, people: FactionId, amount: number): void {
    if (amount <= 0) return;
    entry.displaced_in = Math.max(0, entry.displaced_in - amount);
    const byFaction = entry.displaced_in_by_faction;
    if (!byFaction) return;
    const rest = (byFaction[people] ?? 0) - amount;
    if (rest > 0) byFaction[people] = rest;
    else delete byFaction[people];
}

export function processPocketFalls(
    state: GameState,
    /** OSID-keyed settlements. */
    settlements: Map<string, SettlementRecord>,
    /** OSID edges. */
    edges: ReadonlyArray<EdgeRecord>,
    suppliedByFaction: ReadonlyMap<string, ReadonlySet<string>>,
    population1991ByMun?: MunicipalityPopulation1991Map
): PocketFallStepReport {
    const report: PocketFallStepReport = { firings: [], same_body_moves: [] };
    const all = state.displacement?.displacement_state;
    if (!all) return report;
    const turn = state.meta.turn;

    // This turn's control per municipality, from the OSID controllers.
    const pc = state.political.political_controllers ?? {};
    const osidsByMun = new Map<MunicipalityId, string[]>();
    const heldByMun = new Map<MunicipalityId, Map<FactionId, number>>();
    for (const sid of Object.keys(pc).sort(strictCompare)) {
        const mun = munOfOsid(sid);
        if (mun === undefined) continue;
        const list = osidsByMun.get(mun) ?? [];
        list.push(sid);
        osidsByMun.set(mun, list);
        const holder = CANONICAL_FACTIONS.find((f) => f === pc[sid]);
        if (holder === undefined) continue;
        const held = heldByMun.get(mun) ?? new Map<FactionId, number>();
        held.set(holder, (held.get(holder) ?? 0) + 1);
        heldByMun.set(mun, held);
    }

    let resolver: PassThroughDestinationResolver | undefined;
    let mainBody: Map<FactionId, Set<MunicipalityId>> | undefined;
    const negotiatedFlag = state.military?.event_flags?.[POCKET_FALL_NEGOTIATED_FLAG] === true;
    const records: PocketFallRecord[] = [];

    for (const munId of Object.keys(all).sort(strictCompare)) {
        const entry = all[munId];
        if (!entry) continue;
        const osidsInMun = osidsByMun.get(munId) ?? [];
        const held = heldByMun.get(munId);
        // Nobody holds any settlement here: no captor, so nothing fell.
        const captor = held ? resolveMunicipalityHolder(held) : null;
        if (captor === null) continue;

        for (const side of CANONICAL_FACTIONS) {
            // (a) the side holds zero settlements in M (this also gives (d)).
            if ((held?.get(side) ?? 0) > 0) continue;
            const sheltered = Math.max(0, Math.floor(entry.displaced_in_by_faction?.[side] ?? 0));

            // (c) the B2 resolver (with P0-B). A destination means a same-body move of the sheltered stock (D7).
            resolver ??= buildPassThroughDestinationResolver(state, edges, suppliedByFaction);
            const reachable = resolver(side, munId);
            if (reachable !== null && reachable.size > 0) {
                if (sheltered <= 0) continue;
                const moves = routeDisplacedWithCapacity(state, munId, side, sheltered, captor, reachable);
                const moved = bookArrivals(state, moves, side, turn);
                if (moved > 0) {
                    removeSheltered(entry, side, moved);
                    entry.last_updated_turn = turn;
                    report.same_body_moves.push(...moves);
                }
                continue;
            }

            // (b) a stock to take.
            const originals = originalsStock(state, munId, side, entry, osidsInMun, population1991ByMun);
            const taken = sheltered + originals;
            if (taken <= 0) continue;

            // D3: killed only at a fall of one of the side's enclaves; a negotiated Žepa fall records none.
            const enclaveFall = containsOwnEnclaveSettlement(osidsInMun, side);
            const negotiated = enclaveFall && negotiatedFlag && containsOwnEnclaveSettlement(osidsInMun, side, NEGOTIATED_ENCLAVE_ID);
            const killed = enclaveFall && !negotiated ? Math.floor(taken * ASSAULTED_POCKET_FALL_KILL_RATIO) : 0;
            const killedOriginals = Math.floor((killed * originals) / taken);
            const left = taken - killed;

            // D4: survivors to the side's main-body supplied municipalities, within capacity; the rest fled abroad.
            mainBody ??= buildMainBodySuppliedDestinations(state, settlements, edges, suppliedByFaction);
            const routes = routeDisplacedWithCapacity(state, munId, side, left, captor, mainBody.get(side) ?? new Set<MunicipalityId>());
            const routed = bookArrivals(state, routes, side, turn);
            const fledAbroad = left - routed;

            removeSheltered(entry, side, sheltered);
            if (originals > 0) {
                entry.displaced_out += originals - killedOriginals;
                entry.lost_population += killedOriginals;
                (entry.pocket_fall_originals_booked_by_side ??= {})[side] = turn;
            }
            entry.last_updated_turn = turn;

            const record: PocketFallRecord = {
                turn,
                mun_id: munId,
                side,
                captor,
                left: routed + fledAbroad,
                routed,
                fled_abroad: fledAbroad,
                killed: negotiated ? null : killed,
                negotiated,
                reason: 'pocket_fall',
            };
            records.push(record);
            report.firings.push({ ...record });
        }
    }

    if (records.length > 0) {
        const list = (state.displacement.pocket_fall_records ??= []);
        list.push(...records);
        list.sort((a, b) => a.turn - b.turn || strictCompare(a.mun_id, b.mun_id) || strictCompare(a.side, b.side));
    }
    return report;
}
