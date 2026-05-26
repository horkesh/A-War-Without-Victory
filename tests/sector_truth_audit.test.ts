import { describe, expect, it } from 'vitest';

import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { auditSectorTruth } from '../src/sim/combat/sector_truth_audit.js';
import {
    CURRENT_SCHEMA_VERSION as RUNTIME_SCHEMA_VERSION,
    type CorpsFrontSector,
    type CorpsFrontSubSegment,
    type CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

function makeSubSegment(
    sectorId: string,
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeIds: string[],
): CorpsFrontSubSegment {
    return {
        sub_segment_id: `subseg:${sectorId}:0`,
        friendly_osids: friendlyOsids,
        enemy_osids: enemyOsids,
        edge_ids: edgeIds,
        length_edges: edgeIds.length,
        primary_brigade_ids: [],
    };
}

function makeSector(
    sectorId: string,
    corpsId: string,
    faction: 'RS' | 'RBiH',
    friendlyOsids: string[],
    enemyOsids: string[],
    edgeIds: string[],
    territoryOsids: string[],
    assigned: string[],
    reserve: string[] = [],
): CorpsFrontSector {
    const subSegment = makeSubSegment(sectorId, friendlyOsids, enemyOsids, edgeIds);
    return {
        sector_id: sectorId,
        corps_id: corpsId,
        faction,
        opposing_factions: [faction === 'RS' ? 'RBiH' : 'RS'],
        edge_ids: [...edgeIds],
        sub_segments: [subSegment],
        length_edges: edgeIds.length,
        territory_osids: territoryOsids,
        assigned_brigade_ids: assigned,
        reserve_brigade_ids: reserve,
        density: edgeIds.length > 0 ? assigned.length / edgeIds.length : 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeFormation(id: string, faction: 'RS' | 'RBiH', corpsId: string, location_osid: string): FormationState {
    return {
        id,
        name: id,
        faction,
        kind: 'brigade',
        status: 'active',
        created_turn: 1,
        assignment: null,
        corps_id: corpsId,
        location_osid,
        home_osid: location_osid,
        personnel: 1000,
        cohesion: 60,
        morale: 60,
    } as FormationState;
}

function makeState(formations: Record<string, FormationState>, frontEdges: GameState['military']['war_front_edges_osid'], controllers: Record<string, string>): GameState {
    return {
        schema_version: 1 as typeof CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 1,
            seed: 'sector-truth-audit',
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            referendum_held: true,
            referendum_turn: 1,
            war_start_turn: 1,
        },
        factions: [],
        military: {
            formations,
            war_front_edges_osid: frontEdges,
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            unresolved_sector_brigades: [],
        },
        political: {
            political_controllers: controllers,
        },
        displacement: {},
    } as unknown as GameState;
}

describe('auditSectorTruth', () => {
    it('reports reserve-only, overlap, untruthful assignment, stale density, and edge mismatch issues', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:front:shared', b: 'op:enemy:1' } as EdgeRecord,
            { a: 'op:front:left', b: 'op:enemy:2' } as EdgeRecord,
            { a: 'op:front:right', b: 'op:enemy:3' } as EdgeRecord,
            { a: 'op:front:shared', b: 'op:rear:shared' } as EdgeRecord,
        ];
        const state = makeState(
            {
                brig_false: makeFormation('brig_false', 'RS', 'corps_a', 'op:away'),
                brig_reserve: makeFormation('brig_reserve', 'RS', 'corps_a', 'op:rear:shared'),
            },
            [
                { edge_id: 'op:front:shared__op:enemy:1', a: 'op:front:shared', b: 'op:enemy:1', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:left__op:enemy:2', a: 'op:front:left', b: 'op:enemy:2', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:right__op:enemy:3', a: 'op:front:right', b: 'op:enemy:3', side_a: 'RS', side_b: 'RBiH' },
            ],
            {
                'op:front:shared': 'RS',
                'op:front:left': 'RS',
                'op:front:right': 'RS',
                'op:rear:shared': 'RS',
                'op:away': 'RBiH',
                'op:enemy:1': 'RBiH',
                'op:enemy:2': 'RBiH',
                'op:enemy:3': 'RBiH',
            },
        );

        const sectors = [
            makeSector(
                'sector:corps_a:0',
                'corps_a',
                'RS',
                ['op:front:shared', 'op:front:left'],
                ['op:enemy:1', 'op:enemy:2'],
                ['op:front:shared__op:enemy:1', 'op:front:left__op:enemy:2'],
                ['op:front:shared', 'op:front:left'],
                ['brig_false'],
            ),
            makeSector(
                'sector:corps_a:1',
                'corps_a',
                'RS',
                ['op:front:shared'],
                ['op:enemy:1'],
                ['op:front:shared__op:enemy:1', 'op:front:right__op:enemy:3'],
                ['op:front:right'],
                [],
                ['brig_reserve'],
            ),
        ];
        sectors[1]!.density = 99;

        const audit = auditSectorTruth(state, sectors, edges);

        expect(audit.counts.reserve_only_live_sectors).toBe(1);
        expect(audit.counts.same_corps_front_overlaps).toBe(1);
        expect(audit.counts.untruthful_assigned_brigades).toBe(1);
        expect(audit.counts.stale_density_sectors).toBe(1);
        expect(audit.counts.edge_front_mismatches).toBe(1);
        expect(audit.counts.unresolved_sector_brigades).toBe(0);
        expect(audit.counts.active_formations_in_enemy_territory).toBe(1);
    });

    it('returns a clean audit for truthful non-overlapping sectors', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:front:a', b: 'op:enemy:a' } as EdgeRecord,
            { a: 'op:front:b', b: 'op:enemy:b' } as EdgeRecord,
            { a: 'op:front:a', b: 'op:rear:a' } as EdgeRecord,
        ];
        const state = makeState(
            {
                brig_a: makeFormation('brig_a', 'RS', 'corps_a', 'op:front:a'),
                brig_b: makeFormation('brig_b', 'RS', 'corps_a', 'op:front:b'),
            },
            [
                { edge_id: 'op:front:a__op:enemy:a', a: 'op:front:a', b: 'op:enemy:a', side_a: 'RS', side_b: 'RBiH' },
                { edge_id: 'op:front:b__op:enemy:b', a: 'op:front:b', b: 'op:enemy:b', side_a: 'RS', side_b: 'RBiH' },
            ],
            {
                'op:front:a': 'RS',
                'op:front:b': 'RS',
                'op:rear:a': 'RS',
                'op:enemy:a': 'RBiH',
                'op:enemy:b': 'RBiH',
            },
        );

        const sectors = [
            makeSector(
                'sector:corps_a:0',
                'corps_a',
                'RS',
                ['op:front:a'],
                ['op:enemy:a'],
                ['op:front:a__op:enemy:a'],
                ['op:front:a', 'op:rear:a'],
                ['brig_a'],
            ),
            makeSector(
                'sector:corps_a:1',
                'corps_a',
                'RS',
                ['op:front:b'],
                ['op:enemy:b'],
                ['op:front:b__op:enemy:b'],
                ['op:front:b'],
                ['brig_b'],
            ),
        ];

        const audit = auditSectorTruth(state, sectors, edges);

        expect(audit.counts.reserve_only_live_sectors).toBe(0);
        expect(audit.counts.same_corps_front_overlaps).toBe(0);
        expect(audit.counts.untruthful_assigned_brigades).toBe(0);
        expect(audit.counts.stale_density_sectors).toBe(0);
        expect(audit.counts.edge_front_mismatches).toBe(0);
        expect(audit.counts.unresolved_sector_brigades).toBe(0);
        expect(audit.counts.active_formations_in_enemy_territory).toBe(0);
        expect(audit.ok).toBe(true);
    });

    it('does not flag same-corps sectors that share a seam osid but own disconnected hostile-side lines', () => {
        const edges: EdgeRecord[] = [
            { a: 'op:front:shared', b: 'op:enemy:left' } as EdgeRecord,
            { a: 'op:front:shared', b: 'op:enemy:right' } as EdgeRecord,
        ];
        const state = makeState(
            {
                brig_left: makeFormation('brig_left', 'RS', 'corps_a', 'op:front:shared'),
                brig_right: makeFormation('brig_right', 'RS', 'corps_a', 'op:front:shared'),
            },
            [
                {
                    edge_id: 'op:front:shared__op:enemy:left',
                    a: 'op:front:shared',
                    b: 'op:enemy:left',
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
                {
                    edge_id: 'op:front:shared__op:enemy:right',
                    a: 'op:front:shared',
                    b: 'op:enemy:right',
                    side_a: 'RS',
                    side_b: 'RBiH',
                },
            ],
            {
                'op:front:shared': 'RS',
                'op:enemy:left': 'RBiH',
                'op:enemy:right': 'RBiH',
            },
        );

        const sectors = [
            makeSector(
                'sector:corps_a:0',
                'corps_a',
                'RS',
                ['op:front:shared'],
                ['op:enemy:left'],
                ['op:front:shared__op:enemy:left'],
                ['op:front:shared'],
                ['brig_left'],
            ),
            makeSector(
                'sector:corps_a:1',
                'corps_a',
                'RS',
                ['op:front:shared'],
                ['op:enemy:right'],
                ['op:front:shared__op:enemy:right'],
                ['op:front:shared'],
                ['brig_right'],
            ),
        ];

        const audit = auditSectorTruth(state, sectors, edges);

        expect(audit.counts.same_corps_front_overlaps).toBe(0);
        expect(audit.ok).toBe(true);
    });
});

// ────────────────────────────────────────────────────────────────────────────
// Absorbed from sector_builder_sealing.test.ts (Phase 3 §2 leftover)
// ────────────────────────────────────────────────────────────────────────────

function makeSealingFormation(id: string, overrides: Partial<FormationState>): FormationState {
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

function makeSealingState(): { state: GameState; edges: EdgeRecord[] } {
    const state: GameState = {
        schema_version: RUNTIME_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'sector-builder-sealing',
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
                corps_a: makeSealingFormation('corps_a', {
                    kind: 'corps',
                    location_osid: 'op:test:rear',
                    personnel: 50,
                }),
                rear_guard: makeSealingFormation('rear_guard', {
                    corps_id: 'corps_a',
                    location_osid: 'op:test:rear',
                    home_osid: 'op:test:rear',
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
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
        } as GameState['military'],
        political: {
            political_controllers: {
                'op:test:rear': 'RS',
                'op:test:front': 'RS',
                'op:test:enemy': 'RBiH',
            },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    const edges: EdgeRecord[] = [
        { a: 'op:test:rear', b: 'op:test:front' } as EdgeRecord,
        { a: 'op:test:front', b: 'op:test:enemy' } as EdgeRecord,
    ];

    return { state, edges };
}

describe('sector builder sealing', () => {
    it('moves a one-hop reserve candidate onto an empty front so the sector does not serialize as a gap', () => {
        const { state, edges } = makeSealingState();

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find((candidate) => candidate.corps_id === 'corps_a');

        expect(sector).toBeDefined();
        expect(sector?.assigned_brigade_ids).toContain('rear_guard');
        expect(sector?.reserve_brigade_ids).not.toContain('rear_guard');
        expect(state.military.formations.rear_guard?.location_osid).toBe('op:test:front');
        expect(state.military.formations.rear_guard?.assignment).toEqual({
            kind: 'sector',
            sector_id: sector?.sector_id,
            role: 'front',
        });
        expect(sector?.density ?? 0).toBeGreaterThan(0);
        expect(sector?.defensive_power ?? 0).toBeGreaterThan(0);
    });
});
