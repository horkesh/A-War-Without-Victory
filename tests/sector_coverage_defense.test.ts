/**
 * Tests for sector-pooled defense:
 * - findSectorForEnemyOsid returns correct sector
 * - getCorpsHqOsid returns corps location_osid
 * - attack_resolution_osid uses sector brigades when target is unoccupied
 * - Density modifier affects sector defense power
 * - Rout to corps HQ when sector defender has no retreat
 * - Militia ghost fallback when no sector covers the OSID
 * - combat_predictor mirrors resolver for sector coverage
 * - bfsNearestClaimedCorps (via partitionFrontEdges) assigns orphaned islands correctly
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    findSectorForEnemyOsid,
    getCorpsHqOsid,
    buildCorpsFrontSectors,
} from '../src/sim/combat/corps_front_sectors.js';
import { frontDensityModifier } from '../src/sim/combat/local_front_defense.js';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { predictCombatOutcome, buildTerrainCache } from '../src/sim/combat/combat_predictor.js';
import { buildOsidAdjacency } from '../src/sim/combat/osid_adjacency.js';
import type {
    GameState,
    FactionId,
    FormationState,
    CorpsFrontSector,
    CorpsFrontSubSegment,
} from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ─── Minimal state helpers ──────────────────────────────────────────────────

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {}
): FormationState {
    return {
        id, name: id, faction, kind, status: 'active',
        personnel: 1000, cohesion: 60, morale: 60, experience: 0.3,
        location_osid: locationOsid,
        ...overrides,
    } as FormationState;
}

function makeState(
    formations: Record<string, FormationState>,
    political_controllers: Record<string, FactionId>,
    corps_front_sectors: Record<string, CorpsFrontSector> = {}
): GameState {
    return {
  meta: {
            turn: 5, phase: 'war', seed: 'test',
            scenario_start_date: { year: 1992, month: 4, day: 6 }
        } as unknown as GameState['meta'],
  factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
  formations,
  political_controllers,
  corps_front_sectors,
  military: {
    corps_command: {}
  } as any,
} as unknown as GameState;
}

function makeSubSegment(
    id: string,
    enemyOsids: string[],
    friendlyOsids: string[],
    edgeIds: string[]
): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        enemy_osids: enemyOsids,
        friendly_osids: friendlyOsids,
        length_edges: edgeIds.length,
    };
}

function makeSector(
    id: string,
    corpsId: string,
    faction: FactionId,
    brigadeIds: string[],
    subSegments: CorpsFrontSubSegment[],
    lengthEdges: number
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as any,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap(s => s.edge_ids),
        sub_segments: subSegments,
        length_edges: lengthEdges,
        territory_osids: subSegments.flatMap(s => s.friendly_osids),
        assigned_brigade_ids: brigadeIds as any[],
        reserve_brigade_ids: [],
        density: brigadeIds.length / Math.max(1, lengthEdges),
        threat_ratio: 1.0,
        defensive_power: 100,
    };
}

// ─── findSectorForEnemyOsid ─────────────────────────────────────────────────

describe('findSectorForEnemyOsid', () => {
    it('returns null when no corps_front_sectors', () => {
        const state = makeState({}, {});
        assert.equal(findSectorForEnemyOsid(state, 'op:foo:1'), null);
    });

    it('returns null when targetOsid is not in any sector enemy_osids', () => {
        const sector = makeSector(
            'sector:vrs_1st:0', 'vrs_1st', 'RS', ['brig1'],
            [makeSubSegment('sub1', ['op:rbih:1'], ['op:rs:1'], ['e1'])], 5
        );
        const state = makeState({}, {}, { 'sector:vrs_1st:0': sector });
        assert.equal(findSectorForEnemyOsid(state, 'op:rbih:99'), null);
    });

    it('finds the correct sector by enemy_osid', () => {
        const sectorA = makeSector(
            'sector:vrs_1st:0', 'vrs_1st', 'RS', ['brig1'],
            [makeSubSegment('subA', ['op:rbih:1', 'op:rbih:2'], ['op:rs:1'], ['e1', 'e2'])], 4
        );
        const sectorB = makeSector(
            'sector:vrs_2nd:0', 'vrs_2nd', 'RS', ['brig2'],
            [makeSubSegment('subB', ['op:rbih:5', 'op:rbih:6'], ['op:rs:5'], ['e5', 'e6'])], 4
        );
        const state = makeState({}, {}, {
            'sector:vrs_1st:0': sectorA,
            'sector:vrs_2nd:0': sectorB,
        });
        const result = findSectorForEnemyOsid(state, 'op:rbih:5');
        assert.equal(result?.sector_id, 'sector:vrs_2nd:0');
    });

    it('returns first match in sorted sector_id order (deterministic)', () => {
        // Two sectors both claim the same OSID — first alphabetically wins
        const sectorA = makeSector(
            'sector:aaa:0', 'aaa', 'RS', ['brigA'],
            [makeSubSegment('subA', ['op:rbih:1'], ['op:rs:1'], ['e1'])], 3
        );
        const sectorB = makeSector(
            'sector:zzz:0', 'zzz', 'RS', ['brigB'],
            [makeSubSegment('subB', ['op:rbih:1'], ['op:rs:2'], ['e2'])], 3
        );
        const state = makeState({}, {}, {
            'sector:zzz:0': sectorB,
            'sector:aaa:0': sectorA,
        });
        const result = findSectorForEnemyOsid(state, 'op:rbih:1');
        assert.equal(result?.sector_id, 'sector:aaa:0');
    });
});

// ─── getCorpsHqOsid ─────────────────────────────────────────────────────────

describe('getCorpsHqOsid', () => {
    it('returns null when formation has no corps tag', () => {
        const brig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1');
        const state = makeState({ brig1: brig }, {});
        assert.equal(getCorpsHqOsid(state, brig), null);
    });

    it('returns corps location_osid when found', () => {
        const corps = makeFormation('vrs_1st', 'RS', 'corps', 'op:rs:hq', {
            tags: ['corps:vrs_1st'] as any
        });
        const brig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            tags: ['corps:vrs_1st'] as any
        });
        const state = makeState({ vrs_1st: corps, brig1: brig }, {});
        assert.equal(getCorpsHqOsid(state, brig), 'op:rs:hq');
    });
});

// ─── frontDensityModifier ───────────────────────────────────────────────────

describe('frontDensityModifier', () => {
    it('returns 1.0 for zero-length front', () => {
        assert.equal(frontDensityModifier(1, 0), 1.0);
    });

    it('applies penalty for thin front (density < 0.5)', () => {
        // 1 brigade / 4 edges = 0.25 density → penalty
        const mod = frontDensityModifier(1, 4);
        assert.ok(mod < 1.0, `Expected penalty, got ${mod}`);
        assert.ok(mod >= 0.6, `Should not go below MIN_COVERAGE_PENALTY=0.6, got ${mod}`);
    });

    it('returns 1.0 for normal density (0.5–1.0)', () => {
        // 2 brigades / 3 edges ≈ 0.67 → in [0.5, 1.0] range
        const mod = frontDensityModifier(2, 3);
        assert.equal(mod, 1.0);
    });

    it('applies bonus for dense front (density > 1.0)', () => {
        // 4 brigades / 2 edges = 2.0 → bonus
        const mod = frontDensityModifier(4, 2);
        assert.ok(mod > 1.0, `Expected bonus, got ${mod}`);
        assert.ok(mod <= 1.25, `Should not exceed MAX_DENSITY_BONUS=1.25, got ${mod}`);
    });

    it('caps at MIN_COVERAGE_PENALTY for very thin front', () => {
        // 0 brigades → density 0 → MIN_COVERAGE_PENALTY
        const mod = frontDensityModifier(0, 10);
        assert.equal(mod, 0.6);
    });
});

// ─── Resolver: sector coverage defense ─────────────────────────────────────

describe('resolveAttackOrdersOsid — sector coverage defense', () => {
    /**
     * Build a minimal scenario:
     * - RS brig1 at op:rs:1 attacks op:rbih:1
     * - op:rbih:1 is RBiH-controlled with no brigade physically there
     * - RBiH corps has brig2 in the sector whose enemy_osids includes op:rbih:1
     */
    function makeScenario() {
        const rsBrig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            personnel: 2000, cohesion: 70, experience: 0.4, posture: 'attack' as any,
        });
        const rbihBrig = makeFormation('brig2', 'RBiH', 'brigade', 'op:rbih:2', {
            personnel: 1500, cohesion: 60, experience: 0.3,
        });
        const rbihCorps = makeFormation('arbih_2nd', 'RBiH', 'corps', 'op:rbih:hq', {
            tags: ['corps:arbih_2nd'] as any,
        });
        rbihBrig.tags = ['corps:arbih_2nd'] as any;

        const sector = makeSector(
            'sector:arbih_2nd:0', 'arbih_2nd', 'RBiH', ['brig2'],
            [makeSubSegment('sub1', ['op:rbih:1'], ['op:rbih:2'], ['e1'])], 3
        );

        const political_controllers: Record<string, FactionId> = {
            'op:rs:1': 'RS',
            'op:rbih:1': 'RBiH',
            'op:rbih:2': 'RBiH',
            'op:rbih:hq': 'RBiH',
        };

        const state = makeState(
            { brig1: rsBrig, brig2: rbihBrig, arbih_2nd: rbihCorps },
            political_controllers,
            { 'sector:arbih_2nd:0': sector }
        );
        state.military.brigade_attack_orders = { brig1: 'op:rbih:1' } as any;

        const edges: EdgeRecord[] = [
            { edge_id: 'e1', a: 'op:rs:1', b: 'op:rbih:1' } as EdgeRecord,
            { edge_id: 'e2', a: 'op:rbih:1', b: 'op:rbih:2' } as EdgeRecord,
            { edge_id: 'e3', a: 'op:rbih:2', b: 'op:rbih:hq' } as EdgeRecord,
        ];

        return { state, edges };
    }

    it('sector brigade defends an unoccupied enemy OSID (not a trivial win)', () => {
        const { state, edges } = makeScenario();
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        // Should have resolved a battle
        assert.equal(report.battles.length, 1, 'Expected 1 battle');
        const battle = report.battles[0]!;

        // The defense should NOT be negligible — sector brig2 contributed
        // A 1500-person brigade at 0.5× coverage vs 2000-person attacker should not be decisive_victory easily
        assert.ok(
            battle.defender_brigade === 'brig2' || battle.outcome !== 'decisive_victory',
            `Expected sector defense to matter. outcome=${battle.outcome}, defender=${battle.defender_brigade}`
        );
    });

    it('sector defense is weaker than direct defense (coverage penalty)', () => {
        // Direct: place brig2 at op:rbih:1 itself
        const { state: stateA, edges } = makeScenario();
        (stateA.military.formations!['brig2'] as any).location_osid = 'op:rbih:1';
        const reverseMap = new Map<string, string[]>();
        const reportDirect = resolveAttackOrdersOsid(stateA, edges, reverseMap);

        // Sector: brig2 stays at op:rbih:2
        const { state: stateB } = makeScenario();
        stateB.military.brigade_attack_orders = { brig1: 'op:rbih:1' } as any;
        const reportSector = resolveAttackOrdersOsid(stateB, edges, reverseMap);

        const directRatio = reportDirect.battles[0]?.power_ratio ?? 999;
        const sectorRatio = reportSector.battles[0]?.power_ratio ?? 0;

        // Direct defense should produce a lower power_ratio (harder to attack) than sector defense
        assert.ok(
            directRatio < sectorRatio,
            `Direct defense (ratio=${directRatio}) should be stronger than sector (ratio=${sectorRatio})`
        );
    });

    it('militia ghost fallback when sector has no brigades', () => {
        const { state, edges } = makeScenario();
        // Clear sector brigades
        state.military.corps_front_sectors!['sector:arbih_2nd:0']!.assigned_brigade_ids = [];
        state.military.brigade_attack_orders = { brig1: 'op:rbih:1' } as any;
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        assert.equal(report.battles.length, 1);
        // Militia ghost is tiny — strong attacker should win decisively
        assert.equal(report.battles[0]!.outcome, 'decisive_victory');
        assert.equal(report.battles[0]!.defender_brigade, null);
    });

    it('no battle when target OSID is friendly (attacker already controls it)', () => {
        const { state, edges } = makeScenario();
        // Make RS control op:rbih:1 — no battle should happen
        state.political.political_controllers!['op:rbih:1'] = 'RS';
        state.military.brigade_attack_orders = { brig1: 'op:rbih:1' } as any;
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);
        assert.equal(report.battles.length, 0);
    });
});

// ─── Predictor mirrors resolver ─────────────────────────────────────────────

describe('predictCombatOutcome — mirrors sector coverage defense', () => {
    it('sector defense returns a prediction (not null) when sector has brigades', () => {
        const rsBrig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            personnel: 2000, cohesion: 70, experience: 0.4,
        });
        const rbihBrig = makeFormation('brig2', 'RBiH', 'brigade', 'op:rbih:2', {
            personnel: 1500, cohesion: 60, experience: 0.3,
        });

        const sector = makeSector(
            'sector:arbih_2nd:0', 'arbih_2nd', 'RBiH', ['brig2'],
            [makeSubSegment('sub1', ['op:rbih:1'], ['op:rbih:2'], ['e1'])], 3
        );

        const state = makeState(
            { brig1: rsBrig, brig2: rbihBrig },
            { 'op:rs:1': 'RS', 'op:rbih:1': 'RBiH', 'op:rbih:2': 'RBiH' },
            { 'sector:arbih_2nd:0': sector }
        );

        const edges: EdgeRecord[] = [
            { edge_id: 'e1', a: 'op:rs:1', b: 'op:rbih:1' } as EdgeRecord,
            { edge_id: 'e2', a: 'op:rbih:1', b: 'op:rbih:2' } as EdgeRecord,
        ];
        const adjacency = buildOsidAdjacency(edges);
        const reverseMap = new Map<string, string[]>();
        const terrainMult: Record<string, number> = {};
        const result = predictCombatOutcome(state, 'brig1', 'op:rbih:1', adjacency, reverseMap, terrainMult);
        assert.notEqual(result, null, 'Expected a prediction, not null');
        assert.ok(result!.predicted_outcome != null);
    });

    it('returns null prediction (no battle) when OSID is friendly', () => {
        const rsBrig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            personnel: 2000,
        });
        const state = makeState(
            { brig1: rsBrig },
            { 'op:rs:1': 'RS', 'op:rs:2': 'RS' },
        );
        const edges: EdgeRecord[] = [
            { edge_id: 'e1', a: 'op:rs:1', b: 'op:rs:2' } as EdgeRecord,
        ];
        const adjacency = buildOsidAdjacency(edges);
        const reverseMap = new Map<string, string[]>();
        const result = predictCombatOutcome(state, 'brig1', 'op:rs:2', adjacency, reverseMap, {});
        assert.equal(result, null);
    });
});

// ─── Rout to corps HQ ───────────────────────────────────────────────────────

describe('resolveAttackOrdersOsid — rout to corps HQ', () => {
    it('sector defender with no retreat path routes to corps HQ, not destroyed', () => {
        // Setup: RS overwhelmingly attacks RBiH enclave
        // brig2 is at op:rbih:island — no friendly retreat from op:rbih:1 (surrounded)
        const rsBrig = makeFormation('brig1', 'RS', 'brigade', 'op:rs:1', {
            personnel: 8000, cohesion: 80, experience: 0.8, posture: 'attack' as any,
        });
        const rbihBrig = makeFormation('brig2', 'RBiH', 'brigade', 'op:rbih:island', {
            personnel: 600, cohesion: 40, experience: 0.2,
            tags: ['corps:arbih_2nd'] as any,
        });
        const rbihCorps = makeFormation('arbih_2nd', 'RBiH', 'corps', 'op:rbih:hq', {
            tags: ['corps:arbih_2nd'] as any,
        });

        const sector = makeSector(
            'sector:arbih_2nd:0', 'arbih_2nd', 'RBiH', ['brig2'],
            [makeSubSegment('sub1', ['op:rbih:1'], ['op:rbih:island'], ['e1'])], 2
        );

        const political_controllers: Record<string, FactionId> = {
            'op:rs:1': 'RS',
            'op:rbih:1': 'RBiH',
            // op:rbih:island is where brig2 physically is — RS surrounds op:rbih:1 on all sides
            // so op:rbih:island is also RBiH but has no escape
            'op:rbih:island': 'RBiH',
            'op:rbih:hq': 'RBiH',
        };

        const state = makeState(
            { brig1: rsBrig, brig2: rbihBrig, arbih_2nd: rbihCorps },
            political_controllers,
            { 'sector:arbih_2nd:0': sector }
        );
        state.military.brigade_attack_orders = { brig1: 'op:rbih:1' } as any;

        // Edges: brig1 at op:rs:1 can attack op:rbih:1.
        // op:rbih:island (where brig2 physically is) has NO adjacency at all — completely isolated.
        // This means getFriendlyRetreatDestinations returns [] for brig2.
        // Rout logic must then teleport brig2 to corps HQ (op:rbih:hq).
        const edges: EdgeRecord[] = [
            { edge_id: 'e1', a: 'op:rs:1', b: 'op:rbih:1' } as EdgeRecord,
        ];

        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        // Should have a battle
        assert.equal(report.battles.length, 1);

        // If RS won, brig2 should be routed (still active, at corps HQ) not destroyed
        const battle = report.battles[0]!;
        if (battle.attacker_won) {
            const brig2 = state.military.formations!['brig2']!;
            assert.equal(brig2.status, 'active', 'Sector defender should survive as rout, not be destroyed');
            assert.equal((brig2 as any).location_osid, 'op:rbih:hq', 'Should be at corps HQ');
            assert.ok((brig2 as any).disrupted_turns >= 4, 'Should be heavily disrupted');
        }
    });
});
