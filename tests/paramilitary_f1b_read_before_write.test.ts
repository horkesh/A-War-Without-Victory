/**
 * §6 D1 stage 2, F1-B, the game-designer's "read before write" condition: at both automatic entry points (Observer at fire
 * time, and the Observer drain) the selector reads `hasInPersonParamilitaryStandingOrder` before any flag, effect or shift
 * of that answer is written. In the drain that means through an option chosen up front, not a check made after
 * `applyAIDefaultResponse` has applied the historical default.
 *
 * The predicate is wrapped (the real function still answers) so each call records what the card's answer had written so far.
 */

import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as { policyFlag: unknown; refused: unknown; authorized: unknown; standing: number; logged: number }[]);

vi.mock('../src/sim/events/paramilitary_policy_flag.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../src/sim/events/paramilitary_policy_flag.js')>();
    return {
        ...actual,
        hasInPersonParamilitaryStandingOrder: (state: any, faction: any) => {
            calls.push({
                policyFlag: state.military?.event_flags?.rbih_paramilitary_policy,
                refused: state.military?.event_flags?.rbih_paramilitary_refused,
                authorized: state.military?.event_flags?.rbih_paramilitary_authorized,
                standing: state.military?.negotiation?.strategic_dimensions?.RBiH?.international_standing?.event_modifier ?? 0,
                logged: (state.military?.event_decision_log ?? [])
                    .filter((entry: any) => entry.event_id === 'rbih_paramilitary_policy_1992').length,
            });
            return actual.hasInPersonParamilitaryStandingOrder(state, faction);
        },
    };
});

import type { FactionState, GameState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

const CATALOG = loadEventDefinitions(0);
const CARD_ID = 'rbih_paramilitary_policy_1992';
const CARD = CATALOG.find((def) => def.id === CARD_ID)!;

/** An RBiH human (synthetic state) who gave Always allow in the review modal at t1; the card is enabled for t3. */
function rbihInPersonAllow(): GameState {
    return {
        meta: {
            turn: 3, phase: 'war', schema_version: 1, seed: 'f1b-read-before-write',
            player_faction: 'RBiH', autonomy_level: 0, headless_scenario_auto_control: false,
        } as GameState['meta'],
        factions: [{ id: 'HRHB' } as FactionState, { id: 'RBiH' } as FactionState, { id: 'RS' } as FactionState],
        paramilitary_policy: 'always_allow',
        paramilitary_decision_history: [
            { id: 'paramilitary:1:op:testmun:pocket_a', turn: 1, target_osid: 'op:testmun:pocket_a', faction: 'RBiH', strength: 150, decision: 'allow' },
        ],
        military: {
            formations: {},
            casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
            fired_event_ids: [],
            event_flags: { rbih_state_identity: 'civic' },
            enabled_event_ids: [CARD_ID],
            pending_event_decisions: [],
            negotiation: { strategic_dimensions: initializeStrategicDimensions() },
        } as any,
        political: { political_controllers: {}, municipalities: {} } as any,
    } as unknown as GameState;
}

const noRng = () => 0;

/** The first predicate call during the card's automatic answer saw nothing of that answer written. */
function expectFirstReadBeforeAnyWrite(): void {
    expect(calls.length).toBeGreaterThan(0);
    expect(calls[0]).toEqual({ policyFlag: undefined, refused: undefined, authorized: undefined, standing: 0, logged: 0 });
}

describe('§6 D1 stage 2 F1-B: the in-person check is read before the answer writes anything', () => {
    it('fire time: Observer reads the in-person order before the card\'s answer is applied', () => {
        const state = rbihInPersonAllow();
        state.meta.autonomy_level = 3;
        calls.length = 0;
        evaluateEvents(state, noRng, 3, [CARD]);
        expectFirstReadBeforeAnyWrite();
        expect(state.military.event_decision_log).toEqual([
            expect.objectContaining({ event_id: CARD_ID, response_id: 'always_allow', decision_source: 'bot_ai_default' }),
        ]);
    });

    it('drain: Observer reads the in-person order before the queued card\'s answer is applied', () => {
        const state = rbihInPersonAllow();
        evaluateEvents(state, noRng, 3, [CARD]);
        expect((state.military.pending_event_decisions ?? []).map((pending) => pending.event_id)).toEqual([CARD_ID]);
        state.meta.turn = 4;
        state.meta.autonomy_level = 3;
        calls.length = 0;
        evaluateEvents(state, noRng, 4, [CARD]);
        expectFirstReadBeforeAnyWrite();
        expect(state.military.event_decision_log).toEqual([
            expect.objectContaining({ event_id: CARD_ID, response_id: 'always_allow', decision_source: 'bot_ai_default' }),
        ]);
    });
});
