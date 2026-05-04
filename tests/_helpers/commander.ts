/**
 * Shared test helpers for the v0.8 Corps Commander cluster.
 *
 * Consolidates near-identical mock factories duplicated across 7+ files:
 *   - tests/commander/commander.test.ts
 *   - tests/commander/commander_belief_layer.test.ts
 *   - tests/commander/commander_phase3_candidate_competition.test.ts
 *   - tests/commander/commander_phase4_lesson_personality.test.ts
 *   - tests/commander/commander_phase5_constraint_preference.test.ts
 *   - tests/commander/commander_phase6_trace_qa.test.ts
 *
 * Helpers exported:
 *   - makeCommanderBrigade
 *   - makeCommanderZone
 *   - makeCommanderEval
 *   - makeCommanderForces
 *   - makeCommanderMinimalSpatial
 *   - makeCommanderMinimalBriefing
 *   - makeCommanderMinimalState
 *   - DEFAULT_COMMANDER_PERSONALITY
 *
 * Faction-agnostic: defaults to RBiH but accepts any FactionId via overrides.
 * Deterministic: no Math.random(), no Date.now(), no timestamps.
 *
 * `briefing_campaign_intent.test.ts` and other files with materially different
 * helper shapes are intentionally NOT consolidated here.
 */

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
} from '../../src/sim/combat/commander/commander_state.js';

// ─── Brigade ────────────────────────────────────────────────────────────────

/** RBiH "test_brigade_1" with personnel 2000, cohesion 70, morale 60. */
export function makeCommanderBrigade(
    overrides: Partial<FormationState> = {},
): FormationState {
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

// ─── Zone ───────────────────────────────────────────────────────────────────

/** Default zone: 'zone:test_corps:0', RBiH, 2 OSIDs, main-body, balanced. */
export function makeCommanderZone(
    overrides: Partial<ZoneAssessment> = {},
): ZoneAssessment {
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

// ─── Brigade evaluation ─────────────────────────────────────────────────────

export function makeCommanderEval(
    overrides: Partial<BrigadeEvaluation> = {},
): BrigadeEvaluation {
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

// ─── Force assessment ───────────────────────────────────────────────────────

/**
 * Build a ForceAssessment from a list of evaluations.
 *
 * The second argument can be:
 *   - omitted / undefined → total_surplus = 0
 *   - a number → used directly as total_surplus (matches phase3..6 helpers)
 *   - a ZoneAssessment[] → total_surplus computed from zones
 *     (matches commander.test.ts helper)
 */
export function makeCommanderForces(
    evaluations: BrigadeEvaluation[],
    totalSurplusOrZones?: number | ZoneAssessment[],
): ForceAssessment {
    let mainEffort = 0;
    let activeDefense = 0;
    let garrison = 0;
    let combatEffective = 0;

    const byZone: Record<string, BrigadeEvaluation[]> = {};
    for (const ev of evaluations) {
        if (ev.is_combat_effective) combatEffective++;
        switch (ev.tier) {
            case 'main_effort':
                mainEffort++;
                break;
            case 'active_defense':
                activeDefense++;
                break;
            case 'garrison':
                garrison++;
                break;
        }
        const key = ev.current_zone ?? '__unassigned__';
        if (!byZone[key]) byZone[key] = [];
        byZone[key]!.push(ev);
    }

    let totalSurplus = 0;
    if (typeof totalSurplusOrZones === 'number') {
        totalSurplus = totalSurplusOrZones;
    } else if (Array.isArray(totalSurplusOrZones)) {
        for (const zone of totalSurplusOrZones) {
            totalSurplus += Math.max(
                0,
                zone.assigned_brigades.length - zone.garrison_budget,
            );
        }
    }

    return {
        total_brigades: evaluations.length,
        combat_effective: combatEffective,
        evaluations,
        by_zone: byZone,
        tier_counts: {
            main_effort: mainEffort,
            active_defense: activeDefense,
            garrison,
        },
        total_surplus: totalSurplus,
    };
}

// ─── Spatial ────────────────────────────────────────────────────────────────

/** Empty 3-faction spatial scaffold for briefings that don't need real graph data. */
export function makeCommanderMinimalSpatial(): any {
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

// ─── Personality ────────────────────────────────────────────────────────────

/** Default neutral commander personality used by Phase 1 and commander.test.ts. */
export const DEFAULT_COMMANDER_PERSONALITY: OfficerPersonality = {
    aggression: 0.5,
    caution: 0.3,
    initiative: 0.3,
    competence: 0.5,
};

// ─── Briefing ───────────────────────────────────────────────────────────────

/**
 * Minimal briefing for test_corps / RBiH at turn 10. Override any field.
 *
 * Caller may pass a personality via `overrides.officer_personality`.
 */
export function makeCommanderMinimalBriefing(
    overrides: Partial<CommanderBriefing> = {},
): CommanderBriefing {
    return {
        corps_id: 'test_corps' as FormationId,
        faction: 'RBiH' as FactionId,
        turn: 10,
        spatial: makeCommanderMinimalSpatial(),
        sectors: [],
        brigades: [makeCommanderBrigade()],
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
        officer_personality: DEFAULT_COMMANDER_PERSONALITY,
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

// ─── State ──────────────────────────────────────────────────────────────────

/** Minimal CommanderState — empty everything, low pressure. */
export function makeCommanderMinimalState(
    overrides: Partial<CommanderState> = {},
): CommanderState {
    return {
        zone_assessments: [],
        threat_assessment: {
            threatened_zones: [],
            enemy_concentration_zones: [],
            recent_losses: [],
            overall_pressure: 'low',
        },
        force_assessment: makeCommanderForces([]),
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
