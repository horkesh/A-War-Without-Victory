import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { reconcileFinalSectorTruth } from '../src/sim/combat/final_sector_truth_reconciliation.js';
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
    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'final-sector-truth-reconciliation',
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
                    location_osid: 'op:test:rear',
                    personnel: 50,
                }),
                brig_seed: makeFormation('brig_seed', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:front',
                    home_osid: 'op:test:front',
                }),
            },
            war_front_edges_osid: [
                { edge_id: 'op:test:front__op:test:enemy', a: 'op:test:front', b: 'op:test:enemy', side_a: 'RS', side_b: 'RBiH' },
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
                'op:test:front': 'RS',
                'op:test:enemy': 'RBiH',
            },
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:test:rear', b: 'op:test:front' } as EdgeRecord,
        { a: 'op:test:front', b: 'op:test:enemy' } as EdgeRecord,
    ];

    return { state, edges };
}

describe('final sector truth reconciliation', () => {
    it('rebuilds final sector truth after late brigade writers and clears stale unresolved state', () => {
        const { state, edges } = makeState();

        state.military.corps_front_sectors = buildCorpsFrontSectors(state, edges, null);
        const staleSector = Object.values(state.military.corps_front_sectors)[0]!;
        staleSector.density = 0;
        staleSector.defensive_power = 0;
        staleSector.threat_ratio = 0;
        staleSector.assigned_brigade_ids = [];
        staleSector.reserve_brigade_ids = ['brig_seed'];

        state.military.formations.brig_late = makeFormation('brig_late', {
            corps_id: 'corps_a',
            location_osid: 'op:test:front',
            home_osid: 'op:test:front',
            created_turn: 10,
        });
        state.military.unresolved_sector_brigades = ['brig_late'];

        const report = reconcileFinalSectorTruth(state, edges, null);
        const rebuiltSector = Object.values(state.military.corps_front_sectors ?? {}).find(
            (sector) => sector.corps_id === 'corps_a',
        );

        expect(report.sectors_rebuilt).toBeGreaterThan(0);
        expect(report.sectors_rated).toBeGreaterThan(0);
        expect(report.unresolved_brigades).toBe(0);
        expect(rebuiltSector).toBeDefined();
        expect(rebuiltSector?.assigned_brigade_ids).toContain('brig_late');
        expect(rebuiltSector?.density ?? 0).toBeGreaterThan(0);
        expect(rebuiltSector?.defensive_power ?? 0).toBeGreaterThan(0);
        expect(state.military.unresolved_sector_brigades ?? []).not.toContain('brig_late');
        expect(state.military.formations.brig_late?.assignment).toEqual(
            expect.objectContaining({ kind: 'sector' }),
        );
        expect(
            state.military.sector_combat_ratings?.[rebuiltSector!.sector_id]?.brigade_count ?? 0,
        ).toBeGreaterThan(0);
    });
});
