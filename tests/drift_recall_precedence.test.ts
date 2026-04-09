import { describe, expect, it } from 'vitest';
import { recallDriftedBrigades } from '../src/sim/turn_phases/war_phases.js';
import type { GameState } from '../src/state/game_state.js';

function makeAdjacency(): Map<string, string[]> {
    return new Map<string, string[]>([
        ['op:banja_luka:banja_luka_2', ['op:doboj:doboj_2', 'op:donji_vakuf:pribraca_2']],
        ['op:donji_vakuf:pribraca_2', ['op:banja_luka:banja_luka_2']],
        ['op:doboj:doboj_2', ['op:banja_luka:banja_luka_2', 'op:tuzla:tuzla_2']],
        ['op:tuzla:tuzla_2', ['op:doboj:doboj_2', 'op:zvornik:zvornik_2']],
        ['op:zvornik:zvornik_2', ['op:tuzla:tuzla_2', 'op:rogatica:pljesevica']],
        ['op:rogatica:pljesevica', ['op:zvornik:zvornik_2', 'op:rogatica:rogatica_2', 'op:rogatica:enemy_line']],
        ['op:rogatica:rogatica_2', ['op:rogatica:pljesevica']],
        ['op:rogatica:enemy_line', ['op:rogatica:pljesevica']],
    ]);
}

function makeSector(opts: {
    sectorId: string;
    corpsId: string;
    territory: string[];
    front?: string[];
    assigned?: string[];
    reserve?: string[];
}) {
    return {
        sector_id: opts.sectorId,
        corps_id: opts.corpsId,
        faction: 'RS',
        opposing_factions: ['RBiH'],
        edge_ids: ['e1'],
        sub_segments: [{
            sub_segment_id: `${opts.sectorId}:sub`,
            friendly_osids: opts.front ?? [],
            enemy_osids: ['op:rogatica:enemy_line'],
            edge_ids: ['e1'],
            length_edges: 1,
            primary_brigade_ids: [],
        }],
        territory_osids: opts.territory,
        assigned_brigade_ids: opts.assigned ?? [],
        reserve_brigade_ids: opts.reserve ?? [],
        density: 1,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'balanced',
        stance_source: 'bot',
    };
}

function makeState(overrides: {
    formation?: Partial<any>;
    movementOrder?: string;
    sectors?: Record<string, any>;
    activeOperations?: any[];
} = {}): GameState {
    const formation = {
        id: 'rs_1st_podrinje',
        kind: 'brigade',
        status: 'active',
        faction: 'RS',
        corps_id: 'vrs_drina',
        location_osid: 'op:banja_luka:banja_luka_2',
        home_osid: 'op:rogatica:rogatica_2',
        personnel: 1200,
        disrupted_turns: 0,
        assignment: null,
        ...overrides.formation,
    };

    return {
        meta: { turn: 40, phase: 'war' },
        political: {
            political_controllers: {
                'op:banja_luka:banja_luka_2': 'RS',
                'op:donji_vakuf:pribraca_2': 'RS',
                'op:doboj:doboj_2': 'RS',
                'op:tuzla:tuzla_2': 'RS',
                'op:zvornik:zvornik_2': 'RS',
                'op:rogatica:pljesevica': 'RS',
                'op:rogatica:rogatica_2': 'RS',
                'op:rogatica:enemy_line': 'RBiH',
            },
        },
        military: {
            formations: {
                [formation.id]: formation,
            },
            brigade_movement_orders: overrides.movementOrder
                ? {
                    [formation.id]: {
                        destination_sids: [overrides.movementOrder],
                        stance: 'column',
                    },
                }
                : {},
            corps_command: {
                vrs_drina: {
                    active_operations: overrides.activeOperations ?? [],
                },
            },
            corps_front_sectors: overrides.sectors ?? {
                'sector:vrs_drina:7': makeSector({
                    sectorId: 'sector:vrs_drina:7',
                    corpsId: 'vrs_drina',
                    territory: ['op:rogatica:rogatica_2', 'op:rogatica:pljesevica'],
                    front: ['op:rogatica:pljesevica'],
                }),
            },
        },
    } as unknown as GameState;
}

describe('recallDriftedBrigades', () => {
    it('overrides a generic move order for an ownerless brigade stranded outside same-corps space', () => {
        const state = makeState({ movementOrder: 'op:donji_vakuf:pribraca_2' });

        recallDriftedBrigades(state, makeAdjacency());

        expect(state.military.brigade_movement_orders?.rs_1st_podrinje).toEqual({
            destination_sids: ['op:rogatica:rogatica_2'],
            stance: 'column',
        });
    });

    it('preserves an existing move order when the brigade is still inside same-corps sector space', () => {
        const state = makeState({
            movementOrder: 'op:donji_vakuf:pribraca_2',
            sectors: {
                'sector:vrs_drina:7': makeSector({
                    sectorId: 'sector:vrs_drina:7',
                    corpsId: 'vrs_drina',
                    territory: ['op:rogatica:rogatica_2', 'op:rogatica:pljesevica', 'op:banja_luka:banja_luka_2'],
                    front: ['op:rogatica:pljesevica'],
                }),
            },
        });

        recallDriftedBrigades(state, makeAdjacency());

        expect(state.military.brigade_movement_orders?.rs_1st_podrinje).toEqual({
            destination_sids: ['op:donji_vakuf:pribraca_2'],
            stance: 'column',
        });
    });

    it('preserves an existing move order while the brigade is still claimed by an active operation', () => {
        const state = makeState({
            movementOrder: 'op:donji_vakuf:pribraca_2',
            activeOperations: [{
                phase: 'planning',
                participating_brigades: ['rs_1st_podrinje'],
                axes: [],
            }],
        });

        recallDriftedBrigades(state, makeAdjacency());

        expect(state.military.brigade_movement_orders?.rs_1st_podrinje).toEqual({
            destination_sids: ['op:donji_vakuf:pribraca_2'],
            stance: 'column',
        });
    });
});
