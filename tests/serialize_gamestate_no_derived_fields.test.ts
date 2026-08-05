/**
 * Phase A1.3: Serializer rejects denylisted derived-state keys (defense in depth with validateGameStateShape).
 * Engine Invariants Section 13.1: no serialization of derived states.
 */

import { describe, expect, it } from 'vitest';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeGameState, serializeRuntimeGameState } from '../src/state/serializeGameState.js';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed: 'x', player_faction: 'RBiH', decision_mode: 'historical' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_front_sectors: {},
            sector_intel: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {} as any,
    };
}

function expectThrownMessage(run: () => void, matcher: (message: string) => boolean): void {
    try {
        run();
        throw new Error('Expected serializeGameState to throw');
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        expect(matcher(message), `Unexpected error message: ${message}`).toBe(true);
    }
}

describe('serializeGameState derived-state rejection', () => {
    it('persists materialized sector placement and region assignments', () => {
        const state = baseState();
        state.military.formations = {
            brigade_sector: {
                id: 'brigade_sector',
                faction: 'RBiH',
                name: 'Sector Brigade',
                created_turn: 0,
                status: 'active',
                assignment: { kind: 'sector', sector_id: 'sector_a', role: 'front' },
                assigned_sub_segment_id: 'sector_a:sub:0',
            },
            brigade_region: {
                id: 'brigade_region',
                faction: 'RBiH',
                name: 'Region Brigade',
                created_turn: 0,
                status: 'active',
                assignment: { kind: 'region', region_id: 'region_a' },
            },
        };

        const canonical = JSON.parse(serializeGameState(state)) as GameState;
        const runtime = JSON.parse(serializeRuntimeGameState(state)) as GameState;

        expect(canonical.military.formations.brigade_sector.assignment).toEqual(
            state.military.formations.brigade_sector.assignment,
        );
        expect(canonical.military.formations.brigade_sector.assigned_sub_segment_id).toBe('sector_a:sub:0');
        expect(canonical.military.formations.brigade_region.assignment).toEqual({
            kind: 'region',
            region_id: 'region_a',
        });
        expect(runtime.military.formations.brigade_sector.assignment).toEqual(
            state.military.formations.brigade_sector.assignment,
        );
        expect(runtime.military.formations.brigade_sector.assigned_sub_segment_id).toBe('sector_a:sub:0');
        expect(state.military.formations.brigade_sector.assignment).toEqual({
            kind: 'sector',
            sector_id: 'sector_a',
            role: 'front',
        });
        expect(state.military.formations.brigade_sector.assigned_sub_segment_id).toBe('sector_a:sub:0');
    });

    it('omits only the five transient military caches without mutating runtime state', () => {
        const state = baseState();
        Object.assign(state.military, {
            active_offensives_against_corps: { corps_a: 2 },
            corps_front_sectors: {
                sector_a: {
                    sector_id: 'sector_a',
                    corps_id: 'corps_a',
                    faction: 'RBiH',
                    opposing_factions: ['RS'],
                    edge_ids: ['edge_a'],
                    sub_segments: [],
                    length_edges: 1,
                    territory_osids: ['osid_a'],
                    assigned_brigade_ids: ['brigade_a'],
                    reserve_brigade_ids: [],
                    density: 1,
                    threat_ratio: 0,
                    defensive_power: 1,
                    sector_stance: 'defend',
                    stance_source: 'bot',
                },
            },
            home_distance_cache: { brigade_a: 3 },
            militia_garrison: { settlement_a: 100 },
            sector_combat_ratings: { sector_a: { sector_id: 'sector_a' } },
            unresolved_sector_brigades: ['brigade_a'],
        });
        const serialized = JSON.parse(serializeGameState(state)) as {
            military: Record<string, unknown>;
        };
        const runtime = JSON.parse(serializeRuntimeGameState(state)) as {
            military: Record<string, unknown>;
        };

        expect(serialized.military).not.toHaveProperty('active_offensives_against_corps');
        expect(serialized.military.corps_front_sectors).toEqual(state.military.corps_front_sectors);
        expect(serialized.military).not.toHaveProperty('home_distance_cache');
        expect(serialized.military).not.toHaveProperty('militia_garrison');
        expect(serialized.military).not.toHaveProperty('sector_combat_ratings');
        expect(serialized.military).not.toHaveProperty('unresolved_sector_brigades');
        expect(state.military.corps_front_sectors).toBeDefined();
        expect(state.military.home_distance_cache).toEqual({ brigade_a: 3 });
        expect(runtime.military.corps_front_sectors).toEqual(state.military.corps_front_sectors);
        expect(runtime.military.home_distance_cache).toEqual(state.military.home_distance_cache);
    });

    it('persists history-bearing sector intelligence', () => {
        const state = baseState();
        state.military.sector_intel = {
            friendly_sector: [{
                enemy_sector_id: 'enemy_sector',
                enemy_faction: 'RS',
                enemy_corps_id: 'enemy_corps',
                front_edge_count: 2,
                strength_category: 'moderate',
                posture_observed: 'defensive',
                offensive_signs: false,
                confidence: 0.6,
                turns_in_contact: 3,
                visible_brigade_ids: ['enemy_brigade'],
                last_updated_turn: 4,
            }],
        };

        const serialized = JSON.parse(serializeGameState(state)) as {
            military: Record<string, unknown>;
        };
        expect(serialized.military.sector_intel).toEqual(state.military.sector_intel);
    });

    it('rejects state with top-level "fronts"', () => {
        const state = baseState() as GameState & { fronts?: unknown };
        state.fronts = [];
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('fronts') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "corridors"', () => {
        const state = baseState() as GameState & { corridors?: unknown };
        state.corridors = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('corridors') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "derived"', () => {
        const state = baseState() as GameState & { derived?: unknown };
        state.derived = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('derived') || message.includes('denylisted') || message.includes('validation')
        );
    });

    it('rejects state with top-level "cache"', () => {
        const state = baseState() as GameState & { cache?: unknown };
        state.cache = {};
        expectThrownMessage(
            () => serializeGameState(state),
            (message) => message.includes('cache') || message.includes('denylisted') || message.includes('validation')
        );
    });
});
