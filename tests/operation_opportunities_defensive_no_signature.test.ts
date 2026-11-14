/**
 * L3 (owner decision 2, 2026-11-14; command-loop proposal §5B; Engine Invariants §14.10b):
 * defensive operations are never put to the President.
 *
 * A defensive-crisis (T3) opportunity of the player's faction is decided by staff on the bot path
 * at every autonomy level, and never becomes a review card. Corps operations and campaigns (T1)
 * still reach him in Full Control and Assisted; Delegated is unchanged. Headless auto-control keeps
 * its review-then-auto-resolve timing, so headless runs are byte-identical.
 */

import { describe, expect, it } from 'vitest';
import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyBotOpportunityDecisions,
    generateOpportunityProposalReviews,
    isDefensiveOpportunity,
    runOpportunityEvaluationStep,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';

function buildMinimalState(
    turn: number,
    playerFaction: FactionId | null,
    autonomyLevel: 0 | 1 | 2 | 3,
    primaryCorps = 'arbih_5th_corps',
): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: [],
    };
    const meta: GameState['meta'] = {
        turn,
        seed: 'test',
        phase: 'war',
        autonomy_level: autonomyLevel,
        ...(playerFaction !== null ? { player_faction: playerFaction } : {}),
    };
    return {
        schema_version: 0,
        meta,
        factions: [],
        military: {
            formations: {
                b_a: {
                    id: 'b_a',
                    name: 'Brigade A',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'RBiH',
                    corps_id: primaryCorps,
                    personnel: 1000,
                },
                b_b: {
                    id: 'b_b',
                    name: 'Brigade B',
                    kind: 'brigade',
                    status: 'active',
                    faction: 'RBiH',
                    corps_id: primaryCorps,
                    personnel: 1000,
                },
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { [primaryCorps]: cmd },
        },
        political: {} as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

const greenAxis: OperationOpportunityDef["evaluators"]["date_window"] = () => ({ green: true, reason: 'satisfied' });
const dateWindow = (min: number, max: number): OperationOpportunityDef["evaluators"]["date_window"] =>
    (_state, turn) => ({
        green: turn >= min && turn <= max,
        reason: turn < min ? 'window has not opened' : turn > max ? 'window has closed' : 'window open',
    });

function fixtureOpp(overrides: Partial<OperationOpportunityDef> = {}): OperationOpportunityDef {
    return {
        opportunity_id: 'fixture_opp',
        name: 'Fixture Opportunity',
        tier: 'T1',
        faction: 'RBiH',
        primary_corps: 'arbih_5th_corps',
        family: 'fixture',
        axes: [{
            axis_id: 'main',
            name: 'Main',
            corps: 'arbih_5th_corps',
            brigades: ['b_a', 'b_b'],
            objectives: ['op:bihac:bihac_2'],
        }],
        staging_osid: 'op:bihac:bihac_2',
        planning_duration: 3,
        citations: ['fixture'],
        historical_exit_class: 'partial_success',
        prerequisites: {
            date_window: 'required',
            political_authorization: 'n_a',
            corps_readiness: 'required',
            logistics: 'n_a',
            staging_access: 'required',
            weather_season: 'n_a',
            commander_confidence: 'n_a',
            enemy_weakness: 'n_a',
            alliance_context: 'n_a',
            force_quality: 'n_a',
            min_optional_axes: 0,
        },
        evaluators: {
            date_window: dateWindow(170, 190),
            political_authorization: greenAxis,
            corps_readiness: greenAxis,
            logistics: greenAxis,
            staging_access: greenAxis,
            weather_season: greenAxis,
            commander_confidence: greenAxis,
            enemy_weakness: greenAxis,
            alliance_context: greenAxis,
            force_quality: greenAxis,
        },
        staff_recommendation: 'approve',
        ...overrides,
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

const t1 = () => fixtureOpp();
const t3 = () => fixtureOpp({ opportunity_id: 'fixture_defence', name: 'Operation Fixture Defense', tier: 'T3' });

function evaluate(level: 0 | 1 | 2 | 3, def: OperationOpportunityDef, headless = false): GameState {
    const state = buildMinimalState(175, 'RBiH', level);
    if (headless) state.meta.headless_scenario_auto_control = true;
    runOpportunityEvaluationStep(state, 175, [def]);
    return state;
}

describe('L3: defensive operations are never put to the President', () => {
    it('classifies exactly the catalog T3 entries as defensive (code-side lookup)', () => {
        const defensive = OPERATION_OPPORTUNITY_CATALOG.filter(isDefensiveOpportunity).map((d) => d.name).sort();
        expect(defensive).toEqual(['Operation Breza 94 Defense', 'Operation Spider Defense', 'Operation Una 94 Defense']);
        expect(OPERATION_OPPORTUNITY_CATALOG.filter((d) => !isDefensiveOpportunity(d)).every((d) => d.tier !== 'T3')).toBe(true);
    });

    it.each([0, 1] as const)('at level %i a T3 opportunity is staff-decided this turn and makes no review card', (level) => {
        const state = evaluate(level, t3());
        applyBotOpportunityDecisions(state, 175, 'RBiH', [t3()]);
        const proposal = state.military.operation_opportunities![0]!;
        expect(proposal.status).toBe('approved');
        // T3 approve commits reserves and spawns no operation.
        expect(state.military.corps_command!.arbih_5th_corps!.active_operations).toEqual([]);
        expect(state.military.operation_opportunity_resolutions?.[0]?.exit_class).toBe('t3_authorized_no_offensive');
        expect(generateOpportunityProposalReviews(state, 'RBiH', [t3()])).toEqual([]);
    });

    it.each([0, 1] as const)('at level %i a still-pending T3 opportunity never becomes a review card', (level) => {
        const state = evaluate(level, t3());
        expect(generateOpportunityProposalReviews(state, 'RBiH', [t3()])).toEqual([]);
    });

    it.each([0, 1] as const)('at level %i a T1 corps operation still reaches the President', (level) => {
        const state = evaluate(level, t1());
        applyBotOpportunityDecisions(state, 175, 'RBiH', [t1()]);
        expect(state.military.operation_opportunities![0]!.status).toBe('eligible_pending_review');
        expect(generateOpportunityProposalReviews(state, 'RBiH', [t1()])).toHaveLength(1);
    });

    it('at level 2 (Delegated) both are staff-decided, as before', () => {
        for (const def of [t1(), t3()]) {
            const state = evaluate(2, def);
            expect(generateOpportunityProposalReviews(state, 'RBiH', [def])).toEqual([]);
            applyBotOpportunityDecisions(state, 175, 'RBiH', [def]);
            expect(state.military.operation_opportunities![0]!.status).toBe('approved');
        }
    });

    it('headless auto-control keeps the review-then-auto-resolve path for T3 (byte-identical timing)', () => {
        const state = evaluate(1, t3(), true);
        applyBotOpportunityDecisions(state, 175, 'RBiH', [t3()]);
        expect(state.military.operation_opportunities![0]!.status).toBe('eligible_pending_review');
        expect(generateOpportunityProposalReviews(state, 'RBiH', [t3()])).toHaveLength(1);
    });

    it('another faction\'s T3 is unaffected (bot path, same turn)', () => {
        const state = buildMinimalState(175, 'HRHB' as FactionId, 1);
        runOpportunityEvaluationStep(state, 175, [t3()]);
        applyBotOpportunityDecisions(state, 175, 'HRHB', [t3()]);
        expect(state.military.operation_opportunities![0]!.status).toBe('approved');
    });
});
