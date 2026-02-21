/**
 * Phase A1.3: Serializer rejects denylisted derived-state keys (defense in depth with validateGameStateShape).
 * Engine Invariants §13.1: no serialization of derived states.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState } from '../src/state/serializeGameState.js';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'x' },
        factions: [],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {}
    };
}

test('serializeGameState rejects state with top-level "fronts"', () => {
    const state = baseState() as GameState & { fronts?: unknown };
    state.fronts = [];
    assert.throws(
        () => serializeGameState(state),
        (err: Error) => err.message.includes('fronts') || err.message.includes('denylisted') || err.message.includes('validation'),
        'Must reject fronts key'
    );
});

test('serializeGameState rejects state with top-level "corridors"', () => {
    const state = baseState() as GameState & { corridors?: unknown };
    state.corridors = {};
    assert.throws(
        () => serializeGameState(state),
        (err: Error) => err.message.includes('corridors') || err.message.includes('denylisted') || err.message.includes('validation'),
        'Must reject corridors key'
    );
});

test('serializeGameState rejects state with top-level "derived"', () => {
    const state = baseState() as GameState & { derived?: unknown };
    state.derived = {};
    assert.throws(
        () => serializeGameState(state),
        (err: Error) => err.message.includes('derived') || err.message.includes('denylisted') || err.message.includes('validation'),
        'Must reject derived key'
    );
});

test('serializeGameState rejects state with top-level "cache"', () => {
    const state = baseState() as GameState & { cache?: unknown };
    state.cache = {};
    assert.throws(
        () => serializeGameState(state),
        (err: Error) => err.message.includes('cache') || err.message.includes('denylisted') || err.message.includes('validation'),
        'Must reject cache key'
    );
});
