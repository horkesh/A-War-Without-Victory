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
        expect(compareSaves(base(), botTurn).some((l) => l.includes('no exact headless twin'))).toBe(true);
    });
});
