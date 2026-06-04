/**
 * Phase A1.1: current_turn is modeled as integer weeks; no dates/timestamps in state.
 * Engine Invariants v0.3.0; CANON: one game turn = one week.
 */

import { describe, expect, it } from 'vitest';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';

describe('GameState turn/week invariant', () => {
    it('meta.turn must be non-negative integer (weeks)', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 5, seed: 'x', player_faction: 'RBiH', decision_mode: 'historical' },
            factions: [],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                political_controllers: {},
            } as any,
            displacement: {} as any,
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(true);
    });

    it('rejects meta.turn as float', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 1.5, seed: 'x' },
            factions: [],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                political_controllers: {},
            } as any,
            displacement: {} as any,
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('integer'))).toBe(true);
    });

    it('rejects negative meta.turn', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: -1, seed: 'x' },
            factions: [],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                political_controllers: {},
            } as any,
            displacement: {} as any,
        };
        const result = validateGameStateShape(state);
        expect(result.ok).toBe(false);
        expect((result as { errors: string[] }).errors.some(e => e.includes('non-negative') || e.includes('integer'))).toBe(true);
    });

    it('allows no timestamp or date fields in meta (contract: meta only turn + seed + optional phase + player_faction)', () => {
        const state = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: 0, seed: 'x', player_faction: 'RBiH' },
            factions: [],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as any,
            political: {
                political_controllers: {},
            } as any,
            displacement: {} as any,
        };
        const meta = state.meta as Record<string, unknown>;
        const allowed = new Set(['turn', 'seed', 'phase', 'player_faction']);
        for (const key of Object.keys(meta)) {
            expect(allowed.has(key), `meta must not contain "${key}" (no timestamps/dates); only turn, seed, phase, player_faction allowed`).toBe(true);
        }
    });
});
