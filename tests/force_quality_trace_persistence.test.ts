/**
 * Phase 4 fix-up tests (FORCE QUALITY FOUNDATION milestone close-out).
 *
 * Verifies that `decision_trace.force_quality_traits` is preserved across
 * non-offensive turns. The bug surface lives at the end of `buildUpdatedState`
 * in `src/sim/combat/commander/emit.ts`: previously the assignment was
 *
 *     decision_trace: planDecision.decision_trace ?? briefing.previous_state?.decision_trace
 *
 * which silently dropped the previous turn's `force_quality_traits` whenever
 * `managePlan` early-returned (defensive / exhaustion / fatigue / role /
 * major-op-active branches). Strategy A: one-way merge — a new trace with
 * explicit `force_quality_traits` always wins; if the new trace lacks the
 * field, fall back to the previous trace's value.
 *
 * Tier 2 gap-finder finding: `tools/diagnostics/_force_quality_phase5b_tier1.md`.
 *
 * Determinism: pure function exercise; no Math.random, no Date.now.
 */

import { describe, expect, it } from 'vitest';
import { emitCommanderOutput } from '../src/sim/combat/commander/emit.js';

// ── Fixture helpers ─────────────────────────────────────────────────────────

function makeForceQualityTraits(operationReadiness: number): any {
    return {
        traits: {
            operation_readiness: operationReadiness,
            axis_coordination: 0.6,
            staging_reliability: 0.6,
            sustainment: 0.6,
            command_cohesion: 0.6,
            equipment_serviceability: 0.6,
            officer_quality: 0.6,
        },
        inputs: {
            faction: 'RBiH',
            corps_id: 'test_corps',
            brigade_count: 4,
            mean_officer_quality: 0.6,
            faction_officer_maturity: 0.5,
            mean_cohesion: 60,
            mean_morale: 60,
            mean_exhaustion: 0,
            tank_op_fraction: 0.5,
            artillery_op_fraction: 0.5,
        },
        applied_gate: 'none',
    };
}

function makePreviousState(traitsSnapshot: any): any {
    return {
        zone_assessments: [],
        threat_assessment: { threatened_zones: [], global_threat_level: 'low' },
        force_assessment: { total_brigades: 0 },
        current_plan: null,
        sector_activity_log: [],
        operation_history: [],
        intel_picture: {
            zone_confidence: {},
            offensive_signs: {},
            concentration_detected: {},
            last_updated_turn: 11,
        },
        garrison_budget: {},
        last_assessment_turn: 11,
        decision_trace: {
            turn: 11,
            winning_intent_id: 'launch_opportunity',
            candidates: [],
            hard_constraints: [],
            lessons_applied: [],
            relationships_applied: [],
            force_quality_traits: traitsSnapshot,
        },
    };
}

function makeBriefing(previousState: any | null): any {
    return {
        corps_id: 'test_corps',
        faction: 'RBiH',
        turn: 12,
        officer_personality: {
            aggression: 0.5,
            caution: 0.3,
            initiative: 0.3,
            competence: 0.5,
        },
        sectors: [],
        active_operations: [],
        previous_state: previousState,
    };
}

function callEmit(briefing: any, planDecision: any) {
    return emitCommanderOutput(
        briefing as any,
        [] as any, // zones
        { total_brigades: 0 } as any, // forces
        { zones: [], garrison_locks: [], surplus_pool: [] } as any, // allocation
        planDecision as any, // planDecision
        {
            stance_changes: [],
            reserve_shifts: [],
            reinforcement_requests: [],
            activity_entries: [],
            intel_picture: {
                zone_confidence: {},
                offensive_signs: {},
                concentration_detected: {},
                last_updated_turn: briefing.turn,
            },
        } as any, // decisions
        { threatened_zones: [], global_threat_level: 'low' } as any, // threats
        null, // beliefState
    );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('force_quality_traits persistence in decision_trace', () => {
    it('preserves previous force_quality_traits across non-offensive turns (early-return branch)', () => {
        // Simulate turn 11 having captured traits at operation_readiness=0.55,
        // then turn 12 takes a non-offensive early-return path (e.g. major op
        // active). The plan.ts early-return branches return a `decision_trace`
        // WITHOUT a `force_quality_traits` field — so the merge in emit.ts must
        // fall back to the previous turn's value.
        const previousTraits = makeForceQualityTraits(0.55);
        const previousState = makePreviousState(previousTraits);
        const briefing = makeBriefing(previousState);

        const planDecision = {
            plan: null,
            action: 'none' as const,
            reason: 'major operation already active for this corps',
            decision_trace: {
                turn: 12,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['major_operation_already_active'],
                lessons_applied: [],
                relationships_applied: [],
                // NB: no force_quality_traits — early-return branch never sets it.
            },
        };

        const output = callEmit(briefing, planDecision);
        const trace = output.updated_state.decision_trace!;

        expect(trace).toBeDefined();
        expect(trace.turn).toBe(12); // new trace, not the previous one
        expect(trace.hard_constraints).toEqual(['major_operation_already_active']);
        // Critical: traits preserved from previous turn.
        expect(trace.force_quality_traits).toBe(previousTraits);
        expect(trace.force_quality_traits!.traits.operation_readiness).toBe(0.55);
    });

    it('recomputes force_quality_traits on a fresh offensive turn (new traits win)', () => {
        // Turn 11 captured traits at 0.55. Turn 12 launches a new offensive plan,
        // so the offensive winner branch in plan.ts calls augmentTraceWithForceQuality
        // and returns a trace WITH fresh `force_quality_traits` at 0.70. The merge
        // must NOT overwrite the new value with the stale previous one.
        const previousTraits = makeForceQualityTraits(0.55);
        const previousState = makePreviousState(previousTraits);
        const briefing = makeBriefing(previousState);

        const newTraits = makeForceQualityTraits(0.70);
        const planDecision = {
            plan: null, // null is fine for this test — we only care about decision_trace plumbing
            action: 'none' as const,
            reason: 'no viable plan available',
            decision_trace: {
                turn: 12,
                winning_intent_id: 'launch_opportunity',
                candidates: [],
                hard_constraints: [],
                lessons_applied: [],
                relationships_applied: [],
                force_quality_traits: newTraits,
            },
        };

        const output = callEmit(briefing, planDecision);
        const trace = output.updated_state.decision_trace!;

        expect(trace).toBeDefined();
        expect(trace.force_quality_traits).toBe(newTraits);
        expect(trace.force_quality_traits!.traits.operation_readiness).toBe(0.70);
    });

    it('is deterministic — repeated invocation produces identical traits', () => {
        // Run case 1 twice and compare serialized output. No clocks, no random.
        const previousTraits = makeForceQualityTraits(0.55);

        function once() {
            const previousState = makePreviousState(previousTraits);
            const briefing = makeBriefing(previousState);
            const planDecision = {
                plan: null,
                action: 'none' as const,
                reason: 'major operation already active for this corps',
                decision_trace: {
                    turn: 12,
                    winning_intent_id: null,
                    candidates: [],
                    hard_constraints: ['major_operation_already_active'],
                    lessons_applied: [],
                    relationships_applied: [],
                },
            };
            const output = callEmit(briefing, planDecision);
            return JSON.stringify(output.updated_state.decision_trace);
        }

        const a = once();
        const b = once();
        expect(a).toEqual(b);
    });
});
