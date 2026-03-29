/**
 * Tests for JNA phantom brigade spawn, withdrawal, and equipment handoff.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    spawnJnaPhantomBrigades,
    processJnaWithdrawals,
    getJnaWithdrawalCountdowns,
    _JNA_PHANTOM_DEFS,
    _EQUIPMENT_CEILINGS,
} from '../src/sim/combat/jna_phantom_brigades.js';
import type { FormationState, GameState, FactionId, FormationId } from '../src/state/game_state.js';

function makeState(turn: number): GameState {
    return {
  meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
  factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
  military: {
    formations: {},
    corps_command: {}
  } as any,
  political: {
    political_controllers: {}
  } as any,
} as GameState;
}

describe('JNA Phantom — Spawn', () => {
    it('spawns all 5 phantom brigades', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);
        const phantoms = Object.values(state.military.formations!).filter(f => f.kind === 'jna_phantom');
        assert.equal(phantoms.length, 5);
    });

    it('phantom brigades have correct properties', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);
        const uzice = state.military.formations!['jna_uzice_corps_tg']!;
        assert.equal(uzice.kind, 'jna_phantom');
        assert.equal(uzice.faction, 'RS');
        assert.equal(uzice.status, 'active');
        assert.equal(uzice.personnel, 2000);
        assert.equal(uzice.withdrawal_turn, 4);
        assert.equal(uzice.corps_id, 'vrs_herzegovina');
        assert.equal(uzice.location_osid, 'op:visegrad:visegrad_2');
        assert.ok(uzice.composition);
        assert.equal(uzice.composition!.tanks, 30);
        assert.equal(uzice.composition!.artillery, 20);
    });

    it('does not duplicate on re-spawn', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);
        spawnJnaPhantomBrigades(state);
        const phantoms = Object.values(state.military.formations!).filter(f => f.kind === 'jna_phantom');
        assert.equal(phantoms.length, 5);
    });
});

describe('JNA Phantom — Withdrawal Countdown', () => {
    it('reports countdowns for active phantoms', () => {
        const state = makeState(2);
        spawnJnaPhantomBrigades(state);
        const notices = getJnaWithdrawalCountdowns(state);
        assert.equal(notices.length, 5);
        const uzice = notices.find(n => n.phantom_id === 'jna_uzice_corps_tg');
        assert.ok(uzice);
        assert.equal(uzice!.turns_remaining, 2); // w4 - w2 = 2
    });

    it('reports 0 turns remaining at withdrawal turn', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        const notices = getJnaWithdrawalCountdowns(state);
        const uzice = notices.find(n => n.phantom_id === 'jna_uzice_corps_tg');
        assert.ok(uzice);
        assert.equal(uzice!.turns_remaining, 0);
    });
});

describe('JNA Phantom — Withdrawal', () => {
    it('removes phantom at withdrawal turn', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        assert.ok(state.military.formations!['jna_uzice_corps_tg']);
        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1); // only Uzice at w4
        assert.equal(events[0]!.phantom_id, 'jna_uzice_corps_tg');
        assert.equal(state.military.formations!['jna_uzice_corps_tg'], undefined);
    });

    it('does not withdraw before withdrawal turn', () => {
        const state = makeState(3);
        spawnJnaPhantomBrigades(state);
        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 0);
        assert.ok(state.military.formations!['jna_uzice_corps_tg']);
    });

    it('withdraws multiple at same turn', () => {
        const state = makeState(6);
        spawnJnaPhantomBrigades(state);
        // Also force w4 and w5 phantoms to already be gone
        delete state.military.formations!['jna_uzice_corps_tg'];
        delete state.military.formations!['jna_mostar_garrison_tg'];
        const events = processJnaWithdrawals(state);
        // w6: jna_17th_corps_tg and jna_4th_corps_tg
        assert.equal(events.length, 2);
    });
});

describe('JNA Phantom — Equipment Handoff', () => {
    it('distributes equipment to corps brigades', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        // Add a receiving brigade in same corps
        state.military.formations!['rs_foa_brigade'] = {
            id: 'rs_foa_brigade' as FormationId,
            faction: 'RS' as FactionId,
            name: 'Foca Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 2000,
            corps_id: 'vrs_herzegovina' as FormationId,
            location_osid: 'op:visegrad:visegrad_2', // same OSID as phantom
            equipment_class: 'light_infantry',
            composition: {
                infantry: 1500,
                tanks: 0,
                artillery: 2,
                aa_systems: 0,
                tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
            },
        } as FormationState;

        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1);

        const brigade = state.military.formations!['rs_foa_brigade']!;
        // Light infantry ceiling: max_tanks=5, max_artillery=10, max_apcs=8
        // Phantom had: 30 tanks, 20 artillery, 8 APCs
        // Brigade gets: 5 tanks (ceiling), 8 more artillery (ceiling 10 - 2 existing = 8), some APCs
        assert.ok(brigade.composition!.tanks > 0);
        assert.ok(brigade.composition!.tanks <= 5 + 8); // max_tanks + max_apcs for light_infantry
        assert.ok(brigade.composition!.artillery <= 10);
    });

    it('respects equipment ceilings', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        // Brigade already at ceiling
        state.military.formations!['rs_foa_brigade'] = {
            id: 'rs_foa_brigade' as FormationId,
            faction: 'RS' as FactionId,
            name: 'Foca Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            kind: 'brigade',
            personnel: 2000,
            corps_id: 'vrs_herzegovina' as FormationId,
            location_osid: 'op:visegrad:visegrad_2',
            equipment_class: 'light_infantry',
            composition: {
                infantry: 1500,
                tanks: 13, // already at max_tanks(5) + max_apcs(8)
                artillery: 10, // at ceiling
                aa_systems: 0,
                tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
                artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
            },
        } as FormationState;

        const events = processJnaWithdrawals(state);
        const brigade = state.military.formations!['rs_foa_brigade']!;
        // No room — everything goes to reserve
        assert.equal(brigade.composition!.tanks, 13); // unchanged
        assert.equal(brigade.composition!.artillery, 10); // unchanged
        assert.ok(events[0]!.tanks_to_reserve > 0);
        assert.ok(events[0]!.artillery_to_reserve > 0);
    });

    it('excess goes to corps equipment reserve', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        // No receiving brigades in corps
        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1);
        // All equipment should go to reserve
        const reserve = state.military.corps_equipment_reserve?.['vrs_herzegovina'];
        assert.ok(reserve);
        assert.ok(reserve!.tanks > 0);
        assert.ok(reserve!.artillery > 0);
    });

    it('removes phantom from active operation axes', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        state.military.corps_command = {
            'vrs_herzegovina': {
                stance: 'offensive' as any,
                active_operations: [{
                    name: 'Op Visegrad',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 0,
                    phase_started_turn: 1,
                    participating_brigades: ['jna_uzice_corps_tg', 'rs_foa_brigade'],
                    objectives: ['op:visegrad:visegrad_2'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    axes: [{
                        axis_id: 'main',
                        name: 'Main',
                        assigned_brigades: ['jna_uzice_corps_tg', 'rs_foa_brigade'],
                        objectives: ['op:visegrad:visegrad_2'],
                        current_objective_index: 0,
                        status: 'executing' as const,
                        failure_count: 0,
                        consecutive_failures_on_current: 0,
                        momentum: 0,
                        attack_attempt_count: 0,
                        objective_capture_count: 0,
                        movement_only_execution_turns: 0,
                        idle_execution_turn_streak: 0,
                    }],
                }] as any,
            } as any,
        };

        processJnaWithdrawals(state);
        const op = state.military.corps_command['vrs_herzegovina']!.active_operations[0];
        assert.ok(!op.participating_brigades.includes('jna_uzice_corps_tg' as any));
        assert.ok(op.participating_brigades.includes('rs_foa_brigade' as any));
        assert.ok(!op.axes![0]!.assigned_brigades.includes('jna_uzice_corps_tg' as any));
        assert.ok(op.axes![0]!.assigned_brigades.includes('rs_foa_brigade' as any));
    });
});

describe('JNA Phantom — Equipment Ceilings', () => {
    it('all expected equipment classes have ceilings', () => {
        for (const cls of ['mechanized', 'motorized', 'light_infantry', 'mountain', 'garrison', 'police', 'special']) {
            assert.ok(_EQUIPMENT_CEILINGS[cls], `Missing ceiling for ${cls}`);
        }
    });

    it('mechanized ceiling is highest', () => {
        assert.ok(_EQUIPMENT_CEILINGS['mechanized']!.max_tanks > _EQUIPMENT_CEILINGS['light_infantry']!.max_tanks);
    });
});
