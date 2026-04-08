import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeFormation(id: string, overrides: Partial<FormationState>): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        personnel: 1200,
        cohesion: 65,
        morale: 70,
        ...overrides,
    } as FormationState;
}

describe('post-merge misassignment relocation', () => {
    it('keeps a brigade with the same-corps sector that truthfully owns its current location', () => {
        const state: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: 10,
                seed: 'sector-misassignment-relocation',
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
                    corps_a: makeFormation('corps_a', {
                        kind: 'corps',
                        location_osid: 'op:hq',
                        personnel: 50,
                    }),
                    brig_home: makeFormation('brig_home', {
                        corps_id: 'corps_a',
                        location_osid: 'op:home:rear',
                        home_osid: 'op:home:rear',
                    }),
                    brig_front: makeFormation('brig_front', {
                        corps_id: 'corps_a',
                        location_osid: 'op:front:a',
                        home_osid: 'op:front:a',
                    }),
                },
                war_front_edges_osid: [
                    { edge_id: 'op:front:a__op:enemy:a', a: 'op:front:a', b: 'op:enemy:a', side_a: 'RS', side_b: 'RBiH' },
                    { edge_id: 'op:front:b__op:enemy:b', a: 'op:front:b', b: 'op:enemy:b', side_a: 'RS', side_b: 'RBiH' },
                ],
                front_segments: {},
                front_posture: {},
                front_posture_regions: {},
                front_pressure: {},
                militia_pools: {},
            } as GameState['military'],
            political: {
                political_controllers: {
                    'op:hq': 'RS',
                    'op:front:a': 'RS',
                    'op:front:b': 'RS',
                    'op:home:rear': 'RS',
                    'op:enemy:a': 'RBiH',
                    'op:enemy:b': 'RBiH',
                },
            } as GameState['political'],
            displacement: {} as GameState['displacement'],
        } as GameState;

        const edges: EdgeRecord[] = [
            { a: 'op:hq', b: 'op:front:a' } as EdgeRecord,
            { a: 'op:hq', b: 'op:front:b' } as EdgeRecord,
            { a: 'op:hq', b: 'op:home:rear' } as EdgeRecord,
            { a: 'op:front:a', b: 'op:enemy:a' } as EdgeRecord,
            { a: 'op:front:b', b: 'op:enemy:b' } as EdgeRecord,
        ];

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const homeOwner = Object.values(sectors).find((sector) => sector.territory_osids.includes('op:home:rear'));
        expect(homeOwner).toBeDefined();
        expect(homeOwner?.assigned_brigade_ids).toContain('brig_home');
        for (const sector of Object.values(sectors)) {
            if (sector.sector_id === homeOwner?.sector_id) continue;
            expect(sector.assigned_brigade_ids).not.toContain('brig_home');
            expect(sector.reserve_brigade_ids).not.toContain('brig_home');
        }
    });
});
