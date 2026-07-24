import { describe, expect, it } from 'vitest';

import { advanceTurn, startNewCampaign } from '../src/desktop/desktop_sim.js';
import { runScenarioDeterministic } from '../src/cli/sim_scenario.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';

const INVALID_FORMATION_ID = 'invalid_brigade';
const INVARIANT_FAILURE_MESSAGE =
    'Post-turn invariant failure at turn 1: 1 issue(s): ' +
    'formation.location_missing at military.formations.invalid_brigade.location_osid: ' +
    'Active physical formation invalid_brigade (RBiH) has no location_osid';

function addUnplacedActiveBrigade(state: GameState): void {
    state.military.formations[INVALID_FORMATION_ID] = {
        id: INVALID_FORMATION_ID,
        faction: 'RBiH',
        name: 'Invalid Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
    };
}

function minimalStateWithUnplacedActiveBrigade(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'production-caller-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0,
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as unknown as GameState['military'],
        political: { political_controllers: {} } as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

describe('TurnResult production caller handling', () => {
    it('desktop keeps the input save unchanged and returns a deterministic actionable invariant error', async () => {
        const state = (await startNewCampaign(process.cwd(), 'RS', 'apr_1992')).state;
        addUnplacedActiveBrigade(state);
        const inputBytes = JSON.stringify(state);

        const first = await advanceTurn(state, process.cwd());
        const second = await advanceTurn(state, process.cwd());

        expect(first.error).toBe(INVARIANT_FAILURE_MESSAGE);
        expect(second.error).toBe(first.error);
        expect(first.state).toBe(state);
        expect(second.state).toBe(state);
        expect(JSON.stringify(state)).toBe(inputBytes);
        expect(state.meta.turn).toBe(0);
    }, 30_000);

    it('deterministic scenario CLI stops on the first invariant failure without advancing its input', async () => {
        const state = minimalStateWithUnplacedActiveBrigade();
        addUnplacedActiveBrigade(state);
        const inputBytes = JSON.stringify(state);

        await expect(runScenarioDeterministic(state, {
            turns: 2,
            applyBreaches: false,
            applyNegotiation: false,
            script: { schema: 1, turns: {} },
            settlementEdges: [],
        })).rejects.toThrow(INVARIANT_FAILURE_MESSAGE);

        expect(JSON.stringify(state)).toBe(inputBytes);
        expect(state.meta.turn).toBe(0);
    });
});
