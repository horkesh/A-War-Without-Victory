/**
 * Targeted tests for the anti-paralysis supply gate in operation_preparation.ts.
 *
 * The anti-paralysis override fires when preparation_turns_elapsed >= preparation_max_turns.
 * Previously it launched regardless of supply, causing guaranteed ZEA.
 * The fix adds `&& supplyReadiness >= 0.3` so critical-supply ops abort instead.
 *
 * Deterministic: no Math.random(), no Date.now().
 */
import { describe, it, expect } from 'vitest';

import { tickPreparation } from '../../src/sim/combat/operation_preparation.js';
import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
} from '../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../src/state/officer_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Minimal mock factories
// ═══════════════════════════════════════════════════════════════════════════

const OFFICER_ID = 'officer_aggressive';
const CORPS_ID = 'test_corps' as FormationId;
const FACTION = 'RS' as FactionId;

function makeOfficerData(overrides: Partial<NamedOfficer> = {}): NamedOfficer {
    return {
        id: OFFICER_ID,
        name: 'Test Commander',
        faction: FACTION,
        rank: 'brigadier_general',
        competence: 3,
        aggressiveness: 4,
        defensive_skill: 3,
        political_reliability: 3,
        ...overrides,
    } as NamedOfficer;
}

function makeOfficerState(): NamedOfficerState {
    return {
        officer_id: OFFICER_ID,
        status: 'active',
        assigned_corps_id: CORPS_ID,
        turns_in_command: 10,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
    } as NamedOfficerState;
}

/**
 * Build a minimal op that has already exceeded preparation_max_turns,
 * so the anti-paralysis path fires immediately on the next tick.
 */
function makeExpiredOp(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Op Test',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 0,
        phase_started_turn: 0,
        participating_brigades: [],
        commander_officer_id: OFFICER_ID,
        // Pre-set preparation state so the anti-paralysis block triggers.
        // preparation_turns_elapsed is incremented by +1 inside tickPreparation,
        // so set it to max_turns - 1 so after increment it equals max_turns.
        preparation_sub_phase: 'assessment',
        preparation_turns_elapsed: 4,
        preparation_max_turns: 5,
        postponement_count: 0,
        ...overrides,
    } as CorpsOperation;
}

function makeMinimalState(officerData: NamedOfficer): GameState {
    return {
        meta: { turn: 10 },
        military: {
            formations: {},
            named_officer_data: [officerData],
            named_officers: {
                [OFFICER_ID]: makeOfficerState(),
            },
        },
        political: { political_controllers: {} },
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('anti-paralysis supply gate', () => {
    it('aborts at critical supply (supplyReadiness < 0.3)', () => {
        const officer = makeOfficerData({ aggressiveness: 4 });
        const state = makeMinimalState(officer);
        const op = makeExpiredOp();

        const result = tickPreparation(state, op, CORPS_ID, FACTION, 0.0);

        expect(result.aborted).toBe(true);
        expect(result.assessment).toBe('abort');
        expect(op.commander_assessment).toBe('abort');
        // Should NOT be ready — launching at zero supply guarantees ZEA
        expect(result.ready).toBe(false);
    });

    it('launches at adequate supply (supplyReadiness >= 0.3) with aggressive commander', () => {
        const officer = makeOfficerData({ aggressiveness: 4 });
        const state = makeMinimalState(officer);
        const op = makeExpiredOp();

        const result = tickPreparation(state, op, CORPS_ID, FACTION, 0.5);

        expect(result.ready).toBe(true);
        expect(result.assessment).toBe('launch');
        expect(op.commander_assessment).toBe('launch');
        expect(result.aborted).toBe(false);
    });

    it('aborts for cautious commanders regardless of supply', () => {
        // aggressiveness 2 < 3 threshold — should abort even with good supply
        const officer = makeOfficerData({ aggressiveness: 2 });
        const state = makeMinimalState(officer);
        const op = makeExpiredOp();

        const result = tickPreparation(state, op, CORPS_ID, FACTION, 0.8);

        expect(result.aborted).toBe(true);
        expect(result.assessment).toBe('abort');
        expect(op.commander_assessment).toBe('abort');
        expect(result.ready).toBe(false);
    });
});
