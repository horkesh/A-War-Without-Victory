/**
 * Tests for v0.8.1 Phase 6 — Decision Trace QA.
 *
 * Covers:
 * 1. Lifecycle traces in advanceExistingPlan() — 6 tests
 *    - abandon-by-viability
 *    - abandon-by-suspension-timeout
 *    - new-suspension
 *    - launched (ready → executing)
 *    - inert path (clearing abandoned plan) emits no trace
 *    - lifecycle traces always have relationships_applied: []
 * 2. formatDecisionTrace() — 5 tests
 *    - undefined returns "no trace"
 *    - winner/blocked/loser labels present
 *    - lifecycle annotation ([LAUNCHED], [ABANDONED])
 *    - determinism
 *    - formatTraceHeader returns single line
 * 3. Multi-turn causality integration — 2 tests
 *    - offensive_failure lesson suppresses stage_operation score (lesson_delta < 0)
 *    - offensive_failure lesson changes winner when score delta is decisive
 * 4. Trace structural invariant — 1 test
 *    - competition trace has ≥ 2 candidates when multiple intents are valid
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import type {
    FactionId,
    FormationId,
    FormationState,
} from '../../src/state/game_state.js';
import type {
    ZoneAssessment,
    ZoneId,
    ZonePosture,
    BrigadeEvaluation,
    ForceAssessment,
    OfficerPersonality,
    CommanderBriefing,
    CommanderPlan,
    CommanderState,
    CommanderLesson,
    CommanderBeliefState,
} from '../../src/sim/combat/commander/commander_state.js';
import {
    managePlan,
    selectWinningIntent,
    MIN_BRIGADES_FOR_PLAN,
    MAX_SUSPENSION_TURNS,
    CONCENTRATION_READY_THRESHOLD,
} from '../../src/sim/combat/commander/plan.js';
import {
    formatDecisionTrace,
    formatTraceHeader,
} from '../../src/sim/combat/commander/commander_debug.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../../src/sim/combat/bot_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — extracted to tests/_helpers/commander.ts (Phase 4/5 pattern).
// Aliased here for local readability. Phase-6 neutralPersonality kept local.
// ═══════════════════════════════════════════════════════════════════════════

import {
    makeCommanderBrigade as makeBrigade,
    makeCommanderZone as makeZone,
    makeCommanderEval as makeEval,
    makeCommanderForces as makeForces,
    makeCommanderMinimalSpatial as makeMinimalSpatial,
    makeCommanderMinimalState as makeMinimalState,
} from '../_helpers/commander.js';

const neutralPersonality: OfficerPersonality = {
    aggression: 0.5, caution: 0.5, initiative: 0.5, competence: 0.5,
};

function makeMinimalBriefing(overrides: Partial<CommanderBriefing> = {}): CommanderBriefing {
    return {
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        turn: 10,
        spatial: makeMinimalSpatial(),
        sectors: [],
        brigades: [makeBrigade()],
        supply_by_osid: null,
        ethnic_map: null,
        graph_analysis: null,
        front_geometry: null,
        intel_data: null,
        doctrine_stance: 'balanced',
        corps_stance: 'balanced',
        corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        avg_fatigue_pct: 0,
        brigades_above_fatigue_threshold: 0,
        enemy_equipment_summary: { tanks: 0, artillery: 0, infantry_only: true },
        adjacent_corps: [],
        officer_personality: neutralPersonality,
        pre_planned_ops: [],
        previous_state: null,
        active_operations: [],
        must_hold_osids: [],
        campaign_role: null,
        campaign_offensive_targets: [],
        campaign_hold_targets: [],
        campaign_stance_ceiling: null,
        campaign_sync_role: null,
        campaign_sync_targets: [],
        ...overrides,
    };
}

function makeSurplusPool(count: number, zoneId: ZoneId = 'zone:test_corps:0' as ZoneId): BrigadeEvaluation[] {
    return Array.from({ length: count }, (_, i) =>
        makeEval({
            brigade_id: `bde_${i}` as FormationId,
            current_zone: zoneId,
        }),
    );
}

function makeBeliefState(supplyConfidence: number): CommanderBeliefState {
    return {
        zone_beliefs: [],
        supply_continuity_confidence: supplyConfidence,
        subordinate_reliability: {},
        neighbor_support_confidence: {},
    };
}

/**
 * Build a minimal CommanderPlan for lifecycle testing.
 * All required fields set to safe defaults; callers override what they need.
 */
function makePlan(overrides: Partial<CommanderPlan> = {}): CommanderPlan {
    return {
        plan_id: 'plan_test_t10_test_op',
        objective_description: 'Test Operation',
        target_osids: ['op:test:test_1'],
        required_brigades: MIN_BRIGADES_FOR_PLAN,
        assigned_brigades: (['bde_0', 'bde_1', 'bde_2'] as FormationId[]),
        staging_zone: 'zone:test_corps:0' as ZoneId,
        status: 'concentrating',
        created_turn: 1,
        target_ready_turn: 5,
        concentration_progress: 0.5,
        viability_score: 1.0,
        source: 'pre_planned',
        ...overrides,
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Suite: v0.8.1 Phase 6 — Decision Trace QA
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 6 — Decision Trace QA', () => {

    // ─── Category 1: Lifecycle traces in advanceExistingPlan() ───────────────

    describe('Category 1: Lifecycle traces in advanceExistingPlan()', () => {

        it('abandon-by-viability emits decision_trace with plan_abandoned_viability', () => {
            // Target OSID not in any zone → computeViabilityScore returns 0.0 (staging zone not found)
            const plan = makePlan({
                target_osids: ['op:unknown:osid_not_in_zones'],
                staging_zone: 'zone:nonexistent:999' as ZoneId,
                assigned_brigades: (['bde_0', 'bde_1', 'bde_2'] as FormationId[]),
                required_brigades: MIN_BRIGADES_FOR_PLAN,
            });

            // Use a zone list that does NOT include the plan's staging zone
            // so viability returns 0.0 (below VIABILITY_ABANDON_THRESHOLD = 0.2)
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);
            const briefing = makeMinimalBriefing();
            const turn = 10;

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.hard_constraints).toContain('plan_abandoned_viability');
            expect(result.decision_trace!.candidates).toHaveLength(0);
            expect(result.decision_trace!.winning_intent_id).toBeNull();
        });

        it('abandon-by-suspension-timeout emits decision_trace with plan_abandoned_suspension_timeout', () => {
            // Plan has been suspended for MAX_SUSPENSION_TURNS already.
            // Trigger: previous_state.threat_assessment has a 'critical' threat on the staging zone
            // → checkSuspendConditions returns non-null, timeout branch fires.
            // Brigades must remain present (in surplusPool) so checkAbandonConditions passes.
            const suspendedSinceTurn = 1;
            const turn = suspendedSinceTurn + MAX_SUSPENSION_TURNS; // = 4

            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const stagingZoneId = 'zone:test_corps:0' as ZoneId;

            const plan = makePlan({
                status: 'suspended',
                suspended_since_turn: suspendedSinceTurn,
                staging_zone: stagingZoneId,
                assigned_brigades: surplusPool.map(e => e.brigade_id),
                required_brigades: MIN_BRIGADES_FOR_PLAN,
            });

            const zones = [makeZone({ zone_id: stagingZoneId, posture: 'balanced' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // Build a previous_state with a critical threat on the staging zone
            const previousState = makeMinimalState({
                threat_assessment: {
                    threatened_zones: [
                        {
                            zone_id: stagingZoneId,
                            threat_level: 'critical',
                            enemy_strength_estimate: 5000,
                            recommended_reinforcement: 2,
                        } as any,
                    ],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            });

            const briefing = makeMinimalBriefing({ previous_state: previousState });

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.hard_constraints).toContain('plan_abandoned_suspension_timeout');
            expect(result.decision_trace!.candidates).toHaveLength(0);
            expect(result.decision_trace!.winning_intent_id).toBeNull();
        });

        it('new-suspension emits decision_trace with plan_suspended_ prefix', () => {
            // Trigger suspension via critical threat on the staging zone.
            // checkSuspendConditions fires when previous_state.threat_assessment has
            // a 'critical' threat entry for the plan's staging_zone.
            // Brigades must be present (in surplusPool) so checkAbandonConditions passes.
            // plan.status = 'concentrating' → this is a fresh suspension, not a timeout.
            const stagingZoneId = 'zone:test_corps:0' as ZoneId;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);

            const plan = makePlan({
                status: 'concentrating',
                staging_zone: stagingZoneId,
                assigned_brigades: surplusPool.map(e => e.brigade_id),
                required_brigades: MIN_BRIGADES_FOR_PLAN,
                created_turn: 1,
                target_ready_turn: 10,
            });

            const zones = [makeZone({ zone_id: stagingZoneId, posture: 'balanced' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeMinimalState({
                threat_assessment: {
                    threatened_zones: [
                        {
                            zone_id: stagingZoneId,
                            threat_level: 'critical',
                            enemy_strength_estimate: 5000,
                            recommended_reinforcement: 2,
                        } as any,
                    ],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            });

            const briefing = makeMinimalBriefing({ previous_state: previousState });
            const turn = 5;

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.candidates).toHaveLength(0);
            const hasSuspendConstraint = result.decision_trace!.hard_constraints.some(
                c => c.startsWith('plan_suspended_')
            );
            expect(hasSuspendConstraint).toBe(true);
        });

        it('launched emits decision_trace with winning_intent_id = plan.plan_id and plan_ready_for_launch', () => {
            // A plan with status 'ready' transitions to 'executing' on next advance
            // checkAbandonConditions: staging zone must exist, assigned brigades must be present
            // checkSuspendConditions: for 'ready' plans → returns null (only concentrating/suspended)
            const plan = makePlan({
                status: 'ready',
                concentration_progress: 0.85,
                assigned_brigades: (['bde_0', 'bde_1', 'bde_2'] as FormationId[]),
                required_brigades: MIN_BRIGADES_FOR_PLAN,
                // staging_zone matches the zone below
            });

            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);
            const briefing = makeMinimalBriefing();
            const turn = 10;

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.winning_intent_id).toBe(plan.plan_id);
            expect(result.decision_trace!.hard_constraints).toContain('plan_ready_for_launch');
            expect(result.decision_trace!.candidates).toHaveLength(0);
        });

        it('inert path (clearing abandoned plan) does NOT emit decision_trace', () => {
            // previousPlan.status = 'abandoned' → first guard in advanceExistingPlan fires,
            // returns { plan: null, action: 'none', reason: '...' } with no decision_trace field
            const plan = makePlan({ status: 'abandoned' });

            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone()];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);
            const briefing = makeMinimalBriefing();
            const turn = 10;

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeUndefined();
        });

        it('lifecycle traces always have relationships_applied: []', () => {
            // Use the abandon-by-viability path to get a lifecycle trace
            const plan = makePlan({
                staging_zone: 'zone:nonexistent:999' as ZoneId,
            });

            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);
            const briefing = makeMinimalBriefing();
            const turn = 10;

            const result = managePlan(briefing, zones, forces, surplusPool, plan, turn);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.relationships_applied).toEqual([]);
        });
    });

    // ─── Category 2: formatDecisionTrace() ────────────────────────────────────

    describe('Category 2: formatDecisionTrace()', () => {

        it('formatDecisionTrace(undefined) returns "no trace"', () => {
            expect(formatDecisionTrace(undefined)).toBe('no trace');
        });

        it('formatDecisionTrace with winner/blocked/loser labels contains correct labels', () => {
            const trace = {
                turn: 7,
                winning_intent_id: 'stage_operation_zone_a',
                candidates: [
                    {
                        intent_id: 'stage_operation_zone_a',
                        type: 'stage_operation' as const,
                        score: 0.8,
                        score_breakdown: { surplus: 0.8 } as Record<string, number>,
                        blocked_by: [],
                    },
                    {
                        intent_id: 'hold_line_zone_b',
                        type: 'hold_line' as const,
                        score: 0.0,
                        score_breakdown: {} as Record<string, number>,
                        blocked_by: ['insufficient_surplus'],
                    },
                    {
                        intent_id: 'launch_opportunity_zone_c',
                        type: 'launch_opportunity' as const,
                        score: 0.5,
                        score_breakdown: { surplus: 0.5 } as Record<string, number>,
                        blocked_by: [],
                    },
                ],
                hard_constraints: [],
                lessons_applied: [],
                relationships_applied: [],
            };

            const output = formatDecisionTrace(trace);

            expect(output).toContain('[WINNER]');
            expect(output).toContain('[BLOCKED]');
            expect(output).toContain('[LOSER]');
            expect(output.startsWith('Turn 7')).toBe(true);
        });

        it('formatDecisionTrace lifecycle trace shows correct lifecycle annotation', () => {
            const launchTrace = {
                turn: 5,
                winning_intent_id: 'plan_test_t10_test_op',
                candidates: [],
                hard_constraints: ['plan_ready_for_launch'],
                lessons_applied: [],
                relationships_applied: [],
            };
            const launchOutput = formatDecisionTrace(launchTrace);
            expect(launchOutput).toContain('[LAUNCHED]');

            const abandonTrace = {
                turn: 3,
                winning_intent_id: null,
                candidates: [],
                hard_constraints: ['plan_abandoned_viability'],
                lessons_applied: [],
                relationships_applied: [],
            };
            const abandonOutput = formatDecisionTrace(abandonTrace);
            expect(abandonOutput).toContain('[ABANDONED]');
        });

        it('formatDecisionTrace is deterministic: same trace produces identical output on repeated calls', () => {
            const trace = {
                turn: 12,
                winning_intent_id: 'stage_operation_zone_x',
                candidates: [
                    {
                        intent_id: 'stage_operation_zone_x',
                        type: 'stage_operation' as const,
                        score: 0.75,
                        score_breakdown: { surplus: 0.5, supply: 0.25 } as Record<string, number>,
                        blocked_by: [],
                    },
                    {
                        intent_id: 'hold_line_zone_y',
                        type: 'hold_line' as const,
                        score: 0.4,
                        score_breakdown: { threat: 0.4 } as Record<string, number>,
                        blocked_by: [],
                    },
                ],
                hard_constraints: ['some_constraint'],
                lessons_applied: ['lesson_abc'],
                relationships_applied: [],
            };

            const result1 = formatDecisionTrace(trace);
            const result2 = formatDecisionTrace(trace);

            expect(result1).toBe(result2);
        });

        it('formatTraceHeader returns a single line', () => {
            const trace = {
                turn: 8,
                winning_intent_id: 'hold_line_zone_a',
                candidates: [
                    {
                        intent_id: 'hold_line_zone_a',
                        type: 'hold_line' as const,
                        score: 0.6,
                        score_breakdown: { threat: 0.6 } as Record<string, number>,
                        blocked_by: [],
                    },
                ],
                hard_constraints: [],
                lessons_applied: [],
                relationships_applied: [],
            };

            const header = formatTraceHeader(trace);
            expect(header.split('\n')).toHaveLength(1);
        });
    });

    // ─── Category 3: Multi-turn causality integration ─────────────────────────

    describe('Category 3: Multi-turn causality integration', () => {

        it('offensive_failure lesson suppresses stage_operation score (lesson_delta < 0, lessons_applied populated)', () => {
            const turn = 5;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const offensiveFailureLesson: CommanderLesson = {
                lesson_id: 'lesson_offensive_failure_t1',
                category: 'offensive_failure',
                weight: -0.35,
                created_turn: 1,
                expires_turn: 16,
            };

            const previousState = makeMinimalState({
                lessons: [offensiveFailureLesson],
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn, previousState.lessons);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();

            // lesson_delta must be negative (lesson suppressed the score)
            const lessonDelta = stageOp!.score_breakdown['lesson_delta'] ?? 0;
            expect(lessonDelta).toBeLessThan(0);

            // At least one lesson was applied
            expect(trace.lessons_applied.length).toBeGreaterThan(0);
        });

        it('offensive_failure lesson lowers stage_operation score compared to no-lesson baseline', () => {
            const turn = 5;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const offensiveFailureLesson: CommanderLesson = {
                lesson_id: 'lesson_offensive_failure_t1',
                category: 'offensive_failure',
                weight: -0.35,
                created_turn: 1,
                expires_turn: 16,
            };

            const stateWithLesson = makeMinimalState({ lessons: [offensiveFailureLesson] });
            const stateNoLesson = makeMinimalState({ lessons: [] });

            // Run A: with lesson
            const briefingA = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: stateWithLesson,
            });
            const { trace: traceA } = selectWinningIntent(briefingA, zones, forces, surplusPool, turn, stateWithLesson.lessons);

            // Run B: without lesson
            const briefingB = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: stateNoLesson,
            });
            const { trace: traceB } = selectWinningIntent(briefingB, zones, forces, surplusPool, turn, stateNoLesson.lessons);

            const stageOpA = traceA.candidates.find(c => c.type === 'stage_operation');
            const stageOpB = traceB.candidates.find(c => c.type === 'stage_operation');

            // Both must have produced stage_operation candidates for comparison
            expect(stageOpA).toBeDefined();
            expect(stageOpB).toBeDefined();

            // Run A score (with lesson) must be lower than Run B score (no lesson)
            expect(stageOpA!.score).toBeLessThan(stageOpB!.score);

            // Score difference should be approximately 0.35 (the lesson weight magnitude)
            const scoreDelta = stageOpB!.score - stageOpA!.score;
            expect(scoreDelta).toBeCloseTo(0.35, 1);
        });
    });

    // ─── Category 4: Trace structural invariant ───────────────────────────────

    describe('Category 4: Trace structural invariant', () => {

        it('competition trace has at least 2 candidates when multiple intents are valid', () => {
            const turn = 10;
            // Large surplus pool: guarantees stage_operation and launch_opportunity are generated
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN + 2);
            const zones = [makeZone({
                posture: 'projecting',
                surplus_brigades: surplusPool.map(e => e.brigade_id),
                deficit: 0,
            })];
            const forces = makeForces(surplusPool, surplusPool.length);

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                corps_stance: 'balanced',
                corps_exhaustion: 0,
        faction_war_exhaustion: 0,
                avg_fatigue_pct: 0,
                campaign_role: 'primary',
                active_operations: [],
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            expect(trace.candidates.length).toBeGreaterThanOrEqual(2);
        });
    });
});
