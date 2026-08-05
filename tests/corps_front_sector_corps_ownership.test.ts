import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { CURRENT_SCHEMA_VERSION, type FactionId, type FormationState, type GameState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS',
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        ...overrides,
    } as FormationState;
}

function makeState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 5,
            seed: 'corps-sector-corps-ownership',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        } as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
            { id: 'RBiH' as FactionId, profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 0 }, areasOfResponsibility: [], declared: true },
        ] as unknown as GameState['factions'],
        military: {
            formations: {
                corps_alpha: makeFormation('corps_alpha', {
                    kind: 'corps',
                    location_osid: 'op:alpha:hq',
                    personnel: 50,
                }),
                corps_beta: makeFormation('corps_beta', {
                    kind: 'corps',
                    location_osid: 'op:beta:hq',
                    personnel: 50,
                }),
                brig_alpha: makeFormation('brig_alpha', {
                    corps_id: 'corps_alpha',
                    location_osid: 'op:alpha:front',
                    home_osid: 'op:alpha:front',
                }),
                brig_beta: makeFormation('brig_beta', {
                    corps_id: 'corps_beta',
                    location_osid: 'op:beta:front',
                    home_osid: 'op:beta:front',
                }),
                brig_beta2: makeFormation('brig_beta2', {
                    corps_id: 'corps_beta',
                    location_osid: 'op:beta:front',
                    home_osid: 'op:beta:front',
                }),
            },
            war_front_edges_osid: [
                { edge_id: 'op:alpha:front__op:enemy:a1', a: 'op:alpha:front', b: 'op:enemy:a1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:alpha:front__op:enemy:a2', a: 'op:alpha:front', b: 'op:enemy:a2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:alpha:front__op:enemy:a3', a: 'op:alpha:front', b: 'op:enemy:a3', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:alpha:front__op:enemy:a4', a: 'op:alpha:front', b: 'op:enemy:a4', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:alpha:front__op:enemy:a5', a: 'op:alpha:front', b: 'op:enemy:a5', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:beta:front__op:enemy:b1', a: 'op:beta:front', b: 'op:enemy:b1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:beta:front__op:enemy:b2', a: 'op:beta:front', b: 'op:enemy:b2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:beta:front__op:enemy:b3', a: 'op:beta:front', b: 'op:enemy:b3', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:beta:front__op:enemy:b4', a: 'op:beta:front', b: 'op:enemy:b4', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:beta:front__op:enemy:b5', a: 'op:beta:front', b: 'op:enemy:b5', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
            corps_front_sectors: {},
            sector_intel: {},
        } as GameState['military'],
        political: {
            political_controllers: {
                'op:alpha:hq': 'RS',
                'op:alpha:front': 'RS',
                'op:beta:hq': 'RS',
                'op:beta:front': 'RS',
                'op:enemy:a1': 'RBiH',
                'op:enemy:a2': 'RBiH',
                'op:enemy:a3': 'RBiH',
                'op:enemy:a4': 'RBiH',
                'op:enemy:a5': 'RBiH',
                'op:enemy:b1': 'RBiH',
                'op:enemy:b2': 'RBiH',
                'op:enemy:b3': 'RBiH',
                'op:enemy:b4': 'RBiH',
                'op:enemy:b5': 'RBiH',
            },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;
}

describe('corps front sectors keep brigades with their owning corps', () => {
    it('does not let one corps sector claim another corps brigade', () => {
        const state = makeState();
        const edges: EdgeRecord[] = [
            { a: 'op:alpha:hq', b: 'op:alpha:front' } as EdgeRecord,
            { a: 'op:beta:hq', b: 'op:beta:front' } as EdgeRecord,
            ...((state.military.war_front_edges_osid ?? []).map(edge => ({ a: edge.a, b: edge.b, edge_id: edge.edge_id } as EdgeRecord))),
        ];

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const alphaSector = Object.values(sectors).find(sector => sector.corps_id === 'corps_alpha');
        const betaSector = Object.values(sectors).find(sector => sector.corps_id === 'corps_beta');

        expect(alphaSector).toBeDefined();
        expect(betaSector).toBeDefined();
        expect(alphaSector?.assigned_brigade_ids).not.toContain('brig_beta');
        expect(alphaSector?.reserve_brigade_ids).not.toContain('brig_beta');
        expect([
            ...(betaSector?.assigned_brigade_ids ?? []),
            ...(betaSector?.reserve_brigade_ids ?? []),
        ]).toContain('brig_beta');
    });
});
