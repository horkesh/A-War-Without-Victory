/**
 * Stream 2: Save/Load round-trip test.
 * Verifies that serialize -> file write -> file read -> deserialize produces identical state.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

/** Minimal fixture that can round-trip through JSON serialization. */
function makeFixture(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 5, seed: 'save-roundtrip-test', phase: 'war' },
        factions: [
            {
                id: 'RBiH',
                profile: { authority: 0.5, legitimacy: 0.5, control: 0.5, logistics: 0.5, exhaustion: 0.1 },
                areasOfResponsibility: [],
                supply_sources: [],
                command_capacity: 3,
                negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null },
                declaration_pressure: 0,
                declared: true,
                declaration_turn: 0,
            },
        ],
        military: {
            formations: {
                'brig_101': {
                    id: 'brig_101',
                    faction: 'RBiH',
                    force_label: 'ARBiH',
                    name: '101st Brigade',
                    created_turn: 0,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    readiness: 'active',
                    cohesion: 60,
                    morale: 60,
                    activation_gated: false,
                    activation_turn: null,
                    ops: { fatigue: 0, last_supplied_turn: null },
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {
                'op:sarajevo:sarajevo_1': 'RBiH',
                'op:sarajevo:sarajevo_2': 'RBiH',
            },
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
        },
        displacement: {
            displacement_event_log: [],
        },
    } as unknown as GameState;
}

test('save/load round-trip: serialize -> write -> read -> parse produces identical JSON', () => {
    const state = makeFixture();
    const serialized = serializeGameState(state, 2);

    // Write to a temp file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'awwv-save-test-'));
    const filePath = path.join(tmpDir, 'test_save.json');

    try {
        fs.writeFileSync(filePath, serialized, 'utf-8');

        // Read back
        const readBack = fs.readFileSync(filePath, 'utf-8');

        // Byte-identical
        assert.strictEqual(readBack, serialized, 'File content must be byte-identical to serialized string');

        // Parse produces identical structure
        const parsed = JSON.parse(readBack);
        const original = JSON.parse(serialized);
        assert.deepStrictEqual(parsed, original, 'Parsed JSON must be structurally identical');

        // Key fields preserved
        assert.strictEqual(parsed.meta.turn, 5);
        assert.strictEqual(parsed.meta.seed, 'save-roundtrip-test');
        assert.strictEqual(parsed.factions[0].id, 'RBiH');
        assert.strictEqual(Object.keys(parsed.military.formations).length, 1);
        assert.strictEqual(parsed.military.formations['brig_101'].name, '101st Brigade');
    } finally {
        // Cleanup
        fs.rmSync(tmpDir, { recursive: true, force: true });
    }
});

test('save/load round-trip: re-serializing parsed state produces identical JSON', () => {
    const state = makeFixture();
    const serialized1 = serializeGameState(state, 2);

    // Simulate the full round-trip: serialize -> parse -> re-serialize
    const parsed = JSON.parse(serialized1) as GameState;
    const serialized2 = serializeGameState(parsed, 2);

    assert.strictEqual(serialized1, serialized2, 'Re-serialization must produce byte-identical output');
});
