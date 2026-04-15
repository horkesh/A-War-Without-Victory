/**
 * Event evaluator tests — trigger matching, registry order, determinism.
 * Same state + turn + seed → same events_fired; RNG only for random events; stable registry order.
 * Tests use inline event definitions passed via the registry parameter.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import { triggerMatches } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Deterministic RNG: same seed → same sequence (Mulberry32 + string hash). */
function createRng(seed: string | number): Rng {
    const numericSeed = typeof seed === 'number' ? seed : hashSeed(seed);
    let a = numericSeed >>> 0;
    return function rng(): number {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashSeed(seed: string): number {
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
        h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return (h ^ (h >>> 16)) >>> 0;
}

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
    const rng = createRng('seed-a');
    const result = evaluateEvents(state, rng, 10, TEST_REGISTRY);
    const ids = result.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    assert.ok(ids.includes('test_early_war'));
    assert.ok(ids.includes('test_full_war'));
    assert.ok(!ids.includes('test_mid_war')); // turn_min 40
    assert.ok(!ids.includes('test_late_war')); // turn_min 80
    assert.strictEqual(result.fired.every((f) => typeof f.text === 'string'), true);
});

test('evaluateEvents: war turn 100 fires late and mid war events', () => {
    const state = minimalState('war', 100);
    const rng = createRng('seed-b');
    const result = evaluateEvents(state, rng, 100, TEST_REGISTRY);
    const ids = result.fired.map((f) => f.id);
    assert.ok(ids.includes('test_late_war'));
    assert.ok(ids.includes('test_mid_war'));
    assert.ok(ids.includes('test_full_war'));
});

test('evaluateEvents: same state + turn + seed → same events_fired (determinism)', () => {
    const state1 = minimalState('war', 50);
    const state2 = minimalState('war', 50);
    const rng1 = createRng('determinism-seed');
    const rng2 = createRng('determinism-seed');
    const result1 = evaluateEvents(state1, rng1, 50, TEST_REGISTRY);
    const result2 = evaluateEvents(state2, rng2, 50, TEST_REGISTRY);
    assert.deepStrictEqual(
        result1.fired.map((f) => ({ id: f.id, text: f.text })),
        result2.fired.map((f) => ({ id: f.id, text: f.text }))
    );
});

test('evaluateEvents: registry order stable — two calls produce identical fired order', () => {
    const state1 = minimalState('war', 100);
    const state2 = minimalState('war', 100);
    const rng1 = createRng('order-seed');
    const rng2 = createRng('order-seed');
    const a = evaluateEvents(state1, rng1, 100, TEST_REGISTRY).fired;
    const b = evaluateEvents(state2, rng2, 100, TEST_REGISTRY).fired;
    assert.strictEqual(a.length, b.length);
    for (let i = 0; i < a.length; i += 1) {
        assert.strictEqual(a[i]!.id, b[i]!.id);
        assert.strictEqual(a[i]!.text, b[i]!.text);
    }
});

test('evaluateEvents: peace phase returns empty fired', () => {
    const state = minimalState('peace', 10);
    const rng = createRng('x');
    const result = evaluateEvents(state, rng, 10, TEST_REGISTRY);
    assert.strictEqual(result.fired.length, 0);
});

test('evaluateEvents: once-only events tracked and not re-fired', () => {
    const state = minimalState('war', 10);
    const rng1 = createRng('once-a');
    const rng2 = createRng('once-b');
    const r1 = evaluateEvents(state, rng1, 10, TEST_REGISTRY);
    assert.ok(r1.fired.some(f => f.id === 'test_early_war'));
    // Second call with same state (fired_event_ids now populated)
    const r2 = evaluateEvents(state, rng2, 10, TEST_REGISTRY);
    assert.ok(!r2.fired.some(f => f.id === 'test_early_war'), 'once-only event should not re-fire');
});

test('evaluateEvents: random events use RNG — same seed same fired set', () => {
    const state1 = minimalState('war', 95);
    const state2 = minimalState('war', 95);
    const seed = 'random-same';
    const r1 = evaluateEvents(state1, createRng(seed), 95, TEST_RANDOM);
    const r2 = evaluateEvents(state2, createRng(seed), 95, TEST_RANDOM);
    const ids1 = r1.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const ids2 = r2.fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(ids1, ids2);
});

test('evaluateEvents: each RNG seed yields deterministic fired set', () => {
    const stateA1 = minimalState('war', 95);
    const stateA2 = minimalState('war', 95);
    const stateB1 = minimalState('war', 95);
    const stateB2 = minimalState('war', 95);
    const seedA1 = evaluateEvents(stateA1, createRng('seed-alpha'), 95, TEST_RANDOM).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const seedA2 = evaluateEvents(stateA2, createRng('seed-alpha'), 95, TEST_RANDOM).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const seedB1 = evaluateEvents(stateB1, createRng('seed-beta'), 95, TEST_RANDOM).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    const seedB2 = evaluateEvents(stateB2, createRng('seed-beta'), 95, TEST_RANDOM).fired.map((f) => f.id).sort((a, b) => a.localeCompare(b));
    assert.deepStrictEqual(seedA1, seedA2);
    assert.deepStrictEqual(seedB1, seedB2);
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
    const rng = createRng('prereq-not-met');
    const result = evaluateEvents(state, rng, 6, [prerequisite, dependent]);
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
    const rng = createRng('prereq-met');
    const result = evaluateEvents(state, rng, 6, [dependent]);
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
    const rng = createRng('partial-prereq');
    const result = evaluateEvents(state, rng, 6, [dependent]);
    assert.ok(!result.fired.some(f => f.id === 'multi_dep_event'), 'should not fire with only one of two prerequisites');
});
