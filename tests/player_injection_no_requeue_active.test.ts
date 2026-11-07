import assert from 'node:assert/strict';
import { describe, it } from 'vitest';

import {
    _ALL_PRE_PLANNED,
    injectPrePlannedOperations,
} from '../src/sim/combat/pre_planned_operations.js';
import type {
    CorpsCommandState,
    CorpsOperation,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

const CORPS_ID = 'arbih_1st_corps';
const TURN = 20;

const VISOKO = _ALL_PRE_PLANNED.find((def) => def.name === 'Visoko–Breza Line Clearing');
assert.ok(VISOKO);

/** Minimal RBiH 1st Corps state, following the fixture used by pre_planned_operations.test.ts. */
function makeCorpsState(activeOperationName: string): GameState {
    const defs = _ALL_PRE_PLANNED.filter((def) => def.corps === CORPS_ID && def.faction === 'RBiH');
    const formations: Record<string, FormationState> = {};
    const assignedBrigadeIds: string[] = [];

    for (const def of defs) {
        for (const axis of def.axes) {
            for (const brigadeId of axis.brigades) {
                if (formations[brigadeId]) continue;
                formations[brigadeId] = {
                    id: brigadeId,
                    name: brigadeId,
                    faction: def.faction,
                    kind: 'brigade',
                    status: 'active',
                    personnel: 1000,
                    corps_id: CORPS_ID,
                    location_osid: axis.staging_osid ?? def.staging_osid,
                } as FormationState;
                assignedBrigadeIds.push(brigadeId);
            }
        }
    }

    const politicalControllers: Record<string, string> = {};
    for (const def of defs) {
        politicalControllers[def.staging_osid] = 'RBiH';
        for (const axis of def.axes) {
            if (axis.staging_osid) politicalControllers[axis.staging_osid] = 'RBiH';
            for (const osid of axis.objectives) politicalControllers[osid] = 'RS';
        }
    }

    const command: CorpsCommandState = {
        command_span: 5,
        subordinate_count: 10,
        og_slots: 0,
        active_ogs: [],
        active_operations: [makeActiveOperation(activeOperationName)],
        corps_exhaustion: 0,
        stance: 'balanced',
    };

    return {
        meta: {
            turn: TURN,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'test',
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' },
            { id: 'RBiH' },
            { id: 'HRHB' },
        ] as GameState['factions'],
        military: {
            formations,
            corps_command: { [CORPS_ID]: command },
            corps_front_sectors: {
                [`sector:${CORPS_ID}:0`]: {
                    sector_id: `sector:${CORPS_ID}:0`,
                    corps_id: CORPS_ID,
                    assigned_brigade_ids: assignedBrigadeIds,
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: [],
                },
            },
        } as any,
        political: {
            political_controllers: politicalControllers,
        } as any,
    } as unknown as GameState;
}

function makeActiveOperation(name: string): CorpsOperation {
    return {
        name,
        type: 'sector_attack',
        phase: 'execution',
        is_pre_planned: true,
        started_turn: 8,
        phase_started_turn: 8,
        participating_brigades: [],
        objectives: [],
        current_objective_index: 0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
    } as CorpsOperation;
}

describe('player pre-planned injection queueing', () => {
    it('does not re-queue a deferred pre-planned operation that is already active', () => {
        const state = makeCorpsState(VISOKO.name);
        const command = state.military.corps_command![CORPS_ID]!;
        assert.equal(
            command.active_operations.some((op) => op.name === VISOKO.name),
            true,
            'fixture must leave the deferred definition active',
        );
        assert.equal(
            command.queued_operations?.includes(VISOKO.name) ?? false,
            false,
            'fixture must not already queue the active definition',
        );

        injectPrePlannedOperations(state, undefined, { faction: VISOKO.faction });

        assert.equal(
            command.queued_operations?.includes(VISOKO.name) ?? false,
            false,
            'a running operation must not be appended to its own corps queue',
        );
    });

    it('still queues a deferred pre-planned operation that is neither active nor queued nor resolved', () => {
        const state = makeCorpsState('Blocking Operation');
        const command = state.military.corps_command![CORPS_ID]!;
        assert.equal(
            command.active_operations.some((op) => op.name === VISOKO.name),
            false,
            'fixture must not leave the deferred definition active',
        );
        assert.equal(
            command.queued_operations?.includes(VISOKO.name) ?? false,
            false,
            'fixture must not already queue the deferred definition',
        );

        injectPrePlannedOperations(state, undefined, { faction: VISOKO.faction });

        assert.equal(
            command.queued_operations?.includes(VISOKO.name),
            true,
            'a deferred operation that is not running must still enter the queue',
        );
    });
});
