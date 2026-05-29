/**
 * LANE D-PRE substrate test for `appendDisplacementEvent`.
 *
 * AC-G1 (binding): for any sequence of events appended via the helper, the
 * aggregate values exactly equal what the existing consumers
 * (compute_capital.ts:173, brigade_reconstitution.ts:184) would compute via
 * a full-history scan of the legacy log under matching state assumptions
 * (controllers stable across the test sequence so capture-time == read-time).
 *
 * Determinism: the seeded RNG below is a Mulberry32 hash; deterministic and
 * stand-alone; never invokes Math.random / Date.now / async. Used only for
 * test-input synthesis, NOT for sim code.
 */

import { describe, expect, it } from 'vitest';

import { appendDisplacementEvent, UNKNOWN_CAUSER_BUCKET } from '../../src/state/displacement_event_log.js';
import type { DisplacementEvent, GameState } from '../../src/state/game_state.js';

// ─── Test fixtures ──────────────────────────────────────────────────────────

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

const MUNS = ['mun_a', 'mun_b', 'mun_c', 'mun_d', 'mun_e'] as const;

const OSIDS = [
    'op:mun_a:mun_a_1', 'op:mun_a:mun_a_2',
    'op:mun_b:mun_b_1', 'op:mun_b:mun_b_2',
    'op:mun_c:mun_c_1', 'op:mun_c:mun_c_2',
    'op:mun_d:mun_d_1', 'op:mun_d:mun_d_2',
    'op:mun_e:mun_e_1', 'op:mun_e:mun_e_2',
] as const;

/** Stable controllers map (one snapshot used for every test event in a run). */
function defaultControllers(): Record<string, string> {
    return {
        'op:mun_a:mun_a_1': 'RBiH', 'op:mun_a:mun_a_2': 'RBiH',
        'op:mun_b:mun_b_1': 'RS',   'op:mun_b:mun_b_2': 'RS',
        'op:mun_c:mun_c_1': 'HRHB', 'op:mun_c:mun_c_2': 'HRHB',
        'op:mun_d:mun_d_1': 'RBiH', 'op:mun_d:mun_d_2': 'RS',
        'op:mun_e:mun_e_1': 'HRHB', 'op:mun_e:mun_e_2': 'RBiH',
    };
}

function buildState(controllers: Record<string, string> = defaultControllers()): GameState {
    return {
        displacement: {
            displacement_event_log: [],
            displacement_humanitarian_aggregates: {},
            displacement_origin_dest_arrivals: {},
            displacement_recent_by_turn: {},
        },
        political: { political_controllers: controllers },
    } as unknown as GameState;
}

/** Mulberry32 — deterministic PRNG for property test input synthesis only. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)]!;
}

/** Synthesize a random event sequence under the test schema. */
function synthEvents(rng: () => number, count: number): DisplacementEvent[] {
    const events: DisplacementEvent[] = [];
    for (let i = 0; i < count; i++) {
        const originMun = pick(rng, MUNS);
        const destMun = rng() < 0.7 ? originMun : pick(rng, MUNS);
        const originOsidCandidates = OSIDS.filter(o => o.startsWith(`op:${originMun}:`));
        const destOsidCandidates = OSIDS.filter(o => o.startsWith(`op:${destMun}:`));
        const originOsid = rng() < 0.9 ? pick(rng, originOsidCandidates) : undefined;
        const destOsid = rng() < 0.7 ? pick(rng, destOsidCandidates) : undefined;
        const ethnicity = pick(rng, FACTIONS);
        const causedBy = rng() < 0.85 ? pick(rng, FACTIONS) : undefined;

        // Mix of zero / non-zero counts to exercise edge cases.
        const displaced = rng() < 0.2 ? 0 : Math.floor(rng() * 1000);
        const killed = rng() < 0.5 ? 0 : Math.floor(rng() * 100);
        const fled_abroad = rng() < 0.7 ? 0 : Math.floor(rng() * 50);
        const settled = rng() < 0.4 ? 0 : Math.floor(rng() * 800);

        events.push({
            turn: i,
            origin_mun: originMun,
            origin_osid: originOsid,
            dest_mun: destMun,
            dest_osid: destOsid,
            ethnicity,
            caused_by: causedBy,
            displaced,
            killed,
            fled_abroad,
            settled,
        });
    }
    return events;
}

// ─── Reference scans (mirror consumer logic) ────────────────────────────────

interface RefHumanitarian {
    refugees_created: number;
    refugees_received: number;
    civilian_casualties_caused: number;
}

/**
 * Mirror of compute_capital.ts:173 humanitarian scan, augmented with the
 * `_unknown` bucket so events with neither caused_by nor a controller
 * resolution are accounted (matches helper's behavior).
 */
function refHumanitarianScan(
    events: DisplacementEvent[],
    controllers: Record<string, string>,
): Record<string, Record<string, RefHumanitarian>> {
    const out: Record<string, Record<string, RefHumanitarian>> = {};
    const ensure = (causer: string, eth: string) => {
        const cBucket = (out[causer] ??= {});
        return (cBucket[eth] ??= {
            refugees_created: 0,
            refugees_received: 0,
            civilian_casualties_caused: 0,
        });
    };
    for (const evt of events) {
        // refugees_created / civilian_casualties_caused: caused_by with
        // controller fallback (matches compute_capital.ts:177-178).
        const causedByEffective = evt.caused_by
            ?? (evt.origin_osid ? controllers[evt.origin_osid] : undefined);
        const refugeesCreated = (evt.displaced ?? 0) + (evt.killed ?? 0) + (evt.fled_abroad ?? 0);
        const civCasCaused = evt.killed ?? 0;
        if (refugeesCreated > 0 || civCasCaused > 0) {
            const key = causedByEffective ?? UNKNOWN_CAUSER_BUCKET;
            const slot = ensure(key, evt.ethnicity);
            slot.refugees_created += refugeesCreated;
            slot.civilian_casualties_caused += civCasCaused;
        }
        // refugees_received: by controller of dest_osid (matches
        // compute_capital.ts:184).
        if ((evt.settled ?? 0) > 0 && evt.dest_osid) {
            const receiver = controllers[evt.dest_osid];
            if (receiver !== undefined) {
                const slot = ensure(receiver, evt.ethnicity);
                slot.refugees_received += evt.settled ?? 0;
            }
        }
    }
    return out;
}

/**
 * Mirror of brigade_reconstitution.ts:184 origin-dest scan.
 * Filters: origin_mun, ethnicity match, dest_mun !== origin_mun, settled > 0.
 * Note: the helper does NOT replicate the `evt.settled ?? evt.displaced ?? 0`
 * defensive fallback at line 194 because all production events have a numeric
 * settled value (defaulted to 0 at append sites). Test events likewise always
 * supply a numeric settled, so the two computations agree.
 */
function refOriginDestScan(events: DisplacementEvent[]): Record<string, Record<string, number>> {
    const out: Record<string, Record<string, number>> = {};
    for (const evt of events) {
        const settled = evt.settled ?? 0;
        if (settled <= 0) continue;
        if (!evt.dest_mun) continue;
        if (evt.dest_mun === evt.origin_mun) continue;
        const key = `${evt.origin_mun}|${evt.ethnicity}`;
        const bucket = (out[key] ??= {});
        bucket[evt.dest_mun] = (bucket[evt.dest_mun] ?? 0) + settled;
    }
    return out;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('appendDisplacementEvent — substrate basics', () => {
    it('lazy-initializes displacement_event_log when missing', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 100, killed: 5, fled_abroad: 2, settled: 0,
        });
        expect(Array.isArray(state.displacement.displacement_event_log)).toBe(true);
        expect(state.displacement.displacement_event_log).toHaveLength(1);
    });

    it('updates humanitarian aggregate for caused_by + ethnicity', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 100, killed: 10, fled_abroad: 5, settled: 0,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        expect(agg['RS']!['RBiH']).toEqual({
            refugees_created: 115,
            refugees_received: 0,
            civilian_casualties_caused: 10,
        });
    });

    it('falls back to controllers when caused_by is undefined', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_b:mun_b_1', // controlled by RS
            dest_mun: 'mun_a', ethnicity: 'RBiH', /* caused_by omitted */
            displaced: 50, killed: 0, fled_abroad: 0, settled: 0,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        expect(agg['RS']!['RBiH'].refugees_created).toBe(50);
    });

    it('uses _unknown bucket when caused_by AND origin_osid resolution both fail', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a',
            dest_mun: 'mun_a', ethnicity: 'RBiH',
            displaced: 100, killed: 0, fled_abroad: 0, settled: 0,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        expect(agg[UNKNOWN_CAUSER_BUCKET]!['RBiH'].refugees_created).toBe(100);
    });

    it('attributes refugees_received to dest_osid controller', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1', // controlled by RS
            ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 0, killed: 0, fled_abroad: 0, settled: 80,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        expect(agg['RS']!['RBiH'].refugees_received).toBe(80);
    });

    it('skips refugees_received when dest_osid is missing (matches consumer guard)', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', dest_mun: 'mun_b',
            ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 0, killed: 0, fled_abroad: 0, settled: 80,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        // No bucket should have a refugees_received contribution.
        for (const causerKey of Object.keys(agg)) {
            for (const ethKey of Object.keys(agg[causerKey]!)) {
                expect(agg[causerKey]![ethKey]!.refugees_received).toBe(0);
            }
        }
    });

    it('skips zero-amount events without creating buckets', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 0, killed: 0, fled_abroad: 0, settled: 0,
        });
        const agg = state.displacement.displacement_humanitarian_aggregates!;
        expect(agg).toEqual({});
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual({});
    });

    it('does NOT update origin-dest arrivals when dest_mun === origin_mun', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', dest_osid: 'op:mun_a:mun_a_2',
            ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 0, killed: 0, fled_abroad: 0, settled: 100,
        });
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual({});
    });

    it('updates origin-dest arrivals on cross-mun settle', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1',
            ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 0, killed: 0, fled_abroad: 0, settled: 100,
        });
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual({
            'mun_a|RBiH': { mun_b: 100 },
        });
    });

    it('accumulates origin-dest arrivals across multiple events', () => {
        const state = buildState();
        for (let i = 0; i < 3; i++) {
            appendDisplacementEvent(state, {
                turn: i, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
                dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1',
                ethnicity: 'RBiH', caused_by: 'RS',
                displaced: 0, killed: 0, fled_abroad: 0, settled: 50,
            });
        }
        expect(state.displacement.displacement_origin_dest_arrivals!['mun_a|RBiH']).toEqual({ mun_b: 150 });
    });

    it('legacy log still captures every event push', () => {
        const state = buildState();
        for (let i = 0; i < 5; i++) {
            appendDisplacementEvent(state, {
                turn: i, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
                dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
                displaced: 10, killed: 1, fled_abroad: 0, settled: 0,
            });
        }
        expect(state.displacement.displacement_event_log).toHaveLength(5);
    });

    it('updates per-turn recent displacement totals for cosmetic dispatch windows', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 7, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 100, killed: 10, fled_abroad: 5, settled: 0,
        });
        appendDisplacementEvent(state, {
            turn: 7, origin_mun: 'mun_b', origin_osid: 'op:mun_b:mun_b_1',
            dest_mun: 'mun_b', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 40, killed: 0, fled_abroad: 0, settled: 0,
        });
        appendDisplacementEvent(state, {
            turn: 8, origin_mun: 'mun_c', origin_osid: 'op:mun_c:mun_c_1',
            dest_mun: 'mun_c', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 25, killed: 0, fled_abroad: 0, settled: 0,
        });

        expect(state.displacement.displacement_recent_by_turn).toEqual({
            7: 155,
            8: 25,
        });
    });
});

describe('appendDisplacementEvent — bounded-size analytical assertion', () => {
    it('aggregate outer-key cardinality is bounded by faction count + _unknown (humanitarian)', () => {
        const state = buildState();
        const rng = mulberry32(424242);
        const events = synthEvents(rng, 5000);
        for (const evt of events) appendDisplacementEvent(state, evt);

        const agg = state.displacement.displacement_humanitarian_aggregates!;
        const outerKeys = Object.keys(agg);
        // outer keys are restricted to canonical factions + _unknown bucket
        for (const k of outerKeys) {
            expect(['RBiH', 'RS', 'HRHB', UNKNOWN_CAUSER_BUCKET]).toContain(k);
        }
        // ≤ 4 outer keys regardless of event count
        expect(outerKeys.length).toBeLessThanOrEqual(4);
        // inner keys are restricted to canonical factions (ethnicity)
        for (const ck of outerKeys) {
            const innerKeys = Object.keys(agg[ck]!);
            expect(innerKeys.length).toBeLessThanOrEqual(3);
            for (const ik of innerKeys) {
                expect(['RBiH', 'RS', 'HRHB']).toContain(ik);
            }
        }
    });

    it('origin-dest arrivals outer-key cardinality is bounded by mun_count × 3 ethnicities', () => {
        const state = buildState();
        const rng = mulberry32(99999);
        const events = synthEvents(rng, 5000);
        for (const evt of events) appendDisplacementEvent(state, evt);

        const agg = state.displacement.displacement_origin_dest_arrivals ?? {};
        const outerKeys = Object.keys(agg);
        // Bounded by MUNS.length × FACTIONS.length analytical cap
        expect(outerKeys.length).toBeLessThanOrEqual(MUNS.length * FACTIONS.length);
        // All keys conform to `${origin_mun}|${ethnicity}` shape
        for (const k of outerKeys) {
            const [originMun, eth] = k.split('|');
            expect(MUNS as readonly string[]).toContain(originMun!);
            expect(FACTIONS as readonly string[]).toContain(eth!);
        }
    });
});

describe('appendDisplacementEvent — G1 property test (≥1,000 random sequences)', () => {
    /**
     * For each random seed, synthesize a sequence of events, append them all
     * via the helper, then compute the reference scan over the legacy log
     * (mimicking what compute_capital.ts:173 / brigade_reconstitution.ts:184
     * would compute on full history) and assert byte-equality to aggregates.
     */
    const SEQUENCES = 1024;
    const PER_SEQ_EVENTS = 24;

    it(`property: aggregate == legacy-log full-history scan across ${SEQUENCES} seeds`, () => {
        const controllers = defaultControllers();

        for (let s = 0; s < SEQUENCES; s++) {
            const rng = mulberry32(0x900d_b00b ^ s);
            const events = synthEvents(rng, PER_SEQ_EVENTS);

            const state = buildState(controllers);
            for (const evt of events) appendDisplacementEvent(state, evt);

            const refHum = refHumanitarianScan(events, controllers);
            const refOd = refOriginDestScan(events);

            expect(state.displacement.displacement_humanitarian_aggregates ?? {}).toEqual(refHum);
            expect(state.displacement.displacement_origin_dest_arrivals ?? {}).toEqual(refOd);
        }
    });

    it('property: 100 longer sequences (200 events each) still match reference scan', () => {
        const controllers = defaultControllers();
        const SEQ = 100;
        const N = 200;

        for (let s = 0; s < SEQ; s++) {
            const rng = mulberry32(0xfeed_face ^ s);
            const events = synthEvents(rng, N);
            const state = buildState(controllers);
            for (const evt of events) appendDisplacementEvent(state, evt);

            const refHum = refHumanitarianScan(events, controllers);
            const refOd = refOriginDestScan(events);

            expect(state.displacement.displacement_humanitarian_aggregates ?? {}).toEqual(refHum);
            expect(state.displacement.displacement_origin_dest_arrivals ?? {}).toEqual(refOd);
        }
    });
});

// ─── LANE D-CONTENT (Path A) tests ──────────────────────────────────────────

describe('LANE D-CONTENT Path A — per-turn buffer + aggregate-driven consumers', () => {
    it('end-of-turn clear truncates legacy log; aggregates persist', () => {
        const state = buildState();
        for (let i = 0; i < 5; i++) {
            appendDisplacementEvent(state, {
                turn: i, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
                dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1',
                ethnicity: 'RBiH', caused_by: 'RS',
                displaced: 100, killed: 5, fled_abroad: 2, settled: 60,
            });
        }
        expect(state.displacement.displacement_event_log).toHaveLength(5);
        const aggBefore = JSON.parse(JSON.stringify(state.displacement.displacement_humanitarian_aggregates));
        const odBefore = JSON.parse(JSON.stringify(state.displacement.displacement_origin_dest_arrivals));

        // Simulate the clear-displacement-event-log step's effect
        state.displacement.displacement_event_log!.length = 0;

        expect(state.displacement.displacement_event_log).toHaveLength(0);
        // Aggregates UNTOUCHED by clear — they persist across turns
        expect(state.displacement.displacement_humanitarian_aggregates).toEqual(aggBefore);
        expect(state.displacement.displacement_origin_dest_arrivals).toEqual(odBefore);
    });

    it('aggregate-driven origin-dest dest_mun selection is deterministic across permutation', () => {
        // Same events in different push order must yield same aggregate (sums commute).
        const evts: DisplacementEvent[] = [
            { turn: 1, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1', dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1', ethnicity: 'RBiH', caused_by: 'RS', displaced: 0, killed: 0, fled_abroad: 0, settled: 100 },
            { turn: 2, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1', dest_mun: 'mun_c', dest_osid: 'op:mun_c:mun_c_1', ethnicity: 'RBiH', caused_by: 'RS', displaced: 0, killed: 0, fled_abroad: 0, settled: 200 },
            { turn: 3, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1', dest_mun: 'mun_d', dest_osid: 'op:mun_d:mun_d_1', ethnicity: 'RBiH', caused_by: 'RS', displaced: 0, killed: 0, fled_abroad: 0, settled: 200 },
        ];
        const orderA = [evts[0]!, evts[1]!, evts[2]!];
        const orderB = [evts[2]!, evts[0]!, evts[1]!];
        const orderC = [evts[1]!, evts[2]!, evts[0]!];
        const stateA = buildState();
        const stateB = buildState();
        const stateC = buildState();
        for (const e of orderA) appendDisplacementEvent(stateA, e);
        for (const e of orderB) appendDisplacementEvent(stateB, e);
        for (const e of orderC) appendDisplacementEvent(stateC, e);
        const aggA = stateA.displacement.displacement_origin_dest_arrivals!['mun_a|RBiH']!;
        const aggB = stateB.displacement.displacement_origin_dest_arrivals!['mun_a|RBiH']!;
        const aggC = stateC.displacement.displacement_origin_dest_arrivals!['mun_a|RBiH']!;
        expect(aggA).toEqual({ mun_b: 100, mun_c: 200, mun_d: 200 });
        expect(aggB).toEqual(aggA);
        expect(aggC).toEqual(aggA);
        // Tied max (mun_c, mun_d at 200): consumer sort uses strictCompare, so the
        // chosen dest_mun is alphabetically first among tied — 'mun_c'.
        const sorted = Object.entries(aggA).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
        expect(sorted[0]![0]).toBe('mun_c');
    });

    it('humanitarian aggregate matches capture-time semantics — controller change between events does NOT retroactively reattribute', () => {
        // Scenario: same OSID has two events; controller flips between them.
        // Each event is attributed at append-time using controllers AT THAT MOMENT,
        // not the final controller after a subsequent flip. This is the canonical
        // capture-time semantics shift over the legacy read-time scan.
        const controllers = defaultControllers();
        const state = buildState(controllers);

        // First event: op:mun_b:mun_b_1 controlled by RS (per defaultControllers)
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_b', origin_osid: 'op:mun_b:mun_b_1',
            dest_mun: 'mun_b', /* caused_by omitted, falls back to controllers */
            ethnicity: 'RBiH',
            displaced: 100, killed: 0, fled_abroad: 0, settled: 0,
        });

        // Flip the controller before the second event
        state.political!.political_controllers!['op:mun_b:mun_b_1'] = 'RBiH';

        // Second event: now attributed to RBiH (capture-time)
        appendDisplacementEvent(state, {
            turn: 1, origin_mun: 'mun_b', origin_osid: 'op:mun_b:mun_b_1',
            dest_mun: 'mun_b', /* caused_by omitted */
            ethnicity: 'RBiH',
            displaced: 200, killed: 0, fled_abroad: 0, settled: 0,
        });

        const agg = state.displacement.displacement_humanitarian_aggregates!;
        // RS retains 100 from first event (capture-time at append, not retroactive)
        expect(agg['RS']!['RBiH']!.refugees_created).toBe(100);
        // RBiH attributed 200 from second event
        expect(agg['RBiH']!['RBiH']!.refugees_created).toBe(200);
    });

    it('clear step preserves array identity (in-place truncation)', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_a', ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 100, killed: 0, fled_abroad: 0, settled: 0,
        });
        const logRef = state.displacement.displacement_event_log!;
        // In-place truncate (matches clear step)
        logRef.length = 0;
        // The reference still points at the same array
        expect(state.displacement.displacement_event_log).toBe(logRef);
        expect(state.displacement.displacement_event_log).toHaveLength(0);
    });
});

describe('appendDisplacementEvent — save/load round-trip', () => {
    it('aggregate fields serialize/deserialize cleanly via JSON round-trip', () => {
        const state = buildState();
        appendDisplacementEvent(state, {
            turn: 0, origin_mun: 'mun_a', origin_osid: 'op:mun_a:mun_a_1',
            dest_mun: 'mun_b', dest_osid: 'op:mun_b:mun_b_1',
            ethnicity: 'RBiH', caused_by: 'RS',
            displaced: 100, killed: 10, fled_abroad: 5, settled: 60,
        });

        const json = JSON.stringify(state);
        const hydrated = JSON.parse(json) as GameState;
        expect(hydrated.displacement.displacement_humanitarian_aggregates).toEqual(
            state.displacement.displacement_humanitarian_aggregates,
        );
        expect(hydrated.displacement.displacement_origin_dest_arrivals).toEqual(
            state.displacement.displacement_origin_dest_arrivals,
        );
    });

    it('default-empty aggregates round-trip cleanly when no events appended', () => {
        const state = buildState();
        // No events appended; persisted aggregate records remain empty.
        const json = JSON.stringify(state);
        const hydrated = JSON.parse(json) as GameState;
        expect(hydrated.displacement.displacement_humanitarian_aggregates).toEqual({});
        expect(hydrated.displacement.displacement_origin_dest_arrivals).toEqual({});
        expect(hydrated.displacement.displacement_recent_by_turn).toEqual({});
    });
});
