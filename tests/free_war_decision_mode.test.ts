/**
 * Free War Phase 0 — decision_mode de-railroad behavioral test.
 *
 * Proves the keystone of the Free War model:
 *  - decision_mode === 'emergent' bypasses the historical-default railroad and
 *    routes the bot auto-response through the live political scorer
 *    (pickPoliticalResponse), so the bot can pick a NON-historical option when
 *    battlefield/political signals favor it.
 *  - decision_mode unset / 'historical' keeps the railroad independently of
 *    notification delivery: applyAIDefaultResponse selects the
 *    historical_default_response_id, byte-identical to today.
 *  - Emergent decisions are deterministic: same state → same choice twice.
 *
 * The event is a `strategic_weighted` (POLITICAL_LOGICS) RS decision whose
 * NON-historical option carries a positive territorial_legitimacy dimension
 * shift (RS weights territorial_legitimacy 0.30 — its highest), while the
 * historical default carries a negative one. The political scorer therefore
 * strictly prefers the non-historical option; the railroad always returns the
 * historical default. No tie-break dependence: the scores differ by design.
 */

import assert from 'node:assert';
import { test } from 'vitest';
import { evaluateEvents } from '../src/sim/events/evaluate_events.js';
import type { EventDefinition, Rng } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

/** Deterministic no-op RNG: this path never consults it (no `probability`). */
const rng: Rng = () => 0.5;

const HISTORICAL_DEFAULT_ID = 'hold_line';
const SIGNAL_DRIVEN_ID = 'seize_corridor';

/**
 * RS strategic_weighted decision event.
 * - hold_line (historical default): NEGATIVE territorial_legitimacy → low score.
 * - seize_corridor (counterfactual): POSITIVE territorial_legitimacy → high score.
 * RS personality weights territorial_legitimacy at 0.30 (its max), so the
 * political scorer strictly prefers seize_corridor over hold_line.
 */
function rsDecisionEvent(): EventDefinition {
    return {
        id: 'free_war_test_event',
        trigger: { phase: 'war' },
        effect: { kind: 'narrative', text: 'RS corridor decision.' },
        once: true,
        responding_faction: 'RS',
        bot_response_logic: 'strategic_weighted',
        historical_default_response_id: HISTORICAL_DEFAULT_ID,
        response_options: [
            {
                id: HISTORICAL_DEFAULT_ID,
                label: 'Hold the line',
                historical_marker: 'historical_default',
                effects: [],
                dimension_shifts: [
                    { faction: 'RS', dimension: 'territorial_legitimacy', delta: -8 },
                ],
            },
            {
                id: SIGNAL_DRIVEN_ID,
                label: 'Seize the corridor',
                historical_marker: 'counterfactual',
                effects: [],
                dimension_shifts: [
                    { faction: 'RS', dimension: 'territorial_legitimacy', delta: +8 },
                ],
            },
        ],
    } as EventDefinition;
}

/** Same RS corridor decision but with bot_response_logic 'historical' — the most
 *  common authored logic (55/73 events). Pre-Phase-0.5 this routed to
 *  pickBotResponseV1, which hard-returns the historical default with no scoring;
 *  Phase 0.5 routes ALL faction events through the political scorer in emergent. */
function rsHistoricalLogicEvent(): EventDefinition {
    return { ...rsDecisionEvent(), bot_response_logic: 'historical' } as EventDefinition;
}

/**
 * Minimal war-phase state. player_faction is RBiH so the RS event is NOT a
 * player-respondent → it flows through the bot auto-respond branch (the
 * de-railroad chokepoint).
 */
function rsBotState(decisionMode?: 'historical' | 'emergent'): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 10,
            seed: 'free-war-test-seed',
            phase: 'war',
            player_faction: 'RBiH',
            ...(decisionMode ? { decision_mode: decisionMode } : {}),
        },
        military: { formations: {}, fired_event_ids: [] },
        political: {},
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

/** Returns the bot's chosen response id for the test event from the decision log. */
function chosenResponseId(state: GameState): string | undefined {
    const log = state.military.event_decision_log ?? [];
    return log.find((e) => e.event_id === 'free_war_test_event')?.response_id;
}

/** Returns the decision source recorded for the test event. */
function decisionSource(state: GameState): string | undefined {
    const log = state.military.event_decision_log ?? [];
    return log.find((e) => e.event_id === 'free_war_test_event')?.decision_source;
}

test('emergent mode bypasses the railroad → bot picks the signal-driven (non-historical) option', () => {
    const state = rsBotState('emergent');
    evaluateEvents(state, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(
        chosenResponseId(state),
        SIGNAL_DRIVEN_ID,
        'emergent bot should pick the political-scorer-favored option, not the historical default',
    );
    assert.strictEqual(decisionSource(state), 'bot_political', 'emergent strategic_weighted → political scorer');
});

test('historical mode keeps the railroad → bot picks the historical default', () => {
    const state = rsBotState('historical');
    evaluateEvents(state, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(
        chosenResponseId(state),
        HISTORICAL_DEFAULT_ID,
        'historical bot should replay the historical default via applyAIDefaultResponse',
    );
    assert.strictEqual(decisionSource(state), 'bot_ai_default', 'historical → AI default railroad');
});

test('unset decision_mode behaves as historical (byte-identical-to-today default)', () => {
    const state = rsBotState(undefined);
    evaluateEvents(state, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(chosenResponseId(state), HISTORICAL_DEFAULT_ID, 'unset = historical default');
    assert.strictEqual(decisionSource(state), 'bot_ai_default', 'unset → AI default railroad');
});

test('explicit historical honors the authored default independently of notification delivery', () => {
    const state = rsBotState('historical');
    evaluateEvents(state, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(
        chosenResponseId(state),
        HISTORICAL_DEFAULT_ID,
        'explicit historical must replay the authored historical default',
    );
    assert.strictEqual(decisionSource(state), 'bot_ai_default');
});

test('unset mode remains the migrated historical default', () => {
    const state = rsBotState(undefined);
    evaluateEvents(state, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(decisionSource(state), 'bot_ai_default', 'unset migrates to historical policy');
    assert.strictEqual(chosenResponseId(state), HISTORICAL_DEFAULT_ID);
});

test('emergent decisions are deterministic: same state → same choice twice', () => {
    const a = rsBotState('emergent');
    const b = rsBotState('emergent');
    evaluateEvents(a, rng, 10, [rsDecisionEvent()]);
    evaluateEvents(b, rng, 10, [rsDecisionEvent()]);
    assert.strictEqual(chosenResponseId(a), chosenResponseId(b), 'emergent argmax must be deterministic');
    assert.strictEqual(chosenResponseId(a), SIGNAL_DRIVEN_ID);
});

test('Phase 0.5: a `historical`-logic event DIVERGES in emergent (routed to the political scorer, not the v1 railroad)', () => {
    const state = rsBotState('emergent');
    evaluateEvents(state, rng, 10, [rsHistoricalLogicEvent()]);
    assert.strictEqual(decisionSource(state), 'bot_political', 'emergent routes ALL faction events to the political scorer');
    assert.strictEqual(
        chosenResponseId(state),
        SIGNAL_DRIVEN_ID,
        'the scorer picks the signal-driven option — a `historical`-logic event is no longer hard-railroaded',
    );
});

test('Phase 0.5: a `historical`-logic event still replays the default in historical mode (byte-identical)', () => {
    const state = rsBotState('historical');
    evaluateEvents(state, rng, 10, [rsHistoricalLogicEvent()]);
    assert.strictEqual(decisionSource(state), 'bot_ai_default', 'historical keeps the railroad — unchanged');
    assert.strictEqual(chosenResponseId(state), HISTORICAL_DEFAULT_ID);
});
