import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { deriveWeeklyActivityCounts } from '../src/scenario/scenario_runner.js';
import type { GameState } from '../src/state/game_state.js';
import type { TurnReport } from '../src/sim/turn_pipeline_types.js';

function makeStateWithLegacyFrontSegments(activeCount: number): GameState {
    const front_segments: Record<string, { active: boolean }> = {};
    for (let i = 0; i < activeCount; i++) {
        front_segments[`seg_${i}`] = { active: true };
    }
    front_segments.idle = { active: false };

    return {
        meta: { turn: 1, phase: 'war', seed: 'test' },
        factions: [],
        military: {
            formations: {},
            front_segments,
        },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

describe('scenario activity truth sourcing', () => {
    it('prefers canonical phase_f_displacement trigger metrics over stale proxy fields', () => {
        const state = makeStateWithLegacyFrontSegments(0);
        const turnReport = {
            front_pressure: { pressure_deltas: {} },
            displacement: { by_municipality: [] },
            phase_f_displacement: {
                trigger_report: {
                    triggered_settlements: ['a', 'b'],
                    pressure_eligible_size: 9,
                    front_active_set_size: 7,
                    displacement_trigger_eligible_size: 4,
                },
                capacity_report: {} as NonNullable<TurnReport['phase_f_displacement']>['capacity_report'],
            },
        } as unknown as TurnReport;

        assert.deepEqual(deriveWeeklyActivityCounts(state, turnReport), {
            front_active_set_size: 7,
            pressure_eligible_size: 9,
            displacement_trigger_eligible_size: 4,
        });
    });

    it('returns zero activity when canonical trigger metrics are absent instead of re-deriving from proxy fields', () => {
        const state = makeStateWithLegacyFrontSegments(3);
        const turnReport = {
            front_pressure: { pressure_deltas: { a: 1, b: -1 } },
            displacement: {
                by_municipality: [
                    { municipality_id: 'm1', displacement_this_turn: 12 },
                    { municipality_id: 'm2', displacement_this_turn: 0 },
                    { municipality_id: 'm3', displacement_this_turn: 5 },
                ],
            },
        } as unknown as TurnReport;

        assert.deepEqual(deriveWeeklyActivityCounts(state, turnReport), {
            front_active_set_size: 0,
            pressure_eligible_size: 0,
            displacement_trigger_eligible_size: 0,
        });
    });
});
