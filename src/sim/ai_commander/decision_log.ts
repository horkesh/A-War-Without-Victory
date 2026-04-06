// src/sim/ai_commander/decision_log.ts
/**
 * Decision log for AI commander replay determinism.
 * Logs all AI decisions to state. On replay, logged decisions replace API calls.
 */

import type { GameState, FactionId } from '../../state/game_state.js';
import type { CommandDecisionLogEntry, ArmyDecision, CorpsDecision, AdvisorResponse, PoliticalDecision } from './ai_types.js';

export function logDecision(state: GameState, entry: CommandDecisionLogEntry): void {
    if (!state.military.ai_decision_log) {
        state.military.ai_decision_log = [];
    }
    state.military.ai_decision_log.push(entry);
}

export function getLoggedDecision(
    state: GameState,
    turn: number,
    level: 'army' | 'corps' | 'advisor' | 'political' | 'event',
    faction: FactionId,
    corpsId?: string
): ArmyDecision | CorpsDecision | AdvisorResponse | PoliticalDecision | null {
    const log = state.military.ai_decision_log;
    if (!log) return null;

    const entry = log.find(e =>
        e.turn === turn &&
        e.level === level &&
        e.faction === faction &&
        (corpsId ? e.corps_id === corpsId : true)
    );

    return entry?.decision ?? null;
}

/** Clear per-turn transient AI state (called at start of turn). */
export function clearTurnDecisions(state: GameState): void {
    state.military.ai_army_decisions = undefined;
}
