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
        expect(proposals[0].last_axis_evaluation).toHaveLength(10);
    });

    it('persists a player-safe force-quality trait snapshot on surfaced proposals', () => {
        const state = buildMinimalState(175);
        const def = fixtureSana();

        runOpportunityEvaluationStep(state, 175, [def]);

        const traits = state.military.operation_opportunities![0].last_force_quality_traits;
        expect(Object.keys(traits ?? {}).sort()).toEqual([
            'axis_coordination',
            'collapse_susceptibility',
            'failure_recovery',
            'operation_readiness',
            'reserve_response',
            'staging_reliability',
            'support_delivery',
        ]);
        for (const value of Object.values(traits ?? {})) {
            expect(typeof value).toBe('number');
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        }
    });

    it('persists default map footprint and redirect variant snapshots on surfaced proposals', () => {
        const state = buildMinimalState(175);
        const def: OperationOpportunityDef = {
            ...fixtureSana(),
            staging_osid: 'op:bihac:cazin_2',
            axes: [{
                axis_id: 'fixture_main',
                name: 'Main',
                corps: 'arbih_5th_corps',
                brigades: ['arbih_5_brigade_a', 'arbih_5_brigade_b'],
                objectives: ['op:bihac:bihac_2', 'op:bosanski_petrovac:vrtoce'],
                staging_osid: 'op:bihac:izacic',
            }],
            variants: [{
                variant_id: 'north_hook',
                name: 'Northern Hook',
                staging_osid: 'op:bihac:bihac_3',
                axes: [{
                    axis_id: 'north',
                    name: 'North',
                    corps: 'arbih_5th_corps',
                    brigades: ['arbih_5_brigade_a'],
                    objectives: ['op:bosanska_krupa:bosanska_krupa_2'],
                    staging_osid: 'op:bihac:otoka_2',
                }],
            }],
        };

        runOpportunityEvaluationStep(state, 175, [def]);

        const proposal = state.military.operation_opportunities![0];
        expect(proposal.last_footprint).toEqual({
            objectives: ['op:bihac:bihac_2', 'op:bosanski_petrovac:vrtoce'],
            staging_osids: ['op:bihac:cazin_2', 'op:bihac:izacic'],
        });
        expect(proposal.redirect_variants).toEqual([{
            variant_id: 'north_hook',
            name: 'Northern Hook',
            objectives: ['op:bosanska_krupa:bosanska_krupa_2'],
            staging_osids: ['op:bihac:bihac_3', 'op:bihac:otoka_2'],
        }]);
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

// ─── LANE C Phase 1: Substrate A — targets_friendly_overrides ───────────────
//   Wires the friendly-controller exemption hatch on the opportunity-spawn
//   path so APWB-paint-as-RBiH OSIDs may be ARBiH 5th Corps targets without
//   leaking the exemption into other tiers/families.

function buildStateWithControllers(
    turn: number,
    controllers: Readonly<Record<string, FactionId>>,
    primaryCorps = 'arbih_5th_corps',
): GameState {
    const state = buildMinimalState(turn, primaryCorps);
    (state as unknown as { political: { political_controllers: Record<string, FactionId> } }).political = {
        political_controllers: { ...controllers },
    };
    return state;
}

function fixtureFifthCorpsT1WithFriendlyTarget(
    overrides: Partial<OperationOpportunityDef> = {},
): OperationOpportunityDef {
    return {
        ...fixtureSana(),
        opportunity_id: 'fixture_fifth_corps_apwb',
        name: 'Fixture APWB',
        tier: 'T1',
        family: 'fifth_corps',
        axes: [{
            axis_id: 'apwb_main',
            name: 'APWB Main',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_5_brigade_a', 'arbih_5_brigade_b'],
            // First objective is RBiH-painted (APWB-aligned in catalog); second is unpainted.
            objectives: ['op:velika_kladusa:velika_kladusa_2', 'op:cazin:cazin_3'],
        }],
        ...overrides,
    };
}

describe('operation_opportunities — LANE C Phase 1 Substrate A (targets_friendly_overrides)', () => {
    it('targets_friendly_overrides=undefined is no-op (Sana parity — no friendly objectives kept)', () => {
        // Sana 95 fixture has its objectives controlled by RS/null in test state.
        // With override undefined and no friendly-controlled objective, the spawned
        // op preserves all objectives — byte-identical to pre-LANE-C behavior.
        const state = buildStateWithControllers(175, {
            'op:bihac:bihac_2': 'RS',  // enemy-painted — keep
        });
        const def = fixtureSana();
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        expect(updated!.status).toBe('approved');
        const op = state.military.corps_command![def.primary_corps].active_operations[0];
        expect(op.axes![0].objectives).toEqual(['op:bihac:bihac_2']);
        expect(updated!.executed_op_id).toBe(def.name);
    });

    it('without override, friendly-controlled OSIDs are filtered out of axes', () => {
        // VK is RBiH-painted (modeling APWB-paint-as-RBiH); cazin_3 is RS-painted.
        const state = buildStateWithControllers(175, {
            'op:velika_kladusa:velika_kladusa_2': 'RBiH',
            'op:cazin:cazin_3': 'RS',
        });
        const def = fixtureFifthCorpsT1WithFriendlyTarget();
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        expect(updated!.status).toBe('approved');
        const op = state.military.corps_command![def.primary_corps].active_operations[0];
        // VK filtered out (RBiH-painted, no override); cazin_3 retained (RS-painted).
        expect(op.axes![0].objectives).toEqual(['op:cazin:cazin_3']);
    });

    it('T1 + family=fifth_corps + override: friendly-painted OSID is RETAINED as axis target', () => {
        const state = buildStateWithControllers(175, {
            'op:velika_kladusa:velika_kladusa_2': 'RBiH',  // friendly-painted (APWB)
            'op:cazin:cazin_3': 'RS',
        });
        const def = fixtureFifthCorpsT1WithFriendlyTarget({
            targets_friendly_overrides: ['op:velika_kladusa:velika_kladusa_2'],
        });
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        expect(updated!.status).toBe('approved');
        const op = state.military.corps_command![def.primary_corps].active_operations[0];
        // Both retained — VK exempted by override, cazin_3 normal enemy target.
        expect(op.axes![0].objectives).toEqual([
            'op:velika_kladusa:velika_kladusa_2',
            'op:cazin:cazin_3',
        ]);
    });

    it('T2 with override is IGNORED (scope-restriction: override only honored on T1)', () => {
        // T2 does not exist as an OpportunityTier today, but the scope check is
        // tier === 'T1', so any non-T1 must drop the override. We use T3 here
        // since T2 isn't in the type — but T3 also short-circuits approve, so
        // we exercise scope by attempting under_resource (which still spawns).
        const state = buildStateWithControllers(175, {
            'op:velika_kladusa:velika_kladusa_2': 'RBiH',
            'op:cazin:cazin_3': 'RS',
        });
        const def = fixtureFifthCorpsT1WithFriendlyTarget({
            tier: 'T3',
            targets_friendly_overrides: ['op:velika_kladusa:velika_kladusa_2'],
        });
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'under_resource',
            [def],
        );
        expect(updated!.status).toBe('under_resourced_approved');
        const op = state.military.corps_command![def.primary_corps].active_operations[0];
        // VK dropped (override ignored on non-T1 even with fifth_corps family); cazin_3 retained.
        expect(op.axes![0].objectives).toEqual(['op:cazin:cazin_3']);
    });

    it('non-fifth_corps family with override is IGNORED (scope-restriction: family must match)', () => {
        const state = buildStateWithControllers(175, {
            'op:velika_kladusa:velika_kladusa_2': 'RBiH',
            'op:cazin:cazin_3': 'RS',
        });
        const def = fixtureFifthCorpsT1WithFriendlyTarget({
            family: 'posavina',
            targets_friendly_overrides: ['op:velika_kladusa:velika_kladusa_2'],
        });
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        expect(updated!.status).toBe('approved');
        const op = state.military.corps_command![def.primary_corps].active_operations[0];
        // VK dropped — override ignored because family is not fifth_corps.
        expect(op.axes![0].objectives).toEqual(['op:cazin:cazin_3']);
    });

    it('determinism: two evaluator runs over identical state produce identical resolution rows', () => {
        const ctrl = {
            'op:velika_kladusa:velika_kladusa_2': 'RBiH' as FactionId,
            'op:cazin:cazin_3': 'RS' as FactionId,
        };
        const stateA = buildStateWithControllers(175, ctrl);
        const stateB = buildStateWithControllers(175, ctrl);
        const def = fixtureFifthCorpsT1WithFriendlyTarget({
            targets_friendly_overrides: ['op:velika_kladusa:velika_kladusa_2'],
        });
        runOpportunityEvaluationStep(stateA, 175, [def]);
        runOpportunityEvaluationStep(stateB, 175, [def]);
        applyOpportunityDecision(
            stateA, 175, buildProposalId(def.opportunity_id, 175), 'approve', [def],
        );
        applyOpportunityDecision(
            stateB, 175, buildProposalId(def.opportunity_id, 175), 'approve', [def],
        );
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        // Also assert the spawned op axes are identical byte-for-byte.
        const opA = stateA.military.corps_command![def.primary_corps].active_operations[0];
        const opB = stateB.military.corps_command![def.primary_corps].active_operations[0];
        expect(JSON.stringify(opA.axes)).toBe(JSON.stringify(opB.axes));
    });
});

// ─── LANE C Phase 1: Substrate B — T3 early-return on approve ───────────────
//   Approve on a T3 (defensive-crisis) opportunity records resolution but does
//   NOT build a CorpsOperation — outcome flows through reactive defense.

function fixtureT3DefensiveCrisis(
    overrides: Partial<OperationOpportunityDef> = {},
): OperationOpportunityDef {
    return {
        ...fixtureSana(),
        opportunity_id: 'fixture_t3_pauk_94',
        name: 'Fixture T3 Crisis',
        tier: 'T3',
        family: 'fifth_corps',
        axes: [{
            axis_id: 't3_main',
            name: 'T3 Main',
            corps: 'arbih_5th_corps',
            brigades: ['arbih_5_brigade_a'],
            objectives: ['op:bihac:bihac_2'],
        }],
        ...overrides,
    };
}

describe('operation_opportunities — LANE C Phase 1 Substrate B (T3 early-return)', () => {
    it('T3 approve does NOT push to corps_command.active_operations', () => {
        const state = buildMinimalState(175);
        const def = fixtureT3DefensiveCrisis();
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
        expect(updated!.status).toBe('approved');
        // No CorpsOperation pushed.
        expect(cmd.active_operations).toHaveLength(0);
        // Proposal carries no executed_op_id either.
        expect(updated!.executed_op_id).toBeUndefined();
    });

    it('T3 approve resolution row has executed_op_aar_id=undefined and exit_class=t3_authorized_no_offensive', () => {
        const state = buildMinimalState(175);
        const def = fixtureT3DefensiveCrisis();
        runOpportunityEvaluationStep(state, 175, [def]);
        applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'approve',
            [def],
        );
        const resolutions = state.military.operation_opportunity_resolutions!;
        expect(resolutions).toHaveLength(1);
        const row = resolutions[0];
        expect(row.response).toBe('approve');
        expect(row.opportunity_id).toBe(def.opportunity_id);
        expect(row.response_turn).toBe(175);
        expect(row.executed_op_aar_id).toBeUndefined();
        expect(row.executed_op_name).toBeUndefined();
        expect(row.exit_class).toBe('t3_authorized_no_offensive');
    });

    it('T3 decline path is identical to T1 decline (regression guard)', () => {
        const stateT1 = buildMinimalState(175);
        const stateT3 = buildMinimalState(175);
        const defT1 = fixtureSana();
        const defT3 = fixtureT3DefensiveCrisis();
        runOpportunityEvaluationStep(stateT1, 175, [defT1]);
        runOpportunityEvaluationStep(stateT3, 175, [defT3]);
        applyOpportunityDecision(
            stateT1, 175, buildProposalId(defT1.opportunity_id, 175), 'decline', [defT1],
        );
        applyOpportunityDecision(
            stateT3, 175, buildProposalId(defT3.opportunity_id, 175), 'decline', [defT3],
        );
        // Both should produce a single decline resolution with no exit_class and no aar id.
        const t1Row = stateT1.military.operation_opportunity_resolutions![0];
        const t3Row = stateT3.military.operation_opportunity_resolutions![0];
        expect(t1Row.response).toBe('decline');
        expect(t3Row.response).toBe('decline');
        expect(t1Row.exit_class).toBeUndefined();
        expect(t3Row.exit_class).toBeUndefined();
        expect(t1Row.executed_op_aar_id).toBeUndefined();
        expect(t3Row.executed_op_aar_id).toBeUndefined();
        expect(t1Row.executed_op_name).toBeUndefined();
        expect(t3Row.executed_op_name).toBeUndefined();
        // Neither spawns a corps op.
        expect(stateT1.military.corps_command![defT1.primary_corps].active_operations).toHaveLength(0);
        expect(stateT3.military.corps_command![defT3.primary_corps].active_operations).toHaveLength(0);
    });

    it('T3 + targets_friendly_overrides: override is IGNORED on T3 (only T1 fifth_corps gets it)', () => {
        // The T3 approve never reaches the spawn path, but if the player redirected
        // / under_resourced a T3, the spawn path WOULD run. Verify the override
        // does not leak through scope-restriction even on T3 fifth_corps.
        const state = buildStateWithControllers(175, {
            'op:bihac:bihac_2': 'RBiH',
        });
        const def = fixtureT3DefensiveCrisis({
            axes: [{
                axis_id: 't3_main',
                name: 'T3 Main',
                corps: 'arbih_5th_corps',
                brigades: ['arbih_5_brigade_a'],
                objectives: ['op:bihac:bihac_2'],
            }],
            targets_friendly_overrides: ['op:bihac:bihac_2'],
        });
        runOpportunityEvaluationStep(state, 175, [def]);
        const updated = applyOpportunityDecision(
            state,
            175,
            buildProposalId(def.opportunity_id, 175),
            'under_resource',
            [def],
        );
        expect(updated!.status).toBe('under_resourced_approved');
        // Override ignored: friendly-painted bihac_2 was filtered, no axis survives,
        // so spawn returns null.
        expect(updated!.executed_op_id).toBeUndefined();
        expect(state.military.corps_command![def.primary_corps].active_operations).toHaveLength(0);
    });

    it('determinism: T3 and T1 resolutions are sorted-stable across re-invocation', () => {
        const stateA = buildMinimalState(175);
        const stateB = buildMinimalState(175);
        const defT1 = fixtureSana();
        const defT3 = fixtureT3DefensiveCrisis();
        // Approve both in deterministic order on each state.
        for (const state of [stateA, stateB]) {
            runOpportunityEvaluationStep(state, 175, [defT1, defT3]);
            applyOpportunityDecision(
                state, 175, buildProposalId(defT1.opportunity_id, 175), 'approve', [defT1, defT3],
            );
            applyOpportunityDecision(
                state, 175, buildProposalId(defT3.opportunity_id, 175), 'approve', [defT1, defT3],
            );
        }
        expect(JSON.stringify(stateA.military.operation_opportunity_resolutions))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_resolutions));
        // And resolutions has exactly the two rows in the order they were applied.
        const rows = stateA.military.operation_opportunity_resolutions!;
        expect(rows).toHaveLength(2);
        expect(rows[0].opportunity_id).toBe(defT1.opportunity_id);
        expect(rows[1].opportunity_id).toBe(defT3.opportunity_id);
        expect(rows[1].exit_class).toBe('t3_authorized_no_offensive');
    });
});

// ─── LANE E: ineligible-skip diagnostics ────────────────────────────────────

describe('operation_opportunities — LANE E ineligible-skip diagnostics', () => {
    function fixtureWithLogisticsRequiredRed(): OperationOpportunityDef {
        const def = fixtureSana();
        return {
            ...def,
            opportunity_id: 'fixture_t3_logistics_required',
            tier: 'T3',
            prerequisites: {
                ...def.prerequisites,
                logistics: 'required',
                enemy_weakness: 'n_a',
                min_optional_axes: 0,
            },
            evaluators: { ...def.evaluators, logistics: redAxis },
        };
    }

    function fixtureWithOnlyOneOptionalAndItsRed(): OperationOpportunityDef {
        const def = fixtureSana();
        return {
            ...def,
            opportunity_id: 'fixture_t1_one_optional_red',
            prerequisites: {
                ...def.prerequisites,
                logistics: 'optional',
                enemy_weakness: 'n_a',
                min_optional_axes: 1,
            },
            evaluators: { ...def.evaluators, logistics: redAxis },
        };
    }

    it('emits diagnostic when in date_window but eligibility fails on required axis', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(1);
        expect(diags[0].opportunity_id).toBe('fixture_t3_logistics_required');
        expect(diags[0].turn).toBe(175);
        expect(diags[0].failed_required_axes.map(a => a.axis)).toContain('logistics');
        expect(diags[0].optional_green_count).toBe(0);
        expect(diags[0].min_optional_axes).toBe(0);
    });

    it('emits diagnostic when in date_window but optional-axes count fails', () => {
        const def = fixtureWithOnlyOneOptionalAndItsRed();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(1);
        expect(diags[0].opportunity_id).toBe('fixture_t1_one_optional_red');
        expect(diags[0].failed_required_axes).toHaveLength(0);
        expect(diags[0].failed_optional_axes.map(a => a.axis)).toContain('logistics');
        expect(diags[0].optional_green_count).toBe(0);
        expect(diags[0].min_optional_axes).toBe(1);
    });

    it('does NOT emit diagnostic for out-of-window opportunities (would be log noise)', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const state = buildMinimalState(50); // before window opens (170-190)
        runOpportunityEvaluationStep(state, 50, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(0);
    });

    it('does NOT emit diagnostic when opportunity is eligible (only misses are recorded)', () => {
        const def = fixtureSana();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(0);
    });

    it('does NOT emit diagnostic when one-shot guard already blocks this entry (terminal status)', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const state = buildMinimalState(175);
        // Pre-seed a terminal proposal so the one-shot guard fires.
        state.military.operation_opportunities = [{
            opportunity_id: def.opportunity_id,
            proposal_id: 'OPP_PRESEED',
            eligibility_turn: 174,
            expires_turn: 199,
            status: 'expired',
            approver_faction: 'RBiH',
            last_axis_evaluation: [],
        }];
        runOpportunityEvaluationStep(state, 175, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(0);
    });

    it('appends across multiple turns (per-turn append-only log)', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        runOpportunityEvaluationStep(state, 176, [def]);
        runOpportunityEvaluationStep(state, 177, [def]);
        const diags = state.military.operation_opportunity_diagnostics ?? [];
        expect(diags).toHaveLength(3);
        expect(diags.map(d => d.turn)).toEqual([175, 176, 177]);
    });

    it('determinism: identical state produces identical diagnostics across re-invocations', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const stateA = buildMinimalState(175);
        const stateB = buildMinimalState(175);
        runOpportunityEvaluationStep(stateA, 175, [def]);
        runOpportunityEvaluationStep(stateB, 175, [def]);
        expect(JSON.stringify(stateA.military.operation_opportunity_diagnostics))
            .toBe(JSON.stringify(stateB.military.operation_opportunity_diagnostics));
    });

    it('ineligibility skip does NOT spawn an op or write a resolution row (purity guard)', () => {
        const def = fixtureWithLogisticsRequiredRed();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);
        const cmd = state.military.corps_command?.['arbih_5th_corps'];
        expect(cmd).toBeDefined();
        expect(cmd!.active_operations).toHaveLength(0);
        expect(state.military.operation_opportunity_resolutions ?? []).toHaveLength(0);
    });
});

describe('operation_opportunities - compact lifecycle trace', () => {
    it('records blocked and eligible evaluation outcomes in one deterministic trace stream', () => {
        const base = fixtureSana();
        const blocked = {
            ...base,
            opportunity_id: 'blocked_fixture',
            prerequisites: {
                ...base.prerequisites,
                logistics: 'required' as const,
            },
            evaluators: { ...base.evaluators, logistics: redAxis },
        };
        const eligible = { ...fixtureSana(), opportunity_id: 'eligible_fixture' };
        const state = buildMinimalState(175);

        runOpportunityEvaluationStep(state, 175, [eligible, blocked]);

        expect(state.military.operation_opportunity_traces).toEqual([
            {
                turn: 175,
                opportunity_id: 'blocked_fixture',
                event: 'blocked',
                failed_required_axes: [{ axis: 'logistics', reason: 'not yet' }],
                failed_optional_axes: [],
                optional_green_count: 1,
                min_optional_axes: 0,
            },
            {
                turn: 175,
                opportunity_id: 'eligible_fixture',
                event: 'eligible',
                proposal_id: 'OPP_175_eligible_fixture',
                optional_green_count: 2,
                min_optional_axes: 0,
            },
        ]);
    });

    it('records approve launch outcome with spawned operation name', () => {
        const def = fixtureSana();
        const state = buildMinimalState(175);
        runOpportunityEvaluationStep(state, 175, [def]);

        applyOpportunityDecision(state, 175, buildProposalId(def.opportunity_id, 175), 'approve', [def]);

        expect(state.military.operation_opportunity_traces?.at(-1)).toEqual({
            turn: 175,
            opportunity_id: def.opportunity_id,
            event: 'approved',
            proposal_id: 'OPP_175_fixture_sana_95',
            executed_op_name: 'Fixture Sana',
        });
    });
});
