/**
 * LIVE-HIDDEN-SPLIT (rulings §53, lane B s34, 2026-11-27): every decision answer lands after the
 * primary firing pass, in firing order, in headless and in a hands-off live turn alike.
 *
 * Measured on main 1b11e639d (RBiH a2 historical compare, savediff of the final saves): the first
 * real live/headless split was at t54. srebrenica_demilitarization_1993 (answer hide_weapons: RBiH
 * morale -2) and un_resolution_819_srebrenica_1993 (base effect: RBiH morale +3) fire in one turn.
 * Headless the bot answered at fire time, between the base effects; live the player's card was
 * answered by silence after the whole pass. Morale clamps at 100, so a brigade at 100 ended the turn
 * at 100 headless and 98 live, and the gap fed force ratios, traits and later battles.
 *
 * Pins, through the real `update-event-readiness` and `evaluate-events` steps:
 *  1. a capped brigade ends the turn with the same morale headless and live (autonomy 0, 1, 2), with
 *     the answering card firing before and after the base-effect card;
 *  2. the event decision log has the same rows in the same order in both modes;
 *  3. the answer lands after every base effect of the pass (headless too): 100 + 3 clamped, then -2.
 *
 * Deterministic: no RNG (the step's rng throws), no wall clock.
 */
import { describe, expect, it } from 'vitest';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import type { EventDefinition } from '../../src/sim/events/event_types.js';
import type { TurnContext } from '../../src/sim/turn_pipeline_types.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';

const rng = () => { throw new Error('rng'); };
const readinessStep = warPhases.find((phase) => phase.name === 'update-event-readiness')!;
const step = warPhases.find((phase) => phase.name === 'evaluate-events')!;

async function runStep(state: GameState, defs: EventDefinition[]): Promise<void> {
    const context = {
        state,
        rng,
        input: { seed: 's', eventDefinitions: defs },
        report: { seed: 's', phases: [] },
    } as unknown as TurnContext;
    await readinessStep.run(context);
    await step.run(context);
}

function st(player: string | null, autonomy: number, morale: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 54, seed: 's', phase: 'war', ...(player ? { player_faction: player, autonomy_level: autonomy } : {}) },
        military: {
            formations: {
                b1: { id: 'b1', faction: 'RBiH', kind: 'brigade', status: 'active', morale },
            },
            fired_event_ids: [],
        },
        political: {},
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

/** The answering card (the demilitarization agreement's shape): its answer costs RBiH 2 morale. */
function answerCard(id: string): EventDefinition {
    return {
        id, trigger: { turn_min: 54, turn_max: 54, phase: 'war' }, once: true,
        effect: { kind: 'narrative', text: 'a' }, responding_faction: 'RBiH',
        historical_default_response_id: 'hide',
        response_options: [{ id: 'hide', label: 'h', effects: [{ kind: 'morale_change', faction: 'RBiH', delta: -2 }] }],
    } as unknown as EventDefinition;
}
/** The base-effect card (UN Resolution 819's shape): +3 RBiH morale at fire time. */
function baseCard(id: string): EventDefinition {
    return {
        id, trigger: { turn_min: 54, turn_max: 54, phase: 'war' }, once: true,
        effect: { kind: 'morale_change', faction: 'RBiH', delta: 3 },
    } as unknown as EventDefinition;
}

// Canonical order is by id at equal priority and turn: 'a_*' fires before 'z_*'.
const ORDERS: Array<[string, EventDefinition[]]> = [
    ['answer card fires first', [answerCard('a_answer'), baseCard('z_base')]],
    ['base card fires first', [baseCard('a_base'), answerCard('z_answer')]],
];

describe('LIVE-HIDDEN-SPLIT: decision answers land after the pass, in firing order, in both modes', () => {
    for (const [label, defs] of ORDERS) {
        for (const morale of [100, 99, 90]) {
            it(`${label}, morale ${morale}: hands-off live = headless at autonomy 0, 1, 2`, async () => {
                const headless = st(null, 0, morale);
                await runStep(headless, defs);
                const expected = Math.min(100, morale + 3) - 2;
                expect(headless.military.formations.b1!.morale).toBe(expected);
                for (const autonomy of [0, 1, 2]) {
                    const live = st('RBiH', autonomy, morale);
                    await runStep(live, defs);
                    expect(live.military.formations.b1!.morale).toBe(expected);
                    expect((live.military.pending_event_decisions ?? []).length).toBe(0);
                    const rows = (s: GameState) => (s.military.event_decision_log ?? [])
                        .map((r) => `${r.event_id}:${r.response_id}:${r.turn}`);
                    expect(rows(live)).toEqual(rows(headless));
                }
            });
        }
    }
});
