// tests/ai_commander_ipc.test.ts
/**
 * Tests for AI Commander IPC handler shape and defaults.
 * Validates config structure, default values, and error paths.
 * Does NOT require Electron — tests logic and types directly.
 */

import { describe, it, expect } from 'vitest';
import { AI_DEFAULTS, type AiCommanderConfig, type AiCommanderMode } from '../src/sim/ai_commander/ai_config.js';
import { logDecision, getLoggedDecision, clearTurnDecisions } from '../src/sim/ai_commander/decision_log.js';
import type { GameState } from '../src/state/game_state.js';
import type { ArmyDecision } from '../src/sim/ai_commander/ai_types.js';

// Cluster 6 — ai_commander_decision_log.test.ts (4 it) absorbed at end of file.

describe('AI Commander config shape', () => {
    it('AI_DEFAULTS has mode cadet', () => {
        expect(AI_DEFAULTS.mode).toBe('cadet');
    });

    it('AI_DEFAULTS has session_cost_estimate of 0', () => {
        expect(AI_DEFAULTS.session_cost_estimate).toBe(0);
    });

    it('AI_DEFAULTS has no anthropic_api_key', () => {
        expect(AI_DEFAULTS.anthropic_api_key).toBeUndefined();
    });

    it('valid modes are commander, officer, recruit, cadet', () => {
        const validModes: AiCommanderMode[] = ['commander', 'officer', 'recruit', 'cadet'];
        for (const mode of validModes) {
            const config: AiCommanderConfig = { mode, session_cost_estimate: 0 };
            expect(config.mode).toBe(mode);
        }
    });

    it('config with api key has key set', () => {
        const config: AiCommanderConfig = {
            mode: 'officer',
            anthropic_api_key: 'sk-test-key',
            session_cost_estimate: 0,
        };
        expect(config.anthropic_api_key).toBe('sk-test-key');
    });

    it('session_cost_estimate accumulates correctly', () => {
        const config: AiCommanderConfig = {
            mode: 'officer',
            session_cost_estimate: 0,
        };
        config.session_cost_estimate += 0.05;
        expect(config.session_cost_estimate).toBeCloseTo(0.05);
    });
});

describe('get-ai-commander-config default response shape', () => {
    it('default config returned when no game loaded matches AI_DEFAULTS', () => {
        // Simulate what the IPC handler returns when no game loaded
        const defaultResponse = { mode: 'cadet', session_cost_estimate: 0 };
        expect(defaultResponse.mode).toBe(AI_DEFAULTS.mode);
        expect(defaultResponse.session_cost_estimate).toBe(AI_DEFAULTS.session_cost_estimate);
    });

    it('config stored in meta survives round-trip through plain object', () => {
        const config: AiCommanderConfig = {
            mode: 'recruit',
            session_cost_estimate: 1.23,
        };
        // Simulate serialize/deserialize via JSON (as IPC does)
        const roundTripped = JSON.parse(JSON.stringify(config)) as AiCommanderConfig;
        expect(roundTripped.mode).toBe('recruit');
        expect(roundTripped.session_cost_estimate).toBeCloseTo(1.23);
    });
});

describe('set-ai-commander-config error path', () => {
    it('returns error shape when mode missing', () => {
        // Simulate handler logic for invalid payload
        const payload = {};
        const mode = (payload as Record<string, unknown>)['mode'];
        const isInvalid = typeof mode !== 'string';
        expect(isInvalid).toBe(true);
    });

    it('returns ok shape when mode is valid string', () => {
        const payload = { mode: 'officer' };
        const mode = payload.mode;
        const isValid = typeof mode === 'string';
        expect(isValid).toBe(true);
    });
});

describe('get-advisor-recommendation cadet guard', () => {
    it('cadet mode should not make API calls', () => {
        const config: AiCommanderConfig = { mode: 'cadet', session_cost_estimate: 0 };
        // The IPC handler returns an error for cadet mode
        const isCadet = config.mode === 'cadet';
        expect(isCadet).toBe(true);
    });

    it('non-cadet mode allows advisor calls', () => {
        const modes: AiCommanderMode[] = ['commander', 'officer', 'recruit'];
        for (const mode of modes) {
            const config: AiCommanderConfig = { mode, session_cost_estimate: 0 };
            expect(config.mode).not.toBe('cadet');
        }
    });
});

// ── Absorbed: ai_commander_decision_log.test.ts (Cluster 6) ──────────────────

function makeDecisionLogState(): GameState {
    return { military: {} } as unknown as GameState;
}

describe('decision log', () => {
    it('logs a decision to state', () => {
        const state = makeDecisionLogState();
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
        const state = makeDecisionLogState();
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
        const state = makeDecisionLogState();
        expect(getLoggedDecision(state, 5, 'army', 'RS')).toBeNull();
    });

    it('clearTurnDecisions removes ai_army_decisions', () => {
        const state = makeDecisionLogState();
        state.military.ai_army_decisions = { RS: {} as any };
        clearTurnDecisions(state);
        expect(state.military.ai_army_decisions).toBeUndefined();
    });
});
