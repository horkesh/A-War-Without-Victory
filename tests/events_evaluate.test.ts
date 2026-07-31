/**
 * Event evaluator tests: trigger matching, registry order, and determinism.
 * Same state and turn produce the same fired events in stable registry order.
 * Tests use inline event definitions passed via the registry parameter.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import { compareEventCandidates, evaluateEvents, filterMutexCandidates } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { updateEventReadiness } from '../src/sim/events/pressure_system.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import { triggerMatches } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { strictCompare } from '../src/state/validateGameState.js';

/** Legacy callback supplied only to prove event evaluation never consumes it. */
const rejectRandomness: Rng = () => {
    throw new Error('Engine Invariants 11.1: event evaluator consumed RNG');
};

function minimalState(phase: 'peace' | 'war', turn: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'events-test-seed', phase },
        military: { formations: {}, fired_event_ids: [] },
        political: {},
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

const SAFE_AREA_FALL_EVENTS = ['srebrenica_falls_1995', 'zepa_falls_1995'] as const;

const SREBRENICA_FALL_OSIDS = [
    'op:srebrenica:srebrenica_2',
    'op:srebrenica:donji_potocari_2',
    'op:srebrenica:milacevici',
    'op:srebrenica:ljeskovik_2',
    'op:srebrenica:sulice_2',
    'op:srebrenica:bostahovine_2',
    'op:srebrenica:luka_2',
    'op:srebrenica:suceska',
    'op:srebrenica:radovcici',
    'op:srebrenica:brezovice_2',
];

const ZEPA_FALL_OSIDS = ['op:rogatica:zepa_2'];

function loadedEventById(id: string): EventDefinition {
    const event = loadEventDefinitions(0).find((def) => def.id === id);
    assert.ok(event, `expected loaded event ${id}`);
    return event;
}

function seedEventReadiness(state: GameState, event: EventDefinition): void {
    assert.ok(event.pressure, `${event.id} should be a pressure-gated event`);
    state.military.event_readiness ??= {};
    state.military.event_readiness[event.id] = event.pressure.threshold;
}

function expectEventOwnedControl(
    state: GameState,
    expectedOsids: readonly string[],
    turn: number,
): void {
    for (const osid of expectedOsids) {
        assert.strictEqual(state.political.political_controllers?.[osid], 'RS');
    }

    const controlEvents = (state.political.control_events ?? []).filter(
        (event) => expectedOsids.includes(event.settlement_id) && event.turn === turn,
    );
    assert.strictEqual(controlEvents.length, expectedOsids.length);
    assert.deepStrictEqual(
        controlEvents.map((event) => event.settlement_id).sort(strictCompare),
        [...expectedOsids].sort(strictCompare),
    );
    assert.ok(controlEvents.every((event) => event.mechanism === 'event'));
    assert.ok(controlEvents.every((event) => event.from === 'RBiH'));
    assert.ok(controlEvents.every((event) => event.to === 'RS'));
    assert.ok(controlEvents.every((event) => !('operation_id' in event)));
    assert.ok(controlEvents.every((event) => !('operation_name' in event)));
}

/** Test event definitions (inline, not from JSON files). */
const TEST_HISTORICAL: EventDefinition[] = [
    {
        id: 'test_early_war',
        trigger: { turn_min: 0, turn_max: 80, phase: 'war' },
        effect: { kind: 'narrative', text: 'Early war event.' },
        once: true,
    },
    {
        id: 'test_mid_war',
        trigger: { turn_min: 40, turn_max: 150, phase: 'war' },
        effect: { kind: 'narrative', text: 'Mid war event.' },
        once: true,
    },
    {
        id: 'test_late_war',
        trigger: { turn_min: 80, turn_max: 120, phase: 'war' },
        effect: { kind: 'narrative', text: 'Late war event.' },
        once: true,
    },
    {
        id: 'test_full_war',
        trigger: { turn_min: 0, turn_max: 200, phase: 'war' },
        effect: { kind: 'narrative', text: 'Full war event.' },
        once: true,
    },
];

const TEST_RANDOM: EventDefinition[] = [
    {
        id: 'test_random_a',
        trigger: { phase: 'war' },
        effect: { kind: 'narrative', text: 'Random event A.' },
        probability: 0.08,
    },
    {
        id: 'test_random_b',
        trigger: { phase: 'war' },
        effect: { kind: 'narrative', text: 'Random event B.' },
        probability: 0.50,
    },
];

const TEST_REGISTRY: EventDefinition[] = [...TEST_HISTORICAL, ...TEST_RANDOM];

function makeEligibleEvent(
    id: string,
    options: { priority?: number; turnMin?: number; cooldownTurns?: number; mutexGroup?: string; asDecision?: boolean } = {},
): EventDefinition {
    return {
        id,
        trigger: {
            phase: 'war',
            ...(options.turnMin != null ? { turn_min: options.turnMin } : {}),
        },
        effect: { kind: 'narrative', text: `${id} fired.` },
        ...(options.priority != null ? { priority: options.priority } : {}),
        ...(options.mutexGroup != null ? { mutex_group: options.mutexGroup } : {}),
        ...(options.cooldownTurns != null
            ? { recurrence: { max_fires: 10, cooldown_turns: options.cooldownTurns, escalation: 'static' as const } }
            : {}),
        // The MAX_EVENTS_PER_TURN cap + overflow queue now apply ONLY to
        // player-decision events (events with non-empty response_options).
        // Auto/flag-setter events fire unconditionally. Cap/overflow tests opt
        // in via asDecision so the cap mechanics are exercised. See
        // fix(events): cap only player-facing decisions (silent-drop bug).
        ...(options.asDecision
            ? {
                  response_options: [
                      { id: `${id}_resp`, label: `${id} response`, effects: [] },
                  ],
              }
            : {}),
    };
}

/** Cap/overflow-test variant: every event is a player-decision event so the
 *  per-turn cap and overflow queue apply (auto/flag-setter events bypass both). */
function makeDecisionEvent(
    id: string,
    options: { priority?: number; turnMin?: number; cooldownTurns?: number; mutexGroup?: string } = {},
): EventDefinition {
    return makeEligibleEvent(id, { ...options, asDecision: true });
}

test('compareEventCandidates: sorts by priority, trigger turn_min, missing turn_min last, then event id', () => {
    const registry = [
        makeEligibleEvent('priority_10_turn_1', { priority: 10, turnMin: 1 }),
        makeEligibleEvent('priority_1_missing_turn', { priority: 1 }),
        makeEligibleEvent('priority_1_turn_3_b', { priority: 1, turnMin: 3 }),
        makeEligibleEvent('priority_0_turn_99', { priority: 0, turnMin: 99 }),
        makeEligibleEvent('priority_1_turn_3_a', { priority: 1, turnMin: 3 }),
        makeEligibleEvent('priority_1_turn_8', { priority: 1, turnMin: 8 }),
    ];

    const ids = [...registry].sort(compareEventCandidates).map((event) => event.id);

    assert.deepStrictEqual(ids, [
        'priority_0_turn_99',
        'priority_1_turn_3_a',
        'priority_1_turn_3_b',
        'priority_1_turn_8',
        'priority_1_missing_turn',
        'priority_10_turn_1',
    ]);
});

test('filterMutexCandidates: keeps first canonical event per mutex group and reports suppressed ids', () => {
    const sorted = [
        makeEligibleEvent('same_group_first', { priority: 1, turnMin: 12, mutexGroup: 'group_a' }),
        makeEligibleEvent('ungrouped_between', { priority: 1, turnMin: 12 }),
        makeEligibleEvent('same_group_second', { priority: 1, turnMin: 12, mutexGroup: 'group_a' }),
        makeEligibleEvent('other_group_first', { priority: 1, turnMin: 12, mutexGroup: 'group_b' }),
        makeEligibleEvent('other_group_second', { priority: 1, turnMin: 12, mutexGroup: 'group_b' }),
    ];

    const result = filterMutexCandidates(sorted);

    assert.deepStrictEqual(result.candidates.map((event) => event.id), [
        'same_group_first',
        'ungrouped_between',
        'other_group_first',
    ]);
    assert.deepStrictEqual(result.mutex_suppressed_ids, ['same_group_second', 'other_group_second']);
});

test('evaluateEvents: five eligible same-priority same-turn events fire four and report overflow exactly', () => {
    const state = minimalState('war', 12);
    const registry = [
        makeDecisionEvent('overflow_a', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('overflow_b', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('overflow_c', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('overflow_d', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('overflow_e', { priority: 1, turnMin: 12 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 12, registry);

    assert.deepStrictEqual(result.fired.map((event) => event.id), [
        'overflow_a',
        'overflow_b',
        'overflow_c',
        'overflow_d',
    ]);
    assert.strictEqual(result.candidates_considered, 5);
    assert.strictEqual(result.overflowed, true);
    assert.deepStrictEqual(result.overflowed_ids, ['overflow_e']);
    assert.ok(!state.military.fired_event_ids?.includes('overflow_e'), 'overflowed event must not be tracked as fired');
});

test('evaluateEvents: auto/flag-setter events bypass the cap; only player-decision events overflow', () => {
    // Silent-drop regression guard: five auto events (no response_options) plus
    // five player-decision events all eligible on the same turn. ALL five autos
    // must fire (cap does not apply to them); only the decision events are capped
    // at MAX_EVENTS_PER_TURN (4) with the fifth overflowed. An auto flag-setter on
    // the last turn of its window must never be silently dropped.
    const state = minimalState('war', 12);
    const registry = [
        makeEligibleEvent('auto_a', { priority: 1, turnMin: 12 }),
        makeEligibleEvent('auto_b', { priority: 1, turnMin: 12 }),
        makeEligibleEvent('auto_c', { priority: 1, turnMin: 12 }),
        makeEligibleEvent('auto_d', { priority: 1, turnMin: 12 }),
        makeEligibleEvent('auto_e', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('dec_a', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('dec_b', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('dec_c', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('dec_d', { priority: 1, turnMin: 12 }),
        makeDecisionEvent('dec_e', { priority: 1, turnMin: 12 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 12, registry);

    const firedIds = result.fired.map((event) => event.id);
    // All five autos fire (never capped).
    for (const id of ['auto_a', 'auto_b', 'auto_c', 'auto_d', 'auto_e']) {
        assert.ok(firedIds.includes(id), `auto event ${id} must fire (cap must not apply)`);
    }
    // Exactly four of the five decision events fire; the fifth overflows.
    const firedDecisions = firedIds.filter((id) => id.startsWith('dec_'));
    assert.strictEqual(firedDecisions.length, 4, 'decision events are still capped at 4');
    assert.deepStrictEqual(result.overflowed_ids, ['dec_e']);
    assert.deepStrictEqual(state.military.event_overflow_queue, ['dec_e']);
    // Total fired = 5 autos + 4 capped decisions = 9 (cap is decision-only).
    assert.strictEqual(result.fired.length, 9);
});

test('evaluateEvents: stores overflowed ids in the persisted overflow queue', () => {
    const state = minimalState('war', 13);
    const registry = [
        makeDecisionEvent('queue_a', { priority: 1, turnMin: 13 }),
        makeDecisionEvent('queue_b', { priority: 1, turnMin: 13 }),
        makeDecisionEvent('queue_c', { priority: 1, turnMin: 13 }),
        makeDecisionEvent('queue_d', { priority: 1, turnMin: 13 }),
        makeDecisionEvent('queue_e', { priority: 1, turnMin: 13 }),
        makeDecisionEvent('queue_f', { priority: 1, turnMin: 13 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 13, registry);

    assert.deepStrictEqual(result.overflowed_ids, ['queue_e', 'queue_f']);
    assert.deepStrictEqual(state.military.event_overflow_queue, ['queue_e', 'queue_f']);
});

test('evaluateEvents: clears queued ids outside war phase', () => {
    const state = minimalState('peace', 13);
    state.military.event_overflow_queue = ['queued_war_only'];

    const result = evaluateEvents(state, rejectRandomness, 13, [
        makeEligibleEvent('queued_war_only', { priority: 1, turnMin: 13 }),
    ]);

    assert.deepStrictEqual(result.fired, []);
    assert.deepStrictEqual(result.overflowed_ids, []);
    assert.deepStrictEqual(state.military.event_overflow_queue, []);
});

test('evaluateEvents: re-enters queued ids but canonical order controls firing and overflow', () => {
    const state = minimalState('war', 14);
    state.military.event_overflow_queue = ['queued_z', 'queued_z', 'missing_old'];
    const registry = [
        makeDecisionEvent('new_a', { priority: 1, turnMin: 14 }),
        makeDecisionEvent('new_b', { priority: 1, turnMin: 14 }),
        makeDecisionEvent('new_c', { priority: 1, turnMin: 14 }),
        makeDecisionEvent('new_d', { priority: 1, turnMin: 14 }),
        makeDecisionEvent('queued_z', { priority: 100, turnMin: 14 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 14, registry);

    assert.deepStrictEqual(result.fired.map((event) => event.id), [
        'new_a',
        'new_b',
        'new_c',
        'new_d',
    ]);
    assert.deepStrictEqual(result.overflowed_ids, ['queued_z']);
    assert.deepStrictEqual(state.military.event_overflow_queue, ['queued_z']);
});

test('evaluateEvents: drops queued ids that no longer pass normal gates', () => {
    const state = minimalState('war', 15);
    state.military.event_overflow_queue = ['stale_turn', 'blocked_by_cooldown'];
    state.military.event_last_fired_turn = { blocked_by_cooldown: 14 };
    const registry = [
        makeEligibleEvent('stale_turn', { priority: 1, turnMin: 16 }),
        makeEligibleEvent('blocked_by_cooldown', { priority: 1, turnMin: 15, cooldownTurns: 3 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 15, registry);

    assert.deepStrictEqual(result.fired, []);
    assert.deepStrictEqual(result.overflowed_ids, []);
    assert.deepStrictEqual(state.military.event_overflow_queue, []);
});

test('evaluateEvents: does not queue mutex-suppressed ids', () => {
    const state = minimalState('war', 16);
    const registry = [
        makeDecisionEvent('mutex_queue_a', { priority: 1, turnMin: 16, mutexGroup: 'shared' }),
        makeDecisionEvent('mutex_queue_b', { priority: 1, turnMin: 16, mutexGroup: 'shared' }),
        makeDecisionEvent('plain_queue_a', { priority: 1, turnMin: 16 }),
        makeDecisionEvent('plain_queue_b', { priority: 1, turnMin: 16 }),
        makeDecisionEvent('plain_queue_c', { priority: 1, turnMin: 16 }),
        makeDecisionEvent('plain_queue_d', { priority: 1, turnMin: 16 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 16, registry);

    assert.deepStrictEqual(result.mutex_suppressed_ids, ['mutex_queue_b']);
    assert.deepStrictEqual(result.overflowed_ids, ['plain_queue_d']);
    assert.deepStrictEqual(state.military.event_overflow_queue, ['plain_queue_d']);
    assert.ok(!state.military.event_overflow_queue.includes('mutex_queue_b'));
});

test('evaluateEvents: shuffled five-event registry fires canonical first four deterministically', () => {
    const state = minimalState('war', 20);
    const registry = [
        makeDecisionEvent('canonical_e', { priority: 1, turnMin: 20 }),
        makeDecisionEvent('canonical_c', { priority: 1, turnMin: 20 }),
        makeDecisionEvent('canonical_a', { priority: 1, turnMin: 20 }),
        makeDecisionEvent('canonical_d', { priority: 1, turnMin: 20 }),
        makeDecisionEvent('canonical_b', { priority: 1, turnMin: 20 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 20, registry);

    assert.deepStrictEqual(result.fired.map((event) => event.id), [
        'canonical_a',
        'canonical_b',
        'canonical_c',
        'canonical_d',
    ]);
    assert.deepStrictEqual(result.overflowed_ids, ['canonical_e']);
});

test('compareEventCandidates: loaded catalog preserves current stable priority-only effective order', () => {
    const loaded = loadEventDefinitions(0);
    const currentEffectiveIds = [...loaded]
        .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))
        .map((event) => event.id);
    const canonicalIds = [...loaded].sort(compareEventCandidates).map((event) => event.id);

    assert.deepStrictEqual(canonicalIds, currentEffectiveIds);
});

test('evaluateEvents: Srebrenica and Zepa falls write event-owned control receipts without operations', () => {
    const srebrenica = loadedEventById('srebrenica_falls_1995');
    const zepa = loadedEventById('zepa_falls_1995');
    const state = minimalState('war', 160);
    state.military.event_flags = {
        srebrenica_enclave_formed: true,
        srebrenica_demilitarized: true,
    };
    state.political.political_controllers = Object.fromEntries(
        [...SREBRENICA_FALL_OSIDS, ...ZEPA_FALL_OSIDS].map((osid) => [osid, 'RBiH']),
    );
    state.political.control_events = [];

    assert.strictEqual(state.military.corps_command, undefined);
    assert.strictEqual(state.operation_history, undefined);

    seedEventReadiness(state, srebrenica);
    const srebrenicaResult = evaluateEvents(
        state,
        rejectRandomness,
        160,
        [srebrenica, zepa],
    );

    assert.deepStrictEqual(srebrenicaResult.fired.map((event) => event.id), ['srebrenica_falls_1995']);
    assert.ok(state.military.fired_event_ids.includes('srebrenica_falls_1995'));
    assert.strictEqual(state.military.event_flags.srebrenica_fell, true);
    expectEventOwnedControl(state, SREBRENICA_FALL_OSIDS, 160);
    assert.strictEqual(state.military.corps_command, undefined);
    assert.strictEqual(state.operation_history, undefined);

    state.meta.turn = 161;
    seedEventReadiness(state, zepa);
    const zepaResult = evaluateEvents(
        state,
        rejectRandomness,
        161,
        [srebrenica, zepa],
    );

    assert.deepStrictEqual(zepaResult.fired.map((event) => event.id), ['zepa_falls_1995']);
    assert.ok(state.military.fired_event_ids.includes('zepa_falls_1995'));
    expectEventOwnedControl(state, ZEPA_FALL_OSIDS, 161);
    assert.strictEqual(state.military.corps_command, undefined);
    assert.strictEqual(state.operation_history, undefined);
});

test('evaluateEvents: recurrence cooldown-blocked event is excluded before overflow accounting', () => {
    const state = minimalState('war', 30);
    state.military.event_last_fired_turn = { blocked_by_cooldown: 29 };
    const registry = [
        makeDecisionEvent('included_a', { priority: 1, turnMin: 30 }),
        makeDecisionEvent('included_b', { priority: 1, turnMin: 30 }),
        makeDecisionEvent('included_c', { priority: 1, turnMin: 30 }),
        makeDecisionEvent('included_d', { priority: 1, turnMin: 30 }),
        makeDecisionEvent('overflow_after_gates', { priority: 1, turnMin: 30 }),
        makeDecisionEvent('blocked_by_cooldown', { priority: 1, turnMin: 30, cooldownTurns: 3 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 30, registry);

    assert.strictEqual(result.candidates_considered, 5);
    assert.deepStrictEqual(result.fired.map((event) => event.id), [
        'included_a',
        'included_b',
        'included_c',
        'included_d',
    ]);
    assert.deepStrictEqual(result.overflowed_ids, ['overflow_after_gates']);
    assert.ok(!result.overflowed_ids.includes('blocked_by_cooldown'));
});

test('evaluateEvents: mutex suppression happens after canonical sort and before the per-turn cap', () => {
    const state = minimalState('war', 40);
    const registry = [
        makeDecisionEvent('cap_d', { priority: 1, turnMin: 40 }),
        makeDecisionEvent('mutex_b', { priority: 1, turnMin: 40, mutexGroup: 'shared' }),
        makeDecisionEvent('cap_c', { priority: 1, turnMin: 40 }),
        makeDecisionEvent('overflow_e', { priority: 1, turnMin: 40 }),
        makeDecisionEvent('mutex_a', { priority: 1, turnMin: 40, mutexGroup: 'shared' }),
        makeDecisionEvent('cap_f', { priority: 1, turnMin: 40 }),
    ];

    const result = evaluateEvents(state, rejectRandomness, 40, registry);

    assert.strictEqual(result.candidates_considered, 6);
    assert.deepStrictEqual(result.mutex_suppressed_ids, ['mutex_b']);
    assert.deepStrictEqual(result.fired.map((event) => event.id), [
        'cap_c',
        'cap_d',
        'cap_f',
        'mutex_a',
    ]);
    assert.deepStrictEqual(result.overflowed_ids, ['overflow_e']);
});

test('evaluateEvents: shuffled mutex registry yields deterministic suppression and overflow ids', () => {
    const makeRegistry = () => [
        makeDecisionEvent('z_overflow', { priority: 1, turnMin: 41 }),
        makeDecisionEvent('b_group_second', { priority: 1, turnMin: 41, mutexGroup: 'group_b' }),
        makeDecisionEvent('a_group_second', { priority: 1, turnMin: 41, mutexGroup: 'group_a' }),
        makeDecisionEvent('a_group_first', { priority: 1, turnMin: 41, mutexGroup: 'group_a' }),
        makeDecisionEvent('b_group_first', { priority: 1, turnMin: 41, mutexGroup: 'group_b' }),
        makeDecisionEvent('c_plain', { priority: 1, turnMin: 41 }),
        makeDecisionEvent('d_plain', { priority: 1, turnMin: 41 }),
    ];
    const stateA = minimalState('war', 41);
    const stateB = minimalState('war', 41);

    const resultA = evaluateEvents(stateA, rejectRandomness, 41, makeRegistry());
    const resultB = evaluateEvents(stateB, rejectRandomness, 41, makeRegistry().reverse());

    assert.deepStrictEqual(resultA.fired.map((event) => event.id), resultB.fired.map((event) => event.id));
    assert.deepStrictEqual(resultA.mutex_suppressed_ids, resultB.mutex_suppressed_ids);
    assert.deepStrictEqual(resultA.overflowed_ids, resultB.overflowed_ids);
    assert.deepStrictEqual(resultA.mutex_suppressed_ids, ['a_group_second', 'b_group_second']);
    assert.deepStrictEqual(resultA.overflowed_ids, ['z_overflow']);
});

test('triggerMatches: phase filter — war event does not match peace state', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_late_war')!;
    const state = minimalState('peace', 90);
    assert.strictEqual(triggerMatches(ev, state, 90), false);
});

test('triggerMatches: phase filter — war event matches war state', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_full_war')!;
    const state = minimalState('war', 10);
    assert.strictEqual(triggerMatches(ev, state, 10), true);
});

test('triggerMatches: turn_min — event with turn_min 40 does not match turn 39', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_mid_war')!;
    const state = minimalState('war', 39);
    assert.strictEqual(triggerMatches(ev, state, 39), false);
});

test('triggerMatches: turn_min — event with turn_min 40 matches turn 40', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_mid_war')!;
    const state = minimalState('war', 40);
    assert.strictEqual(triggerMatches(ev, state, 40), true);
});

test('Operation Neretva 93 cannot fire before its September 1993 historical window', () => {
    const event = loadedEventById('operation_neretva_93_1993');
    const earlyState = minimalState('war', 60);
    earlyState.military.fired_event_ids = ['croat_bosniak_war_begins_1993'];
    earlyState.military.event_flags = { mostar_liberated: true };

    assert.strictEqual(event.trigger.turn_min, 74);
    assert.strictEqual(triggerMatches(event, earlyState, 60), false);

    const septemberState = minimalState('war', 74);
    septemberState.military.fired_event_ids = ['croat_bosniak_war_begins_1993'];
    septemberState.military.event_flags = { mostar_liberated: true };
    assert.strictEqual(triggerMatches(event, septemberState, 74), true);
});

test('RBiH officer-corps posture breaks the opening decision drought in early summer 1992', () => {
    const event = loadedEventById('rbih_minority_retention_1992');
    const beforeWindow = minimalState('war', 11);
    beforeWindow.military.event_flags = { rbih_state_identity: 'civic' };
    const openingWindow = minimalState('war', 12);
    openingWindow.military.event_flags = { rbih_state_identity: 'civic' };

    assert.strictEqual(event.trigger.turn_min, 12);
    assert.strictEqual(event.trigger.turn_max, 16);
    assert.strictEqual(triggerMatches(event, beforeWindow, 11), false);
    assert.strictEqual(triggerMatches(event, openingWindow, 12), true);
});

test('London Conference can emerge on its historical week from the camp-revelation chain', () => {
    const event = loadedEventById('london_conference_1992');
    const beforeConference = minimalState('war', 19);
    beforeConference.military.event_last_fired_turn = {
        concentration_camps_revealed_1992: 17,
    };
    const conferenceWeek = minimalState('war', 20);
    conferenceWeek.meta.player_faction = 'RBiH';
    conferenceWeek.military.event_last_fired_turn = {
        concentration_camps_revealed_1992: 17,
    };

    assert.strictEqual(event.trigger.turn_min, 20);
    assert.strictEqual(triggerMatches(event, beforeConference, 19), false);
    assert.strictEqual(triggerMatches(event, conferenceWeek, 20), true);
    updateEventReadiness(conferenceWeek, [event]);
    const result = evaluateEvents(conferenceWeek, rejectRandomness, 20, [event]);
    assert.deepStrictEqual(result.fired.map((fired) => fired.id), ['london_conference_1992']);
});

test('explicitly dated spring 1993 events cannot surface before their first historical week', () => {
    const firstHistoricalTurns: ReadonlyArray<readonly [string, number]> = [
        ['csq_accelerated_safe_areas_1993', 61],
        ['csq_hvo_central_bosnia_offensive_1993', 54],
        ['ahmici_massacre_1993', 54],
        ['sovici_doljani_attack_1993', 54],
        ['trusina_killings_1993', 54],
        ['east_mostar_siege_1993', 57],
        ['un_safe_areas_declared_1993', 57],
    ];

    for (const [eventId, firstTurn] of firstHistoricalTurns) {
        const event = loadedEventById(eventId);
        assert.strictEqual(
            event.trigger.turn_min,
            firstTurn,
            `${eventId} should begin at turn ${firstTurn}`,
        );
        assert.strictEqual(
            triggerMatches(event, minimalState('war', firstTurn - 1), firstTurn - 1),
            false,
            `${eventId} must not match one week early`,
        );
    }
});

test('the general safe-areas card is the turn-57 Resolution 824 expansion, not a duplicate Resolution 819 card', () => {
    const event = loadedEventById('un_safe_areas_declared_1993');

    assert.match(event.title ?? '', /824/);
    assert.doesNotMatch(event.narrative ?? '', /Resolution 819/);
    assert.strictEqual(event.trigger.turn_min, 57);
    assert.strictEqual(event.trigger.turn_max, 57);
});

test('triggerMatches: turn_max — event with turn_max 80 does not match turn 81', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_early_war')!;
    const state = minimalState('war', 81);
    assert.strictEqual(triggerMatches(ev, state, 81), false);
});

test('triggerMatches: turn_max — event with turn_max 80 matches turn 80', () => {
    const ev = TEST_HISTORICAL.find((e) => e.id === 'test_early_war')!;
    const state = minimalState('war', 80);
    assert.strictEqual(triggerMatches(ev, state, 80), true);
});

test('evaluateEvents: war turn 10 fires matching historical events (via registry param)', () => {
    const state = minimalState('war', 10);
    const result = evaluateEvents(state, rejectRandomness, 10, TEST_REGISTRY);
    const ids = result.fired.map((f) => f.id).sort(strictCompare);
    assert.ok(ids.includes('test_early_war'));
    assert.ok(ids.includes('test_full_war'));
    assert.ok(!ids.includes('test_mid_war')); // turn_min 40
    assert.ok(!ids.includes('test_late_war')); // turn_min 80
    assert.strictEqual(result.fired.every((f) => typeof f.text === 'string'), true);
});

test('evaluateEvents: war turn 100 fires late and mid war events', () => {
    const state = minimalState('war', 100);
    const result = evaluateEvents(state, rejectRandomness, 100, TEST_REGISTRY);
    const ids = result.fired.map((f) => f.id);
    assert.ok(ids.includes('test_late_war'));
    assert.ok(ids.includes('test_mid_war'));
    assert.ok(ids.includes('test_full_war'));
});

test('evaluateEvents: same state + turn produces the same events_fired', () => {
    const state1 = minimalState('war', 50);
    const state2 = minimalState('war', 50);
    const result1 = evaluateEvents(state1, rejectRandomness, 50, TEST_REGISTRY);
    const result2 = evaluateEvents(state2, rejectRandomness, 50, TEST_REGISTRY);
    assert.deepStrictEqual(
        result1.fired.map((f) => ({ id: f.id, text: f.text })),
        result2.fired.map((f) => ({ id: f.id, text: f.text }))
    );
});

test('evaluateEvents: registry order stable — two calls produce identical fired order', () => {
    const state1 = minimalState('war', 100);
    const state2 = minimalState('war', 100);
    const a = evaluateEvents(state1, rejectRandomness, 100, TEST_REGISTRY).fired;
    const b = evaluateEvents(state2, rejectRandomness, 100, TEST_REGISTRY).fired;
    assert.strictEqual(a.length, b.length);
    for (let i = 0; i < a.length; i += 1) {
        assert.strictEqual(a[i]!.id, b[i]!.id);
        assert.strictEqual(a[i]!.text, b[i]!.text);
    }
});

test('evaluateEvents: peace phase returns empty fired', () => {
    const state = minimalState('peace', 10);
    const result = evaluateEvents(state, rejectRandomness, 10, TEST_REGISTRY);
    assert.strictEqual(result.fired.length, 0);
});

test('evaluateEvents: once-only events tracked and not re-fired', () => {
    const state = minimalState('war', 10);
    const r1 = evaluateEvents(state, rejectRandomness, 10, TEST_REGISTRY);
    assert.ok(r1.fired.some(f => f.id === 'test_early_war'));
    // Second call with same state (fired_event_ids now populated)
    const r2 = evaluateEvents(state, rejectRandomness, 10, TEST_REGISTRY);
    assert.ok(!r2.fired.some(f => f.id === 'test_early_war'), 'once-only event should not re-fire');
});

test('evaluateEvents: probability metadata cannot suppress a state-eligible event', () => {
    const state = minimalState('war', 95);
    let rngCalls = 0;
    const result = evaluateEvents(state, () => {
        rngCalls += 1;
        throw new Error('Engine Invariants 11.1: event evaluator consumed RNG');
    }, 95, TEST_RANDOM);

    assert.strictEqual(rngCalls, 0);
    assert.deepStrictEqual(
        result.fired.map((event) => event.id),
        TEST_RANDOM.map((event) => event.id).sort(strictCompare),
    );
});

test('triggerMatches: skips event when requires_events prerequisite not met', () => {
    const state = minimalState('war', 6);
    const prerequisite: EventDefinition = {
        id: 'prerequisite_event',
        trigger: { turn_min: 5, turn_max: 5, phase: 'war' },
        effect: { kind: 'narrative', text: 'Prerequisite event.' },
        once: true,
    };
    const dependent: EventDefinition = {
        id: 'dependent_event',
        trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['prerequisite_event'] },
        effect: { kind: 'narrative', text: 'Dependent event.' },
        once: true,
    };
    // Prerequisite has NOT fired — fired_event_ids is empty
    const result = evaluateEvents(state, rejectRandomness, 6, [prerequisite, dependent]);
    assert.ok(!result.fired.some(f => f.id === 'dependent_event'), 'dependent should not fire without prerequisite');
});

test('triggerMatches: fires event when requires_events prerequisite is met', () => {
    const state = minimalState('war', 6);
    // Simulate prerequisite already fired
    (state.military as { fired_event_ids: string[] }).fired_event_ids = ['prerequisite_event'];
    const dependent: EventDefinition = {
        id: 'dependent_event',
        trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['prerequisite_event'] },
        effect: { kind: 'narrative', text: 'Dependent event.' },
        once: true,
    };
    const result = evaluateEvents(state, rejectRandomness, 6, [dependent]);
    assert.ok(result.fired.some(f => f.id === 'dependent_event'), 'dependent should fire when prerequisite is met');
});

test('triggerMatches: requires ALL listed events in requires_events (not just one)', () => {
    const state = minimalState('war', 6);
    // Only one of two prerequisites fired
    (state.military as { fired_event_ids: string[] }).fired_event_ids = ['event_a'];
    const dependent: EventDefinition = {
        id: 'multi_dep_event',
        trigger: { turn_min: 6, turn_max: 10, phase: 'war', requires_events: ['event_a', 'event_b'] },
        effect: { kind: 'narrative', text: 'Multi-dependency event.' },
        once: true,
    };
    const result = evaluateEvents(state, rejectRandomness, 6, [dependent]);
    assert.ok(!result.fired.some(f => f.id === 'multi_dep_event'), 'should not fire with only one of two prerequisites');
});
