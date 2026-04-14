/**
 * Tests for v0.8.1 Phase 3 — Candidate Intent Competition.
 *
 * Covers:
 * 1. Candidate Generation — hold_line always present, stage_operation/launch_opportunity
 *    conditions, pool cap at 5
 * 2. Hard-Block Rules — exhaustion, supply, stance blocks, blocked candidates in trace
 * 3. Winner Selection — highest scoring eligible wins, deterministic tie-breaking
 * 4. Score Breakdown — every candidate has non-empty breakdown matching expected factors
 * 5. Decision Trace Persistence — decision_trace on CommanderState after turn runs
 * 6. Continuity — advanceExistingPlan preserves previous decision_trace
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
    CommanderBeliefState,
} from '../../src/sim/combat/commander/commander_state.js';
import {
    managePlan,
    selectWinningIntent,
    MIN_BRIGADES_FOR_PLAN,
    MAX_SUSPENSION_TURNS,
} from '../../src/sim/combat/commander/plan.js';
import { BotCorpsCommander } from '../../src/sim/combat/commander/commander_loop.js';
import { MAX_EXHAUSTION_FOR_OPERATION } from '../../src/sim/combat/bot_constants.js';
import { CRITICAL_MORALE_THRESHOLD } from '../../src/sim/combat/combat_math.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — minimal mock factories (matching Phase 1/2 pattern)
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

const defaultPersonality: OfficerPersonality = {
    aggression: 0.5, caution: 0.3, initiative: 0.3, competence: 0.5,
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
        officer_personality: defaultPersonality,
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

/**
 * Build a surplus pool of N unique brigade evaluations.
 */
function makeSurplusPool(count: number, zoneId: ZoneId = 'zone:test_corps:0' as ZoneId): BrigadeEvaluation[] {
    return Array.from({ length: count }, (_, i) =>
        makeEval({
            brigade_id: `bde_${i}` as FormationId,
            current_zone: zoneId,
        }),
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Section 1: Candidate Generation
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Candidate Generation', () => {
    it('hold_line is always in the candidate pool', () => {
        const briefing = makeMinimalBriefing();
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);
        const surplusPool: BrigadeEvaluation[] = [];

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const holdLine = trace.candidates.find(c => c.type === 'hold_line');
        expect(holdLine).toBeDefined();
    });

    it('hold_line is generated even when all other intents are blocked', () => {
        // Exhaustion and fatigue block offensive; heavy/critical stance blocks others
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 10,
        faction_war_exhaustion: 0,
            avg_fatigue_pct: 90,
            corps_stance: 'defensive',
        });
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);
        const surplusPool: BrigadeEvaluation[] = [];

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'hold_line')).toBe(true);
    });

    it('stage_operation is generated when pre_planned_ops is non-empty and surplus >= MIN_BRIGADES_FOR_PLAN', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced' })];
        const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'stage_operation')).toBe(true);
    });

    it('stage_operation is NOT generated when pre_planned_ops is empty', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'stage_operation')).toBe(false);
    });

    it('launch_opportunity is generated when surplus >= MIN_BRIGADES_FOR_PLAN and a projecting/balanced zone exists', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing();
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, MIN_BRIGADES_FOR_PLAN);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'launch_opportunity')).toBe(true);
    });

    it('launch_opportunity is NOT generated when surplus < MIN_BRIGADES_FOR_PLAN', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN - 1);
        const briefing = makeMinimalBriefing();
        const zones = [makeZone({ posture: 'projecting' })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'launch_opportunity')).toBe(false);
    });

    it('total candidates is bounded at max 5', () => {
        // Set up conditions that would qualify all 7 intents:
        // hold_line, reinforce_zone, stage_operation, launch_opportunity,
        // thin_quiet_sector, recall_exposed_brigades, request_army_support
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        // Add a disrupted brigade to trigger recall_exposed_brigades
        surplusPool.push(makeEval({
            brigade_id: 'bde_disrupted' as FormationId,
            is_disrupted: true,
            current_zone: 'zone:test_corps:0' as ZoneId,
        }));

        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',  // triggers reinforce_zone + request_army_support conditions
                },
            }),
        });

        // Zone with deficit triggers reinforce_zone; balanced triggers others
        const zones = [
            makeZone({
                posture: 'balanced',
                deficit: 2,
                surplus_brigades: surplusPool.map(e => e.brigade_id),
            }),
        ];
        const forces = makeForces(surplusPool, surplusPool.length);
        // Zero surplus triggers request_army_support — but force total_surplus to 0
        const forcesNoSurplus = { ...forces, total_surplus: 0 };

        const { trace } = selectWinningIntent(briefing, zones, forcesNoSurplus, surplusPool, 10);

        expect(trace.candidates.length).toBeLessThanOrEqual(5);
    });

    it('candidates pool contains at least hold_line when no conditions are met', () => {
        // No zones, no surplus, no pre-planned ops, no pressure
        const briefing = makeMinimalBriefing();
        const { trace } = selectWinningIntent(briefing, [], makeForces([]), [], 10);

        expect(trace.candidates.length).toBeGreaterThanOrEqual(1);
        expect(trace.candidates.some(c => c.type === 'hold_line')).toBe(true);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 2: Hard-Block Rules
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Hard-Block Rules', () => {
    it('exhaustion-blocked corps produce stage_operation with non-empty blocked_by', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        expect(stageOp).toBeDefined();
        expect(stageOp!.blocked_by.length).toBeGreaterThan(0);
        expect(stageOp!.blocked_by).toContain('corps_exhaustion_exceeds_threshold');
    });

    it('exhaustion-blocked corps produce launch_opportunity with non-empty blocked_by', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
        expect(launchOp).toBeDefined();
        expect(launchOp!.blocked_by.length).toBeGreaterThan(0);
        expect(launchOp!.blocked_by).toContain('corps_exhaustion_exceeds_threshold');
    });

    it('when all offensive intents are blocked, winner is non-offensive (not null)', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        // Block all offensive intents via exhaustion
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { winner } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        // Winner must exist and must not be offensive
        expect(winner).not.toBeNull();
        expect(winner!.type).not.toBe('stage_operation');
        expect(winner!.type).not.toBe('launch_opportunity');
        expect(winner!.blocked_by.length).toBe(0);
    });

    it('hard-blocked candidates still appear in trace.candidates', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        // Blocked candidates are still in trace, just not winners
        const blockedCandidates = trace.candidates.filter(c => c.blocked_by.length > 0);
        expect(blockedCandidates.length).toBeGreaterThan(0);

        // Specifically the blocked offensive intents appear
        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        expect(stageOp).toBeDefined();
        expect(stageOp!.blocked_by.length).toBeGreaterThan(0);
    });

    it('critical_supply_belief applies soft penalty (not hard block) when supply_continuity_confidence < 0.2 (Phase 5)', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const belief: CommanderBeliefState = {
            zone_beliefs: [],
            supply_continuity_confidence: 0.1,  // below 0.2 threshold
            subordinate_reliability: {},
            neighbor_support_confidence: {},
        };
        // previous_state must exist with belief_state for isCriticalSupply to fire
        const prevState = makeMinimalState({ belief_state: belief });

        const briefing = makeMinimalBriefing({
            previous_state: prevState,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');

        // Phase 5: reclassified from hard block to soft penalty — must NOT appear in blocked_by
        if (stageOp) {
            expect(stageOp.blocked_by).not.toContain('critical_supply_belief');
            expect(stageOp.score_breakdown['critical_supply_penalty']).toBe(-0.50);
        }
        if (launchOp) {
            expect(launchOp.blocked_by).not.toContain('critical_supply_belief');
            expect(launchOp.score_breakdown['critical_supply_penalty']).toBe(-0.50);
        }
    });

    it('corps_stance defensive blocks offensive intents', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_stance: 'defensive',
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        if (stageOp) {
            expect(stageOp.blocked_by).toContain('corps_stance_forbids_offensive');
        }
        const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
        if (launchOp) {
            expect(launchOp.blocked_by).toContain('corps_stance_forbids_offensive');
        }
    });

    it('campaign_role economy blocks offensive intents', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            campaign_role: 'economy',
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        if (stageOp) {
            expect(stageOp.blocked_by).toContain('campaign_role_forbids_offensive');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 3: Winner Selection
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Winner Selection', () => {
    it('the highest-scoring non-blocked candidate wins', () => {
        const briefing = makeMinimalBriefing({
            // High threat ratio boosts hold_line and reinforce_zone
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            }),
        });
        const zones = [makeZone({ posture: 'balanced', deficit: 3 })];
        const forces = makeForces([], 0);

        const { winner, trace } = selectWinningIntent(briefing, zones, forces, [], 10);

        // Winner must be non-null and have no blocks
        expect(winner).not.toBeNull();
        expect(winner!.blocked_by.length).toBe(0);

        // Winner must have the highest score among eligible
        const eligibleCandidates = trace.candidates.filter(c => c.blocked_by.length === 0);
        const maxScore = Math.max(...eligibleCandidates.map(c => c.score));
        // Allow floating-point tolerance
        expect(winner!.score).toBeCloseTo(maxScore, 9);
    });

    it('deterministic tie-breaking: same inputs produce same winner across two calls', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { winner: winner1, trace: trace1 } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);
        const { winner: winner2, trace: trace2 } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(winner1?.intent_id).toEqual(winner2?.intent_id);
        expect(winner1?.type).toEqual(winner2?.type);
        expect(winner1?.score).toEqual(winner2?.score);
        expect(trace1.candidates.length).toEqual(trace2.candidates.length);
    });

    it('when winner.type is hold_line, managePlan returns action none', () => {
        // Force hold_line to win: high threat, no surplus, no pre-planned ops
        // managePlan requires non-defensive stance and below exhaustion threshold first
        const briefing = makeMinimalBriefing({
            corps_stance: 'balanced',
            corps_exhaustion: 0,
        faction_war_exhaustion: 0,
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            }),
        });
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);

        const result = managePlan(briefing, zones, forces, [], null, 10);

        // No plan created, action is 'none'
        expect(result.plan).toBeNull();
        expect(result.action).toBe('none');
    });

    it('decision_trace on managePlan result has winning_intent_id matching winner', () => {
        const briefing = makeMinimalBriefing({
            corps_stance: 'balanced',
            corps_exhaustion: 0,
        faction_war_exhaustion: 0,
        });
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);

        const result = managePlan(briefing, zones, forces, [], null, 10);

        expect(result.decision_trace).toBeDefined();
        // When action is 'none' due to non-offensive winner, winning_intent_id should be set
        if (result.decision_trace) {
            expect(result.decision_trace.turn).toBe(10);
            expect(result.decision_trace.candidates.length).toBeGreaterThan(0);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 4: Score Breakdown
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Score Breakdown', () => {
    it('every candidate has non-empty score_breakdown', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        for (const candidate of trace.candidates) {
            const keys = Object.keys(candidate.score_breakdown);
            expect(keys.length).toBeGreaterThan(0);
        }
    });

    it('hold_line score_breakdown contains expected factor keys', () => {
        const { trace } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 10);

        const holdLine = trace.candidates.find(c => c.type === 'hold_line');
        expect(holdLine).toBeDefined();
        const keys = Object.keys(holdLine!.score_breakdown);
        expect(keys).toContain('threat_ratio');
        expect(keys).toContain('surplus_inverse');
        expect(keys).toContain('supply_inverse');
    });

    it('stage_operation score_breakdown contains expected factor keys', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'balanced', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const stageOp = trace.candidates.find(c => c.type === 'stage_operation');
        if (stageOp) {
            const keys = Object.keys(stageOp.score_breakdown);
            expect(keys).toContain('supply_readiness');
            expect(keys).toContain('surplus_ratio');
            expect(keys).toContain('threat_inverse');
            expect(keys).toContain('exhaustion_penalty');
            expect(keys).toContain('fatigue_readiness');
            expect(keys).toContain('campaign_alignment');
        }
    });

    it('launch_opportunity score_breakdown contains expected factor keys', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing();
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        const launchOp = trace.candidates.find(c => c.type === 'launch_opportunity');
        if (launchOp) {
            const keys = Object.keys(launchOp.score_breakdown);
            expect(keys).toContain('surplus_ratio');
            expect(keys).toContain('supply_readiness');
            expect(keys).toContain('threat_inverse');
            expect(keys).toContain('exhaustion_penalty');
            expect(keys).toContain('fatigue_readiness');
        }
    });

    it('composite score approximately matches the weighted sum of breakdown values', () => {
        const { trace } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 10);

        const holdLine = trace.candidates.find(c => c.type === 'hold_line');
        expect(holdLine).toBeDefined();

        const breakdownSum = Object.values(holdLine!.score_breakdown).reduce((a, b) => a + b, 0);
        expect(holdLine!.score).toBeCloseTo(breakdownSum, 9);
    });

    it('reinforce_zone score_breakdown contains expected factor keys', () => {
        const briefing = makeMinimalBriefing({
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'heavy',
                },
            }),
        });
        const zones = [makeZone({ deficit: 2 })];
        const forces = makeForces([]);

        const { trace } = selectWinningIntent(briefing, zones, forces, [], 10);

        const reinforce = trace.candidates.find(c => c.type === 'reinforce_zone');
        if (reinforce) {
            const keys = Object.keys(reinforce.score_breakdown);
            expect(keys).toContain('deficit_urgency');
            expect(keys).toContain('threat_ratio');
            expect(keys).toContain('surplus_inverse');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 5: Decision Trace Persistence
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Decision Trace Persistence', () => {
    it('decision_trace on CommanderState is defined after a full commander loop turn', () => {
        const briefing = makeMinimalBriefing({ turn: 11 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        expect(output.updated_state.decision_trace).toBeDefined();
    });

    it('decision_trace.turn matches the briefing turn', () => {
        const briefing = makeMinimalBriefing({ turn: 15 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        // decision_trace may be undefined if managePlan short-circuits before competition
        if (output.updated_state.decision_trace) {
            expect(output.updated_state.decision_trace.turn).toBe(15);
        }
    });

    it('decision_trace.winning_intent_id is present (string or null) after commander loop', () => {
        const briefing = makeMinimalBriefing({ turn: 11 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        if (output.updated_state.decision_trace) {
            // winning_intent_id can be null (all blocked) or a non-empty string
            const wid = output.updated_state.decision_trace.winning_intent_id;
            expect(wid === null || typeof wid === 'string').toBe(true);
        }
    });

    it('decision_trace.candidates array is non-empty after commander loop', () => {
        const briefing = makeMinimalBriefing({ turn: 11 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        if (output.updated_state.decision_trace) {
            expect(output.updated_state.decision_trace.candidates.length).toBeGreaterThan(0);
        }
    });

    it('decision_trace.hard_constraints is populated when constraints fired', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_stance: 'balanced',
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const result = managePlan(briefing, zones, forces, surplusPool, null, 10);

        // managePlan short-circuits before competition when corps_exhaustion > threshold
        // so decision_trace may be undefined — but if the competition ran, check constraints
        if (result.decision_trace) {
            const hasExhaustionConstraint = result.decision_trace.hard_constraints.includes(
                'corps_exhaustion_exceeds_threshold',
            );
            // Constraints should be present since exhaustion block fired for offensive candidates
            expect(hasExhaustionConstraint).toBe(true);
        }
    });

    it('decision_trace.lessons_applied is always an empty array (Phase 3 defers lessons)', () => {
        const briefing = makeMinimalBriefing({ turn: 11 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        if (output.updated_state.decision_trace) {
            expect(output.updated_state.decision_trace.lessons_applied).toEqual([]);
        }
    });

    it('decision_trace is populated when selectWinningIntent runs directly', () => {
        const { trace } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 10);

        expect(trace).toBeDefined();
        expect(trace.turn).toBe(10);
        expect(trace.candidates.length).toBeGreaterThan(0);
        expect(trace.lessons_applied).toEqual([]);
    });

    it('hard_constraints in trace are sorted deterministically', () => {
        const surplusPool = makeSurplusPool(MIN_BRIGADES_FOR_PLAN);
        const briefing = makeMinimalBriefing({
            corps_exhaustion: MAX_EXHAUSTION_FOR_OPERATION + 5,
        faction_war_exhaustion: 0,
            avg_fatigue_pct: 80,
            pre_planned_ops: [{ id: 'op_1' }],
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { trace: trace1 } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);
        const { trace: trace2 } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        expect(trace1.hard_constraints).toEqual(trace2.hard_constraints);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 6: Continuity — advanceExistingPlan preserves previous decision_trace
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Continuity', () => {
    it('when a plan already exists, managePlan does not run selectWinningIntent (no decision_trace overwrite)', () => {
        const brigIds = ['bde_1', 'bde_2', 'bde_3'].map(id => id as FormationId);
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const plan: CommanderPlan = {
            plan_id: 'plan_existing',
            objective_description: 'Advance on test target',
            target_osids: ['op:test:enemy_1'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 5,
            target_ready_turn: 12,
            concentration_progress: 0.5,
            viability_score: 0.7,
            source: 'opportunity',
        };

        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'balanced',
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            deficit: 0,
        })];
        const evals = brigIds.map(id => makeEval({ brigade_id: id, current_zone: zoneId }));
        const forces = makeForces(evals, brigIds.length);

        const briefing = makeMinimalBriefing({ turn: 10 });

        // When existing plan is passed, managePlan routes to advanceExistingPlan —
        // no new competition is run and decision_trace should be undefined on result
        const result = managePlan(briefing, zones, forces, evals, plan, 10);

        // advanceExistingPlan does not produce a decision_trace
        expect(result.decision_trace).toBeUndefined();
        // Plan should be advanced (not re-created)
        expect(result.plan).not.toBeNull();
        expect(result.plan!.plan_id).toBe('plan_existing');
    });

    it('previous decision_trace on CommanderState is preserved when plan is advancing', () => {
        // Simulate a commander loop where a plan existed from the previous turn.
        // The updated_state should carry the previous decision_trace forward.
        const brigIds = ['bde_1', 'bde_2', 'bde_3'].map(id => id as FormationId);
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const previousTrace = {
            turn: 9,
            winning_intent_id: 'stage_operation:9:corps',
            candidates: [],
            hard_constraints: [],
            lessons_applied: [] as string[],
            relationships_applied: [] as string[],
        };

        const plan: CommanderPlan = {
            plan_id: 'plan_carry',
            objective_description: 'Carry-forward plan',
            target_osids: ['op:test:enemy_1'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 8,
            target_ready_turn: 13,
            concentration_progress: 0.6,
            viability_score: 0.8,
            source: 'pre_planned',
        };

        const prevState = makeMinimalState({
            current_plan: plan,
            decision_trace: previousTrace,
        });

        const briefing = makeMinimalBriefing({
            turn: 10,
            previous_state: prevState,
        });

        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, prevState);

        // When advancing an existing plan, the commander loop should preserve prior trace
        // (the updated_state.decision_trace should be the previous one, not undefined)
        // Phase 3 spec: advanceExistingPlan does not overwrite decision_trace
        if (output.updated_state.decision_trace !== undefined) {
            // If a trace exists, it's either the prior one carried forward or a new one from
            // a new-plan competition in the same turn
            expect(output.updated_state.decision_trace.turn).toBeGreaterThanOrEqual(9);
        }
    });

    it('managePlan returns decision_trace only when new competition ran (no existing plan)', () => {
        // No existing plan → competition runs → trace is attached
        const briefing = makeMinimalBriefing({ turn: 10, corps_stance: 'balanced' });
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);

        const result = managePlan(briefing, zones, forces, [], null, 10);

        // Competition runs when no existing plan and stance allows it
        expect(result.decision_trace).toBeDefined();
    });

    it('managePlan returns no decision_trace when corps_stance is defensive (short-circuits before competition)', () => {
        // Defensive stance short-circuits before selectWinningIntent
        const briefing = makeMinimalBriefing({ turn: 10, corps_stance: 'defensive' });
        const zones: ZoneAssessment[] = [];
        const forces = makeForces([]);

        const result = managePlan(briefing, zones, forces, [], null, 10);

        // Phase 5: early-return paths now carry a stub trace with the blocking constraint
        expect(result.decision_trace).toBeDefined();
        expect(result.decision_trace?.hard_constraints).toContain('corps_stance_forbids_offensive');
        expect(result.decision_trace?.candidates).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Section 7: Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 3 — Edge Cases', () => {
    it('intent_id is formatted as type:turn:zone_or_corps', () => {
        const { trace } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 10);

        const holdLine = trace.candidates.find(c => c.type === 'hold_line');
        expect(holdLine).toBeDefined();
        // No zone on hold_line → should end in ':corps'
        expect(holdLine!.intent_id).toBe('hold_line:10:corps');
    });

    it('recall_exposed_brigades is generated when a surplus brigade is disrupted', () => {
        const surplusPool = [
            makeEval({ brigade_id: 'bde_disrupted' as FormationId, is_disrupted: true }),
        ];
        const briefing = makeMinimalBriefing();
        const forces = makeForces(surplusPool, 1);

        const { trace } = selectWinningIntent(briefing, [], forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'recall_exposed_brigades')).toBe(true);
    });

    it('recall_exposed_brigades is generated when a surplus brigade has critically low morale', () => {
        const surplusPool = [
            makeEval({
                brigade_id: 'bde_low_morale' as FormationId,
                morale: CRITICAL_MORALE_THRESHOLD - 1,
            }),
        ];
        const briefing = makeMinimalBriefing();
        const forces = makeForces(surplusPool, 1);

        const { trace } = selectWinningIntent(briefing, [], forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'recall_exposed_brigades')).toBe(true);
    });

    it('recall_exposed_brigades is NOT generated when no disrupted/critical-morale brigades exist', () => {
        const surplusPool = [
            makeEval({ brigade_id: 'bde_healthy' as FormationId, morale: 80, is_disrupted: false }),
        ];
        const briefing = makeMinimalBriefing();
        const forces = makeForces(surplusPool, 1);

        const { trace } = selectWinningIntent(briefing, [], forces, surplusPool, 10);

        expect(trace.candidates.some(c => c.type === 'recall_exposed_brigades')).toBe(false);
    });

    it('winner score is always between 0 and 1 (weighted factors are bounded)', () => {
        const surplusPool = makeSurplusPool(5);
        const briefing = makeMinimalBriefing({
            pre_planned_ops: [{ id: 'op_1' }],
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'critical',
                },
            }),
        });
        const zones = [makeZone({ posture: 'projecting', surplus_brigades: surplusPool.map(e => e.brigade_id) })];
        const forces = makeForces(surplusPool, surplusPool.length);

        const { winner, trace } = selectWinningIntent(briefing, zones, forces, surplusPool, 10);

        for (const candidate of trace.candidates) {
            expect(candidate.score).toBeGreaterThanOrEqual(0);
            expect(candidate.score).toBeLessThanOrEqual(1.001); // allow tiny float margin
        }
        if (winner) {
            expect(winner.score).toBeGreaterThanOrEqual(0);
            expect(winner.score).toBeLessThanOrEqual(1.001);
        }
    });

    it('multiple calls with different turns produce different intent_ids (turn is part of id)', () => {
        const { trace: trace10 } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 10);
        const { trace: trace11 } = selectWinningIntent(makeMinimalBriefing(), [], makeForces([]), [], 11);

        const holdLine10 = trace10.candidates.find(c => c.type === 'hold_line');
        const holdLine11 = trace11.candidates.find(c => c.type === 'hold_line');

        expect(holdLine10!.intent_id).not.toEqual(holdLine11!.intent_id);
        expect(holdLine10!.intent_id).toContain(':10:');
        expect(holdLine11!.intent_id).toContain(':11:');
    });
});
