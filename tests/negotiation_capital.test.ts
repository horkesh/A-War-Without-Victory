import { test } from 'node:test';
import assert from 'node:assert';
import type { GameState } from '../src/state/game_state.js';
import type { FrontEdge } from '../src/map/front_edges.js';
import { updateNegotiationCapital } from '../src/state/negotiation_capital.js';
import { spendNegotiationCapital } from '../src/state/negotiation_capital.js';
import type { LoadedSettlementGraph } from '../src/map/settlements.js';

function createTestState(): GameState {
  return {
    schema_version: 1,
    meta: { turn: 5, seed: 'test' },
    factions: [
      {
        id: 'faction_a',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 },
        areasOfResponsibility: ['sid1', 'sid2'],
        supply_sources: [],
        negotiation: { pressure: 5, last_change_turn: 3, capital: 0, spent_total: 0, last_capital_change_turn: null },
        patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 0 }
      },
      {
        id: 'faction_b',
        profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 },
        areasOfResponsibility: ['sid3', 'sid4'],
        supply_sources: [],
        negotiation: { pressure: 10, last_change_turn: 4, capital: 0, spent_total: 0, last_capital_change_turn: null },
        patron_state: { material_support_level: 0.5, diplomatic_isolation: 0, constraint_severity: 0.3, patron_commitment: 0.5, last_updated: 0 }
      }
    ],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    negotiation_ledger: [],
    international_visibility_pressure: {
      sarajevo_siege_visibility: 0,
      enclave_humanitarian_pressure: 0,
      atrocity_visibility: 0,
      negotiation_momentum: 0.2,
      last_major_shift: null
    },
    enclaves: [
      {
        id: 'ENCL_TEST',
        faction_id: 'faction_a',
        settlement_ids: [],
        integrity: 0.5,
        components: { supply: 0, authority: 0.5, population: 0.5, connectivity: 0.5 },
        humanitarian_pressure: 0.1,
        siege_duration: 3,
        collapsed: false
      }
    ]
  };
}

const EMPTY_GRAPH: LoadedSettlementGraph = { settlements: new Map(), edges: [] };

test('negotiation capital: defaults set correctly', () => {
  const state = createTestState();
  assert.strictEqual(state.factions[0].negotiation?.capital, 0);
  assert.strictEqual(state.factions[0].negotiation?.spent_total, 0);
  assert.strictEqual(state.factions[0].negotiation?.last_capital_change_turn, null);
  assert.ok(Array.isArray(state.negotiation_ledger));
});

test('negotiation capital: computation matches formula', async () => {
  const state = createTestState();

  const report = await updateNegotiationCapital(state, undefined, undefined, undefined, EMPTY_GRAPH);

  // faction_a: base=95, ivp_penalty=2, patron_bonus=2.5, enclave_penalty=1 => floor(94.5)=94
  const factionA = report.per_faction.find((f) => f.faction_id === 'faction_a');
  assert.ok(factionA);
  assert.strictEqual(factionA.capital_after, 94);
  assert.strictEqual(state.factions[0].negotiation?.capital, 94);
  assert.strictEqual(state.factions[0].negotiation?.last_capital_change_turn, 5);

  // faction_b: base=90, ivp_penalty=2, patron_bonus=2.5 => floor(90.5)=90
  const factionB = report.per_faction.find((f) => f.faction_id === 'faction_b');
  assert.ok(factionB);
  assert.strictEqual(factionB.capital_after, 90);
  assert.strictEqual(state.factions[1].negotiation?.capital, 90);
});

test('negotiation capital: ledger ids deterministic', async () => {
  const state = createTestState();
  state.meta.turn = 10;

  await updateNegotiationCapital(state, undefined, undefined, undefined, EMPTY_GRAPH);

  // Should have ledger entries (base_capital, enclave_liability_penalty, ivp_penalty, patron_bonus)
  const ledgerEntries = state.negotiation_ledger?.filter((e) => e.faction_id === 'faction_a' && e.turn === 10) ?? [];
  assert.strictEqual(ledgerEntries.length, 4);
  assert.strictEqual(ledgerEntries[0].id, 'NLED_10_faction_a_adjust_1');
  assert.strictEqual(ledgerEntries[0].reason, 'base_capital');
  assert.strictEqual(ledgerEntries[1].id, 'NLED_10_faction_a_adjust_2');
  assert.strictEqual(ledgerEntries[1].reason, 'enclave_liability_penalty');
  assert.strictEqual(ledgerEntries[2].id, 'NLED_10_faction_a_adjust_3');
  assert.strictEqual(ledgerEntries[2].reason, 'ivp_penalty');
  assert.strictEqual(ledgerEntries[3].id, 'NLED_10_faction_a_adjust_4');
  assert.strictEqual(ledgerEntries[3].reason, 'patron_bonus');
});

test('negotiation capital: spend reduces capital and increases spent_total', () => {
  const state = createTestState();
  state.factions[0].negotiation!.capital = 10;
  state.factions[0].negotiation!.spent_total = 0;

  spendNegotiationCapital(state, 'faction_a', 3, 'pre_treaty_reserve');

  assert.strictEqual(state.factions[0].negotiation?.capital, 7);
  assert.strictEqual(state.factions[0].negotiation?.spent_total, 3);
  assert.strictEqual(state.factions[0].negotiation?.last_capital_change_turn, 5);

  // Check ledger entry
  const ledgerEntries = state.negotiation_ledger?.filter((e) => e.faction_id === 'faction_a' && e.kind === 'spend') ?? [];
  assert.strictEqual(ledgerEntries.length, 1);
  assert.strictEqual(ledgerEntries[0].amount, 3);
  assert.strictEqual(ledgerEntries[0].reason, 'pre_treaty_reserve');
  assert.strictEqual(ledgerEntries[0].id, 'NLED_5_faction_a_spend_1');
});

test('negotiation capital: spend fails if insufficient capital', () => {
  const state = createTestState();
  state.factions[0].negotiation!.capital = 2;

  assert.throws(() => {
    spendNegotiationCapital(state, 'faction_a', 5, 'pre_treaty_reserve');
  }, /Insufficient capital/);
});

test('negotiation capital: determinism regression', async () => {
  const state1 = createTestState();
  const state2 = createTestState();
  await updateNegotiationCapital(state1, undefined, undefined, undefined, EMPTY_GRAPH);
  await updateNegotiationCapital(state2, undefined, undefined, undefined, EMPTY_GRAPH);

  // Results should be identical
  assert.strictEqual(state1.factions[0].negotiation?.capital, state2.factions[0].negotiation?.capital);
  assert.strictEqual(state1.negotiation_ledger?.length, state2.negotiation_ledger?.length);
  if (state1.negotiation_ledger && state2.negotiation_ledger) {
    assert.deepStrictEqual(state1.negotiation_ledger, state2.negotiation_ledger);
  }
});
