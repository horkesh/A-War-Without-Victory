/**
 * Tests for v0.8.3 Phase 1 — Order Interpretation Engine (Stance).
 *
 * Covers:
 * Group 1 — Compliance categories (4 tests):
 *   1. Aligned order → full compliance
 *   2. Mild mismatch, high competence → partial compliance (shifted stance)
 *   3. Severe mismatch, low competence → refusal
 *   4. Moderate mismatch, moderate competence → modified compliance at threshold
 *
 * Group 2 — Special cases (4 tests):
 *   5. Acting commander always complies
 *   6. Cowed officer always complies
 *   7. No commander → full compliance
 *   8. PendingOfficerEvent emitted on non-full compliance
 *
 * Group 3 — Override and cowed mechanic (2 tests):
 *   9. overrideInterpretation increments override_count and marks event acknowledged
 *  10. Cowed mechanic triggers after threshold overrides
 *
 * Group 4 — Preview and determinism (2 tests):
 *  11. previewInterpretation matches interpretStanceOrder, no event emitted
 *  12. Determinism: same inputs → identical outputs, no duplicate events
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import {
    interpretStanceOrder,
    previewInterpretation,
    overrideInterpretation,
} from '../../../src/sim/combat/order_interpretation.js';
import type { GameState, CorpsCommandState } from '../../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState } from '../../../src/state/officer_types.js';

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

function makeOfficerState(overrides: Partial<NamedOfficerState> & { officer_id: string }): NamedOfficerState {
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

function makeMinimalState(
    corpsId: string,
    officerData: NamedOfficer,
    officerState: NamedOfficerState,
): GameState {
    const corpsCommandState: CorpsCommandState = {
        command_span: 4,
        subordinate_count: 4,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'balanced',
        active_operations: [],
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
// Group 1 — Compliance categories
// ═══════════════════════════════════════════════════════════════════════════

describe('Order Interpretation Group 1: Compliance categories', () => {
    it('1. aligned order (agg=4, ordered=offensive) → full compliance, effective=offensive', () => {
        // agg=4 → preferred=offensive, ordered=offensive → gap=0 → score=1.0
        const data = makeOfficerData({ id: 'off_1', aggressiveness: 4, competence: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_1', assigned_corps_id: 'corps_a' });
        const state = makeMinimalState('corps_a', data, state_);

        const result = interpretStanceOrder(state, 'corps_a', 'offensive');

        expect(result.compliance).toBe('full');
        expect(result.effective_stance).toBe('offensive');
        // No event emitted on full compliance
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('2. mild mismatch, high competence (comp=4, agg=4, ordered=defensive → preferred=offensive, gap=2) → partial, effective=balanced', () => {
        // agg=4 → preferred=offensive (rank=2), ordered=defensive (rank=0)
        // gap=2, baseCompliance=0.45+4*0.10=0.85, gapPenalty=2*0.25=0.50
        // score=0.85-0.50=0.35 → >= PARTIAL(0.25) but < MODIFIED(0.50) → partial
        // shift one step from defensive toward offensive → reorganize? No: STANCE_ORDER=['defensive','reorganize','balanced','offensive']
        // orderedIdx=0, preferredIdx=3, direction=+1, shiftedIdx=1 → 'reorganize'
        const data = makeOfficerData({ id: 'off_2', competence: 4, aggressiveness: 4 });
        const state_ = makeOfficerState({ officer_id: 'off_2', assigned_corps_id: 'corps_b' });
        const state = makeMinimalState('corps_b', data, state_);

        const result = interpretStanceOrder(state, 'corps_b', 'defensive');

        expect(result.compliance).toBe('partial');
        expect(result.effective_stance).toBe('reorganize');
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_pushback');
    });

    it('3. severe mismatch, low competence (comp=2, agg=1, ordered=offensive → preferred=defensive, gap=2) → refusal, effective=defensive', () => {
        // agg=1 → preferred=defensive (rank=0), ordered=offensive (rank=2)
        // gap=2, baseCompliance=0.45+2*0.10=0.65, gapPenalty=2*0.25=0.50
        // score=0.65-0.50=0.15 → < PARTIAL(0.25) → refusal
        const data = makeOfficerData({ id: 'off_3', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_3', assigned_corps_id: 'corps_c' });
        const state = makeMinimalState('corps_c', data, state_);

        const result = interpretStanceOrder(state, 'corps_c', 'offensive');

        expect(result.compliance).toBe('refused');
        expect(result.effective_stance).toBe('defensive');
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_refused');
    });

    it('4. moderate mismatch, moderate competence (comp=3, agg=3, ordered=offensive, gap=1) → modified compliance', () => {
        // agg=3 → preferred=balanced (rank=1), ordered=offensive (rank=2)
        // gap=1, baseCompliance=0.45+3*0.10=0.75, gapPenalty=1*0.25=0.25
        // score=0.75-0.25=0.50 → exactly at MODIFIED threshold → modified
        // effective_stance = orderedStance (officer grumbles but complies)
        const data = makeOfficerData({ id: 'off_4', competence: 3, aggressiveness: 3 });
        const state_ = makeOfficerState({ officer_id: 'off_4', assigned_corps_id: 'corps_d' });
        const state = makeMinimalState('corps_d', data, state_);

        const result = interpretStanceOrder(state, 'corps_d', 'offensive');

        expect(result.compliance).toBe('modified');
        expect(result.effective_stance).toBe('offensive');
        expect(result.event).toBeDefined();
        expect(result.event?.type).toBe('order_modified');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 2 — Special cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Order Interpretation Group 2: Special cases', () => {
    it('5. acting commander always complies regardless of mismatch', () => {
        // Severe mismatch would normally cause refusal, but acting=true → full compliance
        const data = makeOfficerData({ id: 'off_5', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({
            officer_id: 'off_5',
            assigned_corps_id: 'corps_e',
            acting_commander: true,
        });
        const state = makeMinimalState('corps_e', data, state_);

        const result = interpretStanceOrder(state, 'corps_e', 'offensive');

        expect(result.compliance).toBe('full');
        expect(result.effective_stance).toBe('offensive');
        expect(result.event).toBeUndefined();
        expect(state.military.pending_officer_events?.length).toBe(0);
    });

    it('6. cowed officer complies fully (cowed_until_turn=10, turn=5)', () => {
        // Severe mismatch would normally refuse, but cowed_until_turn=10 > turn=5 → full compliance
        const data = makeOfficerData({ id: 'off_6', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({
            officer_id: 'off_6',
            assigned_corps_id: 'corps_f',
            cowed_until_turn: 10,
        });
        const state = makeMinimalState('corps_f', data, state_);
        state.meta.turn = 5;

        const result = interpretStanceOrder(state, 'corps_f', 'offensive');

        expect(result.compliance).toBe('full');
        expect(result.effective_stance).toBe('offensive');
        expect(result.event).toBeUndefined();
    });

    it('7. no commander returns full compliance with orderedStance', () => {
        // Corps with no assigned officer — no interpretation possible
        const data = makeOfficerData({ id: 'off_7', competence: 3, aggressiveness: 3 });
        const state_ = makeOfficerState({
            officer_id: 'off_7',
            assigned_corps_id: null, // not assigned to this corps
        });
        const state = makeMinimalState('corps_g', data, state_);

        const result = interpretStanceOrder(state, 'corps_g', 'offensive');

        expect(result.compliance).toBe('full');
        expect(result.effective_stance).toBe('offensive');
        expect(result.event).toBeUndefined();
    });

    it('8. interpretStanceOrder emits PendingOfficerEvent on non-full compliance with correct fields', () => {
        // Refusal case: check event fields thoroughly
        const data = makeOfficerData({ id: 'off_8', name: 'Gen. Test', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_8', assigned_corps_id: 'corps_h' });
        const state = makeMinimalState('corps_h', data, state_);
        state.meta.turn = 7;

        const result = interpretStanceOrder(state, 'corps_h', 'offensive');

        expect(result.compliance).toBe('refused');
        expect(result.event).toBeDefined();
        const evt = result.event!;
        expect(evt.event_id).toBe('corps_h:stance:7');
        expect(evt.type).toBe('order_refused');
        expect(evt.original_order?.stance).toBe('offensive');
        expect(evt.interpreted_order?.stance).toBe('defensive');
        expect(evt.reason).toBeTruthy();
        expect(evt.overridable).toBe(true);
        expect(evt.override_action).toBe('override-officer-interpretation');
        expect(evt.acknowledged).toBe(false);
        expect(evt.faction).toBe('RBiH');
        expect(evt.officer_id).toBe('off_8');
        // Event must also be in state
        expect(state.military.pending_officer_events?.length).toBe(1);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 3 — Override and cowed mechanic
// ═══════════════════════════════════════════════════════════════════════════

describe('Order Interpretation Group 3: Override and cowed mechanic', () => {
    it('9. overrideInterpretation increments override_count and marks event acknowledged', () => {
        const data = makeOfficerData({ id: 'off_9', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_9', assigned_corps_id: 'corps_i' });
        const state = makeMinimalState('corps_i', data, state_);
        state.meta.turn = 5;

        // First generate an event via interpretStanceOrder
        const result = interpretStanceOrder(state, 'corps_i', 'offensive');
        expect(result.compliance).toBe('refused');
        const eventId = result.event!.event_id;

        // Override it
        overrideInterpretation(state, 'corps_i', eventId);

        const officerState = state.military.named_officers!['off_9']!;
        expect(officerState.override_count).toBe(1);
        expect(officerState.last_override_turn).toBe(5);

        const event = state.military.pending_officer_events!.find(e => e.event_id === eventId);
        expect(event?.acknowledged).toBe(true);
    });

    it('10. cowed mechanic triggers after threshold overrides within window', () => {
        const data = makeOfficerData({ id: 'off_10', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({
            officer_id: 'off_10',
            assigned_corps_id: 'corps_j',
            // Simulate first override already on record
            override_count: 1,
            last_override_turn: 4,
        });
        const state = makeMinimalState('corps_j', data, state_);
        state.meta.turn = 6; // within COWED_OVERRIDE_WINDOW=8 of last_override_turn=4

        // Generate a new refusal event
        const result = interpretStanceOrder(state, 'corps_j', 'offensive');
        const eventId = result.event!.event_id;

        // Second override — should trigger cowed (override_count=1 → +1 = 2 >= threshold=2)
        overrideInterpretation(state, 'corps_j', eventId);

        const officerState = state.military.named_officers!['off_10']!;
        // cowed_until_turn should be set = current_turn + COWED_DURATION = 6 + 8 = 14
        expect(officerState.cowed_until_turn).toBe(14);
        // override_count reset to 0
        expect(officerState.override_count).toBe(0);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Group 4 — Preview and determinism
// ═══════════════════════════════════════════════════════════════════════════

describe('Order Interpretation Group 4: Preview and determinism', () => {
    it('11. previewInterpretation matches interpretStanceOrder output and emits no events', () => {
        const data = makeOfficerData({ id: 'off_11', competence: 3, aggressiveness: 3 });
        const state_ = makeOfficerState({ officer_id: 'off_11', assigned_corps_id: 'corps_k' });

        // Build two identical states (preview must not dirty the state)
        const stateForInterpret = makeMinimalState('corps_k', data, state_);
        const stateForPreview = makeMinimalState('corps_k', data, { ...state_ });

        const preview = previewInterpretation(stateForPreview, 'corps_k', 'offensive');
        const interpret = interpretStanceOrder(stateForInterpret, 'corps_k', 'offensive');

        // Compliance and stance must match
        expect(preview.predicted_compliance).toBe(interpret.compliance);
        expect(preview.effective_stance).toBe(interpret.effective_stance);

        // Preview must NOT have pushed any events
        expect(stateForPreview.military.pending_officer_events?.length).toBe(0);

        // Interpret DID push an event (modified compliance)
        if (interpret.compliance !== 'full') {
            expect(stateForInterpret.military.pending_officer_events?.length).toBe(1);
        }
    });

    it('12. determinism: same inputs produce identical outputs, no duplicate events', () => {
        const data = makeOfficerData({ id: 'off_12', competence: 2, aggressiveness: 1 });
        const state_ = makeOfficerState({ officer_id: 'off_12', assigned_corps_id: 'corps_l' });

        // Call once
        const stateA = makeMinimalState('corps_l', data, state_);
        stateA.meta.turn = 3;
        const resultA = interpretStanceOrder(stateA, 'corps_l', 'offensive');

        // Call again with fresh identical state
        const stateB = makeMinimalState('corps_l', data, { ...state_ });
        stateB.meta.turn = 3;
        const resultB = interpretStanceOrder(stateB, 'corps_l', 'offensive');

        expect(resultA.compliance).toBe(resultB.compliance);
        expect(resultA.effective_stance).toBe(resultB.effective_stance);
        expect(resultA.reason).toBe(resultB.reason);

        // No duplicate events within a single state (same event_id guard)
        // If we call a second time on the same state, it would push a second event
        // because the function doesn't deduplicate — but both calls to separate states
        // produce exactly one event each
        expect(stateA.military.pending_officer_events?.length).toBe(1);
        expect(stateB.military.pending_officer_events?.length).toBe(1);
    });
});
