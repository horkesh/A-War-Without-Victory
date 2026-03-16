// tests/ai_commander_decision_log.test.ts
import { describe, it, expect } from 'vitest';
import { logDecision, getLoggedDecision, clearTurnDecisions } from '../src/sim/ai_commander/decision_log.js';
import type { GameState } from '../src/state/game_state.js';
import type { ArmyDecision } from '../src/sim/ai_commander/ai_types.js';

function makeState(): GameState {
    return { military: {} } as unknown as GameState;
}

describe('decision log', () => {
    it('logs a decision to state', () => {
        const state = makeState();
        const decision: ArmyDecision = {
            faction: 'RS', turn: 5,
            corps_directives: {},
            operation_decisions: { approve: [], postpone: [], abort: [] },
            strategic_reasoning: 'test', briefing_text: 'test',
        };
        logDecision(state, { turn: 5, level: 'army', faction: 'RS', decision, model_used: 'test-model', latency_ms: 100 });
        expect(state.military.ai_decision_log).toHaveLength(1);
        expect(state.military.ai_decision_log![0].faction).toBe('RS');
    });

    it('getLoggedDecision returns decision for replay', () => {
        const state = makeState();
        const decision: ArmyDecision = {
            faction: 'RS', turn: 5,
            corps_directives: { vrs_1st_krajina: { stance: 'offensive' } },
            operation_decisions: { approve: [], postpone: [], abort: [] },
            strategic_reasoning: 'test', briefing_text: 'test',
        };
        logDecision(state, { turn: 5, level: 'army', faction: 'RS', decision, model_used: 'test-model' });
        const retrieved = getLoggedDecision(state, 5, 'army', 'RS');
        expect(retrieved).not.toBeNull();
        expect((retrieved as ArmyDecision).corps_directives.vrs_1st_krajina?.stance).toBe('offensive');
    });

    it('getLoggedDecision returns null when no log exists', () => {
        const state = makeState();
        expect(getLoggedDecision(state, 5, 'army', 'RS')).toBeNull();
    });

    it('clearTurnDecisions removes ai_army_decisions', () => {
        const state = makeState();
        state.military.ai_army_decisions = { RS: {} as any };
        clearTurnDecisions(state);
        expect(state.military.ai_army_decisions).toBeUndefined();
    });
});
