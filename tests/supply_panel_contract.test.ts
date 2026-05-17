import { describe, expect, it } from 'vitest';
import { parseGameState } from '../src/ui/map/data/GameStateAdapter.js';

describe('SupplyPanel adapter contract', () => {
    it('exposes deterministic per-faction supply state and corridor summary counts', () => {
        const loaded = parseGameState({
            schema_version: 13,
            meta: { turn: 1, phase: 'war', seed: 'supply-panel-contract', player_faction: null },
            factions: [
                { id: 'RBiH', profile: {}, areasOfResponsibility: [], declared: true },
                { id: 'RS', profile: {}, areasOfResponsibility: [], declared: true },
            ],
            military: {
                formations: {},
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
                general_supply_reserve: { RBiH: 75, RS: 60 },
                heavy_munitions_reserve: { RBiH: 30, RS: 40 },
            },
            political: {
                political_controllers: {},
                war_supply_condition: { RS: 50, RBiH: 100 },
            },
            displacement: {},
            supply_state_by_osid: {
                schema: 1,
                turn: 1,
                factions: [
                    {
                        faction_id: 'RS',
                        by_osid: [
                            { osid: 'rs:a', state: 'critical' },
                            { osid: 'rs:b', state: 'strained' },
                        ],
                    },
                    {
                        faction_id: 'RBiH',
                        by_osid: [
                            { osid: 'rbih:a', state: 'adequate' },
                            { osid: 'rbih:b', state: 'adequate' },
                        ],
                    },
                ],
            },
            supply_corridors_osid: {
                schema: 1,
                turn: 1,
                corridors: [
                    { faction_id: 'RS', edge_id: 'rs:a__rs:b', state: 'cut' },
                    { faction_id: 'RBiH', edge_id: 'rbih:a__rbih:b', state: 'open' },
                    { faction_id: 'RS', edge_id: 'rs:b__rs:c', state: 'brittle' },
                ],
            },
        });

        expect(Object.keys(loaded.supplySummaryByFaction ?? {})).toEqual(['RBiH', 'RS']);
        expect(loaded.supplySummaryByFaction?.RBiH).toEqual({
            adequate_count: 2,
            strained_count: 0,
            critical_count: 0,
            corridor_open_count: 1,
            corridor_brittle_count: 0,
            corridor_cut_count: 0,
        });
        expect(loaded.supplySummaryByFaction?.RS).toEqual({
            adequate_count: 0,
            strained_count: 1,
            critical_count: 1,
            corridor_open_count: 0,
            corridor_brittle_count: 1,
            corridor_cut_count: 1,
        });
    });
});
