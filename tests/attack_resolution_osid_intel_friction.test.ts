import { describe, expect, it } from 'vitest';

import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import {
    getIntelAmbushDefenderCasualtyMult,
    getIntelAmbushAttackerCasualtyMult,
    getIntelExecutionFrictionMultipliers,
} from '../src/sim/combat/combat_math.js';
import { compileTurnSummary } from '../src/sim/compile_turn_summary.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { AARSnapshot, TurnReport } from '../src/sim/turn_pipeline_types.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

function makeFormation(
    id: string,
    faction: FactionId,
    kind: 'brigade' | 'corps',
    locationOsid: string,
    overrides: Partial<FormationState> = {},
): FormationState {
    return {
        id,
        name: id,
        faction,
        kind,
        status: 'active',
        personnel: 5000,
        cohesion: 80,
        morale: 80,
        experience: 0.5,
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
    edgeIds: string[],
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
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as any,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap(s => s.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.length,
        territory_osids: subSegments.flatMap(s => s.friendly_osids),
        assigned_brigade_ids: brigadeIds as any[],
        reserve_brigade_ids: [],
        density: brigadeIds.length,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function makeScenario() {
    const rsBrig = makeFormation('brig_rs_1', 'RS', 'brigade', 'op:rs:staging', {
        corps_id: 'vrs_1st',
        personnel: 5000,
        experience: 0.7,
    });
    const rbihBrig = makeFormation('brig_rbih_1', 'RBiH', 'brigade', 'op:rbih:target', {
        corps_id: 'rbih_corps',
        personnel: 300,
        cohesion: 30,
        morale: 30,
        experience: 0.1,
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
    const rbihCorps = makeFormation('rbih_corps', 'RBiH', 'corps', 'op:rbih:hq');
    const operation: CorpsOperation = {
        name: 'test_op',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 3,
        phase_started_turn: 3,
        participating_brigades: ['brig_rs_1'],
        objectives: ['op:rbih:target'],
        sector_id: 'sector:vrs_1st:0',
        objective_capture_count: 0,
        attack_attempt_count: 0,
    } as unknown as CorpsOperation;
    const attackerSector = makeSector(
        'sector:vrs_1st:0',
        'vrs_1st',
        'RS',
        ['brig_rs_1'],
        [makeSubSegment('sub:vrs_1st:0:0', ['op:rbih:target'], ['op:rs:staging'], ['e1'])],
    );
    const defenderSector = makeSector(
        'sector:rbih_defense:0',
        'rbih_corps',
        'RBiH',
        ['brig_rbih_1'],
        [makeSubSegment('sub:rbih_defense:0:0', ['op:rs:staging'], ['op:rbih:target'], ['e1'])],
    );

    const state: GameState = {
        meta: {
            turn: 5,
            phase: 'war',
            seed: 'intel-friction-test',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'RBiH' as FactionId }] as GameState['factions'],
        political: {
            political_controllers: {
                'op:rs:staging': 'RS',
                'op:rs:hq': 'RS',
                'op:rbih:target': 'RBiH',
                'op:rbih:hq': 'RBiH',
            },
            control_events: [],
        } as any,
        military: {
            formations: {
                vrs_1st: rsCorps,
                rbih_corps: rbihCorps,
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
                'sector:vrs_1st:0': attackerSector,
                'sector:rbih_defense:0': defenderSector,
            },
            brigade_attack_orders: { brig_rs_1: 'op:rbih:target' } as any,
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
    const edges: EdgeRecord[] = [
        { edge_id: 'e1', a: 'op:rs:staging', b: 'op:rbih:target' } as EdgeRecord,
    ];
    return { state, edges };
}

function makeSnapshot(turn: number): AARSnapshot {
    return {
        turn,
        supply: {},
        heavy_munitions: {},
        arcs: {},
        decoration_tiers: {},
        already_destroyed: new Set(),
        formation_ids: new Set(),
        formation_locations: {},
        supply_state_by_osid: {},
    };
}

function seedIntel(state: GameState, confidence: number): void {
    state.military.sector_intel = {
        'sector:vrs_1st:0': [{
            enemy_sector_id: 'sector:rbih_defense:0',
            enemy_faction: 'RBiH',
            enemy_corps_id: 'rbih_corps' as any,
            front_edge_count: 1,
            strength_category: confidence >= 1 ? 'thin' : 'unknown',
            posture_observed: confidence >= 1 ? 'defensive' : 'unknown',
            offensive_signs: false,
            confidence,
            turns_in_contact: 1,
            visible_brigade_ids: confidence >= 1 ? ['brig_rbih_1' as any] : [],
            osid_confidence: [{
                osid: 'op:rbih:target',
                confidence,
                sources: confidence >= 1 ? ['combat'] : ['passive_contact'],
            }],
            last_updated_turn: 5,
        }],
    };
}

describe('attack resolution intel execution friction', () => {
    it('computes deterministic stale-intel attack and OPSEC defense multipliers', () => {
        expect(getIntelExecutionFrictionMultipliers(1, false)).toEqual({
            attackerPowerMult: 1,
            defenderPowerMult: 1,
        });
        expect(getIntelExecutionFrictionMultipliers(0, false)).toEqual({
            attackerPowerMult: 0.85,
            defenderPowerMult: 1,
        });
        expect(getIntelExecutionFrictionMultipliers(0.5, true)).toEqual({
            attackerPowerMult: 0.925,
            defenderPowerMult: 1.08,
        });
    });

    it('computes deterministic ambush casualty friction only for low-confidence OPSEC contacts', () => {
        expect(getIntelAmbushAttackerCasualtyMult(1, true)).toBe(1);
        expect(getIntelAmbushAttackerCasualtyMult(0, false)).toBe(1);
        expect(getIntelAmbushAttackerCasualtyMult(0.5, true)).toBe(1);
        expect(getIntelAmbushAttackerCasualtyMult(0.2, true)).toBeGreaterThan(1);
        expect(getIntelAmbushDefenderCasualtyMult(1, true)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0, false)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0.5, true)).toBe(1);
        expect(getIntelAmbushDefenderCasualtyMult(0.2, true)).toBeLessThan(1);
    });

    it('low attacker intel confidence reduces resolved power ratio without exposing hidden truth', () => {
        const fresh = makeScenario();
        const stale = makeScenario();
        seedIntel(fresh.state, 1);
        seedIntel(stale.state, 0);

        const freshReport = resolveAttackOrdersOsid(fresh.state, fresh.edges, new Map<string, string[]>());
        const staleReport = resolveAttackOrdersOsid(stale.state, stale.edges, new Map<string, string[]>());

        expect(staleReport.battles[0]!.power_ratio).toBeLessThan(freshReport.battles[0]!.power_ratio);
        expect(stale.state.military.sector_intel!['sector:vrs_1st:0']![0]!.visible_brigade_ids).toEqual([]);
    });

    it('annotates stale intel and defender OPSEC only when execution multipliers changed', () => {
        const neutral = makeScenario();
        seedIntel(neutral.state, 1);
        const neutralReport = resolveAttackOrdersOsid(neutral.state, neutral.edges, new Map<string, string[]>());

        const friction = makeScenario();
        seedIntel(friction.state, 0);
        friction.state.military.opsec_sectors = ['sector:rbih_defense:0'];
        const frictionReport = resolveAttackOrdersOsid(friction.state, friction.edges, new Map<string, string[]>());

        expect(neutralReport.battles[0]!.execution_friction).toBeUndefined();
        expect(frictionReport.battles[0]!.execution_friction).toEqual({
            labels: ['stale_intel', 'defender_opsec', 'ambush_risk'],
            attacker_confidence_band: 'low',
        });
    });

    it('carries public intel-friction annotations into the compiled turn AAR', () => {
        const friction = makeScenario();
        seedIntel(friction.state, 0.5);
        friction.state.military.opsec_sectors = ['sector:rbih_defense:0'];
        const report = resolveAttackOrdersOsid(friction.state, friction.edges, new Map<string, string[]>());

        const summary = compileTurnSummary(
            friction.state,
            makeSnapshot(5),
            { attack_resolution_osid: report } as TurnReport,
        );

        expect(summary.battles[0]!.execution_friction).toEqual({
            labels: ['stale_intel', 'defender_opsec'],
            attacker_confidence_band: 'medium',
        });
    });

    it('applies low-confidence OPSEC ambush friction as extra attacker losses', () => {
        const staleOnly = makeScenario();
        seedIntel(staleOnly.state, 0);
        const staleOnlyReport = resolveAttackOrdersOsid(staleOnly.state, staleOnly.edges, new Map<string, string[]>());

        const ambush = makeScenario();
        seedIntel(ambush.state, 0);
        ambush.state.military.opsec_sectors = ['sector:rbih_defense:0'];
        const ambushReport = resolveAttackOrdersOsid(ambush.state, ambush.edges, new Map<string, string[]>());

        expect(ambushReport.casualty_attacker).toBeGreaterThan(staleOnlyReport.casualty_attacker);
        expect(ambushReport.battles[0]!.execution_friction?.labels).toContain('ambush_risk');
    });

    it('applies low-confidence OPSEC ambush friction as reduced defender losses', () => {
        const staleOnly = makeScenario();
        seedIntel(staleOnly.state, 0);
        const staleOnlyReport = resolveAttackOrdersOsid(staleOnly.state, staleOnly.edges, new Map<string, string[]>());

        const ambush = makeScenario();
        seedIntel(ambush.state, 0);
        ambush.state.military.opsec_sectors = ['sector:rbih_defense:0'];
        const ambushReport = resolveAttackOrdersOsid(ambush.state, ambush.edges, new Map<string, string[]>());

        expect(ambushReport.casualty_defender).toBeLessThan(staleOnlyReport.casualty_defender);
        expect(ambushReport.battles[0]!.execution_friction).toEqual({
            labels: ['stale_intel', 'defender_opsec', 'ambush_risk'],
            attacker_confidence_band: 'low',
        });
    });
});
