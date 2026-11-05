/**
 * Player-faction prestage gates must follow staff control, not raw player ownership.
 *
 * At autonomy >= 1 the player's staff executes already-authorized historical
 * plans, so the three authored-concentration gates must not skip merely because
 * the operation belongs to the player faction. They skip only when the faction
 * is not staff-controlled, i.e. a manually played faction at autonomy 0.
 */

import { describe, expect, it } from 'vitest';

import {
    getQueuedDatedPrestageBrigadeIds,
    prestageDeferredPrePlannedElites,
} from '../src/sim/combat/pre_planned_operations.js';
import {
    _TRIGGERED_OPS,
    checkTriggeredOperations,
} from '../src/sim/combat/triggered_operations.js';
import type {
    CorpsCommandState,
    FactionId,
    FormationState,
    GameState,
} from '../src/state/game_state.js';

const CIRCLE_BRIGADES = [
    'arbih_801st_light',
    'arbih_802nd_light',
    'arbih_831st_drina_lineage',
] as const;
const CIRCLE_STAGING = 'op:gorazde:osjecani_2';

function makeCorpsCommand(overrides: Partial<CorpsCommandState> = {}): CorpsCommandState {
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

function makeFormation(id: string, corpsId: string, locationOsid: string): FormationState {
    return {
        id,
        name: id,
        faction: 'RS' as FactionId,
        kind: 'brigade',
        status: 'active',
        personnel: 1000,
        corps_id: corpsId,
        location_osid: locationOsid,
    } as FormationState;
}

interface PrePlannedGateOptions {
    readonly turn?: number;
    readonly playerFaction?: FactionId | null;
    readonly autonomyLevel?: number;
}

/** Minimal Operation Circle fixture: only the authored brigades, away from staging. */
function makeCircleState(options: PrePlannedGateOptions = {}): GameState {
    const {
        turn = 14,
        playerFaction = 'RBiH',
        autonomyLevel = 2,
    } = options;
    const formations: Record<string, FormationState> = {};
    for (const brigadeId of CIRCLE_BRIGADES) {
        formations[brigadeId] = {
            ...makeFormation(brigadeId, 'arbih_1st_corps', `op:test:remote_${brigadeId}`),
            faction: 'RBiH' as FactionId,
        };
    }

    return {
        meta: {
            turn,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'player-staff-prestage-gates',
            player_faction: playerFaction,
            autonomy_level: autonomyLevel,
        } as unknown as GameState['meta'],
        factions: [
            { id: 'RS' as FactionId },
            { id: 'RBiH' as FactionId },
            { id: 'HRHB' as FactionId },
        ] as GameState['factions'],
        military: {
            formations,
            corps_command: { arbih_1st_corps: makeCorpsCommand() },
            brigade_movement_orders: {},
            brigade_movement_state: {},
        } as unknown as GameState['military'],
        political: { political_controllers: {} } as unknown as GameState['political'],
        operation_history: [],
    } as unknown as GameState;
}

interface TriggeredGateOptions {
    readonly playerFaction?: FactionId | null;
    readonly autonomyLevel?: number;
}

/**
 * Minimal triggered-op fixture with the Cerska-Kamenica Main Staff elites at
 * Army HQ, mirroring the existing triggered prestage test.
 */
function makeTriggeredState(options: TriggeredGateOptions = {}): GameState {
    const {
        playerFaction = 'RS',
        autonomyLevel = 2,
    } = options;
    const formations: Record<string, FormationState> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    const allCorpsIds = [...new Set(_TRIGGERED_OPS.flatMap((def) => [
        def.primary_corps,
        ...def.axes.map((axis) => axis.corps),
    ]))];
    for (const corpsId of allCorpsIds) {
        corpsCommand[corpsId] = makeCorpsCommand();
    }

    for (const def of _TRIGGERED_OPS) {
        for (const axis of def.axes) {
            for (const brigadeId of axis.brigades) {
                if (formations[brigadeId]) continue;
                formations[brigadeId] = makeFormation(
                    brigadeId,
                    axis.corps,
                    axis.staging_osid ?? def.staging_osid,
                );
            }
        }
    }

    for (const brigadeId of ['rs_1st_guards_motorized', 'rs_65th_protection_motorized_regiment']) {
        formations[brigadeId] = makeFormation(
            brigadeId,
            'vrs_main_staff',
            'op:hanpijesak:han_pijesak_2',
        );
    }

    return {
        meta: {
            turn: 28,
            phase: 'war',
            scenario_start_date: { year: 1992, month: 4, day: 6 },
            seed: 'player-staff-prestage-gates',
            player_faction: playerFaction,
            autonomy_level: autonomyLevel,
        } as unknown as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        military: {
            formations,
            corps_command: corpsCommand,
            brigade_movement_orders: {},
            brigade_movement_state: {},
        } as unknown as GameState['military'],
        political: { political_controllers: {} } as unknown as GameState['political'],
        operation_history: [],
    } as unknown as GameState;
}

describe('player staff prestage gate: preplanned concentration march', () => {
    it('moves the player-faction authored concentration at autonomy 2', () => {
        const state = makeCircleState({ playerFaction: 'RBiH', autonomyLevel: 2 });

        prestageDeferredPrePlannedElites(state);

        expect(state.military.brigade_movement_orders?.arbih_801st_light).toEqual({
            destination_sids: [CIRCLE_STAGING],
            stance: 'column',
            owner: 'authored_preplanned',
        });
        expect(state.military.brigade_movement_orders?.arbih_802nd_light).toEqual({
            destination_sids: [CIRCLE_STAGING],
            stance: 'column',
            owner: 'authored_preplanned',
        });
    });

    it('still skips the player-faction authored concentration at autonomy 0', () => {
        const state = makeCircleState({ playerFaction: 'RBiH', autonomyLevel: 0 });

        prestageDeferredPrePlannedElites(state);

        expect(state.military.brigade_movement_orders?.arbih_801st_light).toBeUndefined();
        expect(state.military.brigade_movement_orders?.arbih_802nd_light).toBeUndefined();
    });

    it('keeps concentrating a non-player faction at autonomy 0', () => {
        const state = makeCircleState({ playerFaction: 'RS', autonomyLevel: 0 });

        prestageDeferredPrePlannedElites(state);

        expect(state.military.brigade_movement_orders?.arbih_801st_light).toEqual({
            destination_sids: [CIRCLE_STAGING],
            stance: 'column',
            owner: 'authored_preplanned',
        });
        expect(state.military.brigade_movement_orders?.arbih_802nd_light).toEqual({
            destination_sids: [CIRCLE_STAGING],
            stance: 'column',
            owner: 'authored_preplanned',
        });
    });
});

describe('player staff prestage gate: queued-head reservation', () => {
    function makeQueuedCircleState(options: PrePlannedGateOptions): GameState {
        const state = makeCircleState(options);
        state.military.corps_command!.arbih_1st_corps!.queued_operations = ['Operation Circle'];
        return state;
    }

    it('reserves the player-faction queued head at autonomy 2', () => {
        const state = makeQueuedCircleState({ playerFaction: 'RBiH', autonomyLevel: 2 });

        const reserved = getQueuedDatedPrestageBrigadeIds(state);

        for (const brigadeId of CIRCLE_BRIGADES) {
            expect(reserved.has(brigadeId)).toBe(true);
        }
    });

    it('still skips the player-faction queued head at autonomy 0', () => {
        const state = makeQueuedCircleState({ playerFaction: 'RBiH', autonomyLevel: 0 });

        expect([...getQueuedDatedPrestageBrigadeIds(state)]).toEqual([]);
    });

    it('keeps reserving a non-player faction queued head at autonomy 0', () => {
        const state = makeQueuedCircleState({ playerFaction: 'RS', autonomyLevel: 0 });

        const reserved = getQueuedDatedPrestageBrigadeIds(state);

        for (const brigadeId of CIRCLE_BRIGADES) {
            expect(reserved.has(brigadeId)).toBe(true);
        }
    });
});

describe('player staff prestage gate: triggered elite prestage', () => {
    const ELITES = ['rs_1st_guards_motorized', 'rs_65th_protection_motorized_regiment'];
    const CERSKA_STAGING = 'op:vlasenica:milici_2';

    it('marches player-faction triggered elites at autonomy 2', () => {
        const state = makeTriggeredState({ playerFaction: 'RS', autonomyLevel: 2 });

        checkTriggeredOperations(state);

        for (const brigadeId of ELITES) {
            expect(state.military.brigade_movement_orders?.[brigadeId]).toEqual({
                destination_sids: [CERSKA_STAGING],
                stance: 'column',
            });
        }
    });

    it('still skips player-faction triggered elites at autonomy 0', () => {
        const state = makeTriggeredState({ playerFaction: 'RS', autonomyLevel: 0 });

        checkTriggeredOperations(state);

        for (const brigadeId of ELITES) {
            expect(state.military.brigade_movement_orders?.[brigadeId]).toBeUndefined();
        }
    });

    it('keeps marching non-player triggered elites at autonomy 0', () => {
        const state = makeTriggeredState({ playerFaction: 'RBiH', autonomyLevel: 0 });

        checkTriggeredOperations(state);

        for (const brigadeId of ELITES) {
            expect(state.military.brigade_movement_orders?.[brigadeId]).toEqual({
                destination_sids: [CERSKA_STAGING],
                stance: 'column',
            });
        }
    });
});
