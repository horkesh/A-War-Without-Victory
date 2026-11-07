/**
 * PAUSE BEFORE COMBAT (owner decision, 2026-11-05) — `TurnInput.onPlayerDecisionsPending`.
 *
 * A bot answers its decision events inside `evaluate-events`, so the response lands before
 * that turn's movement and combat. A player decision is queued instead; without a pause the
 * human answers between turns and the effects land one turn late. The hook pauses right
 * after `evaluate-events` so the human can answer in-turn.
 *
 * Pins:
 *  1. no callback ⇒ the pipeline is unchanged (and a callback with nothing to answer is inert);
 *  2. the callback runs exactly once per turn, with only the decisions fired THIS turn;
 *  3. answering in the pause gives the bot's in-turn result for the same response (the only
 *     difference is the decision-source label and the player-faction marker);
 *  4. the pause sits before the movement/combat steps.
 *
 * Deterministic: synthetic catalog, no Math.random, no wall clock.
 */
import { describe, expect, it } from 'vitest';

import { runTurn, PLAYER_DECISION_PAUSE_STEP } from '../../src/sim/turn_pipeline.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import {
    resolveDesktopEventDecision,
    resolveDesktopEventDecisionInPlace,
} from '../../src/desktop/desktop_sim.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';

const DECISION_EVENT: EventDefinition = {
    id: 'pause_test_decision',
    once: true,
    priority: 1,
    effect: { kind: 'narrative', text: 'A decision arrives.' },
    trigger: { type: 'turn_gte', value: 1 },
    responding_faction: 'RBiH',
    historical_default_response_id: 'hold',
    bot_response_logic: 'historical',
    response_options: [
        {
            id: 'hold',
            label: 'Hold',
            effects: [],
            sets_flags: { pause_test_answered: 'hold' },
            dimension_shifts: [{ faction: 'RBiH', dimension: 'internal_cohesion', delta: 3 }],
        },
        {
            id: 'yield',
            label: 'Yield',
            effects: [],
            sets_flags: { pause_test_answered: 'yield' },
        },
    ],
} as unknown as EventDefinition;

function baseState(meta: Record<string, unknown> = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 0,
            seed: 'pause-test',
            phase: 'war',
            referendum_held: true,
            referendum_turn: 0,
            war_start_turn: 0,
            decision_mode: 'historical',
            ...meta,
        },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            pending_event_decisions: [],
        } as any,
        political: {} as any,
        displacement: {} as any,
    } as GameState;
}

const PLAYER_META = { player_faction: 'RBiH', autonomy_level: 0 };
const input = { seed: 'pause-test', eventDefinitions: [DECISION_EVENT], settlementEdges: [] };

/**
 * Remove what legitimately differs between a player run and a no-player run: the player
 * markers themselves, the player's staff briefing (written only when a player exists), and
 * the decision-source label ('player' vs 'bot_ai_default').
 */
function withoutDecisionProvenance(state: GameState): unknown {
    const copy = structuredClone(state) as any;
    delete copy.meta.player_faction;
    delete copy.meta.autonomy_level;
    delete copy.military.last_briefing;
    for (const row of copy.military.event_decision_log ?? []) delete row.decision_source;
    return copy;
}

describe('turn pipeline — pause before combat for player decisions', () => {
    it('leaves the pipeline unchanged without a callback, and an unused callback is inert', async () => {
        const without = await runTurn(baseState(PLAYER_META), input);
        let calls = 0;
        const withInert = await runTurn(baseState(PLAYER_META), {
            ...input,
            onPlayerDecisionsPending: () => { calls += 1; },
        });
        expect(calls).toBe(1);
        expect(withInert.nextState).toEqual(without.nextState);
        expect(withInert.report).toEqual(without.report);
        // Without an answer the decision stays pending, exactly as before.
        expect(without.nextState.military.pending_event_decisions?.map((d) => d.event_id))
            .toEqual(['pause_test_decision']);

        // No player ⇒ the bot answers in-turn and nothing is ever paused.
        let headlessCalls = 0;
        const headless = await runTurn(baseState(), {
            ...input,
            onPlayerDecisionsPending: () => { headlessCalls += 1; },
        });
        const headlessWithout = await runTurn(baseState(), input);
        expect(headlessCalls).toBe(0);
        expect(headless.nextState).toEqual(headlessWithout.nextState);
    });

    it('runs once per turn with only the decisions fired this turn', async () => {
        const state = baseState(PLAYER_META);
        const stale: PendingEventDecision = {
            event_id: 'older_unanswered_decision',
            event_title: 'Older',
            turn_fired: 0,
            response_options: [{ id: 'x', label: 'X', effects: [] } as any],
            faction: 'RBiH',
        };
        state.military.pending_event_decisions = [stale];
        const seen: Array<{ turn: number; ids: string[] }> = [];
        let current = state;
        for (let i = 0; i < 2; i += 1) {
            const result = await runTurn(current, {
                ...input,
                onPlayerDecisionsPending: (working, decisions) => {
                    seen.push({ turn: working.meta.turn, ids: decisions.map((d) => d.event_id) });
                },
            });
            current = result.nextState;
        }
        // Turn 1 fires the once-only event (the older pending decision is not offered again);
        // turn 2 fires nothing ⇒ no pause.
        expect(seen).toEqual([{ turn: 1, ids: ['pause_test_decision'] }]);
        expect(current.military.pending_event_decisions?.map((d) => d.event_id).sort())
            .toEqual(['older_unanswered_decision', 'pause_test_decision']);
    });

    it('answering in the pause equals the bot answering in-turn', async () => {
        const bot = await runTurn(baseState(), input);
        expect(bot.nextState.military.event_flags?.pause_test_answered).toBe('hold');

        const player = await runTurn(baseState(PLAYER_META), {
            ...input,
            onPlayerDecisionsPending: (working, decisions) => {
                for (const decision of decisions) resolveEventDecision(working, decision.event_id, 'hold');
            },
        });
        expect(player.nextState.military.pending_event_decisions).toEqual([]);
        expect(player.nextState.military.event_decision_log?.map((row) => row.decision_source)).toEqual(['player']);
        expect(bot.nextState.military.event_decision_log?.map((row) => row.decision_source)).toEqual(['bot_ai_default']);
        expect(withoutDecisionProvenance(player.nextState)).toEqual(withoutDecisionProvenance(bot.nextState));

        // Answered between turns instead, the same response arrives a turn late: this turn ran without it.
        const late = await runTurn(baseState(PLAYER_META), input);
        expect(late.nextState.military.event_flags?.pause_test_answered).toBeUndefined();
    });

    it('the desktop in-place resolver writes the desktop resolution into the same object', async () => {
        const queued = (await runTurn(baseState(PLAYER_META), input)).nextState;
        const expected = resolveDesktopEventDecision(queued, 'pause_test_decision', 'yield', process.cwd());
        const target = structuredClone(queued);
        const identity = target;
        resolveDesktopEventDecisionInPlace(target, 'pause_test_decision', 'yield', process.cwd());
        expect(target).toBe(identity);
        expect(target).toEqual(expected);
        expect(Object.keys(target)).toEqual(Object.keys(expected));
        // A refused answer leaves the target untouched.
        const before = structuredClone(target);
        expect(() => resolveDesktopEventDecisionInPlace(target, 'pause_test_decision', 'yield', process.cwd())).toThrow();
        expect(target).toEqual(before);
    });

    it('a desktop answer given in the pause lands before this turn finishes', async () => {
        const result = await runTurn(baseState(PLAYER_META), {
            ...input,
            onPlayerDecisionsPending: (working, decisions) => {
                for (const decision of decisions) {
                    resolveDesktopEventDecisionInPlace(working, decision.event_id, 'yield', process.cwd());
                }
            },
        });
        expect(result.nextState.military.event_flags?.pause_test_answered).toBe('yield');
        expect(result.nextState.military.pending_event_decisions).toEqual([]);
    });

    it('pauses after evaluate-events and before movement and combat', async () => {
        const names = warPhases.map((step) => step.name);
        const pauseIndex = names.indexOf(PLAYER_DECISION_PAUSE_STEP);
        expect(pauseIndex).toBeGreaterThan(-1);
        for (const later of [
            'osid-column-movement',
            'apply-brigade-movement',
            'process-brigade-movement',
            'resolve-attack-orders',
        ]) {
            expect(names.indexOf(later), later).toBeGreaterThan(pauseIndex);
        }

        // The pause is inside the turn: the working state already carries the new turn number,
        // and the step list of the report is the ordinary one (no extra or missing phase).
        let turnAtPause: number | null = null;
        const paused = await runTurn(baseState(PLAYER_META), {
            ...input,
            onPlayerDecisionsPending: (working) => { turnAtPause = working.meta.turn; },
        });
        const plain = await runTurn(baseState(PLAYER_META), input);
        expect(turnAtPause).toBe(1);
        expect(paused.report.phases).toEqual(plain.report.phases);
    });
});
