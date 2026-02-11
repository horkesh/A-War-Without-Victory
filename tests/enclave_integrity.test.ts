import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '../src/state/game_state.js';
import type { LoadedSettlementGraph } from '../src/map/settlements.js';
import type { SupplyStateDerivationReport } from '../src/state/supply_state_derivation.js';
import { updateEnclaveIntegrity } from '../src/state/enclave_integrity.js';

function baseState(): GameState {
  return {
    schema_version: 1,
    meta: { turn: 5, seed: 'enclave-test', phase: 'phase_ii' },
    factions: [
      { id: 'RBiH', profile: { authority: 0, legitimacy: 0, control: 0, logistics: 0, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    political_controllers: { S1: 'RBiH', S2: 'RBiH' },
    municipalities: { M1: { authority: 0.5 } }
  };
}

test('updateEnclaveIntegrity detects enclave and pressure', () => {
  const state = baseState();
  const graph: LoadedSettlementGraph = {
    settlements: new Map([
      ['S1', { sid: 'S1', source_id: 'S1', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }],
      ['S2', { sid: 'S2', source_id: 'S2', mun_code: 'M1', mun: 'M1', mun1990_id: 'M1' }]
    ]),
    edges: [{ a: 'S1', b: 'S2' }]
  };
  const supplyReport: SupplyStateDerivationReport = {
    schema: 1,
    turn: 5,
    factions: [
      {
        faction_id: 'RBiH',
        by_settlement: [
          { sid: 'S1', state: 'critical' },
          { sid: 'S2', state: 'critical' }
        ],
        adequate_count: 0,
        strained_count: 0,
        critical_count: 2
      }
    ]
  };

  const report = updateEnclaveIntegrity(state, graph, graph.edges, supplyReport);
  assert.strictEqual(report.enclaves.length, 1);
  assert.ok(report.humanitarian_pressure_total > 0);
});
