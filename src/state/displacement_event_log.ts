/**
 * LANE D-PRE substrate: unified append helper for displacement_event_log.
 *
 * Pushes the event onto the legacy log (still active in D-PRE; consumers still
 * scan full history) AND updates two new bounded aggregate structures:
 *   - state.displacement.displacement_humanitarian_aggregates
 *     (faction x ethnicity -> {refugees_created, refugees_received,
 *     civilian_casualties_caused})
 *   - state.displacement.displacement_origin_dest_arrivals
 *     (origin_mun|ethnicity -> dest_mun -> settled_total)
 *
 * D-PRE invariant: this helper is purely additive — the legacy log is still
 * pushed and unmodified, and the new aggregates are unread by consumers, so
 * the 40w hash MUST stay byte-stable to baseline 765c1c19912ce9e8.
 *
 * D-CONTENT (separate lane) will rebind compute_capital.ts:173 and
 * brigade_reconstitution.ts:184 to consume the aggregates and switch the
 * legacy log to streaming-and-cleared.
 *
 * G1 invariant (property-tested in tests/state/displacement_event_log.test.ts):
 * For any sequence of events appended via this helper, the aggregate values
 * exactly equal what the existing consumers (compute_capital.ts:173,
 * brigade_reconstitution.ts:184) would compute via a full-history scan of
 * the legacy log under matching state assumptions (controllers stable across
 * the test sequence so capture-time == read-time).
 *
 * Determinism: this helper is order-insensitive (sums commute), no
 * Math.random / Date.now / async; iteration over the input event itself only.
 */

import type { DisplacementEvent, GameState } from './game_state.js';

/**
 * Bucket key for events with no caused_by attribution. Distinct from any
 * canonical faction id so we never collide with 'RBiH' / 'RS' / 'HRHB'.
 */
export const UNKNOWN_CAUSER_BUCKET = '_unknown';

/**
 * Append a DisplacementEvent to state.displacement.displacement_event_log
 * AND update the LANE D-PRE bounded humanitarian / origin-dest aggregates.
 *
 * Replaces 6 existing in-line `state.displacement.displacement_event_log.push`
 * sites:
 *   - src/state/displacement.ts:441
 *   - src/state/displacement_takeover.ts:386, 725, 850
 *   - src/state/minority_flight.ts:365
 *   - src/sim/combat/paramilitary_sweep.ts:568
 *
 * The legacy log is still pushed (D-PRE substrate-only; consumers untouched).
 * The aggregate fields are written but not read in D-PRE — consumers rebind
 * in D-CONTENT.
 */
export function appendDisplacementEvent(state: GameState, event: DisplacementEvent): void {
    // 1. Legacy log push (unchanged behavior — D-PRE keeps consumers happy).
    if (!state.displacement.displacement_event_log) {
        state.displacement.displacement_event_log = [];
    }
    state.displacement.displacement_event_log.push(event);

    // 2. Humanitarian aggregates (refugees_created, refugees_received,
    //    civilian_casualties_caused).
    if (!state.displacement.displacement_humanitarian_aggregates) {
        state.displacement.displacement_humanitarian_aggregates = {};
    }
    const humAgg = state.displacement.displacement_humanitarian_aggregates;

    // 2a. refugees_created + civilian_casualties_caused are attributed to
    //     event.caused_by (the causer faction). The consumer's read-time
    //     fallback (`controllers[evt.origin_osid]` when caused_by is missing)
    //     is replicated here at append time, so the aggregate matches the
    //     consumer's computation when controllers are stable across turns
    //     (the regime under which D-CONTENT will rebind).
    const causedByEffective = event.caused_by ?? resolveCauserFromControllers(state, event.origin_osid);
    const causerKey = causedByEffective ?? UNKNOWN_CAUSER_BUCKET;
    const refugeesCreated = (event.displaced ?? 0) + (event.killed ?? 0) + (event.fled_abroad ?? 0);
    const civCasCaused = event.killed ?? 0;
    if (refugeesCreated > 0 || civCasCaused > 0) {
        const causerEthBucket = (humAgg[causerKey] ??= {});
        const eth = (causerEthBucket[event.ethnicity] ??= {
            refugees_created: 0,
            refugees_received: 0,
            civilian_casualties_caused: 0,
        });
        eth.refugees_created += refugeesCreated;
        eth.civilian_casualties_caused += civCasCaused;
    }

    // 2b. refugees_received is attributed to the faction controlling
    //     event.dest_osid at append time (mirrors consumer's read at line
    //     184: `controllers[evt.dest_osid] === faction`). When dest_osid
    //     is unknown, this contribution is dropped (matches consumer's
    //     `if (evt.dest_osid && ...)` guard).
    const settled = event.settled ?? 0;
    if (settled > 0 && event.dest_osid) {
        const receiverFaction = resolveCauserFromControllers(state, event.dest_osid);
        if (receiverFaction !== undefined) {
            const recvEthBucket = (humAgg[receiverFaction] ??= {});
            const eth = (recvEthBucket[event.ethnicity] ??= {
                refugees_created: 0,
                refugees_received: 0,
                civilian_casualties_caused: 0,
            });
            eth.refugees_received += settled;
        }
    }

    // 3. Origin-dest arrivals aggregate (per (origin_mun, ethnicity) ->
    //    dest_mun -> settled_total). Only counts cross-municipality
    //    settlements (matches brigade_reconstitution.ts:193:
    //    `if (!evt.dest_mun || evt.dest_mun === homeMun) continue`).
    //    The consumer's defensive `evt.settled ?? evt.displaced ?? 0`
    //    fallback at line 194 is intentionally NOT replicated here:
    //    every production event has a numeric `settled` (defaulted to 0
    //    at append sites), so the aggregate is correct under the current
    //    schema. Property test asserts this matches.
    if (settled > 0 && event.dest_mun && event.dest_mun !== event.origin_mun) {
        if (!state.displacement.displacement_origin_dest_arrivals) {
            state.displacement.displacement_origin_dest_arrivals = {};
        }
        const odMap = state.displacement.displacement_origin_dest_arrivals;
        const compositeKey = `${event.origin_mun}|${event.ethnicity}`;
        const destBucket = (odMap[compositeKey] ??= {});
        destBucket[event.dest_mun] = (destBucket[event.dest_mun] ?? 0) + settled;
    }
}

/**
 * Resolve the faction controlling a given OSID via state.political.
 * Returns undefined when controllers are missing or the OSID is unknown
 * (matches consumer fallback semantics in compute_capital.ts:177-178).
 */
function resolveCauserFromControllers(
    state: GameState,
    osid: string | undefined,
): string | undefined {
    if (!osid) return undefined;
    const controllers = state.political?.political_controllers as Record<string, string> | undefined;
    if (!controllers) return undefined;
    return controllers[osid];
}
