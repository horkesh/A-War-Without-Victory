import { CURRENT_SCHEMA_VERSION, GameState } from './state/game_state.js';
import { serializeState } from './state/serialize.js';
import { executeTurn } from './turn/pipeline.js';

const initial: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: {
        turn: 0,
        seed: 'smoke-seed'
    },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
};

const next = executeTurn(initial, { seed: initial.meta.seed });
process.stdout.write(serializeState(next) + '\n');

