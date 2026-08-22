/**
 * REASON-CODE INSTRUMENTATION — gate and mirror tests.
 *
 * These tests pin the two properties the lane's whole design rests on:
 *
 *   1. THE GATE IS OFF BY DEFAULT, and "off" means the KEY IS ABSENT, not that
 *      it is present-and-null. `weekly_report.jsonl` and
 *      `brigade_temporal_log.jsonl` are baselined artifacts; `stableStringify`
 *      writes `"k":null` for an explicit null and writes nothing for a missing
 *      key, so present-and-null would move the golden manifest exactly as badly
 *      as a populated field would.
 *
 *   2. `classifyEmergentBrigadeRefusal` MIRRORS `canFormEmergentBrigade`. The
 *      classifier duplicates a live predicate's logic on purpose (an observation
 *      lane does not restructure a decision on the hot path), and a duplicate
 *      that drifts is worse than no reason code at all — it reports a refusal
 *      that did not happen. This test is the anti-drift pin.
 *
 * Determinism: no RNG, no wall-clock, no I/O. Env mutation is confined to this
 * file and reset in `afterEach`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    isReasonCodeTopicEnabled,
    resetReasonCodeTopicCacheForTests,
    sortedIds,
    whenReasonCodeTopic,
    type ReasonCodeTopic,
} from '../src/sim/combat/reason_code_debug.js';
import {
    canFormEmergentBrigade,
    classifyEmergentBrigadeRefusal,
} from '../src/sim/recruitment_engine.js';

const ALL_TOPICS: ReasonCodeTopic[] = [
    'axis_reject',
    'battle_power',
    'battle_stack',
    'brigade_state',
    'formation_lifecycle',
    'formation_refusal',
    'movement_reject',
    'objective_filter',
    'opportunity_roster',
];

function setFlag(value: string | undefined): void {
    if (value === undefined) delete process.env.AWWV_DEBUG_REASON_CODES;
    else process.env.AWWV_DEBUG_REASON_CODES = value;
    resetReasonCodeTopicCacheForTests();
}

describe('reason-code gate', () => {
    beforeEach(() => setFlag(undefined));
    afterEach(() => setFlag(undefined));

    it('is off for every topic when the env var is unset', () => {
        for (const topic of ALL_TOPICS) {
            expect(isReasonCodeTopicEnabled(topic)).toBe(false);
        }
    });

    it('is off for every topic when the env var is empty', () => {
        setFlag('');
        for (const topic of ALL_TOPICS) {
            expect(isReasonCodeTopicEnabled(topic)).toBe(false);
        }
    });

    it('enables only the topics named', () => {
        setFlag('battle_stack,brigade_state');
        expect(isReasonCodeTopicEnabled('battle_stack')).toBe(true);
        expect(isReasonCodeTopicEnabled('brigade_state')).toBe(true);
        expect(isReasonCodeTopicEnabled('battle_power')).toBe(false);
        expect(isReasonCodeTopicEnabled('axis_reject')).toBe(false);
        expect(isReasonCodeTopicEnabled('formation_lifecycle')).toBe(false);
        expect(isReasonCodeTopicEnabled('formation_refusal')).toBe(false);
        expect(isReasonCodeTopicEnabled('movement_reject')).toBe(false);
        expect(isReasonCodeTopicEnabled('objective_filter')).toBe(false);
        expect(isReasonCodeTopicEnabled('opportunity_roster')).toBe(false);
    });

    it('accepts all and * as every topic, and tolerates whitespace and case', () => {
        for (const spelling of ['all', '*', ' ALL ', 'All']) {
            setFlag(spelling);
            for (const topic of ALL_TOPICS) {
                expect(isReasonCodeTopicEnabled(topic), spelling).toBe(true);
            }
        }
    });

    it('DEGRADES A TYPO TO SILENCE rather than throwing', () => {
        // A misspelled topic must never fail a 188-week run. It must produce
        // exactly as much output as an unset variable: none.
        setFlag('battle_stak,not_a_topic');
        for (const topic of ALL_TOPICS) {
            expect(isReasonCodeTopicEnabled(topic)).toBe(false);
        }
    });

    it('OMITS THE KEY when off — not present-and-null', () => {
        const off = { keep: 1, ...whenReasonCodeTopic('battle_power', () => ({ added: 2 })) };
        expect(Object.prototype.hasOwnProperty.call(off, 'added')).toBe(false);
        expect(Object.keys(off)).toEqual(['keep']);
        // The JSON shape is the actual contract, so assert on it directly.
        expect(JSON.stringify(off)).toBe('{"keep":1}');
    });

    it('does not evaluate the payload thunk when off', () => {
        let built = 0;
        setFlag(undefined);
        whenReasonCodeTopic('battle_power', () => { built += 1; return { x: 1 }; });
        expect(built).toBe(0);
        setFlag('battle_power');
        whenReasonCodeTopic('battle_power', () => { built += 1; return { x: 1 }; });
        expect(built).toBe(1);
    });

    it('adds the key when on', () => {
        setFlag('battle_power');
        const on = { keep: 1, ...whenReasonCodeTopic('battle_power', () => ({ added: 2 })) };
        expect(on).toEqual({ keep: 1, added: 2 });
    });

    it('sortedIds is deterministic and does not mutate its input', () => {
        const input = ['c', 'a', 'b'];
        expect(sortedIds(input)).toEqual(['a', 'b', 'c']);
        expect(input).toEqual(['c', 'a', 'b']);
    });
});

describe('classifyEmergentBrigadeRefusal mirrors canFormEmergentBrigade', () => {
    // Cases chosen to cross every predicate boundary in both directions,
    // including the ones the two functions could plausibly disagree on:
    // a MISSING pool versus an EMPTY one, and a brigade exactly AT threshold.
    const cases: Array<{
        name: string;
        existing: Array<{ personnel: number; max_personnel?: number }>;
        pool: { available: number } | undefined;
        required: number;
        turn: number;
        availableFrom: number;
        threshold: number;
        expected: string | null;
    }> = [
        { name: 'permitted: pool ample, all brigades full', existing: [{ personnel: 3000, max_personnel: 3000 }], pool: { available: 900 }, required: 500, turn: 10, availableFrom: 4, threshold: 0.8, expected: null },
        { name: 'permitted: no existing brigades at all', existing: [], pool: { available: 500 }, required: 500, turn: 10, availableFrom: 4, threshold: 0.8, expected: null },
        { name: 'too early', existing: [], pool: { available: 9999 }, required: 1, turn: 3, availableFrom: 4, threshold: 0.8, expected: 'not_yet_available' },
        { name: 'exactly available_from is NOT too early', existing: [], pool: { available: 9999 }, required: 1, turn: 4, availableFrom: 4, threshold: 0.8, expected: null },
        { name: 'no pool object', existing: [], pool: undefined, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'no_pool' },
        { name: 'pool present but empty', existing: [], pool: { available: 0 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'pool_below_required' },
        { name: 'pool one man short', existing: [], pool: { available: 499 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'pool_below_required' },
        { name: 'pool exactly enough', existing: [], pool: { available: 500 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: null },
        { name: 'existing brigade below capacity', existing: [{ personnel: 1000, max_personnel: 3000 }], pool: { available: 900 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'existing_brigade_below_capacity' },
        { name: 'existing brigade exactly at threshold passes', existing: [{ personnel: 2400, max_personnel: 3000 }], pool: { available: 900 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: null },
        { name: 'one full one short still refuses', existing: [{ personnel: 3000, max_personnel: 3000 }, { personnel: 10, max_personnel: 3000 }], pool: { available: 900 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'existing_brigade_below_capacity' },
        { name: 'default max_personnel 3000 applies when field absent', existing: [{ personnel: 100 }], pool: { available: 900 }, required: 500, turn: 10, availableFrom: 0, threshold: 0.8, expected: 'existing_brigade_below_capacity' },
        { name: 'earliness outranks emptiness (predicate order)', existing: [], pool: undefined, required: 500, turn: 1, availableFrom: 9, threshold: 0.8, expected: 'not_yet_available' },
    ];

    for (const c of cases) {
        it(`agrees on: ${c.name}`, () => {
            const permitted = canFormEmergentBrigade(
                c.existing, c.pool, c.required, c.turn, c.availableFrom, c.threshold,
            );
            const reason = classifyEmergentBrigadeRefusal(
                c.existing, c.pool, c.required, c.turn, c.availableFrom, c.threshold,
            );
            // The mirror contract, both directions.
            expect(reason).toBe(c.expected);
            expect(permitted).toBe(reason === null);
        });
    }
});
