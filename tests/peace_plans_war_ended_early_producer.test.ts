/**
 * LANE-2026-05-02-D1-WAR-ENDED-EARLY-PRODUCER — Test contract.
 *
 * Asserts that when all factions accept a peace plan, `resolvePeacePlan`
 * sets BOTH the direct termination signal (`meta.game_over` + `meta.outcome`)
 * AND the `war_ended_early` / `early_peace_implemented` event flags that
 * `src/sim/war_termination.ts:62` reads.
 *
 * Background: Mission D#1 finding (per /technical-architect endgame audit).
 * `flags.war_ended_early` was a phantom branch — the `war_termination`
 * check read it but no production code path ever wrote it. This lane wires
 * the producer at the only place an "early peace plan implementation"
 * actually happens: `resolvePeacePlan` after all factions accept.
 *
 * Scope guard: ONLY tests the flag-write side-effect. Does not test the
 * downstream `war_termination` consumer (already covered by
 * `tests/war_termination.test.ts:228`). Does not test rejection-path
 * negative case (no flag should be set).
 *
 * Determinism: pure synchronous assertions. No I/O, no async, no random.
 */

import { describe, it, expect } from 'vitest';
import { resolvePeacePlan } from '../src/sim/negotiation/peace_plans.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { GameState } from '../src/state/game_state.js';

function emptyCapital() {
    return {
        political_capital: 50,
        peace_plans_accepted: [],
        peace_plans_rejected: [],
    } as any;
}

function emptyPatron() {
    return {
        override_authority: 0,
        support_level: 50,
        relationship_events: [],
    } as any;
}

function makeState(): GameState {
    const negotiation = {
        capital: { RBiH: emptyCapital(), RS: emptyCapital(), HRHB: emptyCapital() },
        patron_relationships: { RBiH: emptyPatron(), RS: emptyPatron(), HRHB: emptyPatron() },
        peace_plan_history: [],
        strategic_dimensions: { RBiH: {}, RS: {}, HRHB: {} },
    } as any;
    const state = {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 50,
            phase: 'war',
            seed: 'd1-test',
            player_faction: 'RBiH',
            game_over: false,
        } as any,
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            negotiation,
        } as any,
        political: { political_controllers: {} } as any,
    } as unknown as GameState;
    return state;
}

/** Find any peace plan id we can use for the test fixture. */
function getFirstPeacePlanId(): string {
    // Test against the canonical Vance-Owen plan id which is documented
    // in PEACE_PLANS. If catalog evolves, this single id reference can
    // be updated; the contract stays the same.
    return 'vance_owen';
}

describe('LANE-D1 war_ended_early producer', () => {
    it('sets war_ended_early + early_peace_implemented event flags when all factions accept', () => {
        const state = makeState();
        const planId = getFirstPeacePlanId();
        const neg = state.military.negotiation!;
        // Stub a pending plan that all factions will accept.
        (neg as any).pending_peace_plan = {
            plan_id: planId,
            turn_offered: 50,
            bot_responses: { RS: 'accepted', HRHB: 'accepted' },
        };

        const result = resolvePeacePlan(state, planId, 'accepted');
        expect(result.all_accepted).toBe(true);
        expect(result.rejection_factions).toEqual([]);

        // Direct termination signal — pre-existing behavior (regression guard).
        expect(state.meta.game_over).toBe(true);
        expect(state.meta.outcome).toBe(`peace_plan:${planId}`);

        // LANE-D1 producer: war_ended_early flag is now set.
        expect(state.military.event_flags).toBeDefined();
        expect(state.military.event_flags!.war_ended_early).toBe(true);
        expect(state.military.event_flags!.early_peace_implemented).toBe(planId);
    });

    it('does NOT set war_ended_early when any faction rejects', () => {
        const state = makeState();
        const planId = getFirstPeacePlanId();
        const neg = state.military.negotiation!;
        (neg as any).pending_peace_plan = {
            plan_id: planId,
            turn_offered: 50,
            bot_responses: { RS: 'rejected', HRHB: 'accepted' },
        };

        const result = resolvePeacePlan(state, planId, 'accepted');
        expect(result.all_accepted).toBe(false);

        // No game-over flags should fire.
        expect(state.meta.game_over).toBeFalsy();
        if (state.military.event_flags) {
            expect(state.military.event_flags.war_ended_early).toBeUndefined();
            expect(state.military.event_flags.early_peace_implemented).toBeUndefined();
        }
    });
});
