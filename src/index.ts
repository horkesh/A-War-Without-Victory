/**
 * Minimal smoke entrypoint.
 *
 * This file exists for tiny deterministic smoke checks and should not be
 * treated as the main gameplay or desktop entrypoint.
 */

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
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {} as any, displacement: {} as any
};

const next = executeTurn(initial, { seed: initial.meta.seed });
process.stdout.write(serializeState(next) + '\n');

