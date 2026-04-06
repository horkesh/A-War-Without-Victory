/**
 * v0.8.4 Phase C test suite.
 *
 * Covers:
 *   - generateLevel1StanceProposals: guard conditions, proposal shape, determinism,
 *     player_ordered_stance skip, sort order, level gating
 *   - Proposal review state machine: initial pending → accepted/rejected
 *   - Schema contract: PendingProposalReview.current_value/proposed_value,
 *     CorpsCommandState.ai_recommended_stance
 *   - Level 2+ gate removal: autonomy_level_pending accepts 2 and 3
 *   - Level 3 event-routing regression guard
 */

import { describe, it, expect } from 'vitest';
import type {
    GameState,
    FactionId,
    PendingProposalReview,
    CorpsCommandState,
    CorpsStance,
} from '../../../src/state/game_state.js';
import { generateLevel1StanceProposals } from '../../../src/sim/ai_commander/proposal_generation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCorpsCommand(
    stance: CorpsStance,
    aiStance?: CorpsStance,
    playerOrderedStance?: string | null
): CorpsCommandState {
    return {
        command_span: 3,
        subordinate_count: 3,
        og_slots: 1,
        corps_exhaustion: 0,
        stance,
        active_ogs: [],
        active_operations: [],
        ...(aiStance !== undefined ? { ai_recommended_stance: aiStance } : {}),
        ...(playerOrderedStance !== undefined ? { player_ordered_stance: playerOrderedStance } : {}),
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

/**
 * Build a minimal GameState stub for proposal generation tests.
 * autonomyLevel defaults to 1 (the only level that generates proposals).
 */
function makeState(opts: {
    autonomyLevel?: 0 | 1 | 2 | 3;
    turn?: number;
    playerFaction?: FactionId;
    corpsEntries?: Array<{
        id: string;
        stance: CorpsStance;
        aiStance?: CorpsStance;
        playerOrderedStance?: string | null;
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
        corpsCommand[entry.id] = makeCorpsCommand(
            entry.stance,
            entry.aiStance,
            entry.playerOrderedStance
        );
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
// Group 1: Proposal generation guard conditions
// ---------------------------------------------------------------------------

describe('generateLevel1StanceProposals: guard conditions', () => {
    it('returns empty array when autonomy_level is 0', () => {
        const state = makeState({
            autonomyLevel: 0,
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 2', () => {
        const state = makeState({
            autonomyLevel: 2,
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 3', () => {
        const state = makeState({
            autonomyLevel: 3,
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 1 but no player corps exist', () => {
        // No corps entries at all
        const state = makeState({ autonomyLevel: 1, corpsEntries: [] });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 1 but ai_recommended_stance equals current stance', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'balanced' }],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('returns empty array when autonomy_level is 1 but ai_recommended_stance is absent', () => {
        const state = makeState({
            autonomyLevel: 1,
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced' }],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Group 1 continued: successful proposal generation
// ---------------------------------------------------------------------------

describe('generateLevel1StanceProposals: proposal shape', () => {
    it('generates one proposal when ai_recommended_stance differs from current stance', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const proposals = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });

    it('generated proposal has correct id format: PROP_<turn>_military_<seq>', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.id).toBe('PROP_5_military_0');
    });

    it('generated proposal has correct turn, faction, domain fields', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 7,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.turn).toBe(7);
        expect(proposal.faction).toBe('RBiH');
        expect(proposal.domain).toBe('military');
    });

    it('generated proposal.proposed_action matches SET_STANCE:<corpsId>:<stance>', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.proposed_action).toBe('SET_STANCE:arbih_1st:offensive');
    });

    it('generated proposal has current_value set to existing stance', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.current_value).toBe('balanced');
    });

    it('generated proposal has proposed_value set to ai_recommended_stance', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.proposed_value).toBe('offensive');
    });

    it('generated proposal has accepted === undefined (initial pending state)', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [{ id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' }],
        });
        const [proposal] = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposal.accepted).toBeUndefined();
    });

    it('generates multiple proposals when multiple corps differ — seq increments per proposal', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [
                { id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' },
                { id: 'arbih_2nd', stance: 'offensive', aiStance: 'defensive' },
            ],
        });
        const proposals = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposals).toHaveLength(2);
        // Both IDs must include their respective seq
        const ids = proposals.map(p => p.id);
        expect(ids).toContain('PROP_5_military_0');
        expect(ids).toContain('PROP_5_military_1');
    });
});

// ---------------------------------------------------------------------------
// Group 1 continued: player_ordered_stance skip
// ---------------------------------------------------------------------------

describe('generateLevel1StanceProposals: player_ordered_stance skip', () => {
    it('skips corps where player_ordered_stance is non-null', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [
                {
                    id: 'arbih_1st',
                    stance: 'balanced',
                    aiStance: 'offensive',
                    playerOrderedStance: 'defensive', // player already issued an order
                },
            ],
        });
        expect(generateLevel1StanceProposals(state, 'RBiH')).toEqual([]);
    });

    it('does NOT skip corps where player_ordered_stance is null', () => {
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [
                {
                    id: 'arbih_1st',
                    stance: 'balanced',
                    aiStance: 'offensive',
                    playerOrderedStance: null, // explicitly cleared — should NOT skip
                },
            ],
        });
        const proposals = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposals).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// Group 1 continued: sort order
// ---------------------------------------------------------------------------

describe('generateLevel1StanceProposals: deterministic sort order', () => {
    it('corps sorting by strictCompare determines seq — the lexicographically first id always gets seq=0', () => {
        // 'arbih_1st' < 'arbih_2nd' lexicographically
        const state = makeState({
            autonomyLevel: 1,
            turn: 5,
            playerFaction: 'RBiH',
            corpsEntries: [
                { id: 'arbih_2nd', stance: 'balanced', aiStance: 'offensive' },
                { id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' },
            ],
        });
        const proposals = generateLevel1StanceProposals(state, 'RBiH');
        expect(proposals).toHaveLength(2);
        // First proposal should be for arbih_1st (sorts earlier)
        expect(proposals[0].proposed_action).toContain('arbih_1st');
        expect(proposals[0].id).toBe('PROP_5_military_0');
        expect(proposals[1].proposed_action).toContain('arbih_2nd');
        expect(proposals[1].id).toBe('PROP_5_military_1');
    });
});

// ---------------------------------------------------------------------------
// Group 1 continued: determinism check
// ---------------------------------------------------------------------------

describe('generateLevel1StanceProposals: determinism', () => {
    it('same inputs produce identical proposal IDs on two independent calls', () => {
        const makeIdenticalState = () =>
            makeState({
                autonomyLevel: 1,
                turn: 10,
                playerFaction: 'RBiH',
                corpsEntries: [
                    { id: 'arbih_1st', stance: 'balanced', aiStance: 'offensive' },
                    { id: 'arbih_2nd', stance: 'offensive', aiStance: 'defensive' },
                ],
            });

        const resultA = generateLevel1StanceProposals(makeIdenticalState(), 'RBiH');
        const resultB = generateLevel1StanceProposals(makeIdenticalState(), 'RBiH');

        expect(resultA.map(p => p.id)).toEqual(resultB.map(p => p.id));
        expect(resultA.map(p => p.proposed_action)).toEqual(resultB.map(p => p.proposed_action));
        expect(resultA.map(p => p.current_value)).toEqual(resultB.map(p => p.current_value));
        expect(resultA.map(p => p.proposed_value)).toEqual(resultB.map(p => p.proposed_value));
    });
});

// ---------------------------------------------------------------------------
// Group 2: Proposal review state machine
// ---------------------------------------------------------------------------

describe('PendingProposalReview: state machine', () => {
    function makePendingProposal(): PendingProposalReview {
        return {
            id: 'PROP_5_military_0',
            turn: 5,
            faction: 'RBiH' as FactionId,
            domain: 'military',
            description: 'Formula AI recommends shift from balanced to offensive.',
            proposed_action: 'SET_STANCE:arbih_1st:offensive',
            current_value: 'balanced',
            proposed_value: 'offensive',
            // accepted and resolved_turn left undefined — initial pending state
        };
    }

    it('initial state: accepted is undefined (pending)', () => {
        const proposal = makePendingProposal();
        expect(proposal.accepted).toBeUndefined();
        expect(proposal.resolved_turn).toBeUndefined();
    });

    it('accepted:true with resolved_turn marks an accepted proposal', () => {
        const proposal = makePendingProposal();
        proposal.accepted = true;
        proposal.resolved_turn = 5;
        expect(proposal.accepted).toBe(true);
        expect(proposal.resolved_turn).toBe(5);
    });

    it('accepted:false with resolved_turn marks a rejected proposal', () => {
        const proposal = makePendingProposal();
        proposal.accepted = false;
        proposal.resolved_turn = 5;
        expect(proposal.accepted).toBe(false);
        expect(proposal.resolved_turn).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// Group 3: Schema contract (regression guard)
// ---------------------------------------------------------------------------

describe('schema contract: PendingProposalReview', () => {
    it('current_value and proposed_value are optional string fields that TypeScript accepts', () => {
        // If this compiles and runs, the schema contract is satisfied.
        const review: PendingProposalReview = {
            id: 'PROP_5_military_0',
            turn: 5,
            faction: 'RBiH' as FactionId,
            domain: 'military',
            description: 'test',
            proposed_action: 'SET_STANCE:arbih_1st:offensive',
            current_value: 'balanced',
            proposed_value: 'offensive',
        };
        expect(review.current_value).toBe('balanced');
        expect(review.proposed_value).toBe('offensive');
    });

    it('current_value and proposed_value are optional — can be omitted', () => {
        const review: PendingProposalReview = {
            id: 'PROP_5_military_0',
            turn: 5,
            faction: 'RBiH' as FactionId,
            domain: 'military',
            description: 'test',
            proposed_action: 'SET_STANCE:arbih_1st:offensive',
        };
        expect(review.current_value).toBeUndefined();
        expect(review.proposed_value).toBeUndefined();
    });
});

describe('schema contract: CorpsCommandState.ai_recommended_stance', () => {
    it('ai_recommended_stance is an optional field on CorpsCommandState', () => {
        // Build a corps command entry without ai_recommended_stance — must not fail.
        const cmd = makeCorpsCommand('balanced');
        expect(cmd.ai_recommended_stance).toBeUndefined();
    });

    it('ai_recommended_stance can be assigned a CorpsStance value', () => {
        const cmd = makeCorpsCommand('balanced', 'offensive');
        expect(cmd.ai_recommended_stance).toBe('offensive');
    });
});

// ---------------------------------------------------------------------------
// Group 4: Level 2+ gate removal
// ---------------------------------------------------------------------------

describe('level 2+ gate removal: StateMeta.autonomy_level_pending', () => {
    /**
     * Phase B had a guard blocking level 2+ in the IPC handler.
     * Phase C removes it. We verify at the state layer: autonomy_level_pending can
     * be set to 2 or 3 and the apply-autonomy-transition logic promotes it to
     * autonomy_level without any guard.
     *
     * We simulate the transition inline (no pipeline needed).
     */
    function simulateAutonomyTransition(state: GameState): void {
        const meta = state.meta;
        if (meta.autonomy_level_pending !== undefined) {
            meta.autonomy_level = meta.autonomy_level_pending;
            meta.autonomy_level_pending = undefined;
        }
    }

    it('autonomy_level_pending=2 transitions to autonomy_level=2', () => {
        const state = {
            meta: { turn: 1, seed: 'test', phase: 'war', autonomy_level_pending: 2 as const },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        simulateAutonomyTransition(state);

        expect(state.meta.autonomy_level).toBe(2);
        expect(state.meta.autonomy_level_pending).toBeUndefined();
    });

    it('autonomy_level_pending=3 transitions to autonomy_level=3', () => {
        const state = {
            meta: { turn: 1, seed: 'test', phase: 'war', autonomy_level_pending: 3 as const },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        simulateAutonomyTransition(state);

        expect(state.meta.autonomy_level).toBe(3);
        expect(state.meta.autonomy_level_pending).toBeUndefined();
    });

    it('autonomy_level_pending=1 transitions to autonomy_level=1', () => {
        const state = {
            meta: { turn: 1, seed: 'test', phase: 'war', autonomy_level: 0 as const, autonomy_level_pending: 1 as const },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        simulateAutonomyTransition(state);

        expect(state.meta.autonomy_level).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Group 5: apply-autonomy-transition proposal expiry logic
// ---------------------------------------------------------------------------

describe('apply-autonomy-transition: proposal expiry', () => {
    /**
     * Simulate only the proposal-expiry logic from apply-autonomy-transition.
     */
    function applyExpiry(state: GameState): void {
        const meta = state.meta;
        if (meta.pending_proposal_reviews) {
            meta.pending_proposal_reviews = meta.pending_proposal_reviews.filter(
                p => !(p.turn < meta.turn && p.accepted === undefined)
            );
        }
    }

    it('discards unresolved proposals from a prior turn', () => {
        const state = {
            meta: {
                turn: 6,
                seed: 'test',
                pending_proposal_reviews: [
                    {
                        id: 'PROP_5_military_0',
                        turn: 5,            // prior turn
                        faction: 'RBiH' as FactionId,
                        domain: 'military' as const,
                        description: 'stale',
                        proposed_action: 'SET_STANCE:arbih_1st:offensive',
                        // accepted: undefined — unresolved
                    },
                ] as PendingProposalReview[],
            },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        applyExpiry(state);

        expect(state.meta.pending_proposal_reviews).toHaveLength(0);
    });

    it('keeps resolved proposals (accepted=true) from a prior turn', () => {
        const state = {
            meta: {
                turn: 6,
                seed: 'test',
                pending_proposal_reviews: [
                    {
                        id: 'PROP_5_military_0',
                        turn: 5,
                        faction: 'RBiH' as FactionId,
                        domain: 'military' as const,
                        description: 'accepted',
                        proposed_action: 'SET_STANCE:arbih_1st:offensive',
                        accepted: true,
                        resolved_turn: 5,
                    },
                ] as PendingProposalReview[],
            },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        applyExpiry(state);

        expect(state.meta.pending_proposal_reviews).toHaveLength(1);
    });

    it('keeps current-turn proposals (not yet expired)', () => {
        const state = {
            meta: {
                turn: 5,
                seed: 'test',
                pending_proposal_reviews: [
                    {
                        id: 'PROP_5_military_0',
                        turn: 5,           // same turn — not yet expired
                        faction: 'RBiH' as FactionId,
                        domain: 'military' as const,
                        description: 'current',
                        proposed_action: 'SET_STANCE:arbih_1st:offensive',
                        // accepted: undefined
                    },
                ] as PendingProposalReview[],
            },
            military: { formations: {}, corps_command: {} },
        } as unknown as GameState;

        applyExpiry(state);

        expect(state.meta.pending_proposal_reviews).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// Group 6: Level 3 event-routing regression guard
// ---------------------------------------------------------------------------

describe('level 3 event routing regression guard', () => {
    /**
     * Phase B established: at Level 3, events with requires_player_response:true
     * still route to the player (not auto-resolved). This test re-verifies the
     * data invariant without re-exercising the full evaluate_events.ts pipeline.
     *
     * The canonical test for this is in autonomy_event_routing.test.ts.
     * Here we verify the schema side: a PendingProposalReview with domain 'events'
     * can hold a requires_player_response event proposal correctly.
     */
    it('a pending event proposal at level 3 retains accepted:undefined until player acts', () => {
        const eventProposal: PendingProposalReview = {
            id: 'PROP_5_events_0',
            turn: 5,
            faction: 'RBiH' as FactionId,
            domain: 'events',
            description: 'High-stakes event requires player response.',
            proposed_action: 'EVENT:critical_ceasefire_proposal',
            // accepted intentionally absent — awaiting player
        };
        expect(eventProposal.accepted).toBeUndefined();
        expect(eventProposal.domain).toBe('events');
    });
});
