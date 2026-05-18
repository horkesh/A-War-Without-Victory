import { describe, it, expect } from 'vitest';

import type { GameState } from '../src/state/game_state.js';
import {
    getActivePatronDirective,
    type PatronDirective,
} from '../src/sim/combat/patron_directive_scope.js';

function makeState(patronDirectives: Record<string, PatronDirective[]>): GameState {
    return {
        military: {
            war_timeline: {
                patron_directives: patronDirectives,
            },
        },
    } as unknown as GameState;
}

/**
 * Canonical apr1992 HRHB patron-directive timeline (per
 * `data/scenarios/timelines/apr1992.json` lines 402-411). Encodes the hybrid
 * scope chosen 2026-05-17:
 *   weeks 0-40: faction default "Consolidate Herzegovina" (defensive)
 *               applies to [hvo_southeast_herzegovina, hvo_central_bosnia,
 *               hvo_tomislavgrad]; Posavina (hvo_northwest_bosnia) exempt
 *   weeks 40-50: Herzegovina Offensive (offensive) ONLY for
 *                hvo_southeast_herzegovina + Central Bosnia Restraint
 *                (balanced) ONLY for hvo_central_bosnia + Tomislavgrad Hold
 *                (balanced) for hvo_tomislavgrad
 *   weeks 50-999: Central Bosnia Offensive (offensive) + Tomislavgrad Hold
 */
const HRHB_APR1992_TIMELINE: PatronDirective[] = [
    {
        name: 'Consolidate Herzegovina',
        start_week: 0,
        end_week: 40,
        stance_ceiling: 'defensive',
        corps_ids: ['hvo_southeast_herzegovina', 'hvo_central_bosnia', 'hvo_tomislavgrad'],
    },
    {
        name: 'Herzegovina Offensive',
        start_week: 40,
        end_week: 999,
        stance_ceiling: 'offensive',
        corps_ids: ['hvo_southeast_herzegovina'],
    },
    {
        name: 'Central Bosnia Restraint',
        start_week: 40,
        end_week: 50,
        stance_ceiling: 'balanced',
        corps_ids: ['hvo_central_bosnia'],
    },
    {
        name: 'Central Bosnia Offensive',
        start_week: 50,
        end_week: 999,
        stance_ceiling: 'offensive',
        corps_ids: ['hvo_central_bosnia'],
    },
    {
        name: 'Tomislavgrad Hold',
        start_week: 40,
        end_week: 999,
        stance_ceiling: 'balanced',
        corps_ids: ['hvo_tomislavgrad'],
    },
];

describe('getActivePatronDirective — hybrid scope (Batch 35)', () => {
    const state = makeState({ HRHB: HRHB_APR1992_TIMELINE });

    describe('per-corps divergence (hybrid scope distinguishing behavior)', () => {
        it('at week 45, Herzegovina and Central Bosnia get different ceilings', () => {
            const herzegovina = getActivePatronDirective('HRHB', 45, state, 'hvo_southeast_herzegovina');
            const centralBosnia = getActivePatronDirective('HRHB', 45, state, 'hvo_central_bosnia');
            expect(herzegovina?.name).toBe('Herzegovina Offensive');
            expect(herzegovina?.stance_ceiling).toBe('offensive');
            expect(centralBosnia?.name).toBe('Central Bosnia Restraint');
            expect(centralBosnia?.stance_ceiling).toBe('balanced');
        });

        it('at week 55, both Herzegovina and Central Bosnia are offensive (Restraint ended)', () => {
            const herzegovina = getActivePatronDirective('HRHB', 55, state, 'hvo_southeast_herzegovina');
            const centralBosnia = getActivePatronDirective('HRHB', 55, state, 'hvo_central_bosnia');
            expect(herzegovina?.stance_ceiling).toBe('offensive');
            expect(centralBosnia?.stance_ceiling).toBe('offensive');
            expect(centralBosnia?.name).toBe('Central Bosnia Offensive');
        });
    });

    describe('Posavina exemption (canonical per-corps exception)', () => {
        it('hvo_northwest_bosnia has no directive at week 5 (omitted from Consolidate Herzegovina)', () => {
            const result = getActivePatronDirective('HRHB', 5, state, 'hvo_northwest_bosnia');
            expect(result).toBeNull();
        });

        it('hvo_northwest_bosnia has no directive at week 100 either', () => {
            const result = getActivePatronDirective('HRHB', 100, state, 'hvo_northwest_bosnia');
            expect(result).toBeNull();
        });
    });

    describe('non-HRHB factions remain no-op', () => {
        it('RBiH returns null even when an HRHB directive is active', () => {
            const result = getActivePatronDirective('RBiH', 45, state, 'arbih_1st_corps');
            expect(result).toBeNull();
        });

        it('RS returns null', () => {
            const result = getActivePatronDirective('RS', 45, state, 'vrs_1st_krajina');
            expect(result).toBeNull();
        });
    });

    describe('faction-wide variant (no corpsId — preserves order_interpretation behavior)', () => {
        it('at week 45, faction-wide variant returns first active directive (Herzegovina Offensive)', () => {
            const result = getActivePatronDirective('HRHB', 45, state);
            expect(result?.name).toBe('Herzegovina Offensive');
        });

        it('at week 5, faction-wide variant returns the Consolidate Herzegovina default', () => {
            const result = getActivePatronDirective('HRHB', 5, state);
            expect(result?.name).toBe('Consolidate Herzegovina');
        });

        it('at week 1000, faction-wide variant returns null (all directives expired)', () => {
            const result = getActivePatronDirective('HRHB', 1000, state);
            expect(result).toBeNull();
        });
    });

    describe('edge cases', () => {
        it('empty timeline returns null', () => {
            const emptyState = makeState({});
            const result = getActivePatronDirective('HRHB', 10, emptyState, 'hvo_southeast_herzegovina');
            expect(result).toBeNull();
        });

        it('missing war_timeline returns null', () => {
            const noTimelineState = { military: {} } as unknown as GameState;
            const result = getActivePatronDirective('HRHB', 10, noTimelineState, 'hvo_southeast_herzegovina');
            expect(result).toBeNull();
        });

        it('turn at exact start_week boundary (inclusive) matches', () => {
            const result = getActivePatronDirective('HRHB', 40, state, 'hvo_southeast_herzegovina');
            expect(result?.name).toBe('Herzegovina Offensive');
        });

        it('turn at exact end_week boundary (exclusive) does not match Consolidate Herzegovina', () => {
            // week 40 is end_week (exclusive) for Consolidate Herzegovina (0..40).
            // Herzegovina Offensive starts at 40, so SE Herzegovina matches it instead.
            const result = getActivePatronDirective('HRHB', 40, state, 'hvo_central_bosnia');
            expect(result?.name).toBe('Central Bosnia Restraint');
            // Central Bosnia at week 40: NOT in Consolidate Herzegovina (end exclusive),
            // is in Central Bosnia Restraint (40..50 inclusive start) — proves the
            // per-corps filter chose the right directive across a window boundary.
        });
    });
});
