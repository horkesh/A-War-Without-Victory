import { describe, expect, it } from 'vitest';

import { hasCivilianCasualtyRecords } from '../src/scenario/scenario_runner.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import { recordCivilianDisplacementCasualties } from '../src/state/displacement_state_utils.js';

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'civilian-casualties-contract', phase: 'war', player_faction: 'RBiH' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as GameState['military'],
        political: { political_controllers: {} } as GameState['political'],
        displacement: { civilian_casualties: {} } as GameState['displacement'],
    };
}

describe('displacement civilian casualty contract', () => {
    it('records the first casualty when the persisted casualty map starts empty', () => {
        const state = makeState();

        recordCivilianDisplacementCasualties(state, 'RBiH', 3, 5);

        expect(state.displacement.civilian_casualties.RBiH).toEqual({
            killed: 3,
            fled_abroad: 5,
        });
    });

    it('does not count an empty persisted casualty map as a run-summary record', () => {
        expect(hasCivilianCasualtyRecords({})).toBe(false);
    });

    it('counts finite non-negative casualty totals as run-summary records', () => {
        expect(hasCivilianCasualtyRecords({ RBiH: { killed: 0, fled_abroad: 1 } })).toBe(true);
    });
});
