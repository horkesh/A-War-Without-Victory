import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import { checkTriggeredOperations, _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type {
    CorpsCommandState,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';
import { makeSector } from './test_factories.js';

function makeFormation(id: string, corpsId: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        personnel: 1000,
        corps_id: corpsId,
        location_osid: 'op:test:test',
        ...overrides,
    } as FormationState;
}

function makeCorpsCmd(overrides: Partial<CorpsCommandState> = {}): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 10,
        og_slots: 0,
        active_ogs: [],
        active_operations: [],
        corps_exhaustion: 0,
        stance: 'balanced',
        ...overrides,
    };
}

function makeState(turn: number): GameState {
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};
    const corpsFrontSectors: Record<string, ReturnType<typeof makeSector>> = {};

    const allCorpsIds = [...new Set(_TRIGGERED_OPS.flatMap((def) => [def.primary_corps, ...def.axes.map((axis) => axis.corps)]))];
    for (const corpsId of allCorpsIds) {
        corpsCommand[corpsId] = makeCorpsCmd();
        corpsFrontSectors[`sector:${corpsId}:0`] = makeSector({
            sector_id: `sector:${corpsId}:0`,
            corps_id: corpsId,
            faction: 'RS' as FactionId,
            opposing_factions: ['RBiH' as FactionId],
            edge_ids: [],
            assigned_brigade_ids: [],
            reserve_brigade_ids: [],
            length_edges: 1,
            territory_osids: [],
        });
    }

    for (const def of _TRIGGERED_OPS) {
        for (const axisDef of def.axes) {
            for (const brigadeId of axisDef.brigades) {
                if (formations[brigadeId]) continue;
                formations[brigadeId] = makeFormation(brigadeId, axisDef.corps, {
                    location_osid: axisDef.staging_osid ?? def.staging_osid,
                });
                corpsFrontSectors[`sector:${axisDef.corps}:0`]!.assigned_brigade_ids.push(brigadeId);
            }
        }
    }

    const politicalControllers: Record<string, string> = {};
    for (const def of _TRIGGERED_OPS) {
        for (const axisDef of def.axes) {
            politicalControllers[axisDef.staging_osid ?? def.staging_osid] = 'RS';
            for (const osid of axisDef.objectives) {
                politicalControllers[osid] = 'RBiH';
            }
        }
    }

    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        military: {
            formations,
            corps_command: corpsCommand,
            corps_front_sectors: corpsFrontSectors,
            front_segments: {},
            front_posture: {},
            front_pressure: {},
        } as any,
        political: {
            political_controllers: politicalControllers,
        } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

describe('triggered operations definitions', () => {
    it('defines the current triggered operation catalog', () => {
        // Operation Sana migrated to the opportunity catalog (LANE B Phase 3,
        // 2026-05-01). Its coverage now lives in
        // tests/operation_opportunities_5th_corps_sana.test.ts.
        // ADR-0005 v3.0 (2026-05-29): Vozuća 94 + Lukavac 93 added as army_hq_only
        // RBiH defs (net-new; only fire via the inject-army-hq-operations step when
        // ENABLE_TG_ARMY_HQ_OPS is on). Inserted after Krivaja-95, before Stupčanica-95.
        assert.equal(_TRIGGERED_OPS.length, 8);
        assert.deepEqual(
            _TRIGGERED_OPS.map((def) => def.name),
            [
                'Operation Posavina Corridor',
                'Operation Herzegovina Consolidation',
                'Operation Kotor Varos',
                'Operation Cerska-Kamenica',
                'Operation Krivaja-95',
                'Operation Vozuća 94',
                'Operation Lukavac 93',
                'Operation Stupčanica-95',
            ],
        );
    });

    it('keeps Posavina as a single-corps follow-on and Herzegovina as a dual-axis consolidation', () => {
        const posavina = _TRIGGERED_OPS.find((def) => def.name === 'Operation Posavina Corridor')!;
        const herzegovina = _TRIGGERED_OPS.find((def) => def.name === 'Operation Herzegovina Consolidation')!;

        assert.deepEqual(new Set(posavina.axes.map((axis) => axis.corps)), new Set(['vrs_1st_krajina']));
        assert.equal(herzegovina.axes.length, 2);
        assert.deepEqual(new Set(herzegovina.axes.map((axis) => axis.corps)), new Set(['vrs_herzegovina']));
    });
});

describe('checkTriggeredOperations', () => {
    it('injects Posavina Corridor after Operation Corridor is complete', () => {
        const state = makeState(5);
        state.operation_history = [{
            corps_id: 'vrs_1st_krajina',
            operation_name: 'Operation Corridor',
        } as any];

        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Posavina Corridor'));
        const posavina = state.military.corps_command!['vrs_1st_krajina']!.active_operations[0];
        assert.equal(posavina?.sector_id, 'sector:vrs_1st_krajina:0');
    });

    it('does not inject Posavina when the primary corps already has an active operation', () => {
        const state = makeState(5);
        state.operation_history = [{
            corps_id: 'vrs_1st_krajina',
            operation_name: 'Operation Corridor',
        } as any];
        state.military.corps_command!['vrs_1st_krajina']!.active_operations = [{ name: 'Test Op', type: 'sector_attack', phase: 'execution' } as any];

        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Posavina Corridor'));
        assert.deepEqual(state.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Posavina Corridor'), {
            operation_id: '',
            operation_name: 'Operation Posavina Corridor',
            canonical_window: '5',
            catalog_status: 'present',
            eligibility_status: 'unknown',
            launch_status: 'not_launched',
            delivery_status: 'unknown',
            blocker_code: 'active_primary_corps',
            typed_blocker: 'active_primary_corps',
            turn: 5,
        });
    });

    it('injects Herzegovina Consolidation once the corps finishes its earlier chain', () => {
        const state = makeState(12);
        state.operation_history = [
            {
                corps_id: 'vrs_herzegovina',
                operation_name: 'Operation Visegrad',
            } as any,
            {
                corps_id: 'vrs_herzegovina',
                operation_name: 'Operation Foca',
            } as any,
        ];
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Herzegovina Consolidation'));

        const op = state.military.corps_command!['vrs_herzegovina']!.active_operations[0];
        assert.equal(op?.name, 'Operation Herzegovina Consolidation');
        assert.equal(op?.sector_id, 'sector:vrs_herzegovina:0');
        assert.equal(op?.axes?.length, 2);
    });

    it('does not inject Herzegovina Consolidation before Visegrad and Foca are recorded complete', () => {
        const state = makeState(12);

        const injected = checkTriggeredOperations(state);

        assert.ok(!injected.includes('Operation Herzegovina Consolidation'));
        assert.equal(state.military.corps_command!['vrs_herzegovina']!.active_operations.length, 0);
    });

    it('injects Kotor Varos at turn 10', () => {
        const state = makeState(10);
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Kotor Varos'));
    });

    it('does not inject Kotor Varos once every objective is already RS-controlled', () => {
        const state = makeState(10);
        state.political.political_controllers!['op:kotor_varos:kotor_varos_2'] = 'RS';
        state.political.political_controllers!['op:kotor_varos:vrbanjci_2'] = 'RS';
        state.political.political_controllers!['op:kotor_varos:prisocka_2'] = 'RS';

        const injected = checkTriggeredOperations(state);

        assert.ok(!injected.includes('Operation Kotor Varos'));
        assert.equal(state.military.corps_command!['vrs_1st_krajina']!.active_operations.length, 0);
        assert.deepEqual(state.military.op_injection_warnings ?? [], []);
        assert.deepEqual(state.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Kotor Varos'), {
            operation_id: '',
            operation_name: 'Operation Kotor Varos',
            canonical_window: '10',
            catalog_status: 'present',
            eligibility_status: 'unknown',
            launch_status: 'not_launched',
            delivery_status: 'unknown',
            blocker_code: 'already_owned_objectives',
            typed_blocker: 'already_owned_objectives',
            turn: 10,
        });
    });

    it('does not inject Kotor Varos before turn 10', () => {
        const state = makeState(9);
        const injected = checkTriggeredOperations(state);
        assert.ok(!injected.includes('Operation Kotor Varos'));
    });

    it('injects Cerska-Kamenica at turn 40', () => {
        const state = makeState(40);
        state.military.corps_command!['vrs_herzegovina']!.active_operations = [{ name: 'x' } as any];
        state.military.corps_command!['vrs_1st_krajina']!.active_operations = [{ name: 'y' } as any];
        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Cerska-Kamenica'));

        const op = state.military.corps_command!['vrs_drina']!.active_operations[0];
        assert.equal(op?.sector_id, 'sector:vrs_drina:0');
        assert.deepEqual(state.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Cerska-Kamenica'), {
            operation_id: 'Operation Cerska-Kamenica',
            operation_name: 'Operation Cerska-Kamenica',
            canonical_window: '40',
            catalog_status: 'present',
            eligibility_status: 'eligible',
            launch_status: 'launched',
            delivery_status: 'unknown',
            blocker_code: '',
            typed_blocker: '',
            turn: 40,
        });
    });

    it('does not inject the same triggered operation twice', () => {
        const state = makeState(10);
        const first = checkTriggeredOperations(state);
        assert.ok(first.includes('Operation Kotor Varos'));

        const second = checkTriggeredOperations(state);
        assert.ok(!second.includes('Operation Kotor Varos'));
    });

    it('respects decline cooldown and permanent dismissal', () => {
        const inCooldown = makeState(20);
        inCooldown.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 15, decline_count: 1 },
        };
        assert.ok(!checkTriggeredOperations(inCooldown).includes('Operation Kotor Varos'));
        assert.equal(
            inCooldown.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Kotor Varos')?.blocker_code,
            'cooldown_decline_state',
        );

        const reoffered = makeState(24);
        reoffered.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 15, decline_count: 1 },
        };
        assert.ok(checkTriggeredOperations(reoffered).includes('Operation Kotor Varos'));

        const permanentlyDeclined = makeState(50);
        permanentlyDeclined.military.declined_operations = {
            'Operation Kotor Varos': { declined_turn: 40, decline_count: 3 },
        };
        assert.ok(!checkTriggeredOperations(permanentlyDeclined).includes('Operation Kotor Varos'));
        assert.equal(
            permanentlyDeclined.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Kotor Varos')?.blocker_code,
            'cooldown_decline_state',
        );
    });

    it('persists non-blocking validation warnings in watched-operation traces', () => {
        const state = makeState(170);
        state.military.triggered_operations_accepted = {
            'Operation Cerska-Kamenica': 40,
        };
        state.military.formations!['rs_skelani_battalion']!.status = 'inactive';
        state.military.formations!['rs_skelani_battalion']!.personnel = 0;

        checkTriggeredOperations(state);

        const warningRow = state.military.watched_operations?.find((row: any) =>
            row.operation_name === 'Operation Krivaja-95'
            && row.blocker_code === 'brigade_ineligible'
        );
        assert.deepEqual(warningRow, {
            operation_id: '',
            operation_name: 'Operation Krivaja-95',
            canonical_window: '170-178',
            catalog_status: 'present',
            eligibility_status: 'unknown',
            launch_status: 'unknown',
            delivery_status: 'unknown',
            blocker_code: 'brigade_ineligible',
            typed_blocker: 'brigade_ineligible',
            turn: 170,
        });
    });

    it('persists typed build-failure detail when no triggered axis can be built', () => {
        const state = makeState(10);
        for (const brigadeId of ['rs_1st_kotor_varo_light_infantry', 'rs_12th_kotorsko_light_infantry', 'rs_22nd_krajina_infantry']) {
            state.military.formations![brigadeId]!.personnel = 1;
        }

        const injected = checkTriggeredOperations(state);

        assert.ok(!injected.includes('Operation Kotor Varos'));
        assert.equal(
            state.military.watched_operations?.find((row: any) => row.operation_name === 'Operation Kotor Varos')?.blocker_code,
            'build_no_built_axes',
        );
    });

    it('persists launch-feasibility power inputs for defender-power build blockers', () => {
        const state = makeState(10);
        const objectives = [
            'op:kotor_varos:kotor_varos_2',
            'op:kotor_varos:prisocka_2',
            'op:kotor_varos:vrbanjci_2',
        ];
        state.military.formations!['arbih_kotor_varos_defender'] = makeFormation('arbih_kotor_varos_defender', 'arbih_1st_corps', {
            faction: 'RBiH' as FactionId,
            personnel: 100000,
            location_osid: objectives[0],
        });
        state.military.corps_front_sectors!['sector:arbih_1st_corps:0'] = makeSector({
            sector_id: 'sector:arbih_1st_corps:0',
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH' as FactionId,
            opposing_factions: ['RS' as FactionId],
            edge_ids: ['edge:kotor_varos'],
            friendly_osids: objectives,
            assigned_brigade_ids: ['arbih_kotor_varos_defender'],
            length_edges: 1,
        });

        const injected = checkTriggeredOperations(state);
        const row = state.military.watched_operations?.find((traceRow: any) => traceRow.operation_name === 'Operation Kotor Varos');

        assert.ok(!injected.includes('Operation Kotor Varos'));
        assert.ok(row);
        assert.equal(row.blocker_code, 'build_defender_power_too_high');
        assert.equal(row.launch_objective_osid, 'op:kotor_varos:kotor_varos_2');
        assert.equal(row.launch_primary_defender_id, 'arbih_kotor_varos_defender');
        assert.equal(row.launch_defender_count, 1);
        assert.deepEqual(row.launch_defender_ids, ['arbih_kotor_varos_defender']);
        assert.equal(row.launch_defender_power_by_id?.[0]?.formation_id, 'arbih_kotor_varos_defender');
        assert.equal(row.launch_defender_power_by_id?.[0]?.power, row.launch_defender_power_by_id?.[0]?.stacked_power);
        assert.equal(typeof row.launch_defender_power_by_id?.[0]?.breakdown?.base, 'number');
        assert.equal(typeof row.launch_defender_power_by_id?.[0]?.breakdown?.final_env_mult, 'number');
        assert.equal(Object.prototype.hasOwnProperty.call(row.launch_defender_power_by_id?.[0]?.breakdown ?? {}, 'power'), false);
        assert.equal(typeof row.launch_feasibility_ratio, 'number');
        assert.equal(typeof row.launch_attacker_power, 'number');
        assert.equal(typeof row.launch_defender_power, 'number');
        const attackerPower = row.launch_attacker_power ?? 0;
        const defenderPower = row.launch_defender_power ?? 0;
        assert.ok(defenderPower > attackerPower);
    });

    it('filters already-controlled objectives without dropping a viable triggered axis', () => {
        const state = makeState(40);
        state.military.corps_command!['vrs_herzegovina']!.active_operations = [{ name: 'x' } as any];
        state.military.corps_command!['vrs_1st_krajina']!.active_operations = [{ name: 'y' } as any];
        state.political.political_controllers!['op:srebrenica:brezovice_2'] = 'RS';

        const injected = checkTriggeredOperations(state);
        assert.ok(injected.includes('Operation Cerska-Kamenica'));

        const cerskaOp = state.military.corps_command!['vrs_drina']!.active_operations[0];
        const cerskaAxis = cerskaOp!.axes!.find((axis) => axis.axis_id === 'cerska_pocket');
        assert.ok(cerskaAxis);
        assert.ok(!cerskaAxis!.objectives.includes('op:srebrenica:brezovice_2'));
        assert.ok(cerskaAxis!.objectives.length > 0);
    });

    it('does not warn for a triggered axis whose objectives are already controlled when another axis remains viable', () => {
        const state = makeState(40);
        state.military.corps_command!['vrs_herzegovina']!.active_operations = [{ name: 'x' } as any];
        state.military.corps_command!['vrs_1st_krajina']!.active_operations = [{ name: 'y' } as any];
        state.political.political_controllers!['op:srebrenica:brezovice_2'] = 'RS';
        state.political.political_controllers!['op:srebrenica:mala_daljegosta_2'] = 'RS';

        const injected = checkTriggeredOperations(state);

        assert.ok(injected.includes('Operation Cerska-Kamenica'));
        const cerskaOp = state.military.corps_command!['vrs_drina']!.active_operations[0];
        assert.ok(!cerskaOp!.axes!.some((axis) => axis.axis_id === 'cerska_pocket'));
        assert.ok(cerskaOp!.axes!.some((axis) => axis.axis_id === 'kamenica'));
        assert.equal((state.military.op_injection_warnings ?? []).length, 0);
    });

    it('injects Herzegovina Consolidation without brigade-missing warnings once its chain is complete', () => {
        const state = makeState(12);
        state.operation_history = [
            { corps_id: 'vrs_herzegovina', operation_name: 'Operation Visegrad' } as any,
            { corps_id: 'vrs_herzegovina', operation_name: 'Operation Foca' } as any,
        ];

        const injected = checkTriggeredOperations(state);

        assert.ok(injected.includes('Operation Herzegovina Consolidation'));
        const warnings = state.military.op_injection_warnings ?? [];
        assert.equal(warnings.some((warning: any) => warning.op_name === 'Operation Herzegovina Consolidation' && warning.check === 'brigade_missing'), false);
    });
});
