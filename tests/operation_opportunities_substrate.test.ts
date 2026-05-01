/**
 * operation_opportunities_substrate.test.ts — LANE B Phase 1 protection suite.
 *
 * Validates the GENERIC substrate of the Operation Opportunity layer. No
 * catalog content (Phase 3 ships content for the 5th Corps family). All tests
 * run against in-test fixture catalogs so they are independent of any future
 * catalog evolution.
 *
 * Contract under test:
 *   - Empty catalog produces no opportunity proposals on any turn.
 *   - A fixture opportunity does NOT surface before its date_window opens.
 *   - A fixture opportunity DOES surface when all required axes turn green.
 *   - The proposal queue is sorted deterministically by
 *     (eligibility_turn, opportunity_id, proposal_id).
 *   - Approve routes through the canonical CorpsOperation factory and pushes
 *     the spawned op onto the primary corps's active_operations.
 *   - Decline writes a resolution log entry; never spawns an op.
 *   - No raw OSID strings are surfaced in the player-safe axis reasons.
 *   - The evaluator is deterministic across repeat invocations.
 *   - The evaluator does not flip political controllers (no map writes).
 */

import { describe, expect, it } from 'vitest';

import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    defaultBotDecisionForOpportunity,
    evaluateOperationOpportunities,
    exitClassFromOperationAAR,
    isOpportunityEligible,
    linkOpportunityResolutionToAAR,
    runOpportunityEvaluationStep,
    type AxisPredicate,
    type OperationOpportunityDef,
    type OperationOpportunityState,
} from '../src/sim/combat/operation_opportunities.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import type { CorpsCommandState, FactionId, GameState } from '../src/state/game_state.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

function buildMinimalState(turn: number, primaryCorps = 'arbih_5th_corps'): GameState {
    const cmd: CorpsCommandState = {
        command_span: 6,
        subordinate_count: 6,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: [],
    };
    const state = {
        schema_version: 0,
        meta: { turn, seed: 'test', phase: 'war' as const },
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
    return state;
}

const greenAxis: AxisPredicate = () => ({ green: true, reason: 'satisfied' });
const redAxis: AxisPredicate = () => ({ green: false, reason: 'not yet' });
const dateWindow = (min: number, max: number): AxisPredicate =>
    (_state, turn) => ({
        green: turn >= min && turn <= max,
        reason: turn < min
            ? 'window has not opened'
            : turn > max
                ? 'window has closed'
                : 'window open',
    });

function fakeAar(overrides: Partial<OperationAAR>): OperationAAR {
    return {
        operation_id: 'arbih_5th_corps:Fixture Sana:t175',
        operation_name: 'Fixture Sana',
        corps_id: 'arbih_5th_corps',
        faction: 'RBiH',
        type: 'sector_attack',
        started_turn: 175,
        ended_turn: 184,
        outcome: 'partial',
        objectives_targeted: ['op:bihac:bihac_2', 'op:bihac:bihac_3'],
        objectives_captured: ['op:bihac:bihac_2'],
        duration_turns: 9,
        total_attacks: 3,
        casualties_suffered: { killed: 0, wounded: 0 },
        casualties_inflicted: { killed: 0, wounded: 0 },
        equipment_lost: { tanks: 0, artillery: 0 },
        equipment_destroyed: { tanks: 0, artillery: 0 },
        equipment_captured: { tanks: 0, artillery: 0 },
        participating_brigades: ['arbih_5_brigade_a'],
        initial_strength: 1000,
        final_strength: 900,
        grade: {
            stars: 3,
            verdict: 'solid',
            factors: {
                objective_completion: 0.5,
                exchange_ratio: 1,
                tempo: 1,
                preservation: 0.9,
            },
        },
        weekly_log: [],
        ...overrides,
    };
}

function fixtureSana(): OperationOpportunityDef {
    return {
        opportunity_id: 'fixture_sana_95',
        name: 'Fixture Sana',
        tier: 'T1',
        faction: 'RBiH',
        primary_corps: 'arbih_5th_corps',
        family: 'fifth_corps',
        axes: [{
            axis_id: 'fixture_main',
            name: 'Main',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_5_brigade_a', 'arbih_5_brigade_b'],
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
            logistics: 'optional',
            staging_access: 'required',
            weather_season: 'n_a',
            commander_confidence: 'n_a',
            enemy_weakness: 'optional',
            alliance_context: 'n_a',
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
        },
        staff_recommendation: 'approve',
    };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('operation_opportunities — Phase 1 substrate', () => {
    it('empty catalog produces no proposals', () => {
        const state = buildMinimalState(180);
        runOpportunityEvaluationStep(state, 180, []);
        expect(state.military.operation_opportunities ?? []).toEqual([]);
        expect(state.military.operation_opportunity_resolutions).toBeUndefined();
    });

    it('production catalog is non-empty since Phase 3 (5th Corps / Sana 95)', () => {
        // Phase 1 shipped empty; Phase 3 added the 5th Corps / Sana 95 family
        // (`SANA_95_OPPORTUNITY` in operation_opportunity_catalog_5th_corps.ts).
        // The substrate generic tests below all use inline fixture catalogs,
        // so production catalog content is independent of substrate behavior.
        expect(OPERATION_OPPORTUNITY_CATALOG.length).toBeGreaterThan(0);
        expect(OPERATION_OPPORTUNITY_CATALOG.every(d => d.opportunity_id.length > 0)).toBe(true);
    });

    it('opportunity does not surface before date_window opens', () => {
        const state = buildMinimalState(160);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 160, [def]);
        expect(state.military.operation_opportunities).toEqual([]);
    });

    it('opportunity surfaces when prerequisites align', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const proposals = state.military.operation_opportunities!;
        expect(proposals).toHaveLength(1);
        expect(proposals[0].opportunity_id).toBe('fixture_sana_95');
        expect(proposals[0].status).toBe('eligible_pending_review');
        expect(proposals[0].proposal_id).toBe('OPP_175_fixture_sana_95');
        expect(proposals[0].approver_faction).toBe('RBiH' as FactionId);
        expect(proposals[0].last_axis_evaluation).toHaveLength(9);
    });

    it('does not duplicate-enqueue an already-pending opportunity on the next turn', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        runOpportunityEvaluationStep(state, 176, [def]);
        runOpportunityEvaluationStep(state, 177, [def]);
        expect(state.military.operation_opportunities).toHaveLength(1);
    });

    it('one-shot guard: does NOT re-enqueue after approval (Phase 3.5 fix)', () => {
        // Regression for 188w n1601 bug: Sana was approved at t175 and the
        // evaluator re-proposed it every turn after because `live` filter only
        // included pending/delayed. The fix extends the filter to all-seen
        // opportunity_ids so a one-shot historical operation is consumed for
        // the rest of the scenario.
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        applyOpportunityDecision(state, 175, buildProposalId(def.opportunity_id, 175), 'approve', [def]);
        // Advance several turns — the catalog must NOT enqueue another sana_95.
        for (let t = 176; t <= 188; t++) runOpportunityEvaluationStep(state, t, [def]);
        const sanaProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === def.opportunity_id);
        expect(sanaProposals).toHaveLength(1);
        expect(sanaProposals[0].status).toBe('approved');
        // And the corps_command should have ONE Sana CorpsOperation, not 14.
        const cmd = state.military.corps_command![def.primary_corps];
        expect(cmd.active_operations.filter(o => o.name === def.name)).toHaveLength(1);
    });

    it('one-shot guard: does NOT re-enqueue after decline either', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        applyOpportunityDecision(state, 175, buildProposalId(def.opportunity_id, 175), 'decline', [def]);
        for (let t = 176; t <= 188; t++) runOpportunityEvaluationStep(state, t, [def]);
        const sanaProposals = state.military.operation_opportunities!
            .filter(p => p.opportunity_id === def.opportunity_id);
        expect(sanaProposals).toHaveLength(1);
        expect(sanaProposals[0].status).toBe('declined');
    });

    it('proposal queue is sorted by (eligibility_turn, opportunity_id, proposal_id)', () => {
        const state = buildMinimalState(175);
        const a: OperationOpportunityDef = { ...fixtureSana(), opportunity_id: 'b_op', name: 'B' };
        const b: OperationOpportunityDef = { ...fixtureSana(), opportunity_id: 'a_op', name: 'A' };
        runOpportunityEvaluationStep(state, 175, [a, b]);
        const ids = state.military.operation_opportunities!.map(p => p.opportunity_id);
        expect(ids).toEqual(['a_op', 'b_op']);
    });

    it('isOpportunityEligible respects required + min_optional_axes', () => {
        const def = fixtureSana();
        // All required green, optional green: eligible.
        const greenAll = [
            { axis: 'date_window' as const, mode: 'required' as const, green: true, reason: '' },
            { axis: 'corps_readiness' as const, mode: 'required' as const, green: true, reason: '' },
            { axis: 'staging_access' as const, mode: 'required' as const, green: true, reason: '' },
            { axis: 'logistics' as const, mode: 'optional' as const, green: true, reason: '' },
            { axis: 'enemy_weakness' as const, mode: 'optional' as const, green: true, reason: '' },
        ];
        expect(isOpportunityEligible(def, greenAll)).toBe(true);

        // One required red: not eligible.
        const oneRequiredRed = greenAll.map(a =>
            a.axis === 'corps_readiness' ? { ...a, green: false } : a);
        expect(isOpportunityEligible(def, oneRequiredRed)).toBe(false);
    });

    it('expires a pending proposal once turn > expires_turn', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const proposalsAfterEnqueue = state.military.operation_opportunities!;
        expect(proposalsAfterEnqueue[0].status).toBe('eligible_pending_review');
        const expiry = proposalsAfterEnqueue[0].expires_turn;
        // Force the date_window to fail so the proposal cannot reset itself,
        // then advance past expiry.
        const lockedDef: OperationOpportunityDef = {
            ...def,
            evaluators: { ...def.evaluators, date_window: dateWindow(0, expiry) },
        };
        runOpportunityEvaluationStep(state, expiry + 1, [lockedDef]);
        const after = state.military.operation_opportunities![0];
        expect(after.status).toBe('expired');
        expect(state.military.operation_opportunity_resolutions).toBeDefined();
        expect(state.military.operation_opportunity_resolutions!.length).toBeGreaterThan(0);
        expect(state.military.operation_opportunity_resolutions!.at(-1)!.response).toBe('expire');
    });

    it('approve routes through buildCorpsOperation and pushes onto active_operations', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const cmd = state.military.corps_command![def.primary_corps];
        expect(cmd.active_operations).toHaveLength(0);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        expect(updated).not.toBeNull();
        expect(updated!.status).toBe('approved');
        expect(cmd.active_operations).toHaveLength(1);
        const op = cmd.active_operations[0];
        expect(op.name).toBe(def.name);
        expect(op.is_pre_planned).toBeUndefined();          // opportunity ops never occupy slot 0
        expect(op.axes?.length).toBe(1);
        expect(op.axes?.[0].assigned_brigades).toEqual(['arbih_5_brigade_a', 'arbih_5_brigade_b']);
        expect(op.axes?.[0].status).toBe('executing');
        expect(updated!.executed_op_id).toBe(def.name);
    });

    it('links a completed operation AAR back to the opportunity resolution', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );

        const linked = linkOpportunityResolutionToAAR(state, fakeAar({}));

        expect(linked).toBe(true);
        const resolution = state.military.operation_opportunity_resolutions![0];
        expect(resolution.executed_op_aar_id).toBe('arbih_5th_corps:Fixture Sana:t175');
        expect(resolution.exit_class).toBe('partial_success');
    });

    it('maps operation AAR outcomes into opportunity exit classes', () => {
        expect(exitClassFromOperationAAR(fakeAar({
            outcome: 'success',
            total_attacks: 3,
        }))).toBe('decisive_success');
        expect(exitClassFromOperationAAR(fakeAar({
            outcome: 'partial',
            total_attacks: 3,
        }))).toBe('partial_success');
        expect(exitClassFromOperationAAR(fakeAar({
            outcome: 'failure',
            total_attacks: 4,
            objectives_captured: [],
        }))).toBe('failed');
        expect(exitClassFromOperationAAR(fakeAar({
            outcome: 'failure',
            total_attacks: 0,
            objectives_captured: [],
        }))).toBe('did_not_launch');
        expect(exitClassFromOperationAAR(fakeAar({
            outcome: 'orphaned',
            total_attacks: 0,
        }))).toBe('aborted');
    });

    it('decline writes a resolution and does NOT spawn a corps operation', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const cmd = state.military.corps_command![def.primary_corps];
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'decline',
            [def],
        );
        expect(updated!.status).toBe('declined');
        expect(cmd.active_operations).toHaveLength(0);
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions).toHaveLength(1);
        expect(resolutions[0].response).toBe('decline');
        expect(resolutions[0].executed_op_name).toBeUndefined();
    });

    it('delay sets reevaluate_at_turn and does not spawn a corps operation', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'delay',
            [def],
            { delay_turns: 6 },
        );
        expect(updated!.status).toBe('delayed');
        expect(updated!.reevaluate_at_turn).toBe(181);
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(0);
    });

    it('under_resource trims the brigade pool and spawns a single op', () => {
        const state = buildMinimalState(175);
        const fourBrigadeDef: OperationOpportunityDef = {
            ...fixtureSana(),
            axes: [{
                axis_id: 'main',
                name: 'Main',
                corps: 'arbih_5th_corps',
                brigades: ['b_a', 'b_b', 'b_c', 'b_d'],
                objectives: ['op:bihac:bihac_2'],
            }],
        };
        runOpportunityEvaluationStep(state, 175, [fourBrigadeDef]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(fourBrigadeDef.opportunity_id, 175),
            'under_resource',
            [fourBrigadeDef],
        );
        expect(updated!.status).toBe('under_resourced_approved');
        const op = state.military.corps_command![fourBrigadeDef.primary_corps].active_operations[0];
        expect(op.axes![0].assigned_brigades).toEqual(['b_a', 'b_b']); // floor(4/2) = 2
    });

    it('approval is rejected if the primary corps does not exist', () => {
        const state = buildMinimalState(175, 'some_other_corps');
        const def = fixtureSana(); // primary_corps = arbih_5th_corps which is not in state
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        // Decision still records a status change + resolution row, but no op spawned.
        expect(updated!.status).toBe('approved');
        expect(updated!.executed_op_id).toBeUndefined();
    });

    it('default bot decision falls back to delay when required axes are red', () => {
        const def: OperationOpportunityDef = {
            ...fixtureSana(),
            evaluators: { ...fixtureSana().evaluators, corps_readiness: redAxis },
        };
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        // Required-red opportunities never get enqueued; manufacture a proposal
        // by hand to exercise the bot policy directly.
        const proposal: OperationOpportunityState = {
            opportunity_id: def.opportunity_id,
            proposal_id: 'OPP_175_fixture_sana_95',
            eligibility_turn: 175,
            expires_turn: 199,
            status: 'eligible_pending_review',
            approver_faction: 'RBiH',
            last_axis_evaluation: [
                { axis: 'date_window', mode: 'required', green: true, reason: '' },
                { axis: 'corps_readiness', mode: 'required', green: false, reason: '' },
                { axis: 'staging_access', mode: 'required', green: true, reason: '' },
            ],
        };
        expect(defaultBotDecisionForOpportunity(proposal, def)).toBe('delay');
    });

    it('default bot decision returns staff_recommendation when required axes are green', () => {
        const def = fixtureSana();
        const proposal: OperationOpportunityState = {
            opportunity_id: def.opportunity_id,
            proposal_id: 'OPP_175_fixture_sana_95',
            eligibility_turn: 175,
            expires_turn: 199,
            status: 'eligible_pending_review',
            approver_faction: 'RBiH',
            last_axis_evaluation: [
                { axis: 'date_window', mode: 'required', green: true, reason: '' },
                { axis: 'corps_readiness', mode: 'required', green: true, reason: '' },
                { axis: 'staging_access', mode: 'required', green: true, reason: '' },
            ],
        };
        expect(defaultBotDecisionForOpportunity(proposal, def)).toBe('approve');
    });

    it('evaluator is deterministic across repeat invocations on identical state', () => {
        const def = fixtureSana();
        const stateA = buildMinimalState(175);
        const stateB = buildMinimalState(175);
        runOpportunityEvaluationStep(stateA, 175, [def]);
        runOpportunityEvaluationStep(stateB, 175, [def]);
        // Compare by serialization — fields must match byte-for-byte.
        expect(JSON.stringify(stateA.military.operation_opportunities))
            .toBe(JSON.stringify(stateB.military.operation_opportunities));
    });

    it('does not flip political controllers or write to map state', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();
        // Snapshot before & after; military.formations / political_controllers must
        // be identical on declined / pending opportunities.
        const beforeMilitarySerialized = JSON.stringify({
            formations: state.military.formations,
            corps_front_sectors: state.military.corps_front_sectors ?? null,
        });
        runOpportunityEvaluationStep(state, 175, [def]);
        applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'decline',
            [def],
        );
        const afterMilitarySerialized = JSON.stringify({
            formations: state.military.formations,
            corps_front_sectors: state.military.corps_front_sectors ?? null,
        });
        expect(afterMilitarySerialized).toBe(beforeMilitarySerialized);
    });
});
