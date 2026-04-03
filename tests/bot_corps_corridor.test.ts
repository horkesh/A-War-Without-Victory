import { describe, expect, it } from 'vitest';
import { attemptCorridorBreach } from '../src/sim/combat/bot_corps_corridor.js';
import { CURRENT_SCHEMA_VERSION, type FactionId, type GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import { makeCorps, makeFormation, makeSector } from './test_factories.js';

function makeState(): { state: GameState; edges: EdgeRecord[]; sidToMun: Map<string, string> } {
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 12,
            seed: 'corridor-breach-sector-anchor',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ],
        military: {
            formations: {
                rs_corps: makeCorps({ id: 'rs_corps', faction: 'RS' as FactionId, location_osid: 'op:rear:rs' }),
                rs_b1: makeFormation({
                    id: 'rs_b1',
                    faction: 'RS' as FactionId,
                    corps_id: 'rs_corps' as any,
                    location_osid: 'f_left',
                    home_osid: 'f_left',
                    personnel: 2200,
                    cohesion: 70,
                }),
                rs_b2: makeFormation({
                    id: 'rs_b2',
                    faction: 'RS' as FactionId,
                    corps_id: 'rs_corps' as any,
                    location_osid: 'f_right',
                    home_osid: 'f_right',
                    personnel: 2100,
                    cohesion: 68,
                }),
            },
            corps_command: {
                rs_corps: {
                    command_span: 5,
                    subordinate_count: 2,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                'sector:rs_corps:0': makeSector({
                    sector_id: 'sector:rs_corps:0',
                    corps_id: 'rs_corps',
                    faction: 'RS' as FactionId,
                    opposing_factions: ['RBiH' as FactionId],
                    edge_ids: ['f_left__e_brcko', 'f_right__e_modrica'],
                    friendly_osids: ['f_left', 'f_right'],
                    enemy_osids: ['e_brcko', 'e_modrica'],
                    territory_osids: ['f_left', 'f_right'],
                    assigned_brigade_ids: ['rs_b1', 'rs_b2'],
                }),
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        },
        political: {
            political_controllers: {
                f_left: 'RS',
                f_right: 'RS',
                e_brcko: 'RBiH',
                e_modrica: 'RBiH',
            },
        },
        displacement: {},
    } as unknown as GameState;

    const edges = [
        { a: 'f_left', b: 'e_brcko' },
        { a: 'e_brcko', b: 'e_modrica' },
        { a: 'e_modrica', b: 'f_right' },
    ] as EdgeRecord[];

    const sidToMun = new Map<string, string>([
        ['e_brcko', 'brcko'],
        ['e_modrica', 'modrica'],
        ['f_left', 'brcko'],
        ['f_right', 'modrica'],
    ]);

    return { state, edges, sidToMun };
}

describe('bot_corps_corridor', () => {
    it('anchors corridor breach operations to the launching corps sector', () => {
        const { state, edges, sidToMun } = makeState();

        attemptCorridorBreach(state, 'RS' as FactionId, edges, sidToMun);

        const op = state.military.corps_command?.rs_corps?.active_operations[0];
        expect(op).toBeDefined();
        expect(op?.name).toContain('Corridor Breach');
        expect(op?.sector_id).toBe('sector:rs_corps:0');
    });
});
