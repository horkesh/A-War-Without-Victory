/**
 * LIVE-HIDDEN-SPLIT (rulings §53 stage 2): the full-save parity checker ignores only the declared
 * live-only allowlist, compares the event decision log by its answers, and catches everything else.
 */
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { compareSaves, LIVE_ONLY } = require('../tools/ai_play/full_save_parity.cjs') as {
    compareSaves: (a: unknown, b: unknown, max?: number) => string[];
    LIVE_ONLY: Array<[string, string]>;
};

const base = () => ({
    meta: { turn: 10 },
    paramilitary_policy: 'ask',
    military: {
        formations: { b1: { morale: 90 } },
        event_decision_log: [
            { event_id: 'e1', faction: 'RS', response_id: 'x', turn: 3, decision_source: 'bot_political' },
            { event_id: 'e2', faction: 'RBiH', response_id: 'y', turn: 4, decision_source: 'bot_political' },
        ],
    },
});

describe('full_save_parity.cjs', () => {
    it('every allowlist entry carries a reason', () => {
        for (const [path, reason] of LIVE_ONLY) {
            expect(path.length).toBeGreaterThan(0);
            expect(reason.length).toBeGreaterThan(10);
        }
    });

    it('equal outside the allowlist: live-only meta and the player\'s own in-person rows may differ', () => {
        const headless = base();
        const player = base();
        Object.assign(player.meta, { player_faction: 'RBiH', autonomy_level: 2 });
        player.paramilitary_policy = 'always_deny';
        player.military.event_decision_log = [
            { event_id: 'e2', faction: 'RBiH', response_id: 'y', turn: 0, decision_source: 'player' },
            { event_id: 'e1', faction: 'RS', response_id: 'x', turn: 3, decision_source: 'bot_political' },
        ];
        expect(compareSaves(headless, player)).toEqual([]);
    });

    it('catches a state split', () => {
        const player = base();
        player.military.formations.b1.morale = 88;
        expect(compareSaves(base(), player)).toHaveLength(1);
    });

    it('catches a different answer, and a bot row that differs from its headless twin', () => {
        const answer = base();
        answer.military.event_decision_log[1] = { ...answer.military.event_decision_log[1]!, response_id: 'z', decision_source: 'player' };
        expect(compareSaves(base(), answer).some((l) => l.includes('answers differ'))).toBe(true);
        const botTurn = base();
        botTurn.military.event_decision_log[0] = { ...botTurn.military.event_decision_log[0]!, turn: 5 };
        expect(compareSaves(base(), botTurn).some((l) => l.includes('non-player row 0 differs'))).toBe(true);
    });

    // PARITY-ORDER (rulings §65, Codex r4720444796): non-player rows are compared in order, multiset-exact.
    it('Codex repro: two bot rows swapped in the player save DIFFER (the firing order #905 fixed)', () => {
        const swapped = base();
        swapped.military.event_decision_log = [...swapped.military.event_decision_log].reverse();
        const problems = compareSaves(base(), swapped);
        expect(problems.some((l) => l.includes('non-player row 0 differs'))).toBe(true);
    });

    it('a duplicated non-player row DIFFERS', () => {
        const dup = base();
        dup.military.event_decision_log = [...dup.military.event_decision_log, dup.military.event_decision_log[1]!];
        const problems = compareSaves(base(), dup);
        expect(problems.some((l) => l.includes('answers differ'))).toBe(true);
        expect(problems.some((l) => l.includes('non-player rows differ in count'))).toBe(true);
    });

    it('an in-person player row at a different turn or position still passes; the bot rows around it keep their order', () => {
        const headless = base();
        headless.military.event_decision_log.push({ event_id: 'e3', faction: 'HRHB', response_id: 'w', turn: 6, decision_source: 'bot_political' });
        const player = base();
        player.military.event_decision_log = [
            { event_id: 'e2', faction: 'RBiH', response_id: 'y', turn: 9, decision_source: 'player' },
            { event_id: 'e1', faction: 'RS', response_id: 'x', turn: 3, decision_source: 'bot_political' },
            { event_id: 'e3', faction: 'HRHB', response_id: 'w', turn: 6, decision_source: 'bot_political' },
        ];
        expect(compareSaves(headless, player)).toEqual([]);
        // The same in-person row, but with the two bot rows around it out of order: DIFFERS.
        player.military.event_decision_log = [player.military.event_decision_log[0]!, player.military.event_decision_log[2]!, player.military.event_decision_log[1]!];
        expect(compareSaves(headless, player).some((l) => l.includes('differs (order or content)'))).toBe(true);
    });

    it('an in-person player row with no headless answer DIFFERS', () => {
        const player = base();
        player.military.event_decision_log = [
            ...player.military.event_decision_log,
            { event_id: 'e9', faction: 'RBiH', response_id: 'q', turn: 7, decision_source: 'player' },
        ];
        expect(compareSaves(base(), player).some((l) => l.includes('no headless answer'))).toBe(true);
    });
});
