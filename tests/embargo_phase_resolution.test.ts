import { describe, expect, it } from 'vitest';
import {
    EMBARGO_PHASE_CAPS,
    resolveActiveEmbargoPhase,
    type EmbargoPhaseId,
} from '../src/state/embargo.js';
import type { GameState } from '../src/state/game_state.js';

function stateWithFlags(flags: Record<string, boolean>): GameState {
    return {
        schema_version: 12,
        meta: { turn: 1, seed: 'embargo-phase-test', phase: 'war' },
        factions: [
            { id: 'RBiH', supply_sources: [] },
            { id: 'RS', supply_sources: [] },
            { id: 'HRHB', supply_sources: [] },
        ],
        military: {
            formations: {},
            event_flags: flags,
        } as any,
        political: {} as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('resolveActiveEmbargoPhase', () => {
    it.each([
        [{}, 'phase_0_none'],
        [{ arms_embargo_active: true }, 'phase_1_full'],
        [{ arms_embargo_active: true, embargo_croatia_transit: true }, 'phase_2_croatia'],
        [{ arms_embargo_active: true, embargo_croatia_transit: true, embargo_black_flights: true }, 'phase_3_black_flights'],
        [{ arms_embargo_active: true, embargo_lifted: true }, 'phase_4_unenforced'],
        [{ arms_embargo_active: true, embargo_lifted: true, embargo_formal_lift: true }, 'phase_5_lifted'],
    ] as Array<[Record<string, boolean>, EmbargoPhaseId]>)('returns %s for flags %#', (flags, expected) => {
        expect(resolveActiveEmbargoPhase(stateWithFlags(flags))).toBe(expected);
    });

    it('uses latest-phase precedence when multiple flags are set', () => {
        const state = stateWithFlags({
            arms_embargo_active: true,
            embargo_croatia_transit: true,
            embargo_black_flights: true,
            embargo_lifted: true,
        });

        expect(resolveActiveEmbargoPhase(state)).toBe('phase_4_unenforced');
    });

    it('keeps RS and HRHB neutral and leaves unsourced phase caps tied to sourced predecessors', () => {
        for (const phase of Object.keys(EMBARGO_PHASE_CAPS) as EmbargoPhaseId[]) {
            expect(EMBARGO_PHASE_CAPS[phase].RS).toEqual({ general: 1, heavy: 1 });
            expect(EMBARGO_PHASE_CAPS[phase].HRHB).toEqual({ general: 1, heavy: 1 });
        }

        expect(EMBARGO_PHASE_CAPS.phase_3_black_flights.RBiH).toEqual(EMBARGO_PHASE_CAPS.phase_2_croatia.RBiH);
        expect(EMBARGO_PHASE_CAPS.phase_5_lifted.RBiH).toEqual(EMBARGO_PHASE_CAPS.phase_4_unenforced.RBiH);
    });
});
