import { describe, expect, it } from 'vitest';

import { resolveAttackOrdersOsid } from '../src/sim/combat/attack_resolution_osid.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type {
    CorpsFrontSector,
    CorpsFrontSubSegment,
    CorpsOperation,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

function formation(
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
        ops: { fatigue: 0, last_supplied_turn: null },
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

function subSegment(id: string, enemyOsids: string[], friendlyOsids: string[], edgeIds: string[]): CorpsFrontSubSegment {
    return {
        sub_segment_id: id,
        edge_ids: edgeIds,
        enemy_osids: enemyOsids,
        friendly_osids: friendlyOsids,
        primary_brigade_ids: [],
        length_edges: edgeIds.length,
    };
}

function sector(
    id: string,
    corpsId: string,
    faction: FactionId,
    brigadeIds: string[],
    subSegments: CorpsFrontSubSegment[],
): CorpsFrontSector {
    return {
        sector_id: id,
        corps_id: corpsId as never,
        faction,
        opposing_factions: [],
        edge_ids: subSegments.flatMap((item) => item.edge_ids),
        sub_segments: subSegments,
        length_edges: subSegments.length,
        territory_osids: subSegments.flatMap((item) => item.friendly_osids),
        assigned_brigade_ids: brigadeIds as never[],
        reserve_brigade_ids: [],
        density: brigadeIds.length,
        threat_ratio: 1,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
    };
}

function defendedBattleFixture(): { state: GameState; edges: EdgeRecord[] } {
    const attacker = formation('brig_rs_1', 'RS', 'brigade', 'op:rs:staging', {
        corps_id: 'vrs_1st',
        personnel: 5000,
        experience: 0.7,
    });
    const defender = formation('brig_rbih_1', 'RBiH', 'brigade', 'op:rbih:target', {
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
    const operation: CorpsOperation = {
        name: 'fatigue-owner-test',
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
    const attackerSector = sector(
        'sector:vrs_1st:0',
        'vrs_1st',
        'RS',
        ['brig_rs_1'],
        [subSegment('sub:vrs_1st:0:0', ['op:rbih:target'], ['op:rs:staging'], ['e1'])],
    );
    const defenderSector = sector(
        'sector:rbih:0',
        'rbih_corps',
        'RBiH',
        ['brig_rbih_1'],
        [subSegment('sub:rbih:0:0', ['op:rs:staging'], ['op:rbih:target'], ['e1'])],
    );
    const state = {
        meta: { turn: 5, phase: 'war', seed: 'fatigue-owner-red', scenario_start_date: { year: 1992, month: 4, day: 6 } },
        factions: [{ id: 'RS' }, { id: 'RBiH' }],
        political: {
            political_controllers: {
                'op:rs:staging': 'RS',
                'op:rs:hq': 'RS',
                'op:rbih:target': 'RBiH',
                'op:rbih:hq': 'RBiH',
            },
            control_events: [],
        },
        military: {
            formations: {
                vrs_1st: formation('vrs_1st', 'RS', 'corps', 'op:rs:hq'),
                rbih_corps: formation('rbih_corps', 'RBiH', 'corps', 'op:rbih:hq'),
                brig_rs_1: attacker,
                brig_rbih_1: defender,
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
                'sector:rbih:0': defenderSector,
            },
            brigade_attack_orders: { brig_rs_1: 'op:rbih:target' },
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH']),
        },
        displacement: {},
    } as unknown as GameState;
    return { state, edges: [{ edge_id: 'e1', a: 'op:rs:staging', b: 'op:rbih:target' } as EdgeRecord] };
}

function addSecondAttacker(state: GameState): void {
    state.military.formations.brig_rs_2 = formation('brig_rs_2', 'RS', 'brigade', 'op:rs:staging', {
        corps_id: 'vrs_1st',
        personnel: 4500,
        experience: 0.6,
    });
    state.military.brigade_attack_orders!.brig_rs_2 = 'op:rbih:target';
    state.military.corps_command!.vrs_1st!.active_operations[0]!.participating_brigades.push('brig_rs_2');
    state.military.corps_front_sectors!['sector:vrs_1st:0']!.assigned_brigade_ids.push('brig_rs_2' as never);
}

function removeDefender(state: GameState): void {
    delete state.military.formations.brig_rbih_1;
    state.military.corps_front_sectors!['sector:rbih:0']!.assigned_brigade_ids = [];
}

describe('real resolver combat-fatigue ownership', () => {
    it('charges the canonical +2 attacker and +1 primary defender exactly once for one defended battle', () => {
        const { state, edges } = defendedBattleFixture();
        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.orders_processed).toBe(1);
        expect(report.battles).toHaveLength(1);
        expect.soft(state.military.formations.brig_rs_1?.ops?.fatigue).toBe(2);
        expect.soft(state.military.formations.brig_rbih_1?.ops?.fatigue).toBe(1);
    });

    it('charges every participating attacker +2 exactly once in a shared defended battle', () => {
        const { state, edges } = defendedBattleFixture();
        addSecondAttacker(state);

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles).toHaveLength(1);
        expect.soft(state.military.formations.brig_rs_1?.ops?.fatigue).toBe(2);
        expect.soft(state.military.formations.brig_rs_2?.ops?.fatigue).toBe(2);
        expect.soft(state.military.formations.brig_rbih_1?.ops?.fatigue).toBe(1);
    });

    it('charges an attacker +0.5 exactly once when the target has no defending formation', () => {
        const { state, edges } = defendedBattleFixture();
        removeDefender(state);

        const report = resolveAttackOrdersOsid(state, edges, new Map<string, string[]>());

        expect(report.battles).toHaveLength(1);
        expect(state.military.formations.brig_rs_1?.ops?.fatigue).toBe(0.5);
    });
});
