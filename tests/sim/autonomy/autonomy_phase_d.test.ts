/**
 * v0.8.4 Phase D test suite.
 *
 * Covers:
 *   - generateLevel1OpProposals: guard conditions, proposal shape, determinism
 *   - proposed_action format: APPROVE_OP:<corpsId>:<planId>
 *   - domain 'ops' on op proposals
 *   - deterministic ID format: PROP_<turn>_ops_<seq>
 *   - requires_player_response: true events queued to pending_event_decisions at Level 3
 *   - same event does NOT auto-resolve at Level 3 when requires_player_response: true
 *   - player_op_response schema field is accepted by CorpsCommandState
 */

import { describe, it, expect } from 'vitest';
import type {
    GameState,
    FactionId,
    CorpsCommandState,
    CorpsStance,
    PendingProposalReview,
} from '../../../src/state/game_state.js';
import type { CommanderDecisionTrace } from '../../../src/sim/combat/commander/commander_state.js';
import { generateLevel1OpProposals } from '../../../src/sim/ai_commander/proposal_generation.js';
import { evaluateEvents } from '../../../src/sim/events/evaluate_events.js';
import type { EventDefinition } from '../../../src/sim/events/event_types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Deterministic RNG: always returns 0. */
const alwaysRng = () => 0;

function makeCorpsCommand(overrides: Partial<CorpsCommandState> = {}): CorpsCommandState {
    return {
        command_span: 3,
        subordinate_count: 3,
        og_slots: 1,
        corps_exhaustion: 0,
        stance: 'balanced' as CorpsStance,
        active_ogs: [],
        active_operations: [],
        ...overrides,
    } as unknown as CorpsCommandState;
}

function makeFormation(id: string, faction: FactionId, kind: 'corps' | 'brigade' = 'corps') {
    return {
        id,
        faction,
        name: `${id}-name`,
        created_turn: 1,
        status: 'active' as const,
        assignment: null,
        kind,
    };
}

function makeCommanderState(planStatus?: 'ready' | 'concentrating' | 'executing', planId?: string) {
    if (!planStatus) return undefined;
    return {
        current_plan: {
            plan_id: planId ?? `plan_test_t5`,
            status: planStatus,
            objective_description: 'Capture Jajce',
            target_osids: ['op:jajce:jajce_1'],
            assigned_brigades: [],
            staging_zone: 'op:donji_vakuf:donji_vakuf_1',
            target_ready_turn: 5,
            concentration_progress: 1.0,
            viability_score: 0.8,
        },
        decision_trace: null as CommanderDecisionTrace | null,
        lessons: [],
        belief_state: null,
        relationships: null,
    };
}

function makeState(opts: {
    autonomyLevel?: 0 | 1 | 2 | 3;
    turn?: number;
    playerFaction?: FactionId;
    corpsEntries?: Array<{
        id: string;
        planStatus?: 'ready' | 'concentrating' | 'executing';
        planId?: string;
        traceWinningIntentId?: string | null;
        playerOpResponse?: { plan_id: string; approved: boolean; turn: number };
    }>;
}): GameState {
    const {
        autonomyLevel = 1,
        turn = 5,
        playerFaction = 'RBiH',
        corpsEntries = [],
    } = opts;

    const formations: Record<string, ReturnType<typeof makeFormation>> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};

    for (const entry of corpsEntries) {
        formations[entry.id] = makeFormation(entry.id, playerFaction);
        const overrides: Partial<CorpsCommandState> = {};

        // Build commander_state when a plan OR a trace signal is requested.
        const needsCs = entry.planStatus !== undefined || entry.traceWinningIntentId !== undefined;
        if (needsCs) {
            const cs = makeCommanderState(entry.planStatus, entry.planId) ?? {
                current_plan: null,
                decision_trace: null,
                lessons: [],
                belief_state: null,
                relationships: null,
            };
            // Override decision_trace winning_intent_id if specified
            if (entry.traceWinningIntentId !== undefined) {
                cs.decision_trace = {
                    turn,
                    winning_intent_id: entry.traceWinningIntentId,
                    candidates: [],
                    hard_constraints: [],
                    lessons_applied: [],
                    relationships_applied: [],
                };
            }
            overrides.commander_state = cs as unknown as CorpsCommandState['commander_state'];
        }

        if (entry.playerOpResponse) {
            overrides.player_op_response = entry.playerOpResponse;
        }
        corpsCommand[entry.id] = makeCorpsCommand(overrides);
    }

    return {
        meta: {
            turn,
            seed: 'test',
            phase: 'war',
            player_faction: playerFaction,
            autonomy_level: autonomyLevel,
        },
        military: {
            formations,
            corps_command: corpsCommand,
        },
    } as unknown as GameState;
}

// ---------------------------------------------------------------------------
// High-stakes event for requires_player_response tests
// ---------------------------------------------------------------------------

const HIGH_STAKES_EVENT: EventDefinition = {
    id: 'test_high_stakes_event',
    once: true,
    priority: 50,
    requires_player_response: true,
    responding_faction: 'RS',
    effect: { kind: 'narrative', text: 'A critical decision is required.' },
    trigger: { type: 'turn_gte', value: 1 },
    bot_response_logic: 'strategic_weighted',
    response_options: [
        { id: 'comply', label: 'Comply', effects: [] },
        { id: 'defy', label: 'Defy', effects: [] },
    ],
} as unknown as EventDefinition;

// ---------------------------------------------------------------------------
// Group 1: Guard conditions
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: guard conditions', () => {
    it('returns empty array when autonomy_level is 0', () => {
        const state = makeState({
            autonomyLevel: 0,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 2', () => {
        const state = makeState({
            autonomyLevel: 2,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 3', () => {
        const state = makeState({
            autonomyLevel: 3,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when no corps exist', () => {
        const state = makeState({ autonomyLevel: 1, corpsEntries: [] });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when corps has no commander_state', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st' }], // no planStatus → no commander_state
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when plan status is concentrating (not ready)', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'concentrating' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when plan status is executing (already launched)', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'executing' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when decision_trace winning_intent_id is null', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st', traceWinningIntentId: null }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Group 2: Proposal generation from ready plan
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: proposal shape from ready plan', () => {
    it('generates one proposal when corps has status=ready plan', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });

    it('proposal has correct id format: PROP_<turn>_ops_<seq>', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RBiH');
        expect(p.id).toBe('PROP_5_ops_0');
    });

    it('proposal domain is ops', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RBiH');
        expect(p.domain).toBe('ops');
    });

    it('proposal has correct proposed_action format: APPROVE_OP:<corpsId>:<planId>', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RBiH');
        expect(p.proposed_action).toBe('APPROVE_OP:arbih_1st:plan_arbih_1st_t5');
    });

    it('proposal current_value is pending, proposed_value is approved', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RBiH');
        expect(p.current_value).toBe('pending');
        expect(p.proposed_value).toBe('approved');
    });

    it('proposal turn and faction match state', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 7,
            playerFaction: 'RS',
            corpsEntries: [{ id: 'vrs_1st', planStatus: 'ready', planId: 'plan_vrs_1st_t7' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RS');
        expect(p.turn).toBe(7);
        expect(p.faction).toBe('RS');
    });

    it('proposal accepted is undefined (initial pending state)', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' }],
        });
        const [p] = generateLevel1OpProposals(state, 'RBiH');
        expect(p.accepted).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// Group 3: Proposal from decision_trace (opportunity signal)
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: from decision_trace winning_intent_id', () => {
    it('generates proposal when winning_intent_id contains stage_operation', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', traceWinningIntentId: 'stage_operation_jajce' }],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });

    it('generates proposal when winning_intent_id contains launch_opportunity', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', traceWinningIntentId: 'launch_opportunity' }],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });

    it('does not generate proposal when winning_intent_id is hold_line', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [{ id: 'arbih_1st', traceWinningIntentId: 'hold_line' }],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Group 4: Multiple corps — deterministic ordering
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: multiple corps, deterministic ordering', () => {
    it('generates multiple proposals when multiple corps have ready plans', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [
                { id: 'arbih_2nd', planStatus: 'ready', planId: 'plan_arbih_2nd_t5' },
                { id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' },
            ],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(2);
    });

    it('sorts by corpsId lexicographically — arbih_1st gets seq=0', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [
                { id: 'arbih_2nd', planStatus: 'ready', planId: 'plan_arbih_2nd_t5' },
                { id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t5' },
            ],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals[0].id).toBe('PROP_5_ops_0');
        expect(proposals[0].proposed_action).toContain('arbih_1st');
        expect(proposals[1].id).toBe('PROP_5_ops_1');
        expect(proposals[1].proposed_action).toContain('arbih_2nd');
    });
});

// ---------------------------------------------------------------------------
// Group 5: Determinism — same inputs → same outputs
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: determinism', () => {
    it('same inputs produce identical proposal IDs on two independent calls', () => {
        const makeIdenticalState = () =>
            makeState({
                autonomyLevel: 1,
                turn: 10,
                corpsEntries: [
                    { id: 'arbih_1st', planStatus: 'ready', planId: 'plan_arbih_1st_t10' },
                    { id: 'arbih_2nd', planStatus: 'ready', planId: 'plan_arbih_2nd_t10' },
                ],
            });

        const a = generateLevel1OpProposals(makeIdenticalState(), 'RBiH');
        const b = generateLevel1OpProposals(makeIdenticalState(), 'RBiH');
        expect(a.map(p => p.id)).toEqual(b.map(p => p.id));
        expect(a.map(p => p.proposed_action)).toEqual(b.map(p => p.proposed_action));
    });
});

// ---------------------------------------------------------------------------
// Group 6: player_op_response skip guard
// ---------------------------------------------------------------------------

describe('generateLevel1OpProposals: player_op_response same-turn skip guard', () => {
    it('skips corps that already has a player_op_response for same plan on same turn', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [
                {
                    id: 'arbih_1st',
                    planStatus: 'ready',
                    planId: 'plan_arbih_1st_t5',
                    playerOpResponse: { plan_id: 'plan_arbih_1st_t5', approved: true, turn: 5 },
                },
            ],
        });
        expect(generateLevel1OpProposals(state, 'RBiH')).toEqual([]);
    });

    it('does NOT skip when player_op_response is for a different plan', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [
                {
                    id: 'arbih_1st',
                    planStatus: 'ready',
                    planId: 'plan_arbih_1st_t5',
                    playerOpResponse: { plan_id: 'plan_arbih_1st_t3', approved: true, turn: 5 },
                },
            ],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });

    it('does NOT skip when player_op_response is from a prior turn', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            corpsEntries: [
                {
                    id: 'arbih_1st',
                    planStatus: 'ready',
                    planId: 'plan_arbih_1st_t5',
                    playerOpResponse: { plan_id: 'plan_arbih_1st_t5', approved: true, turn: 4 },
                },
            ],
        });
        const proposals = generateLevel1OpProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// Group 7: requires_player_response gate in evaluateEvents
// ---------------------------------------------------------------------------

describe('requires_player_response: Level 3 gate', () => {
    function makeEventState(autonomyLevel: 0 | 1 | 2 | 3, playerFaction?: FactionId): GameState {
        return {
            meta: {
                turn: 10,
                seed: 'test',
                phase: 'war',
                player_faction: playerFaction ?? 'RS',
                autonomy_level: autonomyLevel,
            },
            factions: [{ id: 'RBiH' }, { id: 'RS' }, { id: 'HRHB' }],
            military: {
                formations: {},
                fired_event_ids: [],
                pending_event_decisions: [],
                strategic_dimensions: undefined,
                negotiation: undefined,
            },
            displacement: {},
            economy: {},
            political: {},
        } as unknown as GameState;
    }

    it('at Level 3, event with requires_player_response:true still queues as PendingEventDecision', () => {
        const state = makeEventState(3, 'RS');
        evaluateEvents(state, alwaysRng, 10, [HIGH_STAKES_EVENT]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(1);
        expect(pending[0].event_id).toBe('test_high_stakes_event');
    });

    it('at Level 3, event without requires_player_response auto-resolves (no PendingEventDecision)', () => {
        const NORMAL_EVENT: EventDefinition = {
            id: 'test_normal_event',
            once: true,
            priority: 1,
            effect: { kind: 'narrative', text: 'A normal event.' },
            trigger: { type: 'turn_gte', value: 1 },
            bot_response_logic: 'default',
            response_options: [
                { id: 'opt_a', label: 'Accept', effects: [] },
            ],
        } as unknown as EventDefinition;

        const state = makeEventState(3, 'RS');
        evaluateEvents(state, alwaysRng, 10, [NORMAL_EVENT]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(0);
    });

    it('at Level 0, event with requires_player_response:true queues as PendingEventDecision', () => {
        const state = makeEventState(0, 'RS');
        evaluateEvents(state, alwaysRng, 10, [HIGH_STAKES_EVENT]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(1);
    });

    it('at Level 1, event with requires_player_response:true queues as PendingEventDecision', () => {
        const state = makeEventState(1, 'RS');
        evaluateEvents(state, alwaysRng, 10, [HIGH_STAKES_EVENT]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(1);
    });

    it('at Level 2, event with requires_player_response:true queues as PendingEventDecision', () => {
        const state = makeEventState(2, 'RS');
        evaluateEvents(state, alwaysRng, 10, [HIGH_STAKES_EVENT]);
        const pending = state.military.pending_event_decisions ?? [];
        expect(pending.length).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Group 8: player_op_response schema field (regression guard)
// ---------------------------------------------------------------------------

describe('CorpsCommandState.player_op_response schema', () => {
    it('player_op_response is optional — absent by default', () => {
        const cmd = makeCorpsCommand();
        expect(cmd.player_op_response).toBeUndefined();
    });

    it('player_op_response can be set with plan_id, approved, turn fields', () => {
        const cmd = makeCorpsCommand({
            player_op_response: { plan_id: 'plan_test_t5', approved: true, turn: 5 },
        });
        expect(cmd.player_op_response?.plan_id).toBe('plan_test_t5');
        expect(cmd.player_op_response?.approved).toBe(true);
        expect(cmd.player_op_response?.turn).toBe(5);
    });

    it('player_op_response can be set with approved:false for rejection', () => {
        const cmd = makeCorpsCommand({
            player_op_response: { plan_id: 'plan_test_t5', approved: false, turn: 5 },
        });
        expect(cmd.player_op_response?.approved).toBe(false);
    });

    it('player_op_response carries optional force_launched marker (force-launch vs ordinary commit)', () => {
        const commit = makeCorpsCommand({
            player_op_response: { plan_id: 'p', approved: true, turn: 5 },
        });
        expect(commit.player_op_response?.force_launched).toBeUndefined();
        const forced = makeCorpsCommand({
            player_op_response: { plan_id: 'p', approved: true, turn: 5, force_launched: true },
        });
        expect(forced.player_op_response?.force_launched).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Group 9: proposal domain 'ops' is valid in PendingProposalReview
// ---------------------------------------------------------------------------

describe('PendingProposalReview domain ops', () => {
    it("domain 'ops' is a valid PendingProposalReview domain", () => {
        const review: PendingProposalReview = {
            id: 'PROP_5_ops_0',
            turn: 5,
            faction: 'RBiH' as FactionId,
            domain: 'ops',
            description: 'Formula AI: 1st Corps ready to launch offensive — Capture Jajce',
            proposed_action: 'APPROVE_OP:arbih_1st:plan_arbih_1st_t5',
            current_value: 'pending',
            proposed_value: 'approved',
        };
        expect(review.domain).toBe('ops');
        expect(review.proposed_action.startsWith('APPROVE_OP:')).toBe(true);
    });
});
