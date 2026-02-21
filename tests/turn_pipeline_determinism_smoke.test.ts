/**
 * Phase A1.6: Deterministic re-run and state-diff tests.
 * Same initial state + same inputs → identical serialized output (canonical serializer).
 * Serialized state diff must be empty.
 */

import assert from 'node:assert';
import { test } from 'node:test';

import { CURRENT_SCHEMA_VERSION, GameState } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

const baseState: GameState = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'initial-seed' },
    factions: [],
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {},
    negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
    ceasefire: {},
    negotiation_ledger: [],
    supply_rights: { corridors: [] }
};

test('same state + same inputs yields identical output', () => {
    const inputs = { seed: 'deterministic-seed' };

    const r1 = runOneTurn(baseState, inputs);
    const r2 = runOneTurn(baseState, inputs);

    const out1 = serializeState(r1.state);
    const out2 = serializeState(r2.state);

    assert.strictEqual(out1, out2, 'Same inputs must produce identical serialized state');
});

test('multiple turns from same base yield deterministic sequence', () => {
    const seed = 'sequence-seed';

    let s1 = baseState;
    for (let i = 0; i < 3; i++) {
        const r = runOneTurn(s1, { seed });
        s1 = r.state;
    }

    let s2 = baseState;
    for (let i = 0; i < 3; i++) {
        const r = runOneTurn(s2, { seed });
        s2 = r.state;
    }

    const out1 = serializeState(s1);
    const out2 = serializeState(s2);
    assert.strictEqual(out1, out2, 'Identical runs must yield identical final state');
});
