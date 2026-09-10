import assert from 'node:assert/strict';
import { loadEventDefinitions } from '../../../src/sim/events/event_loader.js';
import { updateEventReadiness } from '../../../src/sim/events/pressure_system.js';
import { evaluateEvents } from '../../../src/sim/events/evaluate_events.js';
import { turnToDateString } from '../../../src/ui/map/utils/formatters.js';
import type { EventDefinition, Rng } from '../../../src/sim/events/event_types.js';
import type { GameState } from '../../../src/state/game_state.js';

const rejectRandomness: Rng = () => { throw new Error('event evaluation consumed RNG'); };
const catalog = loadEventDefinitions(0);

function event(id: string, turnMin: number): EventDefinition {
  const loaded = catalog.find((row) => row.id === id);
  assert.ok(loaded, `missing ${id}`);
  // Preserve the live trigger, pressure, once, and flags that affect the chain.
  // Strip unrelated mechanical effects so this fixture measures only temporal semantics.
  return {
    ...loaded,
    trigger: { ...loaded.trigger, turn_min: turnMin },
    effect: { kind: 'narrative', text: loaded.id },
    effects: undefined,
    dimension_shifts: undefined,
  };
}

function state(): GameState {
  return {
    schema_version: 1,
    meta: { turn: 0, seed: 'p2-temporal', phase: 'war' },
    factions: [],
    displacement: {},
    political: {
      political_controllers: {
        'op:srebrenica:srebrenica_2': 'RBiH',
        'op:rogatica:zepa_2': 'RBiH',
      },
    },
    military: {
      formations: {},
      fired_event_ids: [],
      event_readiness: {},
      event_flags: {
        srebrenica_enclave_formed: true,
        srebrenica_demilitarized: true,
        coha_expired: true,
        rrf_deployed: true,
        un_hostage_crisis_occurred: true,
        sarajevo_siege_active: true,
      },
      negotiation: {
        capital: { RS: { war_crimes_events: 10, international_credibility: 50 } },
        patron_relationships: {},
        peace_plan_history: [],
      },
    },
  } as unknown as GameState;
}

function intervalForReceipt(turn: number): { completed_week: string; displayed_after_advance: string } {
  const epoch = new Date('1992-04-06T00:00:00Z');
  const start = new Date(epoch); start.setUTCDate(start.getUTCDate() + (turn - 1) * 7);
  const end = new Date(epoch); end.setUTCDate(end.getUTCDate() + turn * 7 - 1);
  return {
    completed_week: `${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}`,
    displayed_after_advance: turnToDateString(turn),
  };
}

function simulate(registry: EventDefinition[], firstTurn: number, lastTurn: number) {
  const s = state();
  const rows = [];
  for (let turn = firstTurn; turn <= lastTurn; turn += 1) {
    s.meta.turn = turn;
    updateEventReadiness(s, registry);
    const readiness_before_evaluation = Object.fromEntries(
      registry.filter((row) => row.pressure).map((row) => [row.id, s.military.event_readiness?.[row.id] ?? 0]),
    );
    const result = evaluateEvents(s, rejectRandomness, turn, registry);
    rows.push({
      raw_turn: turn,
      scenario_week_index: turn - 1,
      ...intervalForReceipt(turn),
      readiness_before_evaluation,
      fired: result.fired.map((row) => row.id),
    });
  }
  return rows;
}

const enclave = [
  event('srebrenica_falls_1995', 169),
  event('srebrenica_column_breakout_1995', 171),
  event('zepa_falls_1995', 160),
];
const nato = [
  event('second_markale_massacre_1995', 177),
  event('nato_deliberate_force_1995', 178),
];

const result = {
  semantics: {
    initial_turn: 0,
    first_run_turn_receipt: 1,
    relation: 'scenario week_index = raw receipt turn - 1; receipt tN closes interval [date(tN-1), date(tN)-1 day]; UI chronology displays date(tN)',
  },
  candidate_projection: {
    enclave: simulate(enclave, 169, 173),
    markale_deliberate_force: simulate(nato, 177, 179),
  },
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
