/**
 * Tests for v0.8.1 Phase 1 — State and Type Foundation.
 *
 * Covers:
 * - New v0.8.1 type structures (belief, relationships, lessons, traces) have safe defaults
 * - CommanderState carries new fields through multi-turn continuity
 * - Serialization round-trip preserves new fields
 * - estimateTurnsActive suspend counter fix (suspended_since_turn)
 * - Tightened supply_by_osid and intel_data types compile and work
 *
 * Deterministic: no Math.random(), no Date.now().
 */

import { describe, it, expect } from 'vitest';
import type {
    FactionId,
    FormationId,
    FormationState,
    CorpsFrontSector,
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
    CommanderRelationships,
    CommanderLesson,
    CommanderLessonCategory,
    CommanderIntentCandidate,
    CommanderIntentType,
    CommanderDecisionTrace,
    ZoneBelief,
    ThreatAssessment,
} from '../../src/sim/combat/commander/commander_state.js';
import {
    managePlan,
    MAX_SUSPENSION_TURNS,
} from '../../src/sim/combat/commander/plan.js';
import { BotCorpsCommander } from '../../src/sim/combat/commander/commander_loop.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers — minimal mock factories
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

function makeForces(evaluations: BrigadeEvaluation[]): ForceAssessment {
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
        evaluations, by_zone: byZone,
        tier_counts: { main_effort: mainEffort, active_defense: activeDefense, garrison },
        total_surplus: 0,
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

// ═══════════════════════════════════════════════════════════════════════════
// 1. v0.8.1 Type Structure Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 1 — type structures', () => {
    it('CommanderBeliefState has correct shape with safe defaults', () => {
        const belief: CommanderBeliefState = {
            zone_beliefs: [],
            supply_continuity_confidence: 1.0,
            subordinate_reliability: {},
            neighbor_support_confidence: {},
        };
        expect(belief.zone_beliefs).toEqual([]);
        expect(belief.supply_continuity_confidence).toBe(1.0);
    });

    it('ZoneBelief has correct shape', () => {
        const zb: ZoneBelief = {
            zone_id: 'zone:test:0' as ZoneId,
            estimated_enemy_strength: 5000,
            estimated_enemy_intent: 'hold',
            confidence: 0.7,
            last_confirmed_turn: 5,
        };
        expect(zb.estimated_enemy_intent).toBe('hold');
        expect(zb.confidence).toBe(0.7);
    });

    it('CommanderRelationships has correct shape with safe defaults', () => {
        const rel: CommanderRelationships = {
            player_trust: 0.5,
            sibling_corps_trust: {},
            patron_alignment: 0.5,
        };
        expect(rel.player_trust).toBe(0.5);
        expect(rel.patron_alignment).toBe(0.5);
    });

    it('CommanderLesson has correct shape', () => {
        const lesson: CommanderLesson = {
            lesson_id: 'lesson_1',
            category: 'offensive_failure' as CommanderLessonCategory,
            zone_id: 'zone:test:0' as ZoneId,
            relevant_osids: ['op:test:test_1'],
            weight: -0.5,
            created_turn: 5,
            expires_turn: 15,
        };
        expect(lesson.category).toBe('offensive_failure');
        expect(lesson.weight).toBe(-0.5);
    });

    it('CommanderIntentCandidate has correct shape', () => {
        const candidate: CommanderIntentCandidate = {
            intent_id: 'intent_1',
            type: 'stage_operation' as CommanderIntentType,
            target_zone: 'zone:test:0' as ZoneId,
            score: 0.8,
            score_breakdown: { threat: 0.3, opportunity: 0.5 },
            blocked_by: [],
        };
        expect(candidate.type).toBe('stage_operation');
        expect(candidate.blocked_by).toEqual([]);
    });

    it('CommanderDecisionTrace has correct shape', () => {
        const trace: CommanderDecisionTrace = {
            turn: 10,
            winning_intent_id: 'intent_1',
            candidates: [],
            hard_constraints: ['insufficient_supply'],
            lessons_applied: ['lesson_1'],
        };
        expect(trace.winning_intent_id).toBe('intent_1');
        expect(trace.hard_constraints).toContain('insufficient_supply');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. CommanderState v0.8.1 field persistence
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 1 — CommanderState persistence', () => {
    it('new v0.8.1 fields are optional and default to undefined', () => {
        const state = makeMinimalState();
        expect(state.belief_state).toBeUndefined();
        expect(state.relationships).toBeUndefined();
        expect(state.lessons).toBeUndefined();
        expect(state.decision_trace).toBeUndefined();
    });

    it('new v0.8.1 fields survive JSON round-trip', () => {
        const belief: CommanderBeliefState = {
            zone_beliefs: [{
                zone_id: 'zone:test:0' as ZoneId,
                estimated_enemy_strength: 3000,
                estimated_enemy_intent: 'attack',
                confidence: 0.6,
                last_confirmed_turn: 8,
            }],
            supply_continuity_confidence: 0.9,
            subordinate_reliability: { bde_1: 0.8 },
            neighbor_support_confidence: { corps_2: 0.7 },
        };
        const relationships: CommanderRelationships = {
            player_trust: 0.6,
            sibling_corps_trust: { corps_2: 0.5 },
            patron_alignment: 0.7,
        };
        const lessons: CommanderLesson[] = [{
            lesson_id: 'l1',
            category: 'offensive_failure',
            weight: -0.3,
            created_turn: 5,
        }];
        const trace: CommanderDecisionTrace = {
            turn: 10,
            winning_intent_id: null,
            candidates: [],
            hard_constraints: [],
            lessons_applied: [],
        };

        const state = makeMinimalState({
            belief_state: belief,
            relationships,
            lessons,
            decision_trace: trace,
        });

        const serialized = JSON.stringify(state);
        const deserialized = JSON.parse(serialized) as CommanderState;

        expect(deserialized.belief_state).toEqual(belief);
        expect(deserialized.relationships).toEqual(relationships);
        expect(deserialized.lessons).toEqual(lessons);
        expect(deserialized.decision_trace).toEqual(trace);
    });

    it('old saves without v0.8.1 fields deserialize cleanly', () => {
        // Simulate an old save that has no v0.8.1 fields
        const oldSave = JSON.stringify({
            zone_assessments: [],
            threat_assessment: { threatened_zones: [], enemy_concentration_zones: [], recent_losses: [], overall_pressure: 'low' },
            force_assessment: makeForces([]),
            current_plan: null,
            sector_activity_log: [],
            operation_history: [],
            intel_picture: { zone_confidence: {}, offensive_signs: {}, concentration_detected: {}, last_updated_turn: 0 },
            garrison_budget: {},
            last_assessment_turn: 5,
        });

        const deserialized = JSON.parse(oldSave) as CommanderState;
        // v0.8.1 fields should be absent (undefined), not crash
        expect(deserialized.belief_state).toBeUndefined();
        expect(deserialized.relationships).toBeUndefined();
        expect(deserialized.lessons).toBeUndefined();
        expect(deserialized.decision_trace).toBeUndefined();
        // v0.8.0 fields still intact
        expect(deserialized.last_assessment_turn).toBe(5);
    });

    it('CommanderState top-level keys include v0.8.1 fields when populated', () => {
        const state = makeMinimalState({
            belief_state: {
                zone_beliefs: [],
                supply_continuity_confidence: 1.0,
                subordinate_reliability: {},
                neighbor_support_confidence: {},
            },
            relationships: { player_trust: 0.5, sibling_corps_trust: {}, patron_alignment: 0.5 },
            lessons: [],
            decision_trace: { turn: 0, winning_intent_id: null, candidates: [], hard_constraints: [], lessons_applied: [] },
        });
        const keys = Object.keys(state);
        expect(keys).toContain('belief_state');
        expect(keys).toContain('relationships');
        expect(keys).toContain('lessons');
        expect(keys).toContain('decision_trace');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Multi-turn state continuity
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 1 — multi-turn continuity', () => {
    it('v0.8.1 fields carry forward through commander loop when populated', () => {
        const belief: CommanderBeliefState = {
            zone_beliefs: [],
            supply_continuity_confidence: 0.8,
            subordinate_reliability: {},
            neighbor_support_confidence: {},
        };
        const relationships: CommanderRelationships = {
            player_trust: 0.6,
            sibling_corps_trust: {},
            patron_alignment: 0.7,
        };
        const lessons: readonly CommanderLesson[] = [{
            lesson_id: 'l1',
            category: 'offensive_failure',
            weight: -0.3,
            created_turn: 5,
        }];

        const previousState = makeMinimalState({
            belief_state: belief,
            relationships,
            lessons,
        });

        const briefing = makeMinimalBriefing({
            turn: 11,
            previous_state: previousState,
        });

        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, previousState);

        // v0.8.1 fields should be carried forward in updated_state
        expect(output.updated_state.belief_state).toEqual(belief);
        expect(output.updated_state.relationships).toEqual(relationships);
        expect(output.updated_state.lessons).toEqual(lessons);
    });

    it('v0.8.1 fields remain undefined when not previously populated', () => {
        const briefing = makeMinimalBriefing({ turn: 11 });
        const commander = new BotCorpsCommander();
        const output = commander.decide(briefing, null);

        expect(output.updated_state.belief_state).toBeUndefined();
        expect(output.updated_state.relationships).toBeUndefined();
        expect(output.updated_state.lessons).toBeUndefined();
        expect(output.updated_state.decision_trace).toBeUndefined();
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. estimateTurnsActive fix — suspended_since_turn
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 1 — suspension timeout fix', () => {
    it('suspended plan records suspended_since_turn', () => {
        const brigIds = ['bde_1', 'bde_2', 'bde_3'].map(id => id as FormationId);
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const plan: CommanderPlan = {
            plan_id: 'plan_1',
            objective_description: 'Test plan',
            target_osids: ['op:test:enemy_1'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'concentrating',
            created_turn: 5,
            target_ready_turn: 8,
            concentration_progress: 0.3,
            viability_score: 0.7,
            source: 'opportunity',
        };

        // Zone has critical threat → triggers suspend condition
        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'defending',
            front_edge_count: 20,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            deficit: 0,
        })];

        const evals = brigIds.map(id => makeEval({ brigade_id: id, current_zone: zoneId }));
        const forces = makeForces(evals);

        const briefing = makeMinimalBriefing({
            turn: 7,
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [{ zone_id: zoneId, threat_level: 'critical' }],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'heavy',
                },
            }),
        });

        const result = managePlan(briefing, zones, forces, evals, plan, 7);

        expect(result.action).toBe('suspended');
        expect(result.plan?.status).toBe('suspended');
        expect(result.plan?.suspended_since_turn).toBe(7);
    });

    it('already-suspended plan preserves original suspended_since_turn', () => {
        const brigIds = ['bde_1', 'bde_2', 'bde_3'].map(id => id as FormationId);
        const zoneId = 'zone:test_corps:0' as ZoneId;

        const plan: CommanderPlan = {
            plan_id: 'plan_1',
            objective_description: 'Test plan',
            target_osids: ['op:test:enemy_1'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'suspended',
            created_turn: 5,
            target_ready_turn: 8,
            concentration_progress: 0.3,
            viability_score: 0.7,
            source: 'opportunity',
            suspension_reason: 'critical threat',
            suspended_since_turn: 7,
        };

        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'defending',
            front_edge_count: 20,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            deficit: 0,
        })];

        const evals = brigIds.map(id => makeEval({ brigade_id: id, current_zone: zoneId }));
        const forces = makeForces(evals);

        const briefing = makeMinimalBriefing({
            turn: 9,
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [{ zone_id: zoneId, threat_level: 'critical' }],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'heavy',
                },
            }),
        });

        const result = managePlan(briefing, zones, forces, evals, plan, 9);

        expect(result.action).toBe('suspended');
        expect(result.plan?.suspended_since_turn).toBe(7);
    });

    it('plan suspended for MAX_SUSPENSION_TURNS is abandoned', () => {
        const brigIds = ['bde_1', 'bde_2', 'bde_3'].map(id => id as FormationId);
        const zoneId = 'zone:test_corps:0' as ZoneId;
        const suspendedSince = 5;

        const plan: CommanderPlan = {
            plan_id: 'plan_1',
            objective_description: 'Test plan',
            target_osids: ['op:test:enemy_1'],
            required_brigades: 3,
            assigned_brigades: brigIds,
            staging_zone: zoneId,
            status: 'suspended',
            created_turn: 2,
            target_ready_turn: 5,
            concentration_progress: 0.3,
            viability_score: 0.7,
            source: 'opportunity',
            suspension_reason: 'critical threat',
            suspended_since_turn: suspendedSince,
        };

        const zones = [makeZone({
            zone_id: zoneId,
            posture: 'defending',
            front_edge_count: 20,
            surplus_brigades: brigIds,
            assigned_brigades: brigIds,
            deficit: 0,
        })];

        const evals = brigIds.map(id => makeEval({ brigade_id: id, current_zone: zoneId }));
        const forces = makeForces(evals);

        const turn = suspendedSince + MAX_SUSPENSION_TURNS;
        const briefing = makeMinimalBriefing({
            turn,
            previous_state: makeMinimalState({
                threat_assessment: {
                    threatened_zones: [{ zone_id: zoneId, threat_level: 'critical' }],
                    enemy_concentration_zones: [],
                    recent_losses: [],
                    overall_pressure: 'heavy',
                },
            }),
        });

        const result = managePlan(briefing, zones, forces, evals, plan, turn);

        expect(result.action).toBe('abandoned');
        expect(result.plan?.status).toBe('abandoned');
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. Tightened types — supply_by_osid and intel_data
// ═══════════════════════════════════════════════════════════════════════════

describe('v0.8.1 Phase 1 — tightened briefing types', () => {
    it('supply_by_osid accepts SupplyStateByOsidReport | null', () => {
        const briefing = makeMinimalBriefing({ supply_by_osid: null });
        expect(briefing.supply_by_osid).toBeNull();
    });

    it('intel_data accepts CommanderIntelData | null', () => {
        const briefing = makeMinimalBriefing({
            intel_data: {
                sector_intel: { 'sector:test:0': [] },
                opsec_active_sectors: ['sector:test:0'],
            },
        });
        expect(briefing.intel_data?.sector_intel).toBeDefined();
        expect(briefing.intel_data?.opsec_active_sectors).toEqual(['sector:test:0']);
    });

    it('intel_data null is handled safely', () => {
        const briefing = makeMinimalBriefing({ intel_data: null });
        expect(briefing.intel_data).toBeNull();
    });
});
