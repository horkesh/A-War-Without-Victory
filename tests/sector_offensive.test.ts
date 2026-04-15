import { describe, expect, it } from 'vitest';

import {
    computePlanningDuration,
    evaluateSectorOffensiveLaunch,
    getMomentumAggressionBonus,
    getMomentumMinOutcome,
} from '../src/sim/combat/sector_offensive.js';
import { EXEMPT_CORPS_IDS } from '../src/sim/combat/corps_front_sectors_constants.js';
import { OPERATION_NAMES, pickOperationName } from '../src/sim/combat/operation_names.js';
import { _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import type { FactionId, FormationState, GameState } from '../src/state/game_state.js';
import type { SupplyStateByOsidReport } from '../src/state/supply_state_derivation.js';

function makeMinimalState(turn: number, formations: Record<string, Partial<FormationState>>): GameState {
    const fmts: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmts[id] = {
            id,
            name: id,
            faction: 'RS' as FactionId,
            kind: 'brigade',
            status: 'active',
            personnel: 2000,
            cohesion: 80,
            location_osid: 'op:test:1',
            ...partial,
        } as FormationState;
    }

    return {
        meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        military: {
            formations: fmts,
            corps_command: {},
            corps_front_sectors: {},
            war_front_edges_osid: [],
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as GameState;
}

function makeLaunchState(turn = 5): GameState {
    const state = makeMinimalState(turn, {
        corps_1: { kind: 'corps' as any, personnel: 0, location_osid: undefined, hq_sid: 'S1', tags: [] },
        b1: { corps_id: 'corps_1' as any, location_osid: 'op:front:1', hq_sid: 'S1', equipment_class: 'mechanized' as any },
        b2: { corps_id: 'corps_1' as any, location_osid: 'op:front:2', hq_sid: 'S1', equipment_class: 'motorized' as any },
        b3: { corps_id: 'corps_1' as any, location_osid: 'op:front:3', hq_sid: 'S1', equipment_class: 'light_infantry' as any },
        d1: { faction: 'RBiH' as FactionId, corps_id: 'enemy_corps' as any, location_osid: 'op:enemy:1', personnel: 600, cohesion: 65, hq_sid: 'S2' },
        d2: { faction: 'RBiH' as FactionId, corps_id: 'enemy_corps' as any, location_osid: 'op:enemy:1', personnel: 600, cohesion: 65, hq_sid: 'S2' },
    });

    state.military.corps_front_sectors = {
        'sector:corps_1:0': {
            sector_id: 'sector:corps_1:0',
            corps_id: 'corps_1',
            faction: 'RS',
            opposing_factions: ['RBiH'],
            edge_ids: ['edge:1', 'edge:2', 'edge:3'],
            sub_segments: [{
                sub_segment_id: 'subseg:sector:corps_1:0:0',
                edge_ids: ['edge:1', 'edge:2', 'edge:3'],
                friendly_osids: ['op:front:1', 'op:front:2', 'op:front:3'],
                enemy_osids: ['op:enemy:1'],
                primary_brigade_ids: ['b1', 'b2', 'b3'],
                length_edges: 3,
            }],
            length_edges: 3,
            territory_osids: ['op:front:1', 'op:front:2', 'op:front:3'],
            assigned_brigade_ids: ['b1', 'b2', 'b3'],
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 100,
            sector_stance: 'attack',
            stance_source: 'bot',
        },
        enemy_sector_1: {
            sector_id: 'enemy_sector_1',
            corps_id: 'enemy_corps',
            faction: 'RBiH',
            opposing_factions: ['RS'],
            edge_ids: ['edge:enemy:1'],
            sub_segments: [{
                sub_segment_id: 'subseg:enemy_sector_1:0',
                edge_ids: ['edge:enemy:1'],
                friendly_osids: ['op:enemy:1'],
                enemy_osids: ['op:front:1', 'op:front:2', 'op:front:3'],
                primary_brigade_ids: ['d1', 'd2'],
                length_edges: 1,
            }],
            length_edges: 1,
            territory_osids: ['op:enemy:1'],
            assigned_brigade_ids: ['d1', 'd2'],
            reserve_brigade_ids: [],
            density: 1,
            threat_ratio: 1,
            defensive_power: 100,
            sector_stance: 'defend',
            stance_source: 'bot',
        },
    } as any;

    state.military.war_front_edges_osid = [
        { a: 'op:front:1', b: 'op:enemy:1', edge_id: 'front1__enemy1', side_a: 'RS', side_b: 'RBiH' },
        { a: 'op:front:2', b: 'op:enemy:1', edge_id: 'front2__enemy1', side_a: 'RS', side_b: 'RBiH' },
        { a: 'op:front:3', b: 'op:enemy:1', edge_id: 'front3__enemy1', side_a: 'RS', side_b: 'RBiH' },
    ] as any;

    state.political.political_controllers = {
        'op:front:1': 'RS',
        'op:front:2': 'RS',
        'op:front:3': 'RS',
        'op:enemy:1': 'RBiH',
    } as any;

    return state;
}

describe('pre-planned operations', () => {
    it('never assign brigades to exempt corps', () => {
        for (const op of _ALL_PRE_PLANNED) {
            expect(
                EXEMPT_CORPS_IDS.has(op.corps),
                `Operation "${op.name}" assigned to exempt corps "${op.corps}"`,
            ).toBe(false);
        }
    });
});

describe('sector offensive planning duration', () => {
    it('keeps the small-objective march buffer behavior', () => {
        expect(computePlanningDuration(1)).toBe(3);
        expect(computePlanningDuration(2)).toBe(3);
        expect(computePlanningDuration(3)).toBe(4);
    });

    it('caps larger plans at the current max planning duration', () => {
        expect(computePlanningDuration(4)).toBe(4);
        expect(computePlanningDuration(5)).toBe(4);
        expect(computePlanningDuration(6)).toBe(4);
        expect(computePlanningDuration(8)).toBe(4);
    });
});

describe('operation naming', () => {
    it('is deterministic for the same corps, turn, and faction', () => {
        expect(pickOperationName('corps_1kk', 5, 'RS')).toBe(pickOperationName('corps_1kk', 5, 'RS'));
    });

    it('uses faction-specific naming pools', () => {
        const rsName = pickOperationName('corps_1kk', 5, 'RS');
        const rbihName = pickOperationName('corps_1kk', 5, 'RBiH');
        const hrhbName = pickOperationName('corps_1kk', 5, 'HRHB');

        expect(OPERATION_NAMES.RS).toContain(rsName);
        expect(OPERATION_NAMES.RBiH).toContain(rbihName);
        expect(OPERATION_NAMES.HRHB).toContain(hrhbName);
    });

    it('tracks sequential consumption through the canonical nested owner', () => {
        const state = { military: { used_operation_names: {} } } as any;
        const names = new Set<string>();

        for (let i = 0; i < 10; i++) {
            const name = pickOperationName(`corps_${i}`, i, 'RS', state);
            expect(names.has(name), `duplicate name: ${name}`).toBe(false);
            names.add(name);
        }

        expect(names.size).toBe(10);
        expect(Object.keys(state.military.used_operation_names)).toHaveLength(10);
    });
});

describe('sector offensive launch evaluation', () => {
    it('launches when the current feasibility and opening-attack gates are satisfied', () => {
        const state = makeLaunchState();

        const op = evaluateSectorOffensiveLaunch(
            state,
            'corps_1',
            'sector:corps_1:0',
            'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:enemy:1'],
            ['op:enemy:1'],
            null,
        );

        expect(op).not.toBeNull();
        expect(op?.type).toBe('sector_attack');
        expect(op?.phase).toBe('planning');
        expect(op?.sector_id).toBe('sector:corps_1:0');
        expect(op?.objectives).toEqual(['op:enemy:1']);
        expect(op?.participating_brigades).toEqual(['b1', 'b2', 'b3']);
    });

    it('rejects launches when fewer than two brigades are available', () => {
        const state = makeLaunchState();

        const op = evaluateSectorOffensiveLaunch(
            state,
            'corps_1',
            'sector:corps_1:0',
            'RS' as FactionId,
            ['b1'],
            ['op:enemy:1'],
            ['op:enemy:1'],
            null,
        );

        expect(op).toBeNull();
    });

    it('keeps critical-supply launches alive for staging under the current readiness scoring', () => {
        const state = makeLaunchState();
        state.meta.supply_reserves_enabled = true;

        const supplyReport: SupplyStateByOsidReport = {
            schema: 1,
            turn: 5,
            factions: [{
                faction_id: 'RS',
                by_osid: [
                    { osid: 'op:front:1', state: 'critical' },
                    { osid: 'op:front:2', state: 'critical' },
                    { osid: 'op:front:3', state: 'critical' },
                ],
            }],
        };

        const op = evaluateSectorOffensiveLaunch(
            state,
            'corps_1',
            'sector:corps_1:0',
            'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:enemy:1'],
            ['op:enemy:1'],
            supplyReport,
        );

        expect(op).not.toBeNull();
        expect(op?.supply_readiness).toBe(0.5);
    });

    it('scores strained brigades at partial readiness when reserves keep them above critical', () => {
        const state = makeLaunchState();
        state.meta.supply_reserves_enabled = true;
        state.military.general_supply_reserve = { RS: 45 } as any;

        const supplyReport: SupplyStateByOsidReport = {
            schema: 1,
            turn: 5,
            factions: [{
                faction_id: 'RS',
                by_osid: [
                    { osid: 'op:front:1', state: 'strained' },
                    { osid: 'op:front:2', state: 'strained' },
                    { osid: 'op:front:3', state: 'strained' },
                ],
            }],
        };

        const op = evaluateSectorOffensiveLaunch(
            state,
            'corps_1',
            'sector:corps_1:0',
            'RS' as FactionId,
            ['b1', 'b2', 'b3'],
            ['op:enemy:1'],
            ['op:enemy:1'],
            supplyReport,
        );

        expect(op).not.toBeNull();
        expect(op?.supply_readiness).toBe(0.5);
    });
});

describe('sector offensive momentum helpers', () => {
    it('scales aggression bonus with momentum', () => {
        expect(getMomentumAggressionBonus(0)).toBe(0);
        expect(getMomentumAggressionBonus(1)).toBe(0.05);
        expect(getMomentumAggressionBonus(2)).toBe(0.1);
        expect(getMomentumAggressionBonus(3)).toBe(0.15);
    });

    it('relaxes minimum outcomes as momentum rises', () => {
        expect(getMomentumMinOutcome(0, 'victory')).toBe('victory');
        expect(getMomentumMinOutcome(3, 'victory')).toBe('stalemate');
        expect(getMomentumMinOutcome(2, 'victory')).toBe('costly_victory');
        expect(getMomentumMinOutcome(1, 'decisive_victory')).toBe('victory');
    });
});
