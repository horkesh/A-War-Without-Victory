import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
    findBrigadeOperation,
    findBrigadeOperationAnywhere,
    getBrigadeExecutionAttackPowerMult,
} from '../src/sim/combat/corps_operation_helpers.js';
import { getOperationsMult } from '../src/sim/combat/combat_math.js';
import {
    generateAllBotOrdersOsid,
    isPinnedActiveOperationAttacker,
} from '../src/sim/combat/bot_brigade_ai_osid.js';
import type {
    CorpsCommandState,
    CorpsOperation,
    FormationId,
    GameState,
} from '../src/state/game_state.js';

const CORPS = 'vrs_drina';
const FOREIGN_CORPS = 'vrs_foreign';
const BRIGADE = 'brig_shadow';
const LOCATION = 'op:bratunac:slapasnica';
const REAR = 'op:bratunac:rear';
const STAGING = 'op:bratunac:polom';
const TARGET = 'op:bratunac:bratunac_2';

function makeOperation(
    phase: CorpsOperation['phase'],
    name: string,
    overrides: Partial<CorpsOperation> = {},
): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase,
        started_turn: 0,
        phase_started_turn: 1,
        participating_brigades: [BRIGADE],
        objectives: [TARGET],
        current_objective_index: 0,
        planning_duration: 1,
        supply_readiness: 1,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: STAGING,
        execution_attack_power_mult: 1.6,
        ...overrides,
    } as CorpsOperation;
}

function makeCmd(activeOperations: CorpsOperation[]): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 10,
        og_slots: 0,
        active_ogs: [],
        active_operations: activeOperations,
        corps_exhaustion: 0,
        stance: 'offensive',
    } as CorpsCommandState;
}

function makeState(
    corpsCommand: Record<string, CorpsCommandState>,
    brigadeCorps = CORPS,
    location = LOCATION,
): GameState {
    return {
        meta: { turn: 2, phase: 'war', seed: 'recovery-shadowing' },
        corps_front_directives: {},
        military: {
            formations: {
                [BRIGADE]: {
                    id: BRIGADE,
                    name: BRIGADE,
                    kind: 'brigade',
                    faction: 'RS',
                    status: 'active',
                    corps_id: brigadeCorps,
                    home_defense_active: true,
                    posture: 'defend',
                    cohesion: 70,
                    morale: 70,
                    personnel: 1000,
                    equipment: { infantry: 1000, tanks: 0, artillery: 0, air_defense: 0 },
                    location_osid: location,
                },
            },
            corps_command: corpsCommand,
            brigade_posture_orders: [],
        },
        political: {
            political_controllers: {
                [REAR]: 'RS',
                [LOCATION]: 'RS',
                [STAGING]: 'RS',
                [TARGET]: 'RBiH',
            },
        },
    } as unknown as GameState;
}

function botContext(location = LOCATION) {
    const edges = location === REAR
        ? [
            { edge_id: 'e1', a: REAR, b: STAGING },
            { edge_id: 'e2', a: STAGING, b: TARGET },
        ]
        : [
            { edge_id: 'e1', a: LOCATION, b: TARGET },
            { edge_id: 'e2', a: LOCATION, b: STAGING },
            { edge_id: 'e3', a: STAGING, b: TARGET },
        ];
    const adjacency = location === REAR
        ? new Map<string, string[]>([
            [REAR, [STAGING]],
            [STAGING, [REAR, TARGET]],
            [TARGET, [STAGING]],
        ])
        : new Map<string, string[]>([
            [LOCATION, [TARGET, STAGING]],
            [TARGET, [LOCATION, STAGING]],
            [STAGING, [LOCATION, TARGET]],
        ]);
    return {
        edges: edges as never,
        reverseMap: new Map() as never,
        adjacency: adjacency as never,
        supplyStateByOsid: {} as never,
        osidPopulationMap: new Map() as never,
    };
}

function generate(state: GameState, location = LOCATION): void {
    generateAllBotOrdersOsid(state, ['RS'], botContext(location));
}

function formationOf(state: GameState) {
    return state.military.formations![BRIGADE]!;
}

describe('operation recovery shadowing readers', () => {
    it('prefers a later planning/execution match over an earlier recovery match in the corps array', () => {
        const recovery = makeOperation('recovery', 'Recovery first');
        const planning = makeOperation('planning', 'Planning second');
        const cmd = makeCmd([recovery, planning]);
        const state = makeState({ [CORPS]: cmd });

        assert.equal(findBrigadeOperation(cmd, BRIGADE), planning);
        assert.equal(findBrigadeOperationAnywhere(state, BRIGADE)?.op, planning);
        assert.equal(getOperationsMult(state, formationOf(state)), 1);
        assert.equal(getBrigadeExecutionAttackPowerMult(state, BRIGADE as FormationId), 1);
    });

    it('does not rank execution above planning among live matches', () => {
        const planning = makeOperation('planning', 'Planning first');
        const execution = makeOperation('execution', 'Execution second');

        const planningFirst = makeState({ [CORPS]: makeCmd([planning, execution]) });
        assert.equal(findBrigadeOperationAnywhere(planningFirst, BRIGADE)?.op, planning);
        assert.equal(getOperationsMult(planningFirst, formationOf(planningFirst)), 1);
        assert.equal(getBrigadeExecutionAttackPowerMult(planningFirst, BRIGADE as FormationId), 1);

        const executionFirst = makeState({ [CORPS]: makeCmd([execution, planning]) });
        assert.equal(findBrigadeOperationAnywhere(executionFirst, BRIGADE)?.op, execution);
        assert.equal(getOperationsMult(executionFirst, formationOf(executionFirst)), 1.3);
        assert.equal(getBrigadeExecutionAttackPowerMult(executionFirst, BRIGADE as FormationId), 1.6);
    });

    it('does not let an earlier recovery operation hide a later planning march', () => {
        const recovery = makeOperation('recovery', 'Recovery first');
        const planning = makeOperation('planning', 'Planning second');
        const state = makeState({ [CORPS]: makeCmd([recovery, planning]) }, CORPS, REAR);

        generate(state, REAR);

        const movement = state.military.brigade_movement_orders?.[BRIGADE];
        assert.ok(movement, 'planning participant must receive a march order, not recovery defend-only');
        assert.equal(movement!.stance, 'column');
        assert.equal(movement!.destination_sids.length, 1);
        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], undefined);
    });

    it('does not let an earlier recovery operation hide a later executing attack', () => {
        const recovery = makeOperation('recovery', 'Recovery first');
        const execution = makeOperation('execution', 'Execution second');
        const state = makeState({ [CORPS]: makeCmd([recovery, execution]) });

        generate(state);

        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], TARGET);
        assert.equal(isPinnedActiveOperationAttacker(state, BRIGADE as FormationId), true);
        assert.equal(getOperationsMult(state, formationOf(state)), 1.3);
        assert.equal(getBrigadeExecutionAttackPowerMult(state, BRIGADE as FormationId), 1.6);
    });

    it('keeps the live execution visible when the array order is reversed', () => {
        const execution = makeOperation('execution', 'Execution first');
        const recovery = makeOperation('recovery', 'Recovery second');
        const state = makeState({ [CORPS]: makeCmd([execution, recovery]) });

        generate(state);

        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], TARGET);
        assert.equal(isPinnedActiveOperationAttacker(state, BRIGADE as FormationId), true);
    });

    it('retains recovery-only defend and multiplier behavior', () => {
        const recovery = makeOperation('recovery', 'Recovery only');
        const state = makeState({ [CORPS]: makeCmd([recovery]) });

        generate(state);

        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], undefined);
        assert.equal(state.military.brigade_movement_orders?.[BRIGADE], undefined);
        assert.ok(state.military.brigade_posture_orders?.some(
            (order) => order.brigade_id === BRIGADE && order.posture === 'defend',
        ));
        assert.equal(getOperationsMult(state, formationOf(state)), 0.6);
        assert.equal(getBrigadeExecutionAttackPowerMult(state, BRIGADE as FormationId), 1);
    });

    it('retains live/live array precedence in the actual bot path', () => {
        const planning = makeOperation('planning', 'Planning first');
        const execution = makeOperation('execution', 'Execution second');
        const planningFirst = makeState({ [CORPS]: makeCmd([planning, execution]) }, CORPS, REAR);
        generate(planningFirst, REAR);
        assert.ok(planningFirst.military.brigade_movement_orders?.[BRIGADE]);
        assert.equal(planningFirst.military.brigade_attack_orders?.[BRIGADE], undefined);

        const executionFirst = makeState({ [CORPS]: makeCmd([execution, planning]) });
        generate(executionFirst);
        assert.equal(executionFirst.military.brigade_attack_orders?.[BRIGADE], TARGET);
    });

    it('does not let corps-local recovery hide a foreign-corps executing mission', () => {
        const localRecovery = makeOperation('recovery', 'Local recovery');
        const foreignExecution = makeOperation('execution', 'Foreign execution');
        const localCmd = makeCmd([localRecovery]);
        const state = makeState({
            [CORPS]: localCmd,
            [FOREIGN_CORPS]: makeCmd([foreignExecution]),
        });

        assert.equal(findBrigadeOperation(localCmd, BRIGADE), localRecovery);
        assert.equal(findBrigadeOperationAnywhere(state, BRIGADE)?.op, foreignExecution);

        generate(state);

        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], TARGET);
        assert.equal(isPinnedActiveOperationAttacker(state, BRIGADE as FormationId), true);
        assert.equal(getOperationsMult(state, formationOf(state)), 1.3);
        assert.equal(getBrigadeExecutionAttackPowerMult(state, BRIGADE as FormationId), 1.6);
    });

    it('does not let corps-local recovery hide a foreign-corps planning march', () => {
        const localRecovery = makeOperation('recovery', 'Local recovery');
        const foreignPlanning = makeOperation('planning', 'Foreign planning');
        const state = makeState({
            [CORPS]: makeCmd([localRecovery]),
            [FOREIGN_CORPS]: makeCmd([foreignPlanning]),
        }, CORPS, REAR);

        generate(state, REAR);

        assert.ok(state.military.brigade_movement_orders?.[BRIGADE]);
        assert.equal(state.military.brigade_attack_orders?.[BRIGADE], undefined);
        assert.equal(getOperationsMult(state, formationOf(state)), 1);
        assert.equal(getBrigadeExecutionAttackPowerMult(state, BRIGADE as FormationId), 1);
    });

    it('preserves empty and malformed reader guards', () => {
        assert.equal(
            findBrigadeOperationAnywhere(
                { meta: { turn: 1 }, military: { corps_command: {} } } as unknown as GameState,
                BRIGADE,
            ),
            null,
        );
        assert.equal(
            findBrigadeOperationAnywhere(
                { meta: { turn: 1 }, military: {} } as unknown as GameState,
                BRIGADE,
            ),
            null,
        );
        assert.equal(findBrigadeOperation(makeCmd([]), BRIGADE), null);

        const malformed = { name: 'Malformed', type: 'sector_attack', phase: 'planning' } as CorpsOperation;
        const validPlanning = makeOperation('planning', 'Valid planning');
        const state = makeState({ [CORPS]: makeCmd([malformed, validPlanning]) });
        assert.equal(findBrigadeOperationAnywhere(state, BRIGADE)?.op, validPlanning);
    });
});
