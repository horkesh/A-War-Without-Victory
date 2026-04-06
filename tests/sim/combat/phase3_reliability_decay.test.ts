/**
 * Tests for v0.8.3 Phase 3 — reliabilityModifier wiring, warlord supersession, decay step.
 *
 * Covers:
 * Suite A — reliabilityModifier wiring in stance interpretation (3 tests):
 *   A1. High pol_rel=5 → higher compliance score than pol_rel=1 (opposing stance)
 *   A2. Low pol_rel=1 (refusal territory) → -0.20 pushes score below refusal threshold
 *   A3. Neutral pol_rel=3 → modifier=0, same result as before wiring
 *
 * Suite B — warlord supersession (4 tests):
 *   B1. RBiH, pol_rel=2, turn=10, warlord_friction_end_week=60 → total modifier=-0.25
 *   B2. RBiH, pol_rel=2, turn=70, warlord_friction_end_week=60 → warlord NOT applied
 *   B3. RS, pol_rel=2, turn=10, warlord_friction_end_week=60 → warlord NOT applied
 *   B4. RBiH, pol_rel=3, turn=10 → warlord NOT applied (pol_rel > 2)
 *
 * Suite C — decay: cowed expiry (2 tests):
 *   C1. cowed_until_turn=5, current turn=6 → after decay: cowed cleared, override_count=0
 *   C2. cowed_until_turn=10, current turn=6 → cowed_until_turn still set
 *
 * Suite D — decay: stale event cleanup (3 tests):
 *   D1. acknowledged event from turn=1, current turn=12 → removed (>8 turns ago)
 *   D2. acknowledged event from turn=5, current turn=12 → NOT removed (7 turns ago)
 *   D3. unacknowledged event from turn=1, current turn=12 → NOT removed
 *
 * Suite E — halt_delay sanity: decay step does NOT touch halt_delay (1 test):
 *   E1. Decay step body does not reference halt_delay_turns_remaining
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import {
    interpretStanceOrder,
} from '../../../src/sim/combat/order_interpretation.js';
import { warPhases } from '../../../src/sim/turn_phases/war_phases.js';
import type { GameState, CorpsCommandState } from '../../../src/state/game_state.js';
import type { NamedOfficer, NamedOfficerState, PendingOfficerEvent } from '../../../src/state/officer_types.js';
import type { TurnContext, TurnReport } from '../../../src/sim/turn_pipeline_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// Shared fixture helpers (mirrors order_interpretation.test.ts pattern)
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
    turn = 10,
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
            turn,
            seed: 'test',
            phase: 'war',
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

/**
 * Build a minimal state with war_timeline.officer_config for warlord tests.
 */
function makeStateWithTimeline(
    corpsId: string,
    officerData: NamedOfficer,
    officerState: NamedOfficerState,
    turn: number,
    warlordFrictionEndWeek: number,
): GameState {
    const base = makeMinimalState(corpsId, officerData, officerState, turn);
    (base.military as unknown as Record<string, unknown>).war_timeline = {
        officer_config: {
            RBiH: {
                warlord_friction_end_week: warlordFrictionEndWeek,
            },
        },
    };
    return base;
}

/**
 * Find and invoke the decay-officer-interpretation-state step from warPhases.
 */
function runDecayStep(state: GameState): void {
    const step = warPhases.find(p => p.name === 'decay-officer-interpretation-state');
    if (!step) throw new Error('decay-officer-interpretation-state step not found in warPhases');

    // Minimal TurnContext — the decay step only uses context.state
    const fakeContext = {
        state,
        rng: null,
        input: {},
        report: { seed: 'test', phases: [] } as unknown as TurnReport,
    } as unknown as TurnContext;

    step.run(fakeContext);
}

// ═══════════════════════════════════════════════════════════════════════════
// Suite A — reliabilityModifier wiring in stance interpretation
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3 Suite A: reliabilityModifier wiring in stance interpretation', () => {
    it('A1. pol_rel=5 gets higher compliance score (better outcome) than pol_rel=1 on opposing stance', () => {
        // Setup: agg=1 → preferred=defensive; ordered=offensive → large gap, borderline result
        // pol_rel=5 → modifier=+0.20; pol_rel=1 → modifier=-0.20
        // comp=3, agg=1: baseCompliance=0.45+3*0.10=0.75, gap=2, gapPenalty=0.50, raw=0.25
        // pol_rel=5: 0.25+0.20=0.45 → modified compliance (>= 0.50? No: 0.45 is partial, >= PARTIAL=0.25)
        //   Actually score=0.45 → >= PARTIAL(0.25) but < MODIFIED(0.50) → partial
        // pol_rel=1: 0.25-0.20=0.05 → < PARTIAL(0.25) → refused
        // pol_rel=5 outcome is better than pol_rel=1 outcome.
        const highRelData = makeOfficerData({ id: 'off_a1h', competence: 3, aggressiveness: 1, political_reliability: 5 });
        const lowRelData = makeOfficerData({ id: 'off_a1l', competence: 3, aggressiveness: 1, political_reliability: 1 });

        const highRelState = makeOfficerState({ officer_id: 'off_a1h', assigned_corps_id: 'corps_a1h' });
        const lowRelState = makeOfficerState({ officer_id: 'off_a1l', assigned_corps_id: 'corps_a1l' });

        const highRelGameState = makeMinimalState('corps_a1h', highRelData, highRelState);
        const lowRelGameState = makeMinimalState('corps_a1l', lowRelData, lowRelState);

        const highResult = interpretStanceOrder(highRelGameState, 'corps_a1h', 'offensive');
        const lowResult = interpretStanceOrder(lowRelGameState, 'corps_a1l', 'offensive');

        // pol_rel=5 should produce a better (or equal) compliance outcome than pol_rel=1
        // Compliance rank: full > modified > partial > refused
        const complianceRank: Record<string, number> = { full: 4, modified: 3, partial: 2, refused: 1 };
        expect(complianceRank[highResult.compliance]!).toBeGreaterThan(complianceRank[lowResult.compliance]!);

        // Specifically: pol_rel=1 should refuse, pol_rel=5 should not refuse
        expect(lowResult.compliance).toBe('refused');
        expect(highResult.compliance).not.toBe('refused');
    });

    it('A2. pol_rel=1 pushes score below refusal threshold where pol_rel=3 would partially comply', () => {
        // comp=4, agg=1: baseCompliance=0.45+4*0.10=0.85, gap=2, gapPenalty=0.50, raw=0.35
        // pol_rel=3: modifier=0 → 0.35 → >= PARTIAL(0.25) → partial compliance
        // pol_rel=1: modifier=-0.20 → 0.15 → < PARTIAL(0.25) → refused
        const neutralRelData = makeOfficerData({ id: 'off_a2n', competence: 4, aggressiveness: 1, political_reliability: 3 });
        const lowRelData = makeOfficerData({ id: 'off_a2l', competence: 4, aggressiveness: 1, political_reliability: 1 });

        const neutralRelState = makeOfficerState({ officer_id: 'off_a2n', assigned_corps_id: 'corps_a2n' });
        const lowRelState = makeOfficerState({ officer_id: 'off_a2l', assigned_corps_id: 'corps_a2l' });

        const neutralGameState = makeMinimalState('corps_a2n', neutralRelData, neutralRelState);
        const lowGameState = makeMinimalState('corps_a2l', lowRelData, lowRelState);

        const neutralResult = interpretStanceOrder(neutralGameState, 'corps_a2n', 'offensive');
        const lowResult = interpretStanceOrder(lowGameState, 'corps_a2l', 'offensive');

        // pol_rel=3 partially complies; pol_rel=1 refuses
        expect(neutralResult.compliance).toBe('partial');
        expect(lowResult.compliance).toBe('refused');
    });

    it('A3. pol_rel=3 (neutral) produces modifier=0, same outcome as unmodified baseline', () => {
        // comp=3, agg=3, ordered=offensive, gap=1
        // baseCompliance=0.45+3*0.10=0.75, gapPenalty=0.25, raw=0.50
        // pol_rel=3: modifier=0 → 0.50 exactly → modified compliance
        // This is the same result as before Phase 3 wiring (modifier was 0 in seam).
        const neutralData = makeOfficerData({ id: 'off_a3', competence: 3, aggressiveness: 3, political_reliability: 3 });
        const neutralState = makeOfficerState({ officer_id: 'off_a3', assigned_corps_id: 'corps_a3' });
        const gameState = makeMinimalState('corps_a3', neutralData, neutralState);

        const result = interpretStanceOrder(gameState, 'corps_a3', 'offensive');

        expect(result.compliance).toBe('modified');
        expect(result.effective_stance).toBe('offensive');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite B — warlord supersession
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3 Suite B: warlord supersession', () => {
    it('B1. RBiH, pol_rel=2, turn=10 < warlord_end=60 → total modifier=-0.25, refused stance', () => {
        // base modifier = (2-3)*0.10 = -0.10
        // warlord modifier = -0.15
        // total = -0.25
        // comp=3, agg=1, ordered=offensive, gap=2
        // base compliance=0.45+3*0.10=0.75, gapPenalty=0.50, raw before rel=0.25
        // with rel modifier -0.25: 0.25 + (-0.25) = 0.00 → < PARTIAL → refused
        const data = makeOfficerData({
            id: 'off_b1',
            faction: 'RBiH',
            competence: 3,
            aggressiveness: 1,
            political_reliability: 2,
        });
        const officerState = makeOfficerState({ officer_id: 'off_b1', assigned_corps_id: 'corps_b1' });
        const state = makeStateWithTimeline('corps_b1', data, officerState, 10, 60);

        const result = interpretStanceOrder(state, 'corps_b1', 'offensive');

        // With -0.25 modifier the score drops to 0.00 — should refuse
        expect(result.compliance).toBe('refused');
        expect(result.effective_stance).toBe('defensive');
    });

    it('B2. RBiH, pol_rel=2, turn=70 >= warlord_end=60 → WARLORD_MODIFIER not applied', () => {
        // base modifier = -0.10 only, no warlord penalty
        // comp=3, agg=1, ordered=offensive
        // score = 0.25 + (-0.10) = 0.15 → < PARTIAL → still refused due to gap
        // But specifically: turn >= end_week means warlord is NOT applied.
        // We verify by checking that partial compliance is possible with different params
        // where base-only gives >= PARTIAL but warlord would push below.
        // comp=4, agg=1: raw=0.85-0.50=0.35, base_rel=-0.10 → 0.25 >= PARTIAL → partial
        // with warlord: 0.35-0.25=0.10 < PARTIAL → refused
        const data = makeOfficerData({
            id: 'off_b2',
            faction: 'RBiH',
            competence: 4,
            aggressiveness: 1,
            political_reliability: 2,
        });
        const officerState = makeOfficerState({ officer_id: 'off_b2', assigned_corps_id: 'corps_b2' });
        // turn=70 >= warlord_end=60 → no warlord modifier
        const state = makeStateWithTimeline('corps_b2', data, officerState, 70, 60);

        const result = interpretStanceOrder(state, 'corps_b2', 'offensive');

        // base_rel=-0.10 only: 0.35-0.10=0.25 → exactly PARTIAL → partial compliance
        expect(result.compliance).toBe('partial');
    });

    it('B3. RS officer, pol_rel=2, turn=10 → WARLORD_MODIFIER not applied (wrong faction)', () => {
        // Warlord supersession is RBiH-only.
        // comp=4, agg=1, pol_rel=2: base_rel=-0.10, no warlord → same as B2 (partial)
        const data = makeOfficerData({
            id: 'off_b3',
            faction: 'RS',
            competence: 4,
            aggressiveness: 1,
            political_reliability: 2,
        });
        const officerState = makeOfficerState({ officer_id: 'off_b3', assigned_corps_id: 'corps_b3' });
        const state = makeStateWithTimeline('corps_b3', data, officerState, 10, 60);

        const result = interpretStanceOrder(state, 'corps_b3', 'offensive');

        // RS officer: only base modifier=-0.10, score=0.25 → partial (not refused)
        expect(result.compliance).toBe('partial');
        // Crucially not refused (warlord would have made it 0.00 → refused)
        expect(result.compliance).not.toBe('refused');
    });

    it('B4. RBiH, pol_rel=3, turn=10 → WARLORD_MODIFIER not applied (pol_rel > 2)', () => {
        // Warlord only triggers on pol_rel <= 2.
        // comp=3, agg=3, ordered=offensive: score=0.50 → modified (no warlord help or hurt)
        const data = makeOfficerData({
            id: 'off_b4',
            faction: 'RBiH',
            competence: 3,
            aggressiveness: 3,
            political_reliability: 3,
        });
        const officerState = makeOfficerState({ officer_id: 'off_b4', assigned_corps_id: 'corps_b4' });
        const state = makeStateWithTimeline('corps_b4', data, officerState, 10, 60);

        const result = interpretStanceOrder(state, 'corps_b4', 'offensive');

        // pol_rel=3 → modifier=0, warlord does not apply → same as A3 baseline
        expect(result.compliance).toBe('modified');
        expect(result.effective_stance).toBe('offensive');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite C — decay: cowed expiry
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3 Suite C: decay — cowed expiry', () => {
    it('C1. cowed_until_turn=5, current turn=6 → after decay: cowed_until_turn cleared, override_count=0', () => {
        const data = makeOfficerData({ id: 'off_c1' });
        const officerState = makeOfficerState({
            officer_id: 'off_c1',
            assigned_corps_id: 'corps_c1',
            cowed_until_turn: 5,
            override_count: 2,
        });
        const state = makeMinimalState('corps_c1', data, officerState, 6);

        runDecayStep(state);

        const mutatedState = state.military.named_officers!['off_c1']!;
        expect(mutatedState.cowed_until_turn).toBeUndefined();
        expect(mutatedState.override_count).toBe(0);
    });

    it('C2. cowed_until_turn=10, current turn=6 → cowed_until_turn still set (not expired)', () => {
        const data = makeOfficerData({ id: 'off_c2' });
        const officerState = makeOfficerState({
            officer_id: 'off_c2',
            assigned_corps_id: 'corps_c2',
            cowed_until_turn: 10,
            override_count: 2,
        });
        const state = makeMinimalState('corps_c2', data, officerState, 6);

        runDecayStep(state);

        const mutatedState = state.military.named_officers!['off_c2']!;
        expect(mutatedState.cowed_until_turn).toBe(10);
        // override_count should remain unchanged (not expired)
        expect(mutatedState.override_count).toBe(2);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite D — decay: stale event cleanup
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3 Suite D: decay — stale acknowledged event cleanup', () => {
    it('D1. acknowledged event from turn=1, current turn=12 → event removed (11 turns > 8 window)', () => {
        const data = makeOfficerData({ id: 'off_d1' });
        const officerState = makeOfficerState({ officer_id: 'off_d1', assigned_corps_id: 'corps_d1' });
        const state = makeMinimalState('corps_d1', data, officerState, 12);

        const staleEvent: PendingOfficerEvent = {
            event_id: 'corps_d1:stance:1',
            type: 'order_refused',
            faction: 'RBiH',
            turn: 1,
            officer_id: 'off_d1',
            corps_id: 'corps_d1',
            acknowledged: true,
        };
        state.military.pending_officer_events = [staleEvent];

        runDecayStep(state);

        expect(state.military.pending_officer_events).toHaveLength(0);
    });

    it('D2. acknowledged event from turn=5, current turn=12 → event NOT removed (7 turns, within window)', () => {
        // Filter condition: acknowledged && turn < currentTurn - 8 → 5 < 12-8=4 → FALSE, kept
        const data = makeOfficerData({ id: 'off_d2' });
        const officerState = makeOfficerState({ officer_id: 'off_d2', assigned_corps_id: 'corps_d2' });
        const state = makeMinimalState('corps_d2', data, officerState, 12);

        const recentEvent: PendingOfficerEvent = {
            event_id: 'corps_d2:stance:5',
            type: 'order_modified',
            faction: 'RBiH',
            turn: 5,
            officer_id: 'off_d2',
            corps_id: 'corps_d2',
            acknowledged: true,
        };
        state.military.pending_officer_events = [recentEvent];

        runDecayStep(state);

        expect(state.military.pending_officer_events).toHaveLength(1);
        expect(state.military.pending_officer_events![0]!.event_id).toBe('corps_d2:stance:5');
    });

    it('D3. unacknowledged event from turn=1, current turn=12 → event NOT removed', () => {
        // acknowledged=false means the player hasn't seen it yet — never discard unacknowledged
        const data = makeOfficerData({ id: 'off_d3' });
        const officerState = makeOfficerState({ officer_id: 'off_d3', assigned_corps_id: 'corps_d3' });
        const state = makeMinimalState('corps_d3', data, officerState, 12);

        const unacknowledgedEvent: PendingOfficerEvent = {
            event_id: 'corps_d3:stance:1',
            type: 'order_pushback',
            faction: 'RBiH',
            turn: 1,
            officer_id: 'off_d3',
            corps_id: 'corps_d3',
            acknowledged: false,
        };
        state.military.pending_officer_events = [unacknowledgedEvent];

        runDecayStep(state);

        expect(state.military.pending_officer_events).toHaveLength(1);
        expect(state.military.pending_officer_events![0]!.acknowledged).toBe(false);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Suite E — halt_delay sanity: decay step does NOT touch halt_delay
// ═══════════════════════════════════════════════════════════════════════════

describe('Phase 3 Suite E: halt_delay sanity — decay step scope guard', () => {
    it('E1. Decay step does not decrement halt_delay_turns_remaining (belongs to sector_offensive)', () => {
        // The decay step comment explicitly states:
        // "NOTE: halt_delay_turns_remaining countdown stays in sector_offensive.ts (must run pre-combat)."
        // We verify that after running decay, a halt_delay_turns_remaining on an active operation
        // is left completely untouched.
        const data = makeOfficerData({ id: 'off_e1' });
        const officerState = makeOfficerState({ officer_id: 'off_e1', assigned_corps_id: 'corps_e1' });
        const state = makeMinimalState('corps_e1', data, officerState, 10);

        // Inject a fake operation with halt_delay_turns_remaining
        const corpsCmd = state.military.corps_command!['corps_e1']!;
        (corpsCmd as unknown as Record<string, unknown>).active_operations = [
            {
                name: 'op_test',
                phase: 'execution',
                momentum: 3,
                halt_delay_turns_remaining: 2,
            },
        ];

        runDecayStep(state);

        // The decay step must not have touched halt_delay_turns_remaining
        const ops = (corpsCmd as unknown as { active_operations: Array<{ halt_delay_turns_remaining: number }> }).active_operations;
        expect(ops[0]!.halt_delay_turns_remaining).toBe(2);
    });
});
