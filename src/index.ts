/**
 * Minimal smoke entrypoint.
 *
 * This file exists for tiny deterministic smoke checks and should not be
 * treated as the main gameplay or desktop entrypoint.
 */

import { CURRENT_SCHEMA_VERSION, type GameState } from './state/game_state.js';
import { prepareNewGameState } from './state/initialize_new_game_state.js';
import { serializeState } from './state/serialize.js';
import { executeTurn } from './turn/pipeline.js';
import { loadSettlementGraph } from './map/settlements.js';

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
    militia_pools: {},
    army_co_decision_traces: {},
    army_corps_directives_by_faction: {},
    event_decision_log: [],
    fired_event_ids: [],
    event_readiness: {},
    event_fire_counts: {},
    event_last_fired_turn: {},
    event_flags: {},
    enabled_event_ids: []
  },
  political: {
    war_consolidation_until: {},
    war_control_strain: {},
    war_supply_pressure: {},
    war_supply_condition: {},
    war_exhaustion: {},
    war_exhaustion_local: {}
  },
  displacement: {
    war_displacement_initiated: {},
    hostile_takeover_timers: {},
    displacement_camp_state: {},
    displacement_event_log: [],
    displacement_humanitarian_aggregates: {},
    displacement_origin_dest_arrivals: {},
    displacement_recent_by_turn: {},
    settlement_displacement: {},
    settlement_displacement_started_turn: {},
    municipality_displacement: {}
  }
};

async function main(): Promise<void> {
  const graph = await loadSettlementGraph();
  await prepareNewGameState(initial, graph);

  const next = executeTurn(initial, { seed: initial.meta.seed });
  process.stdout.write(serializeState(next) + '\n');
}

main().catch((err) => {
  console.error('smoke entrypoint failed', err);
  process.exitCode = 1;
});
