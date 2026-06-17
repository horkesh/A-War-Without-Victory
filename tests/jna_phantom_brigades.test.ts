/**
 * Tests for JNA/HV phantom brigade spawn, withdrawal, and equipment handoff.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
    spawnJnaPhantomBrigades,
    processJnaWithdrawals,
    getJnaWithdrawalCountdowns,
    _JNA_PHANTOM_DEFS,
    _HV_PHANTOM_DEFS,
    _ALL_PHANTOM_DEFS,
    _EQUIPMENT_CEILINGS,
} from '../src/sim/combat/jna_phantom_brigades.js';
import { CURRENT_SCHEMA_VERSION, type FormationId, type FormationState, type FactionId, type GameState } from '../src/state/game_state.js';

function makeState(turn: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }, { id: 'HRHB' as FactionId }] as GameState['factions'],
        military: {
            formations: {},
            corps_command: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
        displacement: {} as any,
    } as GameState;
}

function phantomIdsByKind(state: GameState, kind: 'jna_phantom' | 'hv_phantom'): string[] {
    return Object.values(state.military.formations ?? {})
        .filter((f): f is FormationState => f != null && f.kind === kind)
        .map((f) => f.id)
        .sort();
}

function keepOnlyPhantoms(state: GameState, keepIds: string[]): void {
    const keep = new Set(keepIds);
    for (const [id, formation] of Object.entries(state.military.formations ?? {})) {
        if ((formation?.kind === 'jna_phantom' || formation?.kind === 'hv_phantom') && !keep.has(id)) {
            delete state.military.formations![id];
        }
    }
}

function addReceivingBrigade(state: GameState, overrides: Partial<FormationState> = {}): void {
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
        location_osid: 'op:visegrad:okrugla',
        equipment_class: 'light_infantry',
        composition: {
            infantry: 1500,
            tanks: 0,
            artillery: 2,
            aa_systems: 0,
            tank_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
            artillery_condition: { operational: 0.8, degraded: 0.15, non_operational: 0.05 },
        },
        ...overrides,
    } as FormationState;
}

function defsSpawnedByTurn(turn: number): typeof _ALL_PHANTOM_DEFS {
    return _ALL_PHANTOM_DEFS.filter((def) => ((def as { spawn_turn?: number }).spawn_turn ?? 0) <= turn);
}

describe('phantom spawn catalog', () => {
    it('spawns the full current JNA + HV phantom catalog', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);

        assert.equal(phantomIdsByKind(state, 'jna_phantom').length, _JNA_PHANTOM_DEFS.length);
        assert.equal(phantomIdsByKind(state, 'hv_phantom').length, defsSpawnedByTurn(0).filter((def) => def.kind_tag === 'hv_phantom').length);
        assert.equal(
            phantomIdsByKind(state, 'jna_phantom').length + phantomIdsByKind(state, 'hv_phantom').length,
            defsSpawnedByTurn(0).length
        );
    });

    it('representative phantom definitions match current engine truth', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);

        const uzice = state.military.formations!['jna_uzice_corps_tg']!;
        assert.equal(uzice.kind, 'jna_phantom');
        assert.equal(uzice.faction, 'RS');
        assert.equal(uzice.withdrawal_turn, 6);
        assert.equal(uzice.corps_id, 'vrs_herzegovina');
        assert.equal(uzice.location_osid, 'op:visegrad:okrugla');
        assert.equal(uzice.composition!.tanks, 30);
        assert.equal(uzice.composition!.artillery, 20);

        const ninthCorps = state.military.formations!['jna_9th_corps_tg']!;
        assert.equal(ninthCorps.withdrawal_turn, 4);
        assert.equal(ninthCorps.location_osid, 'op:kupres:bucovaca');
    });

    it('does not duplicate the catalog on re-spawn', () => {
        const state = makeState(0);
        spawnJnaPhantomBrigades(state);
        spawnJnaPhantomBrigades(state);

        assert.equal(
            phantomIdsByKind(state, 'jna_phantom').length + phantomIdsByKind(state, 'hv_phantom').length,
            defsSpawnedByTurn(0).length
        );
    });

    it('can seed startup setup control without emitting combat history', () => {
        const state = makeState(0);
        state.political.political_controllers = {
            'op:stolac:stolac_2': 'RBiH' as FactionId,
            'op:kupres:kupres_2': 'HRHB' as FactionId,
        };

        spawnJnaPhantomBrigades(state, { emitCaptureEvents: false });

        assert.equal(state.political.political_controllers['op:stolac:stolac_2'], 'RS');
        assert.equal(state.political.political_controllers['op:kupres:kupres_2'], 'RS');
        assert.deepEqual(state.political.control_events ?? [], []);
    });

    it('keeps default phantom capture events for turn-pipeline spawn history', () => {
        const state = makeState(0);
        state.political.political_controllers = {
            'op:stolac:stolac_2': 'RBiH' as FactionId,
        };

        spawnJnaPhantomBrigades(state);

        assert.equal(state.political.political_controllers['op:stolac:stolac_2'], 'RS');
        assert.ok((state.political.control_events ?? []).some((event) =>
            event.turn === 0
            && event.settlement_id === 'op:stolac:stolac_2'
            && event.mechanism === 'combat'
            && event.from === 'RBiH'
            && event.to === 'RS'
        ));
    });
});

describe('withdrawal countdowns', () => {
    it('reports countdowns for all active phantoms', () => {
        const state = makeState(2);
        spawnJnaPhantomBrigades(state);

        const notices = getJnaWithdrawalCountdowns(state);
        assert.equal(notices.length, defsSpawnedByTurn(2).length);

        const uzice = notices.find((n) => n.phantom_id === 'jna_uzice_corps_tg');
        const ninthCorps = notices.find((n) => n.phantom_id === 'jna_9th_corps_tg');
        assert.ok(uzice);
        assert.ok(ninthCorps);
        assert.equal(uzice!.turns_remaining, 4);
        assert.equal(ninthCorps!.turns_remaining, 2);
    });

    it('reports zero turns remaining at the real withdrawal turn', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);

        const notices = getJnaWithdrawalCountdowns(state);
        const ninthCorps = notices.find((n) => n.phantom_id === 'jna_9th_corps_tg');
        const uzice = notices.find((n) => n.phantom_id === 'jna_uzice_corps_tg');
        assert.ok(ninthCorps);
        assert.ok(uzice);
        assert.equal(ninthCorps!.turns_remaining, 0);
        assert.equal(uzice!.turns_remaining, 2);
    });
});

describe('withdrawal processing', () => {
    it('withdraws the current no-handoff phantom at turn 4', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        keepOnlyPhantoms(state, ['jna_9th_corps_tg']);

        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1);
        assert.equal(events[0]!.phantom_id, 'jna_9th_corps_tg');
        assert.equal(state.military.formations!['jna_9th_corps_tg'], undefined);
        assert.equal(state.military.corps_equipment_reserve, undefined);
    });

    it('withdraws every phantom already due if earlier turns were never processed', () => {
        const state = makeState(6);
        spawnJnaPhantomBrigades(state);

        const expectedDue = _ALL_PHANTOM_DEFS
            .filter((def) => def.withdrawal_turn <= 6)
            .map((def) => def.id)
            .sort();

        const events = processJnaWithdrawals(state);
        const withdrawnIds = events.map((event) => event.phantom_id).sort();
        assert.deepEqual(withdrawnIds, expectedDue);
    });
});

describe('equipment handoff', () => {
    it('distributes equipment from a handoff-enabled JNA phantom to an eligible brigade', () => {
        const state = makeState(6);
        spawnJnaPhantomBrigades(state);
        keepOnlyPhantoms(state, ['jna_uzice_corps_tg']);
        addReceivingBrigade(state);

        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1);

        const brigade = state.military.formations!['rs_foa_brigade']!;
        assert.ok(brigade.composition!.tanks > 0);
        assert.ok(brigade.composition!.artillery > 2);
        assert.ok(brigade.composition!.tanks <= _EQUIPMENT_CEILINGS['light_infantry']!.max_tanks + _EQUIPMENT_CEILINGS['light_infantry']!.max_apcs);
        assert.ok(brigade.composition!.artillery <= _EQUIPMENT_CEILINGS['light_infantry']!.max_artillery);
    });

    it('respects no-handoff phantoms even when an eligible brigade is present', () => {
        const state = makeState(4);
        spawnJnaPhantomBrigades(state);
        keepOnlyPhantoms(state, ['jna_9th_corps_tg']);
        addReceivingBrigade(state, {
            corps_id: 'vrs_2nd_krajina' as FormationId,
            location_osid: 'op:kupres:bucovaca',
        });

        processJnaWithdrawals(state);
        const brigade = state.military.formations!['rs_foa_brigade']!;
        assert.equal(brigade.composition!.tanks, 0);
        assert.equal(brigade.composition!.artillery, 2);
        assert.equal(state.military.corps_equipment_reserve, undefined);
    });

    it('sends excess equipment to reserve when no eligible brigade can receive it', () => {
        const state = makeState(6);
        spawnJnaPhantomBrigades(state);
        keepOnlyPhantoms(state, ['jna_uzice_corps_tg']);

        const events = processJnaWithdrawals(state);
        assert.equal(events.length, 1);
        const reserve = state.military.corps_equipment_reserve?.['vrs_herzegovina'];
        assert.ok(reserve);
        assert.ok(reserve!.tanks > 0);
        assert.ok(reserve!.artillery > 0);
    });

    it('removes a withdrawn phantom from active operation axes', () => {
        const state = makeState(6);
        spawnJnaPhantomBrigades(state);
        keepOnlyPhantoms(state, ['jna_uzice_corps_tg']);
        addReceivingBrigade(state);
        state.military.corps_command = {
            vrs_herzegovina: {
                stance: 'offensive' as any,
                active_operations: [{
                    name: 'Op Visegrad',
                    type: 'sector_attack',
                    phase: 'execution',
                    started_turn: 0,
                    phase_started_turn: 1,
                    participating_brigades: ['jna_uzice_corps_tg', 'rs_foa_brigade'],
                    objectives: ['op:visegrad:okrugla'],
                    current_objective_index: 0,
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    axes: [{
                        axis_id: 'main',
                        name: 'Main',
                        assigned_brigades: ['jna_uzice_corps_tg', 'rs_foa_brigade'],
                        objectives: ['op:visegrad:okrugla'],
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

describe('equipment ceilings', () => {
    it('keeps expected equipment-class ceiling coverage', () => {
        for (const cls of ['mechanized', 'motorized', 'light_infantry', 'mountain', 'garrison', 'police', 'special']) {
            assert.ok(_EQUIPMENT_CEILINGS[cls], `Missing ceiling for ${cls}`);
        }
    });

    it('still gives mechanized formations the highest tank ceiling', () => {
        assert.ok(_EQUIPMENT_CEILINGS['mechanized']!.max_tanks > _EQUIPMENT_CEILINGS['light_infantry']!.max_tanks);
    });
});
