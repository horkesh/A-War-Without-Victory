/**
 * Tests for Fix B: Probes must not flip political control.
 *
 * Probe operations are first-class in lifecycle (planning, execution, recovery,
 * cooldown suppression) but the territory flip gate must not treat them
 * identically to full offensives. A probe that wins tactically should NOT
 * change political_controllers — it inflicts casualties and generates battle
 * records, but doesn't capture territory.
 */
import { describe, it, expect } from 'vitest';
import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type {
    FactionId,
    FormationState,
    GameState,
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
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
        personnel: 5000, cohesion: 80, morale: 80, experience: 0.5,
        location_osid: locationOsid,
        posture: 'attack',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
        ...overrides,
    } as FormationState;
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
        primary_brigade_ids: [],
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
        sector_stance: 'defend',
        stance_source: 'bot' as const,
    };
}

/**
 * Build a scenario where a strong RS attacker attacks a weak RBiH defender.
 * The attacker is part of a corps with an active operation of the given type.
 * The power asymmetry (5000 vs 300) ensures a decisive_victory/victory outcome.
 */
function makeScenario(opType: CorpsOperation['type']) {
    const rsBrig = makeFormation('brig_rs_1', 'RS', 'brigade', 'op:rs:staging', {
        personnel: 5000, cohesion: 80, experience: 0.7, posture: 'attack' as any,
        corps_id: 'vrs_1st',
        composition: {
            infantry: 2000,
            tanks: 20,
            artillery: 15,
            aa_systems: 3,
            tank_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
            artillery_condition: { operational: 0.9, degraded: 0.08, non_operational: 0.02 },
        },
    });
    const rbihBrig = makeFormation('brig_rbih_1', 'RBiH', 'brigade', 'op:rbih:target', {
        personnel: 300, cohesion: 30, morale: 30, experience: 0.1,
        composition: {
            infantry: 200,
            tanks: 0,
            artillery: 0,
            aa_systems: 0,
            tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
            artillery_condition: { operational: 0, degraded: 0, non_operational: 0 },
        },
    });
    const rsCorps = makeFormation('vrs_1st', 'RS', 'corps', 'op:rs:hq');

    const operation: CorpsOperation = {
        name: `test_op_${opType}`,
        type: opType,
        phase: 'execution',
        started_turn: 3,
        phase_started_turn: 3,
        participating_brigades: ['brig_rs_1'],
        objectives: ['op:rbih:target'],
        objective_capture_count: 0,
        attack_attempt_count: 0,
        sector_id: 'sector:vrs_1st:0',
        axes: [{
            axis_id: `test_op_${opType}_ax0`,
            name: 'Main',
            assigned_brigades: ['brig_rs_1'],
            objectives: ['op:rbih:target'],
            current_objective_index: 0,
            status: 'executing',
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
        }],
    } as unknown as CorpsOperation;

    const sector = makeSector(
        'sector:vrs_1st:0', 'vrs_1st', 'RS', ['brig_rs_1'],
        [makeSubSegment('sub:vrs_1st:0:0',
            ['op:rbih:target'],
            ['op:rs:staging'],
            ['e1']
        )],
        1
    );

    const state: GameState = {
        meta: {
            turn: 5, phase: 'war', seed: 'probe-flip-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
        ] as GameState['factions'],
        formations: {
            vrs_1st: rsCorps,
            brig_rs_1: rsBrig,
            brig_rbih_1: rbihBrig,
        },
        political: {
            political_controllers: {
                'op:rs:staging': 'RS',
                'op:rs:hq': 'RS',
                'op:rbih:target': 'RBiH',
                'op:rbih:rear': 'RBiH',
            },
            control_events: [],
        } as any,
        military: {
            formations: {
                vrs_1st: rsCorps,
                brig_rs_1: rsBrig,
                brig_rbih_1: rbihBrig,
            },
            corps_command: {
                vrs_1st: {
                    command_span: 3,
                    subordinate_count: 1,
                    og_slots: 1,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [operation],
                },
            },
            corps_front_sectors: {
                'sector:vrs_1st:0': sector,
            },
            brigade_attack_orders: { brig_rs_1: 'op:rbih:target' } as any,
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        } as any,
        displacement: {} as any,
    } as unknown as GameState;

    const edges: EdgeRecord[] = [
        { edge_id: 'e1', a: 'op:rs:staging', b: 'op:rbih:target' } as EdgeRecord,
        { edge_id: 'e2', a: 'op:rbih:target', b: 'op:rbih:rear' } as EdgeRecord,
    ];

    return { state, edges, operation };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('probe territory flip gate', () => {
    it('a probe that wins tactically does NOT flip political_controllers', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        // Should have resolved a battle
        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // The overwhelming force (5000 vs 300) should produce a clear win
        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control must NOT have changed
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RBiH');

        // No flips recorded in the report
        expect(report.flips_applied).toBe(0);
    });

    it('a sector_attack that wins tactically DOES flip political_controllers', () => {
        const { state, edges } = makeScenario('sector_attack');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // The overwhelming force should produce a clear win
        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control MUST have changed to RS
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');

        // Flip recorded
        expect(report.flips_applied).toBe(1);
    });

    it('a general_offensive that wins tactically DOES flip political_controllers', () => {
        const { state, edges } = makeScenario('general_offensive');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        expect(['decisive_victory', 'victory', 'costly_victory']).toContain(battle.outcome);

        // KEY ASSERTION: political control MUST have changed to RS
        expect(state.political.political_controllers!['op:rbih:target']).toBe('RS');
        expect(report.flips_applied).toBe(1);
    });

    it('a probe battle still records casualties (battle happened, just no territorial consequence)', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        const report = resolveAttackOrdersOsid(state, edges, reverseMap);

        expect(report.battles.length).toBe(1);
        const battle = report.battles[0]!;

        // Casualties should be non-zero — a real battle occurred
        const totalCasualties = report.casualty_attacker + report.casualty_defender;
        expect(totalCasualties).toBeGreaterThan(0);

        // Defender took casualties (300 personnel vs 5000 attacker — should take real losses)
        expect(report.casualty_defender).toBeGreaterThan(0);
    });

    it('probe does not record a control_event', () => {
        const { state, edges } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        resolveAttackOrdersOsid(state, edges, reverseMap);

        // No control events should be emitted for probes
        const controlEvents = (state.political as any).control_events ?? [];
        const targetEvents = controlEvents.filter(
            (e: any) => e.settlement_id === 'op:rbih:target'
        );
        expect(targetEvents.length).toBe(0);
    });

    it('probe does not increment operation territory_gained counters', () => {
        const { state, edges, operation } = makeScenario('probe');
        const reverseMap = new Map<string, string[]>();
        resolveAttackOrdersOsid(state, edges, reverseMap);

        // Territory gained counters should remain at 0
        expect(operation.territory_gained_this_turn ?? 0).toBe(0);
        expect(operation.total_territory_gained ?? 0).toBe(0);

        // But battles_this_turn SHOULD increment (the battle happened)
        expect(operation.battles_this_turn ?? 0).toBeGreaterThan(0);
    });
});
