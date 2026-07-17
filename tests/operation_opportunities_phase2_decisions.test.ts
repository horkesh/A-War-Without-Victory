/**
 * operation_opportunities_phase2_decisions.test.ts — LANE B Phase 2 protection suite.
 *
 * Validates the autonomy / IPC review surface wiring:
 *   - Bot opportunities (approver_faction !== playerFaction) are decided
 *     synchronously and never appear in the player's pending review queue.
 *   - Player opportunities surface as `PendingProposalReview` rows at
 *     autonomy_level === 1 only, with `proposed_action: "OPPORTUNITY:<id>"`
 *     and player-safe descriptions (no raw OSIDs).
 *   - The accept/reject IPC marks `accepted` on the proposal row; the
 *     `applyResolvedOpportunityDecisions` step routes it through
 *     applyOpportunityDecision. Rich opportunity decisions can also be written
 *     explicitly on the review row so IPC can expose delay / redirect /
 *     under_resource without bypassing the war-pipeline owner.
 *   - Bot decisions are deterministic across replay (same state -> same
 *     decision in same order).
 *
 * Legacy accept/reject IPC remains supported for approve/decline. The richer
 * opportunity IPC writes `opportunity_decision` and optional decision options
 * onto the review row; this consumer owns the state mutation on the next turn.
 */

import { describe, expect, it } from 'vitest';

import {
    OPPORTUNITY_PROPOSAL_ACTION_PREFIX,
    applyBotOpportunityDecisions,
    applyResolvedOpportunityDecisions,
    autoResolveOpportunityProposalReviews,
    buildProposalId,
    generateOpportunityProposalReviews,
    runOpportunityEvaluationStep,
    type AxisPredicate,
    type OperationOpportunityDef,
} from '../src/sim/combat/operation_opportunities.js';
import { selectBotBrigadeOrderFactions } from '../src/sim/turn_phases/war_phases.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

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
            formations: {},
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

const greenAxis: AxisPredicate = () => ({ green: true, reason: 'satisfied' });
const dateWindow = (min: number, max: number): AxisPredicate =>
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

describe('operation_opportunities — Phase 2 decision surface', () => {
    it('bot opportunity is auto-approved on the same turn it becomes eligible', () => {
        // Player is HRHB; the catalog opportunity belongs to RBiH (a bot from this lens).
        const state = buildMinimalState(175, 'HRHB', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        // Before bot decisions: proposal is pending.
        expect(state.military.operation_opportunities![0].status).toBe('eligible_pending_review');
        applyBotOpportunityDecisions(state, 175, 'HRHB', [def]);
        const after = state.military.operation_opportunities![0];
        expect(after.status).toBe('approved');
        expect(after.executed_op_id).toBe(def.name);
        // The bot opportunity must NOT have surfaced into pending_proposal_reviews.
        expect(state.meta.pending_proposal_reviews ?? []).toEqual([]);
    });

    it('bot apply is a no-op when there are no opportunities', () => {
        const state = buildMinimalState(175, 'HRHB', 1);
        applyBotOpportunityDecisions(state, 175, 'HRHB', []);
        expect(state.military.operation_opportunities ?? []).toEqual([]);
    });

    it('bot opportunity resolver treats null player faction as fully headless control', () => {
        const state = buildMinimalState(175, 'RBiH', 0);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);

        applyBotOpportunityDecisions(state, 175, null, [def]);

        const after = state.military.operation_opportunities![0];
        expect(after.status).toBe('approved');
        expect(after.executed_op_id).toBe(def.name);
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(1);
    });

    it('player opportunity surfaces as a PendingProposalReview at autonomy_level=1', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        expect(reviews).toHaveLength(1);
        const r = reviews[0];
        expect(r.domain).toBe('ops');
        expect(r.faction).toBe('RBiH');
        expect(r.proposed_action.startsWith(OPPORTUNITY_PROPOSAL_ACTION_PREFIX)).toBe(true);
        const proposalIdInAction = r.proposed_action.slice(OPPORTUNITY_PROPOSAL_ACTION_PREFIX.length);
        expect(proposalIdInAction).toBe(buildProposalId(def.opportunity_id, 175));
        // Description contains the player-safe name + recommendation.
        expect(r.description).toContain(def.name);
        expect(r.description).toContain('approve');
        // Description must NOT leak raw OSIDs.
        expect(r.description.includes('op:')).toBe(false);
    });

    it('player opportunity does NOT surface at autonomy_level=0 (full control)', () => {
        const state = buildMinimalState(175, 'RBiH', 0);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        expect(reviews).toEqual([]);
    });

    it('apply-resolved consumer routes accepted=true → approve, accepted=false → decline', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        // Player accepts via IPC equivalent.
        state.meta.pending_proposal_reviews = reviews.map(r => ({
            ...r,
            accepted: true,
            resolved_turn: 175,
        }));
        // Advance turn — consumer runs at start of turn 176.
        state.meta.turn = 176;
        applyResolvedOpportunityDecisions(state, 176, [def]);
        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('approved');
        const cmd = state.military.corps_command![def.primary_corps];
        expect(cmd.active_operations).toHaveLength(1);
    });

    it('apply-resolved consumer with accepted=false yields decline + no op spawn', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        state.meta.pending_proposal_reviews = reviews.map(r => ({
            ...r,
            accepted: false,
            resolved_turn: 175,
        }));
        state.meta.turn = 176;
        applyResolvedOpportunityDecisions(state, 176, [def]);
        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('declined');
        const cmd = state.military.corps_command![def.primary_corps];
        expect(cmd.active_operations).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.response === 'decline')).toBe(true);
    });

    it('apply-resolved consumer routes explicit opportunity_decision=delay without spawning an op', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        state.meta.pending_proposal_reviews = reviews.map(r => ({
            ...r,
            opportunity_decision: 'delay',
            opportunity_decision_options: { delay_turns: 2 },
            resolved_turn: 175,
        } as any));
        state.meta.turn = 176;

        applyResolvedOpportunityDecisions(state, 176, [def]);

        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('delayed');
        expect(proposal!.reevaluate_at_turn).toBe(178);
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(0);
        expect(state.military.operation_opportunity_resolutions ?? []).toEqual([]);
    });

    it('apply-resolved consumer routes explicit opportunity_decision=under_resource through the normal approval path', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        state.meta.pending_proposal_reviews = reviews.map(r => ({
            ...r,
            opportunity_decision: 'under_resource',
            opportunity_decision_options: { commitment_profile: 'minimum' },
            resolved_turn: 175,
        } as any));
        state.meta.turn = 176;

        applyResolvedOpportunityDecisions(state, 176, [def]);

        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('under_resourced_approved');
        const cmd = state.military.corps_command![def.primary_corps];
        expect(cmd.active_operations).toHaveLength(1);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions.some(r => r.response === 'under_resource')).toBe(true);
    });

    it('apply-resolved ignores rows that have not been resolved by the player yet', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        state.meta.pending_proposal_reviews = [...reviews]; // NO accepted set
        state.meta.turn = 176;
        applyResolvedOpportunityDecisions(state, 176, [def]);
        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('eligible_pending_review');
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(0);
    });

    it('headless auto-resolve marks opportunity reviews with the staff recommendation for next-turn application', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        state.meta.pending_proposal_reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);

        const marked = autoResolveOpportunityProposalReviews(state, 175, 'RBiH');

        expect(marked).toBe(1);
        expect(state.meta.pending_proposal_reviews![0].opportunity_decision).toBe('approve');
        expect(state.meta.pending_proposal_reviews![0].resolved_turn).toBe(175);

        state.meta.turn = 176;
        applyResolvedOpportunityDecisions(state, 176, [def]);

        const proposal = state.military.operation_opportunities!.find(
            p => p.opportunity_id === def.opportunity_id);
        expect(proposal!.status).toBe('approved');
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(1);
    });

    it('headless scenario bridge includes the player faction in bot brigade orders only when flagged', () => {
        const state = buildMinimalState(176, 'RBiH', 0);
        state.factions = [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }] as GameState['factions'];

        expect(selectBotBrigadeOrderFactions(state)).toEqual(['HRHB', 'RS']);

        state.meta.headless_scenario_auto_control = true;

        expect(selectBotBrigadeOrderFactions(state)).toEqual(['HRHB', 'RBiH', 'RS']);
    });

    it('bot decisions are deterministic across two independent runs', () => {
        const def = fixtureOpp();
        const stateA = buildMinimalState(175, 'HRHB', 1);
        const stateB = buildMinimalState(175, 'HRHB', 1);
        runOpportunityEvaluationStep(stateA, 175, [def]);
        runOpportunityEvaluationStep(stateB, 175, [def]);
        applyBotOpportunityDecisions(stateA, 175, 'HRHB', [def]);
        applyBotOpportunityDecisions(stateB, 175, 'HRHB', [def]);
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
        expect(JSON.stringify(stateA.military.corps_command))
            .toBe(JSON.stringify(stateB.military.corps_command));
    });

    it('bot apply respects deterministic proposal_id sort when two opportunities are eligible', () => {
        const def_b: OperationOpportunityDef = {
            ...fixtureOpp(),
            opportunity_id: 'b_op',
            name: 'B Op',
        };
        const def_a: OperationOpportunityDef = {
            ...fixtureOpp(),
            opportunity_id: 'a_op',
            name: 'A Op',
            primary_corps: 'arbih_5th_corps',
        };
        const state = buildMinimalState(175, 'HRHB', 1);
        runOpportunityEvaluationStep(state, 175, [def_b, def_a]);
        // Both eligible.
        expect(state.military.operation_opportunities).toHaveLength(2);
        applyBotOpportunityDecisions(state, 175, 'HRHB', [def_b, def_a]);
        // Both approved; corps got two ops back-to-back.
        const cmd = state.military.corps_command!['arbih_5th_corps'];
        // Note: getMaxOperationSlots(0 brigades) = max(1, 0/12) = 1, but slot
        // enforcement happens in the planner — opportunity spawn doesn't gate.
        // Both ops are pushed; queue ordering reflects sorted proposal ids.
        expect(cmd.active_operations).toHaveLength(2);
        const opNames = cmd.active_operations.map(o => o.name);
        // A Op spawns first (a_op < b_op alphabetically).
        expect(opNames[0]).toBe('A Op');
        expect(opNames[1]).toBe('B Op');
    });

    it('player opportunity proposals are absent when the catalog has no matching def', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        // generateOpportunityProposalReviews called with EMPTY catalog → no rows.
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', []);
        expect(reviews).toEqual([]);
    });

    it('proposed_action format is exactly OPPORTUNITY:<proposal_id>', () => {
        const state = buildMinimalState(175, 'RBiH', 1);
        const def = fixtureOpp();
        runOpportunityEvaluationStep(state, 175, [def]);
        const reviews = generateOpportunityProposalReviews(state, 'RBiH', [def]);
        expect(reviews[0].proposed_action).toBe('OPPORTUNITY:OPP_175_fixture_opp');
    });
});
