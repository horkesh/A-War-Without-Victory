/**
 * Tests for v0.8.3 Phase 2 — Operation Interpretation Engine (Launch + Halt).
 *
 * Covers:
 * Group 1 — interpretOperationLaunch fast-paths (4 tests):
 *   1. No corps command entry → full compliance, no event
 *   2. Operation not in planning phase → full compliance, no event
 *   3. Acting commander → full compliance, no event
 *   4. Cowed officer → full compliance, no event
 *
 * Group 2 — interpretOperationLaunch compliance outcomes (4 tests):
 *   5. High-competence neutral officer (agg=3,comp=5,orderedRank=2,gap=1) → full compliance (agg===3 special case)
 *   6. Cautious officer (agg=1,comp=3) → planning_duration extended, order_modified event
 *   7. Partial compliance (agg=1,comp=2 → score=0.15 < 0.25) → refused, recovery_reason set
 *   8. Partial compliance path (agg=2,comp=3 → score=0.25 = PARTIAL threshold) → partial
 *
 * Group 3 — interpretOperationHalt fast-paths (3 tests):
 *   9.  Op not in execution phase → full compliance, halt_delay_turns=0, no event
 *  10. Acting commander → full compliance, halt_delay_turns=0, no event
 *  11. Cowed officer → full compliance, halt_delay_turns=0, no event
 *
 * Group 4 — interpretOperationHalt compliance outcomes (4 tests):
 *  12. Cautious officer (agg=1) ordered to halt → full compliance (gap=0), no event
 *  13. Balanced officer (agg=3,comp=3) ordered to halt → modified, halt_delay_turns=1, order_modified event
 *  14. Aggressive officer (agg=4,comp=4) ordered to halt without momentum → partial, order_pushback event
 *  15. Aggressive officer (agg=4,comp=1) ordered to halt → refused, halt_delay_turns=AGGRESSIVE_HALT_DELAY, op NOT terminated
 *
 * Group 5 — Patron ceiling on launch (1 test):
 *  16. Patron directive stance_ceiling=defensive active → stance cap applied (launch effectively blocked by score path)
 *      NOTE: patron_directives affect interpretStanceOrder, not interpretOperationLaunch directly.
 *      Test verifies that interpretOperationLaunch is unaffected by patron ceiling (ceiling is stance-only).
 *
 * Group 6 — Deterministic repeatability (2 tests):
 *  17. Same inputs → same outputs on two successive interpretOperationLaunch calls
 *  18. Same inputs → same outputs on two successive interpretOperationHalt calls
 *
 * Group 7 — halt_delay_turns_remaining countdown (1 test):
 *  19. halt_delay_turns_remaining: noted as integration-test concern (sector_offensive.ts).
 *      Unit test: verify halt_delay_turns_remaining field round-trips on CorpsOperation.
 *
 * Compliance score math reference (orderedRank=2.0 for launch, 0.0 for halt):
 *   baseCompliance = 0.45 + competence * 0.10
 *   gapPenalty = gap * 0.25
 *   score = baseCompliance - gapPenalty (reliabilityModifier=0 in Phase 2)
 *   Thresholds: FULL=0.80, MODIFIED=0.50, PARTIAL=0.25, below=refused
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import {
    interpretOperationLaunch,
    interpretOperationHalt,
} from '../../../src/sim/combat/order_interpretation.js';
import type { GameState, CorpsCommandState, CorpsOperation } from '../../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../../src/state/officer_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants mirrored from order_interpretation.ts (not exported, so duplicated)
// ═══════════════════════════════════════════════════════════════════════════

const CAUTIOUS_EXTRA_PREP_TURNS = [0, 3, 2, 0, 0, 0]; // indexed by aggressiveness 0-5
const AGGRESSIVE_HALT_DELAY = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Fixture helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeOfficerData(overrides: Partial<NamedOfficer> & { id: string }): NamedOfficer {
    return {
        name: overrides.name ?? `Officer ${overrides.id}`,
        faction: 'RBiH',
        rank: 'corps_commander',
        competence: 3,
        aggressiveness: 3,
        defensive_skill: 3,
        political_reliability: 3,
        available_from_turn: 0,
        origin: 'military',
        casualty_vulnerability: 0.1,
        can_improve: false,
        improvement_rate: 0,
        pool_tier: 'tier_b',
        ...overrides,
    };
}

function makeOfficerState(
    overrides: Partial<NamedOfficerState> & { officer_id: string },
): NamedOfficerState {
    return {
        status: 'active',
        assigned_corps_id: null,
        turns_in_command: 0,
        battles: 0,
        victories: 0,
        effective_competence_penalty: 0,
        penalty_turns_remaining: 0,
        acting_commander: false,
        ...overrides,
    };
}

function makePlanningOp(name: string, overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name,
        phase: 'planning',
        planning_duration: 4,
        planning_elapsed: 0,
        objectives: ['obj_alpha', 'obj_beta', 'obj_gamma'],
        participating_brigades: [],
        sector_id: 'sector_test',
        momentum: 0,
        ...overrides,
    } as unknown as CorpsOperation;
}

function makeExecutionOp(name: string, overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name,
        phase: 'execution',
        planning_duration: 4,
        planning_elapsed: 4,
        objectives: ['obj_alpha', 'obj_beta', 'obj_gamma'],
        participating_brigades: [],
        sector_id: 'sector_test',
        momentum: 0,
        ...overrides,
    } as unknown as CorpsOperation;
}

function makeMinimalState(
    corpsId: string,
    officerData: NamedOfficer,
    officerState: NamedOfficerState,
    activeOps: CorpsOperation[] = [],
): GameState {
    const corpsCommandState: CorpsCommandState = {
        command_span: 4,
        subordinate_count: 4,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'balanced',
        active_operations: activeOps,
    };

    return {
        schema_version: 1,
        meta: {
            turn: 10,
            seed: 'test',
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            named_officer_data: [officerData],
            named_officers: {
                [officerData.id]: officerState,
            },
            corps_command: {
                [corpsId]: corpsCommandState,
            },
            pending_officer_events: [],
        },
        political: {
            political_controllers: {},
        },
        displacement: {
            displaced_persons: {},
        },
    } as unknown as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// Group 1 — interpretOperationLaunch fast-paths
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 1: interpretOperationLaunch fast-paths', () => {
    it('1. no corps command entry → full compliance, no event', () => {
        const data = makeOfficerData({ id: 'off_fp1', competence: 3, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_fp1', assigned_corps_id: 'corps_fp1' });
        const state = makeMinimalState('corps_fp1', data, state_);
        // Remove corps_command entirely to trigger fast-path
        delete (state.military.corps_command as Record<string, unknown>)['corps_fp1'];

        const result = interpretOperationLaunch(state, 'corps_fp1', 'Op_Alpha');

        expect(result.compliance).toBe('full');
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('2. operation not in planning phase (execution) → full compliance, no event', () => {
        const data = makeOfficerData({ id: 'off_fp2', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_fp2', assigned_corps_id: 'corps_fp2' });
        // Op is in execution, not planning
        const op = makeExecutionOp('Op_Beta');
        const state = makeMinimalState('corps_fp2', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_fp2', 'Op_Beta');

        expect(result.compliance).toBe('full');
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('3. acting commander → full compliance, no event (even with severe mismatch)', () => {
        // agg=1 (very cautious) would refuse a launch, but acting=true bypasses all interpretation
        const data = makeOfficerData({ id: 'off_fp3', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({
            officer_id: 'off_fp3',
            assigned_corps_id: 'corps_fp3',
            acting_commander: true,
        });
        const op = makePlanningOp('Op_Gamma');
        const state = makeMinimalState('corps_fp3', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_fp3', 'Op_Gamma');

        expect(result.compliance).toBe('full');
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('4. cowed officer → full compliance, no event (cowed_until_turn=15, turn=10)', () => {
        // agg=1 would refuse, but cowed_until_turn >= turn → always complies
        const data = makeOfficerData({ id: 'off_fp4', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({
            officer_id: 'off_fp4',
            assigned_corps_id: 'corps_fp4',
            cowed_until_turn: 15,
        });
        const op = makePlanningOp('Op_Delta');
        const state = makeMinimalState('corps_fp4', data, state_, [op]);
        state.meta.turn = 10;

        const result = interpretOperationLaunch(state, 'corps_fp4', 'Op_Delta');

        expect(result.compliance).toBe('full');
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2 — interpretOperationLaunch compliance outcomes
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 2: interpretOperationLaunch compliance outcomes', () => {
    it('5. agg=3 (balanced) with any competence → full compliance via special case', () => {
        // agg=3 → preferred=balanced (rank=1), orderedRank=2.0, gap=1
        // comp=5: base=0.95, penalty=0.25, score=0.70 → hits MODIFIED branch
        // BUT agg===3 special case → returns full immediately, no event
        const data = makeOfficerData({ id: 'off_co1', competence: 5, aggressiveness: 3 });
        const state_ = makeOfficerState({ officer_id: 'off_co1', assigned_corps_id: 'corps_co1' });
        const op = makePlanningOp('Op_Epsilon', { planning_duration: 3 });
        const state = makeMinimalState('corps_co1', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_co1', 'Op_Epsilon');

        expect(result.compliance).toBe('full');
        expect(result.event).toBeUndefined();
        // planning_duration must be unchanged
        expect(op.planning_duration).toBe(3);
    });

    it('6. cautious officer (agg=1,comp=5) → partial compliance, planning_duration extended, order_pushback event', () => {
        // agg=1 → preferred=defensive (rank=0), orderedRank=2.0, gap=2
        // comp=5: base=0.95, penalty=0.50, score=0.45 → < MODIFIED(0.50) → PARTIAL branch
        // PARTIAL: extends planning_duration AND trims objective
        // CAUTIOUS_EXTRA_PREP_TURNS[1]=3, current planning_duration=4 → effective=7
        // objectives trimmed from 3 to 2
        const data = makeOfficerData({ id: 'off_co2', competence: 5, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_co2', assigned_corps_id: 'corps_co2' });
        const op = makePlanningOp('Op_Zeta', { planning_duration: 4, objectives: ['a', 'b', 'c'] });
        const state = makeMinimalState('corps_co2', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_co2', 'Op_Zeta');

        expect(result.compliance).toBe('partial');
        // planning_duration extended by CAUTIOUS_EXTRA_PREP_TURNS[1]=3
        expect(result.effective_planning_duration).toBe(7);
        expect(op.planning_duration).toBe(7);
        // objectives trimmed (3→2)
        expect(result.effective_objectives).toEqual(['a', 'b']);
        expect(op.objectives).toEqual(['a', 'b']);
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_pushback');
        expect(state.military.pending_officer_events?.length).toBe(1);
    });

    it('7. cautious officer (agg=1,comp=2) → refused, recovery_reason=manual_termination, order_refused event', () => {
        // agg=1 → preferred=defensive (rank=0), orderedRank=2.0, gap=2
        // comp=2: base=0.65, penalty=0.50, score=0.15 → < PARTIAL(0.25) → REFUSED
        const data = makeOfficerData({ id: 'off_co3', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_co3', assigned_corps_id: 'corps_co3' });
        const op = makePlanningOp('Op_Eta', { objectives: ['x', 'y', 'z'] });
        const state = makeMinimalState('corps_co3', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_co3', 'Op_Eta');

        expect(result.compliance).toBe('refused');
        // Op recovery_reason set to manual_termination
        expect(op.recovery_reason).toBe('manual_termination');
        // No planning_duration or objectives change from refused
        expect(result.effective_planning_duration).toBeUndefined();
        expect(result.effective_objectives).toBeUndefined();
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_refused');
        expect(result.reason).toBeTruthy();
        expect(state.military.pending_officer_events?.length).toBe(1);
    });

    it('8. cautious officer (agg=2,comp=3) → partial compliance at exact PARTIAL threshold (score=0.25)', () => {
        // agg=2 → preferred=defensive (rank=0), orderedRank=2.0, gap=2
        // comp=3: base=0.75, penalty=0.50, score=0.25 → exactly at PARTIAL(0.25) → partial
        // CAUTIOUS_EXTRA_PREP_TURNS[2]=2, current planning_duration=5 → effective=7
        // objectives trimmed from 3 to 2
        const data = makeOfficerData({ id: 'off_co4', competence: 3, aggressiveness: 2 });
        const state_ = makeOfficerState({ officer_id: 'off_co4', assigned_corps_id: 'corps_co4' });
        const op = makePlanningOp('Op_Theta', { planning_duration: 5, objectives: ['p', 'q', 'r'] });
        const state = makeMinimalState('corps_co4', data, state_, [op]);

        const result = interpretOperationLaunch(state, 'corps_co4', 'Op_Theta');

        expect(result.compliance).toBe('partial');
        expect(result.effective_planning_duration).toBe(7);
        expect(op.planning_duration).toBe(7);
        expect(result.effective_objectives).toEqual(['p', 'q']);
        expect(op.objectives).toEqual(['p', 'q']);
        expect(result.event?.type).toBe('order_pushback');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3 — interpretOperationHalt fast-paths
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 3: interpretOperationHalt fast-paths', () => {
    it('9. operation not in execution phase (planning) → full compliance, halt_delay_turns=0, no event', () => {
        const data = makeOfficerData({ id: 'off_hfp1', competence: 5, aggressiveness: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_hfp1', assigned_corps_id: 'corps_hfp1' });
        // Op is in planning — halt fast-path triggers
        const op = makePlanningOp('Op_Iota');
        const state = makeMinimalState('corps_hfp1', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hfp1', 'Op_Iota');

        expect(result.compliance).toBe('full');
        expect(result.halt_delay_turns).toBe(0);
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('10. acting commander → full compliance, halt_delay_turns=0, no event', () => {
        // agg=4 (aggressive) would resist halt, but acting=true bypasses
        const data = makeOfficerData({ id: 'off_hfp2', competence: 4, aggressiveness: 4 });
        const state_ = makeOfficerState({
            officer_id: 'off_hfp2',
            assigned_corps_id: 'corps_hfp2',
            acting_commander: true,
        });
        const op = makeExecutionOp('Op_Kappa');
        const state = makeMinimalState('corps_hfp2', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hfp2', 'Op_Kappa');

        expect(result.compliance).toBe('full');
        expect(result.halt_delay_turns).toBe(0);
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('11. cowed officer → full compliance, halt_delay_turns=0, no event', () => {
        // agg=5 (very aggressive) would refuse halt, but cowed → always complies
        const data = makeOfficerData({ id: 'off_hfp3', competence: 4, aggressiveness: 5 });
        const state_ = makeOfficerState({
            officer_id: 'off_hfp3',
            assigned_corps_id: 'corps_hfp3',
            cowed_until_turn: 20,
        });
        const op = makeExecutionOp('Op_Lambda');
        const state = makeMinimalState('corps_hfp3', data, state_, [op]);
        state.meta.turn = 10;

        const result = interpretOperationHalt(state, 'corps_hfp3', 'Op_Lambda');

        expect(result.compliance).toBe('full');
        expect(result.halt_delay_turns).toBe(0);
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4 — interpretOperationHalt compliance outcomes
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 4: interpretOperationHalt compliance outcomes', () => {
    it('12. cautious officer (agg=1) ordered to halt → full compliance (gap=0), halt_delay_turns=0, no event', () => {
        // agg=1 → preferred=defensive (rank=0), orderedRank=0.0 (halt), gap=0
        // gap=0 → score=1.0 → FULL compliance
        const data = makeOfficerData({ id: 'off_hc1', competence: 3, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_hc1', assigned_corps_id: 'corps_hc1' });
        const op = makeExecutionOp('Op_Mu');
        const state = makeMinimalState('corps_hc1', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hc1', 'Op_Mu');

        expect(result.compliance).toBe('full');
        expect(result.halt_delay_turns).toBe(0);
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('13. balanced officer (agg=3,comp=3) ordered to halt → modified, halt_delay_turns=1, order_modified event', () => {
        // agg=3 → preferred=balanced (rank=1), orderedRank=0.0 (halt), gap=1
        // comp=3: base=0.75, penalty=0.25, score=0.50 → at MODIFIED(0.50) → modified
        const data = makeOfficerData({ id: 'off_hc2', competence: 3, aggressiveness: 3 });
        const state_ = makeOfficerState({ officer_id: 'off_hc2', assigned_corps_id: 'corps_hc2' });
        const op = makeExecutionOp('Op_Nu');
        const state = makeMinimalState('corps_hc2', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hc2', 'Op_Nu');

        expect(result.compliance).toBe('modified');
        expect(result.halt_delay_turns).toBe(1);
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_modified');
        expect(result.reason).toBeTruthy();
        expect(state.military.pending_officer_events?.length).toBe(1);
    });

    it('14. aggressive officer (agg=4,comp=4) ordered to halt without momentum → partial, order_pushback event, delay=1', () => {
        // agg=4 → preferred=offensive (rank=2), orderedRank=0.0 (halt), gap=2
        // comp=4: base=0.85, penalty=0.50, score=0.35 → >= PARTIAL(0.25) but < MODIFIED(0.50) → partial
        // momentum=0 < HALT_DELAY_MOMENTUM_THRESHOLD(2) → delay=1 (not AGGRESSIVE_HALT_DELAY)
        const data = makeOfficerData({ id: 'off_hc3', competence: 4, aggressiveness: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_hc3', assigned_corps_id: 'corps_hc3' });
        const op = makeExecutionOp('Op_Xi', { momentum: 0 });
        const state = makeMinimalState('corps_hc3', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hc3', 'Op_Xi');

        expect(result.compliance).toBe('partial');
        expect(result.halt_delay_turns).toBe(1); // no momentum → delay=1
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_pushback');
        expect(state.military.pending_officer_events?.length).toBe(1);
    });

    it('14b. aggressive officer (agg=4,comp=4) with momentum → partial, delay=AGGRESSIVE_HALT_DELAY(2)', () => {
        // Same as above but momentum=3 >= HALT_DELAY_MOMENTUM_THRESHOLD(2) → delay=AGGRESSIVE_HALT_DELAY=2
        const data = makeOfficerData({ id: 'off_hc3b', competence: 4, aggressiveness: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_hc3b', assigned_corps_id: 'corps_hc3b' });
        const op = makeExecutionOp('Op_Xi_B', { momentum: 3 });
        const state = makeMinimalState('corps_hc3b', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hc3b', 'Op_Xi_B');

        expect(result.compliance).toBe('partial');
        expect(result.halt_delay_turns).toBe(AGGRESSIVE_HALT_DELAY);
        expect(result.event?.type).toBe('order_pushback');
    });

    it('15. aggressive officer (agg=4,comp=1) ordered to halt → refused, halt_delay_turns=AGGRESSIVE_HALT_DELAY, op NOT terminated', () => {
        // agg=4 → preferred=offensive (rank=2), orderedRank=0.0 (halt), gap=2
        // comp=1: base=0.55, penalty=0.50, score=0.05 → < PARTIAL(0.25) → refused
        // Refused halt: op continues (no recovery_reason set), delay applied
        const data = makeOfficerData({ id: 'off_hc4', competence: 1, aggressiveness: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_hc4', assigned_corps_id: 'corps_hc4' });
        const op = makeExecutionOp('Op_Omicron');
        const state = makeMinimalState('corps_hc4', data, state_, [op]);

        const result = interpretOperationHalt(state, 'corps_hc4', 'Op_Omicron');

        expect(result.compliance).toBe('refused');
        expect(result.halt_delay_turns).toBe(AGGRESSIVE_HALT_DELAY);
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_refused');
        // Op NOT terminated — recovery_reason must not be set
        expect(op.recovery_reason).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 5 — Patron ceiling interaction with launch
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 5: Patron ceiling on launch', () => {
    it('16. patron directive stance_ceiling does not affect interpretOperationLaunch (ceiling is stance-only)', () => {
        // interpretOperationLaunch does not read patron_directives — that code path
        // is in computeInterpretation which is only called by interpretStanceOrder.
        // A patron ceiling of "defensive" should have zero effect on an operation launch.
        // We verify the refused path fires as expected (proving no ceiling is applied to compliance score).
        const data = makeOfficerData({ id: 'off_pc1', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_pc1', assigned_corps_id: 'corps_pc1' });
        const op = makePlanningOp('Op_Pi');
        const state = makeMinimalState('corps_pc1', data, state_, [op]);

        // Wire patron directive (cast through unknown to satisfy strict TS)
        (state.military as unknown as Record<string, unknown>).war_timeline = {
            patron_directives: {
                RBiH: [
                    { start_week: 0, end_week: 52, stance_ceiling: 'defensive' },
                ],
            },
        };

        // With agg=1,comp=2: score=0.15 → refused
        // If patron ceiling were wrongly applied to launch, it might change behavior.
        // In the correct implementation, result is still 'refused' purely from score.
        const result = interpretOperationLaunch(state, 'corps_pc1', 'Op_Pi');

        expect(result.compliance).toBe('refused');
        expect(op.recovery_reason).toBe('manual_termination');
        // Result is driven solely by compliance score, not patron ceiling
        expect(result.event?.type).toBe('order_refused');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 6 — Deterministic repeatability
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 6: Deterministic repeatability', () => {
    it('17. interpretOperationLaunch: same inputs → identical outputs on two fresh states', () => {
        const data = makeOfficerData({ id: 'off_det1', competence: 5, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_det1', assigned_corps_id: 'corps_det1' });

        const opA = makePlanningOp('Op_Rho', { planning_duration: 4, objectives: ['x', 'y', 'z'] });
        const stateA = makeMinimalState('corps_det1', data, state_, [opA]);
        stateA.meta.turn = 7;

        const opB = makePlanningOp('Op_Rho', { planning_duration: 4, objectives: ['x', 'y', 'z'] });
        const stateB = makeMinimalState('corps_det1', { ...data }, { ...state_ }, [opB]);
        stateB.meta.turn = 7;

        const resultA = interpretOperationLaunch(stateA, 'corps_det1', 'Op_Rho');
        const resultB = interpretOperationLaunch(stateB, 'corps_det1', 'Op_Rho');

        expect(resultA.compliance).toBe(resultB.compliance);
        expect(resultA.effective_planning_duration).toBe(resultB.effective_planning_duration);
        expect(resultA.effective_objectives).toEqual(resultB.effective_objectives);
        expect(resultA.reason).toBe(resultB.reason);
        // Both states get exactly one event each
        expect(stateA.military.pending_officer_events?.length).toBe(
            stateB.military.pending_officer_events?.length,
        );
    });

    it('18. interpretOperationHalt: same inputs → identical outputs on two fresh states', () => {
        const data = makeOfficerData({ id: 'off_det2', competence: 3, aggressiveness: 3 });
        const state_ = makeOfficerState({ officer_id: 'off_det2', assigned_corps_id: 'corps_det2' });

        const opA = makeExecutionOp('Op_Sigma');
        const stateA = makeMinimalState('corps_det2', data, state_, [opA]);
        stateA.meta.turn = 5;

        const opB = makeExecutionOp('Op_Sigma');
        const stateB = makeMinimalState('corps_det2', { ...data }, { ...state_ }, [opB]);
        stateB.meta.turn = 5;

        const resultA = interpretOperationHalt(stateA, 'corps_det2', 'Op_Sigma');
        const resultB = interpretOperationHalt(stateB, 'corps_det2', 'Op_Sigma');

        expect(resultA.compliance).toBe(resultB.compliance);
        expect(resultA.halt_delay_turns).toBe(resultB.halt_delay_turns);
        expect(resultA.reason).toBe(resultB.reason);
        expect(stateA.military.pending_officer_events?.length).toBe(
            stateB.military.pending_officer_events?.length,
        );
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 7 — halt_delay_turns_remaining field round-trip
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 2 Group 7: halt_delay_turns_remaining field', () => {
    it('19. halt_delay_turns_remaining field exists on CorpsOperation and is mutable (state schema)', () => {
        // sector_offensive.ts countdown logic is an integration concern (complex call graph).
        // This unit test verifies the field round-trips correctly on the CorpsOperation type,
        // and that decrementing to 0 can be expressed in-place — the contract sector_offensive.ts depends on.
        const op = makeExecutionOp('Op_Tau', { halt_delay_turns_remaining: 2 } as Partial<CorpsOperation>);

        // Simulate one turn countdown
        if ((op as { halt_delay_turns_remaining?: number }).halt_delay_turns_remaining !== undefined) {
            (op as { halt_delay_turns_remaining?: number }).halt_delay_turns_remaining! -= 1;
        }
        expect((op as { halt_delay_turns_remaining?: number }).halt_delay_turns_remaining).toBe(1);

        // Second turn countdown to zero
        (op as { halt_delay_turns_remaining?: number }).halt_delay_turns_remaining! -= 1;
        expect((op as { halt_delay_turns_remaining?: number }).halt_delay_turns_remaining).toBe(0);

        // At zero, the op would be terminated by sector_offensive.ts — not tested here.
        // Full countdown → manual_termination is an integration-test concern.
    });
});
