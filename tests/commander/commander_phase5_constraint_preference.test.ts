/**
 * Tests for v0.8.1 Phase 5 — Constraint Reclassification and Preference Scoring.
 *
 * Covers:
 * 1. Critical supply reclassification — soft penalty (-0.50), not hard block
 * 2. Hard-block integrity — exhaustion/stance/surplus blocks unoverrideable by relationships
 * 3. player_trust effects — boosts stage_operation and launch_opportunity, not hold_line
 * 4. patron_alignment effects — boosts stage_operation when campaign role set
 * 5. sibling_corps_trust effects — boosts/dampens request_army_support
 * 6. managePlan() trace stubs — all 4 early-return paths emit decision_trace with relationships_applied: []
 * 7. Determinism — same inputs produce same winner, relationship ordering invariant
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
    CommanderState,
    CommanderRelationships,
    CommanderBeliefState,
} from '../../src/sim/combat/commander/commander_state.js';
import {
    managePlan,
    selectWinningIntent,
    MIN_BRIGADES_FOR_PLAN,
} from '../../src/sim/combat/commander/plan.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../../src/sim/combat/bot_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — minimal mock factories (matching Phase 3/4 pattern)
// ═══════════════════════════════════════════════════════════════════════════

function makeBrigade(overrides: Partial<FormationState> = {}): FormationState {
    return {
        id: 'test_brigade_1' as FormationId,
        faction: 'RBiH' as FactionId,
        name: 'Test Brigade',
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 2000,
        cohesion: 70,
        morale: 60,
        entrenchment_turns: 0,
        disrupted_turns: 0,
        location_osid: 'op:test:test_1',
        ...overrides,
    } as FormationState;
}

function makeZone(overrides: Partial<ZoneAssessment> = {}): ZoneAssessment {
    return {
        zone_id: 'zone:test_corps:0' as ZoneId,
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        osids: ['op:test:test_1', 'op:test:test_2'],
        front_edge_count: 10,
        depth: 3,
        corridor_width: 5,
        population_value: 10000,
        strategic_value: 5,
        posture: 'balanced' as ZonePosture,
        commitment_ratio: 2.5,
        garrison_budget: 1,
        assigned_brigades: [],
        surplus_brigades: [],
        deficit: 0,
        is_main_body: true,
        enemy_adjacent_osids: [],
        is_must_hold: false,
        ...overrides,
    } as ZoneAssessment;
}

function makeEval(overrides: Partial<BrigadeEvaluation> = {}): BrigadeEvaluation {
    return {
        brigade_id: 'test_brigade_1' as FormationId,
        fitness_offense: 0.6,
        fitness_defense: 0.4,
        fitness_garrison: 0.4,
        equipment_class: undefined,
        equipment_priority: 0,
        tier: 'active_defense' as const,
        is_combat_effective: true,
        is_disrupted: false,
        is_on_loan: false,
        is_home_defense: false,
        morale: 80,
        current_zone: 'zone:test_corps:0' as ZoneId,
        ...overrides,
    };
}

function makeForces(evaluations: BrigadeEvaluation[], totalSurplus = 0): ForceAssessment {
    let mainEffort = 0, activeDefense = 0, garrison = 0, combatEffective = 0;
    const byZone: Record<string, BrigadeEvaluation[]> = {};
    for (const ev of evaluations) {
        if (ev.is_combat_effective) combatEffective++;
        switch (ev.tier) {
            case 'main_effort': mainEffort++; break;
            case 'active_defense': activeDefense++; break;
            case 'garrison': garrison++; break;
        }
        const key = ev.current_zone ?? '__unassigned__';
        if (!byZone[key]) byZone[key] = [];
        byZone[key]!.push(ev);
    }
    return {
        total_brigades: evaluations.length,
        combat_effective: combatEffective,
        evaluations,
        by_zone: byZone,
        tier_counts: { main_effort: mainEffort, active_defense: activeDefense, garrison },
        total_surplus: totalSurplus,
    };
}

const neutralPersonality: OfficerPersonality = {
    aggression: 0.5, caution: 0.5, initiative: 0.5, competence: 0.5,
};

function makeMinimalSpatial() {
    return {
        componentsByFaction: new Map([
            ['RBiH' as FactionId, new Map<string, number>()],
            ['RS' as FactionId, new Map<string, number>()],
            ['HRHB' as FactionId, new Map<string, number>()],
        ]),
        friendlyOsidsByFaction: new Map([
            ['RBiH' as FactionId, new Set<string>()],
            ['RS' as FactionId, new Set<string>()],
            ['HRHB' as FactionId, new Set<string>()],
        ]),
        adjacency: new Map<string, readonly string[]>(),
        osidToController: new Map<string, FactionId>(),
    } as any;
}

function makeMinimalState(overrides: Partial<CommanderState> = {}): CommanderState {
    return {
        zone_assessments: [],
        threat_assessment: {
            threatened_zones: [],
            enemy_concentration_zones: [],
            recent_losses: [],
            overall_pressure: 'low',
        },
        force_assessment: makeForces([]),
        current_plan: null,
        sector_activity_log: [],
        operation_history: [],
        intel_picture: {
            zone_confidence: {},
            offensive_signs: {},
            concentration_detected: {},
            last_updated_turn: 0,
        },
        garrison_budget: {},
        last_assessment_turn: 0,
        ...overrides,
    };
}

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

/** Create a belief state with the given supply confidence. */
function makeBeliefState(supplyConfidence: number): CommanderBeliefState {
    return {
        zone_beliefs: [],
        supply_continuity_confidence: supplyConfidence,
        subordinate_reliability: {},
        neighbor_support_confidence: {},
    };
}

/** Create a CommanderState with relationships set. */
function makeStateWithRelationships(relationships: CommanderRelationships): CommanderState {
    return makeMinimalState({ relationships });
}

/** Create a CommanderState with both relationships and belief state. */
function makeStateWithRelAndBelief(
    relationships: CommanderRelationships,
    beliefState: CommanderBeliefState,
): CommanderState {
    return makeMinimalState({ relationships, belief_state: beliefState });
}

// ═══════════════════════════════════════════════════════════════════════════
// Suite: v0.8.1 Phase 5 — Constraint Reclassification and Preference Scoring
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 5 — Constraint Reclassification and Preference Scoring', () => {

    // ─── Category 1: Critical supply reclassification ────────────────────────

    describe('Category 1: Critical supply reclassification', () => {
        it('critical supply is a soft penalty, not a hard block: stage_operation has critical_supply_penalty in breakdown but blocked_by is empty', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // supplyReadiness < 0.2 AND belief_state is non-null → triggers isCriticalSupply
            const previousState = makeMinimalState({
                belief_state: makeBeliefState(0.15),
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            // Penalty recorded in breakdown
            expect(stageOp!.score_breakdown['critical_supply_penalty']).toBe(-0.50);
            // NOT a hard block — blocked_by must be empty (no critical_supply_belief entry)
            expect(stageOp!.blocked_by).not.toContain('critical_supply_belief');
            expect(stageOp!.blocked_by.length).toBe(0);
        });

        it('critical supply penalty fires for launch_opportunity too: breakdown has critical_supply_penalty: -0.50 and blocked_by is empty', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeMinimalState({
                belief_state: makeBeliefState(0.10),
            });

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
            expect(launchOp).toBeDefined();
            expect(launchOp!.score_breakdown['critical_supply_penalty']).toBe(-0.50);
            expect(launchOp!.blocked_by).not.toContain('critical_supply_belief');
            expect(launchOp!.blocked_by.length).toBe(0);
        });

        it('critical supply with very high surplus ratio does not block stage_operation — it remains eligible', () => {
            const turn = 10;
            // Many brigades to push surplus ratio high
            const surplusPool = makeSurplusPool(20);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, 20);

            const previousState = makeMinimalState({
                belief_state: makeBeliefState(0.05), // critical supply
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            // Must be eligible (not blocked)
            expect(stageOp!.blocked_by.length).toBe(0);
            // Penalty is present in breakdown
            expect(stageOp!.score_breakdown['critical_supply_penalty']).toBe(-0.50);
        });

        it('critical supply penalty does NOT fire when belief_state is null (isCriticalSupply = false)', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // previous_state present but no belief_state → isCriticalSupply = false
            const previousState = makeMinimalState({ belief_state: undefined });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            expect(stageOp!.score_breakdown['critical_supply_penalty']).toBeUndefined();
        });
    });

    // ─── Category 2: Hard-block integrity ────────────────────────────────────

    describe('Category 2: Hard-block integrity', () => {
        it('corps_exhaustion_exceeds_threshold blocks stage_operation even with player_trust=1.0 and patron_alignment=1.0', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 1.0,
                patron_alignment: 1.0,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 10,
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            expect(stageOp!.blocked_by).toContain('corps_exhaustion_exceeds_threshold');

            // Winner must not be any offensive intent
            const winnerType = trace.candidates.find(c => c.intent_id === trace.winning_intent_id)?.type;
            expect(winnerType).not.toBe('stage_operation');
            expect(winnerType).not.toBe('launch_opportunity');
        });

        it('corps_exhaustion_exceeds_threshold blocks stage_operation even with player_trust=0.0', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 0.0,
                patron_alignment: 0.0,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 10,
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            expect(stageOp!.blocked_by).toContain('corps_exhaustion_exceeds_threshold');
        });

        it('surplus_available_no_hq_request blocks request_army_support regardless of sibling trust values', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            // Heavy pressure AND surplus > 0 → generates candidate but blocks it
            const zones = [makeZone({ posture: 'defending', deficit: 2 })];
            // total_surplus > 0 → hard block fires
            const forces = makeForces(surplusPool, 5);

            const previousState = makeStateWithRelationships({
                player_trust: 0.5,
                patron_alignment: 0.5,
                sibling_corps_trust: { corp_a: 1.0, corp_b: 1.0 },
            });

            // Need heavy pressure to even generate request_army_support candidate
            const stateWithPressure = makeMinimalState({
                relationships: { player_trust: 0.5, patron_alignment: 0.5, sibling_corps_trust: { corp_a: 1.0, corp_b: 1.0 } },
                threat_assessment: {
                    threatened_zones: [{ zone_id: 'zone:test_corps:0' as ZoneId, threat_level: 'critical' }],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            });

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: stateWithPressure,
            });

            // To generate request_army_support: isHeavyOrCriticalPressure=true AND total_surplus=0
            // We need surplus=0 for generation but the test is about hard-block when surplus > 0
            // Generate it by using forces with 0 surplus for candidateGeneration context but
            // the hard block checks forces.total_surplus directly.
            // Instead: check with 0 surplus that candidate is generated, then verify block with > 0.
            const forcesZeroSurplus = makeForces(surplusPool, 0);
            const { trace: traceZero } = selectWinningIntent(briefing, zones, forcesZeroSurplus, [], turn);
            const requestCandidateZero = traceZero.candidates.find(c => c.type === 'request_army_support');
            // With zero surplus the candidate is generated and NOT blocked by surplus rule
            if (requestCandidateZero) {
                expect(requestCandidateZero.blocked_by).not.toContain('surplus_available_no_hq_request');
            }

            // Now with positive surplus: candidate generated only if pressure still triggers it
            // (generation check: isHeavyOrCriticalPressure && forces.total_surplus === 0)
            // With total_surplus > 0, the candidate is not even generated — that IS the hard block.
            // Verify the candidate is absent when surplus > 0.
            const forcesWithSurplus = makeForces(surplusPool, 5);
            const { trace: tracePositive } = selectWinningIntent(briefing, zones, forcesWithSurplus, surplusPool, turn);
            // request_army_support should not be generated when surplus > 0
            // (generation gate: forces.total_surplus === 0)
            const requestPositive = tracePositive.candidates.find(c => c.type === 'request_army_support');
            // Either absent (not generated) or present but blocked
            if (requestPositive) {
                expect(requestPositive.blocked_by).toContain('surplus_available_no_hq_request');
            } else {
                // Candidate not even generated — acceptable; generation gate already excludes it
                expect(requestPositive).toBeUndefined();
            }
        });
    });

    // ─── Category 3: player_trust effects ────────────────────────────────────

    describe('Category 3: player_trust effects', () => {
        it('high player_trust (1.0) boosts stage_operation: relationship_delta ≈ 0.06 and player_trust:stage_operation in relationships_applied', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 1.0,
                patron_alignment: 0.5,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            // player_trust=1.0 → (1.0-0.5)*0.12 = 0.06, capped at 0.06
            expect(stageOp!.score_breakdown['relationship_delta']).toBeCloseTo(0.06, 5);
            expect(trace.relationships_applied).toContain('player_trust:stage_operation');
        });

        it('low player_trust (0.0) dampens stage_operation: relationship_delta ≈ -0.06', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 0.0,
                patron_alignment: 0.5,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            // player_trust=0.0 → (0.0-0.5)*0.12 = -0.06, capped at -0.06
            expect(stageOp!.score_breakdown['relationship_delta']).toBeCloseTo(-0.06, 5);
        });

        it('high player_trust (1.0) boosts launch_opportunity: player_trust:launch_opportunity in relationships_applied', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 1.0,
                patron_alignment: 0.5,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
            expect(launchOp).toBeDefined();
            expect(launchOp!.score_breakdown['relationship_delta']).toBeCloseTo(0.06, 5);
            expect(trace.relationships_applied).toContain('player_trust:launch_opportunity');
        });

        it('player_trust does NOT affect hold_line: relationship_delta key absent from hold_line score_breakdown', () => {
            const turn = 10;

            const previousState = makeStateWithRelationships({
                player_trust: 1.0,
                patron_alignment: 0.5,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, [], makeForces([]), [], turn);

            const holdLine = trace.candidates.find(c => c.type === 'hold_line');
            expect(holdLine).toBeDefined();
            // hold_line is not an offensive intent — no relationship delta from player_trust
            expect(holdLine!.score_breakdown['relationship_delta']).toBeUndefined();
        });
    });

    // ─── Category 4: patron_alignment effects ────────────────────────────────

    describe('Category 4: patron_alignment effects', () => {
        it('high patron_alignment (1.0) with campaign_role=primary boosts stage_operation: patron_alignment:stage_operation in relationships_applied', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // player_trust neutral to isolate patron_alignment effect
            const previousState = makeStateWithRelationships({
                player_trust: 0.5,
                patron_alignment: 1.0,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                campaign_role: 'primary', // campaignAlignment = 1.0
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            expect(trace.relationships_applied).toContain('patron_alignment:stage_operation');
            expect(stageOp!.score_breakdown['relationship_delta']).toBeGreaterThan(0);
        });

        it('patron_alignment with campaign_role=null produces small non-zero delta for stage_operation', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // player_trust neutral, patron_alignment high, no campaign_role → campaignAlignment = 0.5
            const previousState = makeStateWithRelationships({
                player_trust: 0.5,
                patron_alignment: 1.0,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                campaign_role: null, // campaignAlignment = 0.5
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
            expect(stageOp).toBeDefined();
            // (1.0 - 0.5) * 0.5 * 0.12 = 0.03 — non-zero, appears in relationship_delta
            expect(trace.relationships_applied).toContain('patron_alignment:stage_operation');
            expect(stageOp!.score_breakdown['relationship_delta']).toBeCloseTo(0.03, 5);
        });

        it('patron_alignment does NOT affect launch_opportunity: no patron_alignment key in relationships_applied for launch_opportunity', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            // player_trust neutral to avoid triggering player_trust delta for launch_opportunity
            const previousState = makeStateWithRelationships({
                player_trust: 0.5,
                patron_alignment: 1.0,
                sibling_corps_trust: {},
            });

            const briefing = makeMinimalBriefing({
                turn,
                campaign_role: 'primary',
                previous_state: previousState,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
            expect(launchOp).toBeDefined();
            // patron_alignment only applies to stage_operation, not launch_opportunity
            const patronApplied = trace.relationships_applied.filter(r => r.startsWith('patron_alignment'));
            expect(patronApplied).not.toContain('patron_alignment:launch_opportunity');
            // And since player_trust is 0.5 (neutral), no relationship_delta at all on launch_opportunity
            expect(launchOp!.score_breakdown['relationship_delta']).toBeUndefined();
        });
    });

    // ─── Category 5: sibling_corps_trust effects ─────────────────────────────

    describe('Category 5: sibling_corps_trust effects', () => {
        it('high avg sibling trust (avg=0.85) boosts request_army_support: relationship_delta ≈ 0.042', () => {
            const turn = 10;
            // Need isHeavyOrCriticalPressure=true AND total_surplus=0 to generate request_army_support
            const stateWithPressure = makeMinimalState({
                relationships: { player_trust: 0.5, patron_alignment: 0.5, sibling_corps_trust: { corp_a: 0.9, corp_b: 0.8 } },
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical', // triggers isHeavyOrCriticalPressure
                },
            });

            const zones = [makeZone({ posture: 'defending', deficit: 2 })];
            const forces = makeForces([], 0); // zero surplus → candidate is generated

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: stateWithPressure,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, [], turn);

            const requestOp = trace.candidates.find(c => c.type === 'request_army_support');
            expect(requestOp).toBeDefined();
            // avg = (0.9 + 0.8) / 2 = 0.85 → (0.85 - 0.5) * 0.12 = 0.042
            expect(requestOp!.score_breakdown['relationship_delta']).toBeCloseTo(0.042, 3);
            expect(trace.relationships_applied).toContain('sibling_corps_trust:request_army_support');
        });

        it('low avg sibling trust (avg=0.15) dampens request_army_support: relationship_delta is negative', () => {
            const turn = 10;
            const stateWithPressure = makeMinimalState({
                relationships: { player_trust: 0.5, patron_alignment: 0.5, sibling_corps_trust: { corp_a: 0.1, corp_b: 0.2 } },
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            });

            const zones = [makeZone({ posture: 'defending', deficit: 2 })];
            const forces = makeForces([], 0);

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: stateWithPressure,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, [], turn);

            const requestOp = trace.candidates.find(c => c.type === 'request_army_support');
            expect(requestOp).toBeDefined();
            // avg = (0.1 + 0.2) / 2 = 0.15 → (0.15 - 0.5) * 0.12 = -0.042
            expect(requestOp!.score_breakdown['relationship_delta']).toBeCloseTo(-0.042, 3);
        });

        it('empty sibling_corps_trust defaults to neutral (avg=0.5): no relationship_delta on request_army_support', () => {
            const turn = 10;
            const stateWithPressure = makeMinimalState({
                relationships: { player_trust: 0.5, patron_alignment: 0.5, sibling_corps_trust: {} },
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            });

            const zones = [makeZone({ posture: 'defending', deficit: 2 })];
            const forces = makeForces([], 0);

            const briefing = makeMinimalBriefing({
                turn,
                previous_state: stateWithPressure,
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, [], turn);

            const requestOp = trace.candidates.find(c => c.type === 'request_army_support');
            expect(requestOp).toBeDefined();
            // Empty sibling_corps_trust → avgSiblingTrust defaults to 0.5 → delta = 0 → no key
            expect(requestOp!.score_breakdown['relationship_delta']).toBeUndefined();
            expect(trace.relationships_applied).not.toContain('sibling_corps_trust:request_army_support');
        });
    });

    // ─── Category 6: managePlan() trace stubs ────────────────────────────────

    describe('Category 6: managePlan() trace stubs', () => {
        it('defensive stance early return emits decision_trace with hard_constraints=[corps_stance_forbids_offensive]', () => {
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const briefing = makeMinimalBriefing({
                corps_stance: 'defensive',
                pre_planned_ops: [{ id: 'op_1' }],
            });

            const result = managePlan(briefing, zones, forces, surplusPool, null, 10);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.hard_constraints).toContain('corps_stance_forbids_offensive');
            expect(result.decision_trace!.candidates).toHaveLength(0);
            expect(result.decision_trace!.winning_intent_id).toBeNull();
        });

        it('corps_exhaustion early return emits decision_trace with hard_constraints=[corps_exhaustion_exceeds_threshold]', () => {
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const briefing = makeMinimalBriefing({
                corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 1,
                pre_planned_ops: [{ id: 'op_1' }],
            });

            const result = managePlan(briefing, zones, forces, surplusPool, null, 10);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.hard_constraints).toContain('corps_exhaustion_exceeds_threshold');
            expect(result.decision_trace!.candidates).toHaveLength(0);
            expect(result.decision_trace!.winning_intent_id).toBeNull();
        });

        it('campaign_role=economy early return emits decision_trace with hard_constraints=[campaign_role_forbids_offensive]', () => {
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting' })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const briefing = makeMinimalBriefing({
                campaign_role: 'economy',
                pre_planned_ops: [{ id: 'op_1' }],
            });

            const result = managePlan(briefing, zones, forces, surplusPool, null, 10);

            expect(result.decision_trace).toBeDefined();
            expect(result.decision_trace!.hard_constraints).toContain('campaign_role_forbids_offensive');
            expect(result.decision_trace!.candidates).toHaveLength(0);
            expect(result.decision_trace!.winning_intent_id).toBeNull();
        });

        it('all managePlan() trace stubs always have relationships_applied: []', () => {
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone()];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const stanceResult = managePlan(
                makeMinimalBriefing({ corps_stance: 'defensive' }),
                zones, forces, surplusPool, null, 10,
            );
            const exhaustionResult = managePlan(
                makeMinimalBriefing({ corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 1 }),
                zones, forces, surplusPool, null, 10,
            );
            const campaignResult = managePlan(
                makeMinimalBriefing({ campaign_role: 'contain' }),
                zones, forces, surplusPool, null, 10,
            );

            for (const result of [stanceResult, exhaustionResult, campaignResult]) {
                expect(result.decision_trace).toBeDefined();
                expect(result.decision_trace!.relationships_applied).toEqual([]);
            }
        });
    });

    // ─── Category 7: Determinism ──────────────────────────────────────────────

    describe('Category 7: Determinism', () => {
        it('same relationships → same winner and same relationships_applied on repeated calls', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const previousState = makeStateWithRelationships({
                player_trust: 0.8,
                patron_alignment: 0.7,
                sibling_corps_trust: { corp_x: 0.6 },
            });

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                campaign_role: 'secondary',
                previous_state: previousState,
            });

            const { winner: winner1, trace: trace1 } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);
            const { winner: winner2, trace: trace2 } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            expect(winner1?.score).toBe(winner2?.score);
            expect(winner1?.intent_id).toBe(winner2?.intent_id);
            expect(trace1.relationships_applied).toEqual(trace2.relationships_applied);
        });

        it('sibling_corps_trust key ordering does not affect relationship_delta on request_army_support', () => {
            const turn = 10;
            const zones = [makeZone({ posture: 'defending', deficit: 2 })];
            const forces = makeForces([], 0);

            function makeStateWithSiblings(sibs: Record<string, number>): CommanderState {
                return makeMinimalState({
                    relationships: { player_trust: 0.5, patron_alignment: 0.5, sibling_corps_trust: sibs },
                    threat_assessment: {
                        threatened_zones: [],
                        enemy_concentration_zones: [],
                        recent_losses: [],
                        overall_pressure: 'critical',
                    },
                });
            }

            const briefingAB = makeMinimalBriefing({
                turn,
                previous_state: makeStateWithSiblings({ a: 0.8, b: 0.6 }),
            });
            const briefingBA = makeMinimalBriefing({
                turn,
                previous_state: makeStateWithSiblings({ b: 0.6, a: 0.8 }),
            });

            const { trace: traceAB } = selectWinningIntent(briefingAB, zones, forces, [], turn);
            const { trace: traceBA } = selectWinningIntent(briefingBA, zones, forces, [], turn);

            const requestAB = traceAB.candidates.find(c => c.type === 'request_army_support');
            const requestBA = traceBA.candidates.find(c => c.type === 'request_army_support');

            expect(requestAB).toBeDefined();
            expect(requestBA).toBeDefined();
            expect(requestAB!.score_breakdown['relationship_delta']).toBe(requestBA!.score_breakdown['relationship_delta']);
        });

        it('null previous_state (no relationships) → zero deltas: no relationship_delta in any candidate score_breakdown', () => {
            const turn = 10;
            const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
            const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
            const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

            const briefing = makeMinimalBriefing({
                turn,
                pre_planned_ops: [{ id: 'op_1' }],
                previous_state: null, // no relationships
            });

            const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, turn);

            for (const candidate of trace.candidates) {
                expect(candidate.score_breakdown['relationship_delta']).toBeUndefined();
            }
            expect(trace.relationships_applied).toEqual([]);
        });
    });
});
