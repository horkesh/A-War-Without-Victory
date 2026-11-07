import { describe, it, expect } from 'vitest';
import { finalizeOperationAAR } from '../src/sim/combat/operation_aar.js';
import type { CorpsOperation } from '../src/state/game_state.js';

// Fixtures mirror tests/operation_aar.test.ts (makeFinalizeState / makeFinalizableOp)
// so this suite exercises the same finalize path without importing non-exported helpers.

function makeFinalizeState(
    ops: Record<string, CorpsOperation>,
    formations: Record<string, any>,
    politicalControllers: Record<string, string> = {},
    turn = 10,
) {
    const corps_command: Record<string, any> = {};
    for (const [corpsId, op] of Object.entries(ops)) {
        corps_command[corpsId] = {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [op],
        };
    }
    return {
        meta: { turn, phase: 'war' },
        military: { formations, corps_command },
        political: { political_controllers: politicalControllers },
    } as any;
}

function makeFinalizableOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Op Corridor',
        type: 'sector_attack',
        phase: 'recovery',
        started_turn: 5,
        phase_started_turn: 9,
        participating_brigades: ['bde_1', 'bde_2'],
        objectives: ['op:brcko:brcko_1', 'op:brcko:brcko_2'],
        recovery_reason: 'completed',
        weekly_log: [],
        initial_strength: 3000,
        ...overrides,
    };
}

function makeLossEntry(turn: number, osid: string, attacksThisTurn = 1) {
    return {
        turn,
        phase: 'execution' as const,
        attacks_this_turn: attacksThisTurn,
        objectives_captured_this_turn: [] as string[],
        objectives_lost_this_turn: [osid],
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        brigade_count: 1,
        momentum: 0,
        notable_events: [] as string[],
    };
}

function makeFlipEngagement(turn: number, osid: string) {
    return {
        battle_id: `${turn}:${osid}:bde_1:defender`,
        turn,
        osid,
        role: 'attacker' as const,
        outcome: 'decisive_victory' as const,
        enemy_faction: 'RBiH',
        casualties_taken: 0,
        casualties_inflicted: 10,
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        territory_flipped: true,
    };
}

function brigadeWithEngagements(engagements: ReturnType<typeof makeFlipEngagement>[]) {
    return {
        personnel: 1300,
        faction: 'RS',
        status: 'active',
        brigade_history: { engagements },
    };
}

describe('finalizeOperationAAR capture chronology', () => {
    it('does not re-credit an older engagement capture after a later recorded loss', () => {
        const osid = 'op:brcko:brcko_1';
        const op = makeFinalizableOp({
            started_turn: 1,
            objectives: [osid],
            participating_brigades: ['bde_1'],
            weekly_log: [makeLossEntry(3, osid, 2)],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            { bde_1: brigadeWithEngagements([makeFlipEngagement(2, osid)]) },
            // Enemy holds the objective at finalization: the turn-3 loss stuck.
            { [osid]: 'RBiH' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar = state.operation_history[0];
        expect(aar.objectives_captured).toEqual([]);
        expect(aar.outcome).not.toBe('success');
    });

    it('still credits an engagement capture with no later loss', () => {
        const osid = 'op:brcko:brcko_1';
        const op = makeFinalizableOp({
            started_turn: 1,
            objectives: [osid],
            participating_brigades: ['bde_1'],
            weekly_log: [],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            { bde_1: brigadeWithEngagements([makeFlipEngagement(2, osid)]) },
            { [osid]: 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar = state.operation_history[0];
        expect(aar.objectives_captured).toEqual([osid]);
        expect(aar.outcome).toBe('success');
    });

    it('credits a recapture that happens after an earlier recorded loss', () => {
        const osid = 'op:brcko:brcko_1';
        const op = makeFinalizableOp({
            started_turn: 1,
            objectives: [osid],
            participating_brigades: ['bde_1'],
            weekly_log: [makeLossEntry(2, osid, 0)],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            { bde_1: brigadeWithEngagements([makeFlipEngagement(4, osid)]) },
            { [osid]: 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar = state.operation_history[0];
        expect(aar.objectives_captured).toEqual([osid]);
        expect(aar.outcome).toBe('success');
    });

    it('keeps the same-turn order: a battle capture folded in after that turn\'s logged loss is credited', () => {
        // The weekly entry is written before that turn's battle receipts, so a turn-3
        // logged loss followed by a turn-3 recapture ends held (pre-existing behaviour).
        const osid = 'op:brcko:brcko_1';
        const op = makeFinalizableOp({
            started_turn: 1,
            objectives: [osid],
            participating_brigades: ['bde_1'],
            weekly_log: [makeLossEntry(3, osid, 1)],
        });
        const state = makeFinalizeState(
            { corps_1kr: op },
            { bde_1: brigadeWithEngagements([makeFlipEngagement(3, osid)]) },
            { [osid]: 'RS' },
        );

        finalizeOperationAAR(state, 'corps_1kr', op);

        const aar = state.operation_history[0];
        expect(aar.objectives_captured).toEqual([osid]);
        expect(aar.outcome).toBe('success');
    });
});
