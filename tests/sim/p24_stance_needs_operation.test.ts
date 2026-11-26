/**
 * P2.4 stance coherence (orchestrator ruling §8 R1, 2026-11-26): a corps holds an
 * offensive stance only while an operation in planning or execution carries it.
 * Lane B s21's R1 query found at least 203 offensive corps-weeks with no such
 * operation on main (emer 214), set by faction biases that never asked for one.
 *
 * Deterministic: no randomness, no wall clock.
 */
import { describe, expect, it } from 'vitest';
import {
    capCorpsStancesWithoutOperation,
    capOffensiveStanceWithoutOperation,
    corpsHasPlanningOrExecutionOperation,
} from '../../src/sim/combat/bot_corps_stance.js';
import type { CorpsCommandState, CorpsOperation, CorpsStance, GameState } from '../../src/state/game_state.js';

const op = (phase: string, type = 'sector_attack') => ({ type, phase }) as unknown as CorpsOperation;

describe('P2.4: an offensive corps stance needs an operation', () => {
    it('counts planning and execution (a probe included), not recovery', () => {
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [] })).toBe(false);
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('recovery')] })).toBe(false);
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('planning')] })).toBe(true);
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('execution', 'probe')] })).toBe(true);
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('planning', 'feint')] })).toBe(true);
    });

    it('a reorganization or strategic-defence operation does not carry an offensive stance', () => {
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('planning', 'reorganization')] })).toBe(false);
        expect(corpsHasPlanningOrExecutionOperation({ active_operations: [op('execution', 'strategic_defense')] })).toBe(false);
        expect(capOffensiveStanceWithoutOperation('offensive', { active_operations: [op('planning', 'reorganization')] })).toBe('balanced');
    });

    it('caps only offensive, only at balanced, and only without an operation', () => {
        const none = { active_operations: [op('recovery')] };
        const live = { active_operations: [op('execution')] };
        for (const s of ['reorganize', 'defensive', 'balanced'] as CorpsStance[]) {
            expect(capOffensiveStanceWithoutOperation(s, none)).toBe(s);
        }
        expect(capOffensiveStanceWithoutOperation('offensive', none)).toBe('balanced');
        expect(capOffensiveStanceWithoutOperation('offensive', live)).toBe('offensive');
    });

    it('the post-loop pass caps late writers, keeps a President order, and caps the recommendation', () => {
        const cmd = (stance: CorpsStance, extra: Partial<CorpsCommandState> = {}) => ({
            command_span: 5, subordinate_count: 1, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
            active_operations: [], stance, ...extra,
        }) as unknown as CorpsCommandState;
        const state = {
            formations: {},
            military: {
                formations: {
                    c_bot: { id: 'c_bot', faction: 'RBiH', kind: 'corps', status: 'active' },
                    c_op: { id: 'c_op', faction: 'RBiH', kind: 'corps', status: 'active' },
                    c_player: { id: 'c_player', faction: 'RBiH', kind: 'corps', status: 'active' },
                    c_rs: { id: 'c_rs', faction: 'RS', kind: 'corps', status: 'active' },
                },
                corps_command: {
                    c_bot: cmd('offensive', { ai_recommended_stance: 'offensive' }),
                    c_op: cmd('offensive', { active_operations: [op('planning')] }),
                    c_player: cmd('offensive', { player_ordered_stance: 'offensive', ai_recommended_stance: 'offensive' } as Partial<CorpsCommandState>),
                    c_rs: cmd('offensive'),
                },
            },
        } as unknown as GameState;

        capCorpsStancesWithoutOperation(state, 'RBiH');

        const cc = state.military.corps_command!;
        expect(cc.c_bot.stance).toBe('balanced');
        expect(cc.c_bot.ai_recommended_stance).toBe('balanced');
        expect(cc.c_op.stance).toBe('offensive');
        expect(cc.c_player.stance).toBe('offensive');
        expect(cc.c_player.ai_recommended_stance).toBe('balanced');
        expect(cc.c_rs.stance).toBe('offensive'); // other faction untouched
    });
});
