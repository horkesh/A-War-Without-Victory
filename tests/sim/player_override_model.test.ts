/**
 * Player-override model (owner 2026-11-25: "There should be no drift between live and headless
 * games"; lane C s8 integrated ruling Q1-Q7; Engine Invariants §14.10a-c).
 *
 * For the player faction the staff pipeline runs as headless at every autonomy level. Silence
 * applies the staff's (bot's) choice on the turn headless applies it; an explicit act overrides
 * that one decision. One block per override type, each pinning BOTH halves:
 *   - silence resolves to the bot's choice on the headless turn (compared with a no-player run);
 *   - the player's explicit act still wins.
 *
 * Deterministic: synthetic fixtures, no Math.random, no wall clock.
 */
import { describe, expect, it } from 'vitest';

import type {
    CorpsCommandState,
    FactionId,
    FormationId,
    GameState,
    PendingProposalReview,
    SettlementId,
} from '../../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';
import { applyCommanderOutput } from '../../src/sim/combat/commander/commander_loop.js';
import { corpsHoldForbidsNewPlans } from '../../src/sim/combat/stance_matter_holds.js';
import { recordLevel1StanceAnswerHold } from '../../src/sim/combat/stance_matters.js';
import { selectStaffControlledFactions } from '../../src/sim/bot/staff_control.js';
import {
    applyStagedPresidentialAttackOrders,
    snapshotStagedPresidentialAttackOrders,
    warPhases,
} from '../../src/sim/turn_phases/war_phases.js';
import { selectAutomaticRecruitmentFactions, selectPlayerHeldBrigadeIds, setPlayerRecruitmentHold } from '../../src/sim/recruitment_turn.js';
import {
    applyBotOpportunityDecisions,
    applyResolvedOpportunityDecisions,
    runOpportunityEvaluationStep,
    type OperationOpportunityDef,
} from '../../src/sim/combat/operation_opportunities.js';
import { runTurn } from '../../src/sim/turn_pipeline.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import { evaluatePeacePlans, resolvePeacePlan } from '../../src/sim/negotiation/peace_plans.js';
import {
    DAYTON_DEFAULT_PROPOSER,
    buildHistoricalDefaultDaytonProposal,
    daytonProposerFaction,
    initiateDaytonNegotiation,
    resolveDaytonNegotiation,
    resolvePendingDaytonCloseOut,
} from '../../src/sim/negotiation/dayton_negotiation.js';
import { createEmptyCapital, type NegotiationState } from '../../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../../src/sim/events/strategic_dimensions.js';
import { processOfficerSuccession } from '../../src/sim/combat/officer_system.js';
import { validateCorpsCoRoster } from '../../src/sim/combat/corps_co_roster.js';
import type { NamedOfficer, NamedOfficerState } from '../../src/state/officer_types.js';

/** What a live run carries that a no-player run cannot: the seat markers and the record-only receipts. */
function withoutSeat(state: GameState): unknown {
    const copy = structuredClone(state) as any;
    delete copy.meta.player_faction;
    delete copy.meta.autonomy_level;
    delete copy.meta.headless_scenario_auto_control;
    delete copy.meta.proposal_decision_history;
    delete copy.meta.pending_proposal_reviews;
    // Level-2 stance-matter bookkeeping (a live president only; in the parity noise filter).
    delete copy.meta.stance_matters;
    delete copy.meta.stance_matter_history;
    delete copy.military.stance_matter_state;
    delete copy.military.last_briefing;
    for (const row of copy.military.event_decision_log ?? []) delete row.decision_source;
    return copy;
}

// ─── Staff op plans (H-1..H-6) ──────────────────────────────────────────────────────────────

const CORPS: Record<FactionId, string> = { RBiH: 'arbih_test_corps', RS: 'vrs_test_corps', HRHB: 'hvo_test_corps' };
const FACTIONS: FactionId[] = ['HRHB', 'RBiH', 'RS'];
const PLAN = (faction: FactionId) => `plan_${CORPS[faction]}_t10`;

function corpsState(autonomy: number | undefined, player: FactionId | undefined): GameState {
    const formations: Record<string, unknown> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};
    for (const faction of FACTIONS) {
        const id = CORPS[faction];
        formations[id] = { id, faction, name: id, kind: 'corps', status: 'active', created_turn: 1, assignment: null };
        corpsCommand[id] = {
            command_span: 5, subordinate_count: 2, og_slots: 0, active_ogs: [], corps_exhaustion: 0,
            faction_war_exhaustion: 0, stance: 'offensive', active_operations: [],
            commander_state: { current_plan: { plan_id: PLAN(faction), status: 'ready' } },
        } as unknown as CorpsCommandState;
    }
    return {
        meta: {
            turn: 10, seed: 'override', phase: 'war',
            ...(autonomy !== undefined ? { autonomy_level: autonomy } : {}),
            ...(player ? { player_faction: player } : {}),
        },
        factions: FACTIONS.map((id) => ({ id })),
        military: { formations, corps_command: corpsCommand, brigade_movement_orders: {} },
    } as unknown as GameState;
}

function launchPlan(state: GameState, faction: FactionId): void {
    const id = CORPS[faction];
    applyCommanderOutput(state, id, {
        directive: { type: 'hold', target_zone: null },
        operations: [{
            name: `op_${id}`, type: 'sector_attack', phase: 'planning', sector_id: `sector:${id}:0`,
            objectives: ['op:test:objective'], participating_brigades: [`${id}_b1`, `${id}_b2`],
            commander_officer_id: `officer_${id}`,
        }],
        sector_stances: [],
        updated_state: { current_plan: { plan_id: PLAN(faction), status: 'executing', target_osids: ['op:test:objective'] } },
        reinforcement_requests: [], prepositioning_orders: [], plan_updates: [], garrison_locks: [],
    } as any);
}

const ops = (state: GameState, faction: FactionId) =>
    (state.military.corps_command?.[CORPS[faction]]?.active_operations ?? []).map((op) => op.name);

describe('override: staff op plan (H-1..H-6)', () => {
    it.each([0, 1, 2, 3])('silence at Level %i: the player corps launches exactly as the no-player run', (level) => {
        const live = corpsState(level, 'RBiH');
        const headless = corpsState(undefined, undefined);
        for (const faction of FACTIONS) {
            launchPlan(live, faction);
            launchPlan(headless, faction);
        }
        expect(ops(live, 'RBiH')).toEqual([`op_${CORPS.RBiH}`]);
        expect(live.military.corps_command).toEqual(headless.military.corps_command);
    });

    it('an explicit refusal still wins: the plan is abandoned before launch, at no cost', () => {
        const state = corpsState(1, 'RBiH');
        state.military.corps_command![CORPS.RBiH]!.player_op_response = { plan_id: PLAN('RBiH'), approved: false, turn: 10 };
        launchPlan(state, 'RBiH');
        expect(ops(state, 'RBiH')).toEqual([]);
        expect(state.military.corps_command![CORPS.RBiH]!.commander_state?.current_plan).toBeNull();
        expect(state.military.corps_command![CORPS.RBiH]!.player_op_response).toBeUndefined();
    });

    it('an explicit backing launches the plan and clears their hold; a silent launch never clears a hold', () => {
        const backed = corpsState(1, 'RBiH');
        recordLevel1StanceAnswerHold(backed, CORPS.RBiH, 'defensive', 'PROP_10_military_0');
        expect(corpsHoldForbidsNewPlans(backed, CORPS.RBiH, 10)).toBe(true);
        backed.military.corps_command![CORPS.RBiH]!.player_op_response = { plan_id: PLAN('RBiH'), approved: true, turn: 10 };
        launchPlan(backed, 'RBiH');
        expect(ops(backed, 'RBiH')).toEqual([`op_${CORPS.RBiH}`]);
        expect(corpsHoldForbidsNewPlans(backed, CORPS.RBiH, 10)).toBe(false);

        const silent = corpsState(1, 'RBiH');
        recordLevel1StanceAnswerHold(silent, CORPS.RBiH, 'defensive', 'PROP_10_military_0');
        launchPlan(silent, 'RBiH');
        expect(corpsHoldForbidsNewPlans(silent, CORPS.RBiH, 10)).toBe(true);
    });

    it('a lapsed review is stamped as the staff proceeding (silence), never as a refusal', async () => {
        const state = corpsState(1, 'RBiH');
        const review: PendingProposalReview = {
            id: 'PROP_10_ops_0', turn: 10, faction: 'RBiH', domain: 'ops', description: 'Test offensive',
            proposed_action: `APPROVE_OP:${CORPS.RBiH}:${PLAN('RBiH')}`, current_value: 'pending', proposed_value: 'approved',
        };
        state.meta.pending_proposal_reviews = [review];
        state.meta.turn = 11;
        await warPhases.find((s) => s.name === 'apply-autonomy-transition')!.run({ state } as never);
        expect(state.meta.pending_proposal_reviews![0]).toMatchObject({ accepted: true, resolved_by: 'silence', resolved_turn: 11 });
        expect(state.meta.proposal_decision_history).toEqual([
            expect.objectContaining({ id: 'PROP_10_ops_0', accepted: true, resolved_by: 'silence' }),
        ]);
        expect(state.military.corps_command![CORPS.RBiH]!.player_op_response).toBeUndefined();
    });
});

// ─── Level 0: the staff pipeline runs for the player; their brigade order overrides per unit ──

describe('override: Level-0 brigade order (H-8..H-12)', () => {
    function ordersState(autonomy: number): GameState {
        return {
            meta: { turn: 20, seed: 'l0', phase: 'war', autonomy_level: autonomy, player_faction: 'RBiH' },
            factions: FACTIONS.map((id) => ({ id })),
            military: {
                formations: {
                    rbih_b1: { id: 'rbih_b1', faction: 'RBiH', kind: 'brigade', status: 'active' },
                    rbih_b2: { id: 'rbih_b2', faction: 'RBiH', kind: 'brigade', status: 'active' },
                    rs_b1: { id: 'rs_b1', faction: 'RS', kind: 'brigade', status: 'active' },
                },
                brigade_attack_orders: { rbih_b1: 'op:test:president_target' as SettlementId },
            },
        } as unknown as GameState;
    }

    it('the staff pipeline includes the player faction at every level, 0 included', () => {
        for (const level of [0, 1, 2, 3]) {
            expect(selectStaffControlledFactions(ordersState(level))).toEqual(['HRHB', 'RBiH', 'RS']);
        }
    });

    it('an attack order they staged at Level 0 replaces the staff order for that brigade only', () => {
        const state = ordersState(0);
        const staged = snapshotStagedPresidentialAttackOrders(state);
        expect(staged).toEqual([['rbih_b1', 'op:test:president_target']]);
        // The staff pass (replace mode) writes its own orders for every faction, the player's included.
        state.military.brigade_attack_orders = {
            rbih_b1: 'op:test:staff_target', rbih_b2: 'op:test:staff_b2', rs_b1: 'op:test:rs',
        } as Record<FormationId, SettlementId>;
        (state.military as { brigade_attack_order_owners?: unknown }).brigade_attack_order_owners = { rbih_b1: { op_name: 'staff' } };
        applyStagedPresidentialAttackOrders({ state }, staged);
        expect(state.military.brigade_attack_orders).toEqual({
            rbih_b1: 'op:test:president_target', rbih_b2: 'op:test:staff_b2', rs_b1: 'op:test:rs',
        });
        expect((state.military.brigade_attack_order_owners as Record<string, unknown> | undefined)?.rbih_b1).toBeUndefined();
    });

    it('silence (no staged order) leaves the staff orders untouched; above Level 0 nothing is snapshotted', () => {
        const silent = ordersState(0);
        delete silent.military.brigade_attack_orders;
        expect(snapshotStagedPresidentialAttackOrders(silent)).toEqual([]);
        expect(snapshotStagedPresidentialAttackOrders(ordersState(2))).toEqual([]);
        const headless = ordersState(0);
        headless.meta.headless_scenario_auto_control = true;
        expect(snapshotStagedPresidentialAttackOrders(headless)).toEqual([]);
    });
});

// ─── Recruitment hold (H-8) ─────────────────────────────────────────────────────────────────

describe('override: recruitment hold (H-8)', () => {
    it('silence: the staff raise for the player at Level 0 as headless; their hold keeps that brigade back', () => {
        const state = {
            meta: { turn: 5, seed: 'r', phase: 'war', autonomy_level: 0, player_faction: 'RBiH' },
            factions: FACTIONS.map((id) => ({ id })),
            military: { recruitment_state: { recruited_brigade_ids: [] } },
        } as unknown as GameState;
        expect(selectAutomaticRecruitmentFactions(state)).toEqual(['HRHB', 'RBiH', 'RS']);
        expect(selectPlayerHeldBrigadeIds(state)).toBeUndefined();
        setPlayerRecruitmentHold(state, 'arbih_held', true);
        expect([...selectPlayerHeldBrigadeIds(state)!]).toEqual(['arbih_held']);
    });
});

// ─── Operation opportunities (H-15) ─────────────────────────────────────────────────────────

const green = () => ({ green: true, reason: 'satisfied' });
function opportunity(): OperationOpportunityDef {
    return {
        opportunity_id: 'override_opp', name: 'Override Opportunity', tier: 'T1', faction: 'RBiH',
        primary_corps: 'arbih_5th_corps', family: 'fixture',
        axes: [{ axis_id: 'main', name: 'Main', corps: 'arbih_5th_corps', brigades: ['b_a', 'b_b'], objectives: ['op:bihac:bihac_2'] }],
        staging_osid: 'op:bihac:bihac_2', planning_duration: 3, citations: ['fixture'], historical_exit_class: 'partial_success',
        prerequisites: {
            date_window: 'required', political_authorization: 'n_a', corps_readiness: 'required', logistics: 'n_a',
            staging_access: 'required', weather_season: 'n_a', commander_confidence: 'n_a', enemy_weakness: 'n_a',
            alliance_context: 'n_a', force_quality: 'n_a', min_optional_axes: 0,
        },
        evaluators: {
            date_window: green, political_authorization: green, corps_readiness: green, logistics: green,
            staging_access: green, weather_season: green, commander_confidence: green, enemy_weakness: green,
            alliance_context: green, force_quality: green,
        },
        staff_recommendation: 'approve',
    } as unknown as OperationOpportunityDef;
}

function opportunityState(player: FactionId | null, autonomy: 0 | 1 | 2 | 3): GameState {
    const brigade = (id: string) => ({ id, name: id, kind: 'brigade', status: 'active', faction: 'RBiH', corps_id: 'arbih_5th_corps', personnel: 1000 });
    return {
        schema_version: 0,
        meta: { turn: 175, seed: 'opp', phase: 'war', autonomy_level: autonomy, ...(player ? { player_faction: player } : {}) },
        factions: [],
        military: {
            formations: { b_a: brigade('b_a'), b_b: brigade('b_b') },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            corps_command: {
                arbih_5th_corps: {
                    command_span: 6, subordinate_count: 6, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
                    stance: 'defensive', active_operations: [],
                },
            },
        },
        political: {},
        displacement: {},
    } as unknown as GameState;
}

describe('override: operation opportunity (H-15)', () => {
    it.each([0, 1] as const)('silence at Level %i: the staff decide on the headless turn, as the no-player run', (level) => {
        const live = opportunityState('RBiH', level);
        const headless = opportunityState(null, level);
        for (const state of [live, headless]) runOpportunityEvaluationStep(state, 175, [opportunity()]);
        applyBotOpportunityDecisions(live, 175, 'RBiH', [opportunity()]);
        applyBotOpportunityDecisions(headless, 175, null, [opportunity()]);
        expect(live.military.operation_opportunities![0]!.status).toBe('approved');
        expect(live.military).toEqual(headless.military);
        expect(live.meta.proposal_decision_history?.map((row) => row.resolved_by)).toEqual(['silence']);
    });

    it('an explicit decision on a review row wins over the staff default', () => {
        const state = opportunityState('RBiH', 1);
        runOpportunityEvaluationStep(state, 175, [opportunity()]);
        const proposalId = state.military.operation_opportunities![0]!.proposal_id;
        state.meta.pending_proposal_reviews = [{
            id: 'PROP_175_opportunity_0', turn: 175, faction: 'RBiH', domain: 'ops', description: 'x',
            proposed_action: `OPPORTUNITY:${proposalId}`, proposed_value: 'approve',
            opportunity_decision: 'decline', resolved_turn: 175,
        }];
        applyResolvedOpportunityDecisions(state, 176, [opportunity()]);
        applyBotOpportunityDecisions(state, 176, 'RBiH', [opportunity()]);
        expect(state.military.operation_opportunities![0]!.status).toBe('declined');
        expect(state.military.corps_command!.arbih_5th_corps!.active_operations).toEqual([]);
    });
});

// ─── Event decisions (H-16) ─────────────────────────────────────────────────────────────────

const DECISION_EVENT = {
    id: 'override_test_decision', once: true, priority: 1,
    effect: { kind: 'narrative', text: 'A decision arrives.' },
    trigger: { type: 'turn_gte', value: 1 },
    responding_faction: 'RBiH', historical_default_response_id: 'hold', bot_response_logic: 'historical',
    response_options: [
        { id: 'hold', label: 'Hold', effects: [], sets_flags: { override_test_answer: 'hold' } },
        { id: 'yield', label: 'Yield', effects: [], sets_flags: { override_test_answer: 'yield' } },
    ],
} as unknown as EventDefinition;

function eventState(meta: Record<string, unknown> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0, seed: 'override-events', phase: 'war', referendum_held: true, referendum_turn: 0,
            war_start_turn: 0, decision_mode: 'historical', ...meta,
        },
        factions: [],
        military: {
            formations: {}, front_segments: {}, front_posture: {}, front_posture_regions: {},
            front_pressure: {}, militia_pools: {}, pending_event_decisions: [],
        } as any,
        political: {} as any,
        displacement: {} as any,
    } as GameState;
}
const eventInput = { seed: 'override-events', eventDefinitions: [DECISION_EVENT], settlementEdges: [] };

describe('override: event decision (H-16)', () => {
    it.each([0, 1, 2])('silence at Level %i: the bot answer lands in-turn, exactly as headless', async (level) => {
        const headless = await runTurn(eventState(), eventInput);
        const live = await runTurn(eventState({ player_faction: 'RBiH', autonomy_level: level }), eventInput);
        expect(live.nextState.military.pending_event_decisions).toEqual([]);
        expect(live.nextState.military.event_flags?.override_test_answer).toBe('hold');
        expect(withoutSeat(live.nextState)).toEqual(withoutSeat(headless.nextState));
        expect(live.nextState.meta.proposal_decision_history?.map((row) => [row.proposed_action, row.resolved_by]))
            .toEqual([['EVENT:override_test_decision', 'silence']]);
    });

    it('an explicit answer in the pause wins over the bot answer', async () => {
        const live = await runTurn(eventState({ player_faction: 'RBiH', autonomy_level: 0 }), {
            ...eventInput,
            onPlayerDecisionsPending: (working, decisions) => {
                for (const decision of decisions) resolveEventDecision(working, decision.event_id, 'yield');
            },
        });
        expect(live.nextState.military.event_flags?.override_test_answer).toBe('yield');
        expect(live.nextState.military.event_decision_log?.map((row) => row.decision_source)).toEqual(['player']);
        expect(live.nextState.meta.proposal_decision_history).toBeUndefined();
    });
});

// ─── Peace plans (H-18) ─────────────────────────────────────────────────────────────────────

function planState(player: FactionId | null): GameState {
    const negotiation: NegotiationState = {
        capital: {}, patron_relationships: {}, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions(),
    } as unknown as NegotiationState;
    return {
        meta: { turn: 68, phase: 'war', seed: 1, date: '1993-05-01', war_start_turn: 10, ...(player ? { player_faction: player } : {}) },
        factions: FACTIONS.map((id) => ({ id })),
        military: { formations: {}, negotiation },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
}

describe('override: peace plan (H-18)', () => {
    it('silence at the close week: the plan owner answers the player seat as headless does', () => {
        const live = planState('RS');
        const headless = planState(null);
        evaluatePeacePlans(live);
        evaluatePeacePlans(headless);
        expect(live.military.negotiation!.pending_peace_plan).toBeUndefined();
        expect(live.military.negotiation!.peace_plan_history).toEqual(headless.military.negotiation!.peace_plan_history);
        expect(live.meta.proposal_decision_history?.map((row) => row.resolved_by)).toEqual(['silence']);
    });

    it('an explicit answer on a pending fallback wins over the plan owner answer', () => {
        const live = planState('RS');
        live.military.negotiation!.pending_peace_plan = {
            plan_id: 'vance_owen', turn_offered: 50, bot_responses: { RBiH: 'accepted', HRHB: 'accepted' },
        };
        resolvePeacePlan(live, 'vance_owen', 'accepted');
        const row = live.military.negotiation!.peace_plan_history.find((h) => h.plan_id === 'vance_owen');
        expect(row?.responses.RS).toBe('accepted'); // headless answers RS 'rejected' (historical)
    });
});

// ─── Dayton (H-19) ──────────────────────────────────────────────────────────────────────────

function daytonState(player: FactionId | null): GameState {
    const capital: Record<string, unknown> = {};
    const patron_relationships: Record<string, unknown> = {};
    for (const faction of FACTIONS) {
        capital[faction] = { ...createEmptyCapital(), territory_controlled_pct: 30 };
        patron_relationships[faction] = {
            patron_id: 'international_community', support_level: 50, override_authority: 10,
            sanctions_active: false, relationship_events: [],
        };
    }
    const state = {
        meta: {
            turn: 188, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21', game_over: false,
            dayton_close_out: true, ...(player ? { player_faction: player } : {}),
        },
        factions: FACTIONS.map((id) => ({ id })),
        military: {
            formations: {},
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: initializeStrategicDimensions() },
        },
        political: { political_controllers: {} },
        displacement: {},
    } as unknown as GameState;
    state.military.negotiation!.pending_dayton = initiateDaytonNegotiation(state) as never;
    return state;
}

describe('override: Dayton (H-19)', () => {
    it('silence (the historical-default close-out) does not depend on who the player is', () => {
        const headless = daytonState(null);
        const rbih = daytonState('RBiH');
        const rs = daytonState('RS');
        const hrhb = daytonState('HRHB');
        const results = [headless, rbih, rs, hrhb].map((state) => resolvePendingDaytonCloseOut(state));
        for (const result of results.slice(1)) expect(result).toEqual(results[0]);
        expect(headless.meta.proposal_decision_history).toBeUndefined();
        expect(rs.meta.proposal_decision_history?.map((row) => row.resolved_by)).toEqual(['silence']);
        expect(DAYTON_DEFAULT_PROPOSER).toBe('RBiH');
    });

    it('an explicit proposal wins: it is signed for the President\'s own seat and the close-out never overrides it', () => {
        const explicit = daytonState('RS');
        // Their proposal is computed for their seat; only silence uses the default seat.
        expect(daytonProposerFaction(explicit)).toBe('RS');
        expect(daytonProposerFaction(daytonState(null))).toBe(DAYTON_DEFAULT_PROPOSER);
        const signed = resolveDaytonNegotiation(explicit, buildHistoricalDefaultDaytonProposal());
        expect(explicit.military.negotiation!.dayton_result).toEqual(signed);
        // The horizon close-out finds the table already signed: nothing applied by silence, no receipt.
        expect(resolvePendingDaytonCloseOut(explicit)).toBeNull();
        expect(explicit.meta.proposal_decision_history).toBeUndefined();
    });
});

// ─── Officers (H-13) ────────────────────────────────────────────────────────────────────────

function officer(id: string, home: string): NamedOfficer {
    return {
        id, name: id, faction: 'RBiH', rank: 'corps_commander', competence: 3, aggressiveness: 3, defensive_skill: 3,
        political_reliability: 3, available_from_turn: 0, origin: 'jna', casualty_vulnerability: 0.05,
        can_improve: false, improvement_rate: 0, pool_tier: 'tier_a', home_corps_id: home,
    } as NamedOfficer;
}
function seat(id: string, corps: string | null, status: NamedOfficerState['status'] = 'active'): NamedOfficerState {
    return {
        officer_id: id, status, assigned_corps_id: corps, turns_in_command: 0, battles: 0, victories: 0,
        effective_competence_penalty: 0, penalty_turns_remaining: 0, acting_commander: false,
    } as NamedOfficerState;
}
function officerState(player: boolean): GameState {
    const corps = (id: string) => ({ id, faction: 'RBiH', kind: 'corps_asset', status: 'active', name: id });
    return {
        meta: { turn: 22, phase: 'war', scenario_id: 'test', ...(player ? { player_faction: 'RBiH', autonomy_level: 0 } : {}) },
        factions: [],
        military: {
            formations: { c3: corps('c3'), c4: corps('c4') },
            corps_command: { c3: { active_operations: [] }, c4: { active_operations: [] } },
            named_officer_data: [officer('incumbent3', 'c3'), officer('holder3', 'c3'), officer('appointee4', 'c4'), officer('holder4', 'c4')],
            named_officers: {
                incumbent3: seat('incumbent3', 'c3'), holder3: seat('holder3', null, 'reserve'),
                appointee4: seat('appointee4', 'c4'), holder4: seat('holder4', null, 'reserve'),
            },
        },
        political: { settlements: {}, political_controllers: {} },
    } as unknown as GameState;
}
const tenure = (officer_id: string) => ({ officer_id, tenure_start: 22, tenure_end: 82, historical_fate: 'survived' as const, source: 'test' });

describe('override: officer appointment (H-13)', () => {
    const roster = () => validateCorpsCoRoster({
        schema_version: 1,
        rosters: { c3: { schedule: [tenure('holder3')] }, c4: { schedule: [tenure('holder4')] } },
    });

    it('silence at Level 0: the authored schedule applies exactly as headless', () => {
        const live = officerState(true);
        const headless = officerState(false);
        processOfficerSuccession(live, new Set(), roster());
        processOfficerSuccession(headless, new Set(), roster());
        expect(live.military.named_officers!.holder3).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
        expect(live.military.named_officers).toEqual(headless.military.named_officers);
        expect((live.military.pending_officer_events ?? []).filter((e) => e.type === 'replacement_suggested')).toEqual([]);
    });

    it('their explicit appointment wins: the appointee is not rotated out, the other corps still is', () => {
        const live = officerState(true);
        (live.military.corps_command as any).c4.co_replacement_record = [{ relieved_officer_id: 'x', replacement_officer_id: 'appointee4', turn: 10 }];
        processOfficerSuccession(live, new Set(), roster());
        expect(live.military.named_officers!.appointee4).toMatchObject({ status: 'active', assigned_corps_id: 'c4' });
        expect(live.military.named_officers!.holder3).toMatchObject({ status: 'active', assigned_corps_id: 'c3' });
    });
});
