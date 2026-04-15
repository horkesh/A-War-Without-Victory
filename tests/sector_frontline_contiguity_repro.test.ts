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

function makeState(): { state: GameState; edges: EdgeRecord[] } {
    const formations: Record<string, FormationState> = {
        corps_a: makeFormation('corps_a', {
            kind: 'corps',
            faction: 'RS',
            location_osid: 'op:test:rear',
        }),
        brig_1: makeFormation('brig_1', {
            corps_id: 'corps_a',
            location_osid: 'op:test:f1',
            home_osid: 'op:test:f1',
        }),
        brig_2: makeFormation('brig_2', {
            corps_id: 'corps_a',
            location_osid: 'op:test:f2',
            home_osid: 'op:test:f2',
        }),
    };

    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'sector-frontline-contiguity-repro',
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
            formations,
            war_front_edges_osid: [
                { edge_id: 'op:test:f1__op:test:e1', a: 'op:test:f1', b: 'op:test:e1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:test:f2__op:test:e1', a: 'op:test:f2', b: 'op:test:e1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:test:f1__op:test:e2', a: 'op:test:f1', b: 'op:test:e2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:test:f2__op:test:e2', a: 'op:test:f2', b: 'op:test:e2', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as GameState['military'],
        political: {
            political_controllers: {
                'op:test:rear': 'RS',
                'op:test:f1': 'RS',
                'op:test:f2': 'RS',
                'op:test:e1': 'RBiH',
                'op:test:e2': 'RBiH',
            },
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:test:rear', b: 'op:test:f1' } as EdgeRecord,
        { a: 'op:test:rear', b: 'op:test:f2' } as EdgeRecord,
        { a: 'op:test:f1', b: 'op:test:f2' } as EdgeRecord,
        { a: 'op:test:f1', b: 'op:test:e1' } as EdgeRecord,
        { a: 'op:test:f2', b: 'op:test:e1' } as EdgeRecord,
        { a: 'op:test:f1', b: 'op:test:e2' } as EdgeRecord,
        { a: 'op:test:f2', b: 'op:test:e2' } as EdgeRecord,
    ];

    return { state, edges };
}

describe('sector frontline contiguity repro', () => {
    it('does not merge separate frontline pockets that only share friendly-side OSIDs', () => {
        const { state, edges } = makeState();

        const result = buildCorpsFrontSectors(state, edges, null);
        const sectors = Object.values(result).filter((sector) => sector.corps_id === 'corps_a');

        expect(sectors).toHaveLength(2);
        for (const sector of sectors) {
            expect(sector.sub_segments).toHaveLength(1);
        }

        const enemyPocketSets = sectors
            .map((sector) => [...new Set(sector.sub_segments.flatMap((subSegment) => subSegment.enemy_osids))].sort().join('|'))
            .sort();
        expect(enemyPocketSets).toEqual(['op:test:e1', 'op:test:e2']);
    });
});
