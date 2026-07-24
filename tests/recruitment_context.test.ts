import { describe, expect, it } from 'vitest';
import { buildRecruitmentContext } from '../src/sim/recruitment_context.js';
import type { GameState } from '../src/state/game_state.js';

describe('buildRecruitmentContext', () => {
    it('uses the same deterministic OSID municipality map for OSID-keyed state', () => {
        const state = {
            political: { political_controllers: { 'op:zenica:west': 'RBiH' } },
        } as unknown as GameState;
        const settlements = new Map([
            ['sid-a', { sid: 'sid-a', mun1990_id: 'zenica', mun_code: 'zenica' }],
        ]) as never;
        const canonicalToOperational = { 'sid-a': 'op:zenica:west' };
        const operationalToCanonical = new Map([['op:zenica:west', ['sid-a']]]);

        const context = buildRecruitmentContext(
            state,
            settlements,
            { zenica: 'sid-a' },
            { canonicalToOperational, operationalToCanonical },
        );

        expect([...context.sidToMun.entries()]).toEqual([['op:zenica:west', 'zenica']]);
        expect(context.canonicalToOperational).toBe(canonicalToOperational);
        expect(context.municipalityHqSettlement).toEqual({ zenica: 'sid-a' });
    });

    it('uses strictCompare ordering when deciding whether controller keys are operational', () => {
        const state = {
            political: {
                political_controllers: {
                    'op:zenica:west': 'RBiH',
                    'Z:legacy-controller': 'RS',
                },
            },
        } as unknown as GameState;
        const settlements = new Map([
            ['sid-a', { sid: 'sid-a', mun1990_id: 'zenica', mun_code: 'zenica' }],
        ]) as never;

        const context = buildRecruitmentContext(
            state,
            settlements,
            { zenica: 'sid-a' },
            {
                canonicalToOperational: { 'sid-a': 'op:zenica:west' },
                operationalToCanonical: new Map([['op:zenica:west', ['sid-a']]]),
            },
        );

        expect([...context.sidToMun.entries()]).toEqual([['sid-a', 'zenica']]);
    });
});
