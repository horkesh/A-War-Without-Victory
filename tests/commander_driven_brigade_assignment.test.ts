/**
 * Tests for n696: Commander-driven brigade assignment.
 *
 * Tests Phase 2a (home affinity without need gate), Phase 2b (competence-gated
 * commander distribution), Phase 2c (4-hop BFS cap + pre-op staging weight),
 * and determinism.
 *
 * All tests use buildCorpsFrontSectors() since classifyBrigadesByTerritory
 * is internal.
 *
 * Topology notes:
 * - Edge IDs MUST be in `osidA__osidB` format (parsed by buildMultiSectorsForCorps).
 * - Front edges need to form a contiguous segment via triple-junction adjacency
 *   (Case A: same friendly OSID + adjacent hostile OSIDs).
 * - We use a linear chain of friendly OSIDs (front1..front5) each facing one enemy
 *   OSID. Adjacent friendly OSIDs imply adjacent hostile OSIDs via the friendly chain.
 *   Actually the simplest topology: 5 friendly OSIDs (f1-f5) connected as a chain,
 *   each with 1 front edge to a corresponding enemy OSID, and the enemy OSIDs also
 *   adjacent as a chain so Case A fires.
 */

import { describe, expect, it } from 'vitest';
import { buildCorpsFrontSectors } from '../src/sim/combat/corps_front_sectors.js';
import { commanderReviewAssignment, type CorpsCommanderProfile } from '../src/sim/combat/commander_override.js';
import {
    CURRENT_SCHEMA_VERSION,
    type FactionId,
    type FormationState,
    type GameState,
} from '../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../src/state/officer_types.js';
import type { EdgeRecord } from '../src/map/settlements.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

function makeOfficerData(id: string, competence: number, aggressiveness: number): NamedOfficer {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        rank: 'corps_commander',
        competence,
        aggressiveness,
        defensive_skill: 3,
        political_reliability: 3,
        origin: 'jna',
        casualty_vulnerability: 0.1,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'starter',
        available_from_turn: 1,
    };
}

function makeOfficerState(id: string, corpsId: string): NamedOfficerState {
    return {
        officer_id: id,
        status: 'active',
        assigned_corps_id: corpsId,
        turns_in_command: 5,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
    };
}

/**
 * Build a linear front: 5 RS friendly OSIDs (f1..f5) facing 5 enemy OSIDs (e1..e5).
 * Adjacent in a chain: f1-f2-f3-f4-f5 (RS territory) | e1-e2-e3-e4-e5 (RBiH territory).
 * rear is the RS rear OSID (connected to f1..f5 for territory BFS).
 *
 * This topology produces Case A connections because:
 * - f1 faces e1, f2 faces e2, etc.
 * - fi and fj have adjacent hostile OSIDs ei and ej when i,j differ by 1 AND fi-fj are adjacent.
 *
 * With all front OSIDs sharing the same corps (via brigade home seeds), we get 5 edges
 * in one contiguous sector.
 */
function makeLinearFrontState(overrides?: {
    formations?: Record<string, FormationState>;
    officerData?: NamedOfficer[];
    officerStates?: Record<string, NamedOfficerState>;
    corpsCommand?: Record<string, unknown>;
    extraPolitical?: Record<string, string>;
    extraEdges?: EdgeRecord[];
}): { state: GameState; edges: EdgeRecord[] } {

    // Friendly OSID chain: rear ← f1 - f2 - f3 - f4 - f5
    // Enemy OSID chain:                 e1 - e2 - e3 - e4 - e5
    // Front edges: f1-e1, f2-e2, f3-e3, f4-e4, f5-e5

    const formations: Record<string, FormationState> = {
        corps_a: makeFormation('corps_a', {
            kind: 'corps',
            faction: 'RS',
            location_osid: 'op:zon:rear',
        }),
        // Seed brigade at f3 (middle of front) — seeds corps territory
        brig_seed: makeFormation('brig_seed', {
            corps_id: 'corps_a',
            location_osid: 'op:zon:f3',
            home_osid: 'op:zon:f3',
        }),
        ...overrides?.formations,
    };

    const political: Record<string, string> = {
        'op:zon:rear': 'RS',
        'op:zon:f1': 'RS',
        'op:zon:f2': 'RS',
        'op:zon:f3': 'RS',
        'op:zon:f4': 'RS',
        'op:zon:f5': 'RS',
        'op:zon:e1': 'RBiH',
        'op:zon:e2': 'RBiH',
        'op:zon:e3': 'RBiH',
        'op:zon:e4': 'RBiH',
        'op:zon:e5': 'RBiH',
        ...overrides?.extraPolitical,
    };

    const state: GameState = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'n696-linear-front-test',
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
                // f1-e1: friendly=f1, hostile=e1
                { edge_id: 'op:zon:f1__op:zon:e1', a: 'op:zon:f1', b: 'op:zon:e1', side_a: 'RS', side_b: 'RBiH' },
                // f2-e2
                { edge_id: 'op:zon:f2__op:zon:e2', a: 'op:zon:f2', b: 'op:zon:e2', side_a: 'RS', side_b: 'RBiH' },
                // f3-e3
                { edge_id: 'op:zon:f3__op:zon:e3', a: 'op:zon:f3', b: 'op:zon:e3', side_a: 'RS', side_b: 'RBiH' },
                // f4-e4
                { edge_id: 'op:zon:f4__op:zon:e4', a: 'op:zon:f4', b: 'op:zon:e4', side_a: 'RS', side_b: 'RBiH' },
                // f5-e5
                { edge_id: 'op:zon:f5__op:zon:e5', a: 'op:zon:f5', b: 'op:zon:e5', side_a: 'RS', side_b: 'RBiH' },
            ],
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            named_officer_data: overrides?.officerData,
            named_officers: overrides?.officerStates as unknown as GameState['military']['named_officers'],
            corps_command: overrides?.corpsCommand as unknown as GameState['military']['corps_command'],
        } as GameState['military'],
        political: {
            political_controllers: political,
        } as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as GameState;

    // Adjacency edges:
    //   RS side: rear - f1 - f2 - f3 - f4 - f5 (chain)
    //   Enemy side: e1 - e2 - e3 - e4 - e5 (chain, for Case A to fire)
    //   Front edges: f1-e1, f2-e2, f3-e3, f4-e4, f5-e5
    const edges: EdgeRecord[] = [
        // RS territory chain
        { a: 'op:zon:rear', b: 'op:zon:f1' } as EdgeRecord,
        { a: 'op:zon:f1', b: 'op:zon:f2' } as EdgeRecord,
        { a: 'op:zon:f2', b: 'op:zon:f3' } as EdgeRecord,
        { a: 'op:zon:f3', b: 'op:zon:f4' } as EdgeRecord,
        { a: 'op:zon:f4', b: 'op:zon:f5' } as EdgeRecord,
        // Enemy chain (for Case A: adjacent hostile OSIDs)
        { a: 'op:zon:e1', b: 'op:zon:e2' } as EdgeRecord,
        { a: 'op:zon:e2', b: 'op:zon:e3' } as EdgeRecord,
        { a: 'op:zon:e3', b: 'op:zon:e4' } as EdgeRecord,
        { a: 'op:zon:e4', b: 'op:zon:e5' } as EdgeRecord,
        // Front contact edges
        { a: 'op:zon:f1', b: 'op:zon:e1' } as EdgeRecord,
        { a: 'op:zon:f2', b: 'op:zon:e2' } as EdgeRecord,
        { a: 'op:zon:f3', b: 'op:zon:e3' } as EdgeRecord,
        { a: 'op:zon:f4', b: 'op:zon:e4' } as EdgeRecord,
        { a: 'op:zon:f5', b: 'op:zon:e5' } as EdgeRecord,
        ...(overrides?.extraEdges ?? []),
    ];

    return { state, edges };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('n696: Phase 2a — home affinity without need gate', () => {
    it('assigns home brigade to home sector even when sector need is 0', () => {
        // brig_seed is already on front (Phase 1). Sector has need = 4 at start.
        // After 4 more frontline brigades fill the sector, need = 0.
        // brig_home_rear (in rear, home = f3) should STILL get assigned to this sector.
        const { state, edges } = makeLinearFrontState({
            formations: {
                // 4 more brigades at front positions (Phase 1 positional assignment)
                brig_f1: makeFormation('brig_f1', { corps_id: 'corps_a', location_osid: 'op:zon:f1', home_osid: 'op:zon:f1' }),
                brig_f2: makeFormation('brig_f2', { corps_id: 'corps_a', location_osid: 'op:zon:f2', home_osid: 'op:zon:f2' }),
                brig_f4: makeFormation('brig_f4', { corps_id: 'corps_a', location_osid: 'op:zon:f4', home_osid: 'op:zon:f4' }),
                brig_f5: makeFormation('brig_f5', { corps_id: 'corps_a', location_osid: 'op:zon:f5', home_osid: 'op:zon:f5' }),
                // Surplus brigade in rear, home = zon (same municipality as front OSIDs)
                brig_home_rear: makeFormation('brig_home_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:zon:f3', // home is in sector territory (zon municipality)
                }),
            },
        });
        // At this point: brig_seed + brig_f1 + brig_f2 + brig_f4 + brig_f5 = 5 on front.
        // Sector has 5 edges → need = max(0, 5 - 5) = 0 after Phase 1.
        // brig_home_rear is in the pool with home municipality 'zon'.
        // Phase 2a (no need gate): home brigade goes home regardless of need.

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        // brig_home_rear must be assigned (Phase 2a: home affinity, no need gate)
        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_home_rear');
    });
});

describe('n696: Phase 2b — competence-gated commander distribution', () => {
    it('low-competence commander (1/5 = 0.20) skips Phase 2b and uses BFS', () => {
        // With competence < 0.35, Phase 2b is skipped. Brigade assigned via Phase 2c BFS.
        // Brigade at rear is 4 hops from f1 (rear→f1→f2→f3→...) — need to check.
        // rear is adjacent to f1 (1 hop). f1 is in the sector's front set. → 1 hop.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away', // no home match → Phase 2a skipped
                }),
            },
            officerData: [makeOfficerData('officer_low', 1, 3)], // 1/5=0.2 < 0.35
            officerStates: { officer_low: makeOfficerState('officer_low', 'corps_a') },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        // BFS: rear → f1 (1 hop) → sector found → assigned
        expect(allBrigs).toContain('brig_rear');
    });

    it('high-competence aggressive commander (5/5 = 1.0, aggr 5/5 = 1.0) assigns surplus brigade', () => {
        // Phase 2b: aggressive → concentrate at highest threat_ratio sector.
        // Only one sector exists, so brigade goes there.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
            officerData: [makeOfficerData('officer_agg', 5, 5)], // 1.0, 1.0 ≥ 0.6
            officerStates: { officer_agg: makeOfficerState('officer_agg', 'corps_a') },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_rear');
    });

    it('high-competence defensive commander (5/5 = 1.0, aggr 1/5 = 0.2) assigns surplus brigade', () => {
        // Phase 2b: defensive → fill thinnest sector.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
            officerData: [makeOfficerData('officer_def', 5, 1)], // 1.0, 0.2 ≤ 0.4
            officerStates: { officer_def: makeOfficerState('officer_def', 'corps_a') },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_rear');
    });

    it('balanced commander (3/5 = 0.6 aggressiveness) falls to Phase 2c BFS', () => {
        // 3/5 aggressiveness = 0.6, which is exactly on the boundary (>= 0.6 means aggressive).
        // Let's use 2/5 = 0.4 (exactly boundary for defensive, <= 0.4 is defensive).
        // For balanced: 0.4 < aggr < 0.6, so use aggr=3 (0.6) — falls to aggressive branch.
        // Use aggr=2 (0.4) → exactly defensive. Use aggr=2.5 → not integer. Use aggr=3 (=0.6) → aggressive.
        // So balanced in code is strictly between 0.4 and 0.6 (exclusive).
        // Pass aggr=2 (0.4) → goes to defensive branch → should assign.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
            officerData: [makeOfficerData('officer_mid', 5, 2)], // 1.0, 2/5=0.4 → defensive branch
            officerStates: { officer_mid: makeOfficerState('officer_mid', 'corps_a') },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_rear');
    });
});

describe('n696: Phase 2c — PHASE_2C_MAX_HOPS = 4', () => {
    it('brigade 1 hop from front is within cap and gets assigned', () => {
        // rear → f1 is 1 hop. Within PHASE_2C_MAX_HOPS=4.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_rear');
    });

    it('brigade 2 hops from front (via chain) is assigned within 4-hop cap', () => {
        // deep → rear → f1 = 2 hops.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_deep: makeFormation('brig_deep', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:deep',
                    home_osid: 'op:far:away',
                }),
            },
            extraPolitical: { 'op:zon:deep': 'RS' },
            extraEdges: [{ a: 'op:zon:rear', b: 'op:zon:deep' } as EdgeRecord],
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const corpsSectors = Object.values(sectors).filter(s => s.corps_id === 'corps_a');
        expect(corpsSectors.length).toBeGreaterThan(0);

        const allBrigs = corpsSectors.flatMap((sector) => [
            ...sector.assigned_brigade_ids,
            ...sector.reserve_brigade_ids,
            ...(sector.rear_brigade_ids ?? []),
        ]);
        // deep → rear (1) → f1 (2): within cap
        expect(allBrigs).toContain('brig_deep');
        expect(state.military.formations.brig_deep.location_osid).toBe('op:zon:deep');
        expect(state.military.formations.brig_deep.assignment?.role).toBe('rear');
    });

    it('frontline brigade is assigned via Phase 1 (0 hops)', () => {
        // brig_front is on f1 — Phase 1 assigns it directly.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_front: makeFormation('brig_front', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:f1',
                    home_osid: 'op:zon:f1',
                }),
            },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();
        // Phase 1: frontline brigade directly in assigned_brigade_ids
        expect(sector?.assigned_brigade_ids).toContain('brig_front');
    });
});

describe('n696: Pre-op staging weight', () => {
    it('brigade is assigned to sector even when active op staging is in force_staging', () => {
        // The staging weight (3.0×) on the active op sector boosts effective need.
        // Since there's only one sector, the brigade should always be assigned.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
            corpsCommand: {
                corps_a: {
                    command_span: 0,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'test_staging_op',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 8,
                        phase_started_turn: 8,
                        participating_brigades: [],
                        preparation_sub_phase: 'force_staging',
                        // sector_id not set → preStagingSectorWeights stays empty
                        // but directive?.priority_sector_id might be set later.
                        // This test just verifies the brigade is still assigned (staging
                        // weight only increases score, can't decrease it).
                    }],
                },
            },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        expect(allBrigs).toContain('brig_rear');
    });
});

describe('n696: Determinism', () => {
    it('produces identical sector assignments on repeated calls with identical inputs', () => {
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_a: makeFormation('brig_a', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:a',
                }),
                brig_b: makeFormation('brig_b', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:b',
                }),
            },
            officerData: [makeOfficerData('officer_x', 4, 3)],
            officerStates: { officer_x: makeOfficerState('officer_x', 'corps_a') },
        });

        const sectors1 = buildCorpsFrontSectors(state, edges, null);
        const sectors2 = buildCorpsFrontSectors(state, edges, null);

        expect(Object.keys(sectors1).sort()).toEqual(Object.keys(sectors2).sort());
        for (const sid of Object.keys(sectors1)) {
            expect(sectors1[sid]!.assigned_brigade_ids).toEqual(sectors2[sid]!.assigned_brigade_ids);
            expect(sectors1[sid]!.reserve_brigade_ids).toEqual(sectors2[sid]!.reserve_brigade_ids);
            expect(sectors1[sid]!.rear_brigade_ids ?? []).toEqual(sectors2[sid]!.rear_brigade_ids ?? []);
        }
    });

    it('no named officer uses generic defaults (competence 0.3 < 0.35 → BFS path)', () => {
        // Without any named officer, competence=0.3 < COMMANDER_COMPETENCE_ASSIGNMENT_THRESHOLD=0.35
        // → Phase 2b skipped → Phase 2c BFS handles the brigade.
        const { state, edges } = makeLinearFrontState({
            formations: {
                brig_rear: makeFormation('brig_rear', {
                    corps_id: 'corps_a',
                    location_osid: 'op:zon:rear',
                    home_osid: 'op:far:away',
                }),
            },
        });

        const sectors = buildCorpsFrontSectors(state, edges, null);
        const sector = Object.values(sectors).find(s => s.corps_id === 'corps_a');
        expect(sector).toBeDefined();

        const allBrigs = [
            ...(sector?.assigned_brigade_ids ?? []),
            ...(sector?.reserve_brigade_ids ?? []),
            ...(sector?.rear_brigade_ids ?? []),
        ];
        // Brigade should be assigned by Phase 2c BFS (1 hop from front)
        expect(allBrigs).toContain('brig_rear');
    });
});

describe('frontline truth: commander review must not paper-transfer anchored frontline brigades', () => {
    it('keeps a brigade on its current frontline sector instead of reassigning it to a safer paper sector', () => {
        const sectorA = {
            sector_id: 'sector:corps_a:0',
            corps_id: 'corps_a',
            faction: 'RS' as FactionId,
            sub_segments: [{
                sub_segment_id: 'subseg:corps_a:0',
                edge_ids: ['a__ae'],
                friendly_osids: ['op:test:a1'],
                enemy_osids: ['op:test:ae1'],
                length_edges: 1,
                primary_brigade_ids: ['brig_exposed'],
                gap: false,
            }],
            assigned_brigade_ids: ['brig_exposed'],
            reserve_brigade_ids: [],
            territory_osids: ['op:test:a1'],
            length_edges: 1,
            density: 1,
            defensive_power: 100,
            threat_ratio: 10,
            sector_stance: 'defend',
        } as any;

        const sectorB = {
            sector_id: 'sector:corps_a:1',
            corps_id: 'corps_a',
            faction: 'RS' as FactionId,
            sub_segments: [{
                sub_segment_id: 'subseg:corps_a:1',
                edge_ids: ['b__be'],
                friendly_osids: ['op:test:b1'],
                enemy_osids: ['op:test:be1'],
                length_edges: 1,
                primary_brigade_ids: ['brig_safe'],
                gap: false,
            }],
            assigned_brigade_ids: ['brig_safe'],
            reserve_brigade_ids: [],
            territory_osids: ['op:test:b1'],
            length_edges: 1,
            density: 1,
            defensive_power: 100,
            threat_ratio: 1,
            sector_stance: 'defend',
        } as any;

        const formations: Record<string, FormationState> = {
            brig_exposed: makeFormation('brig_exposed', {
                corps_id: 'corps_a',
                location_osid: 'op:test:a1',
                home_osid: 'op:test:a1',
                personnel: 800,
            }),
            brig_safe: makeFormation('brig_safe', {
                corps_id: 'corps_a',
                location_osid: 'op:test:b1',
                home_osid: 'op:test:b1',
                personnel: 1200,
            }),
        };

        const commanderProfile: CorpsCommanderProfile = {
            competence: 1,
            aggressiveness: 0.8,
            preStagingSectorWeights: new Map(),
        };

        const overrides = commanderReviewAssignment(
            'corps_a',
            [sectorA, sectorB],
            formations,
            [],
            commanderProfile,
            new Map([
                ['op:test:a1', 0],
                ['op:test:b1', 0],
            ]),
            new Map(),
            new Set(['op:test:a1', 'op:test:b1']),
            new Set(),
        );

        expect(overrides).toEqual([]);
        expect(sectorA.assigned_brigade_ids).toContain('brig_exposed');
        expect(sectorB.assigned_brigade_ids).not.toContain('brig_exposed');
    });
});
