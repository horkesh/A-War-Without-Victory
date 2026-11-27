/**
 * PAUSE-ANSWER-ORDER (rulings §58.2, §69, lane B s36, 2026-11-27): an answer the President gives in
 * person at the PAUSE BEFORE COMBAT lands its effect in the settle step, at its card's slot in
 * firing order, like every other answer (#905's principle extended to in-person answers).
 *
 * Measured on main da0f06a2c (PARITY-EMER sweep pe2, final checker 90ed9fcc8): HRHB a0, a1, a2 and
 * production differed from headless only in the order of two `military.event_aggression_modifiers`
 * rows (an RBiH -0.1 and an HRHB +0.05 from one turn). The bot_equivalent harness answers HRHB's
 * card in person at the pause, so that answer's effect was appended before the settle-slot answer
 * of a card that fired earlier. The order of an effects array is state, and with a clamped value the
 * same order change is a value split (the #905 class).
 *
 * Pins, through the real `update-event-readiness` and `evaluate-events` steps, with a pause hook
 * that answers the player's card in person exactly as the bot does:
 *  1. the effects array has the headless order, whichever card fires first (autonomy 0, 1, 2);
 *  2. a clamped value ends the turn at the headless value;
 *  3. the decision log has the same rows as headless, the player's row in the bot row's place;
 *  4. the hook sees its own answer's effect at once (the paused screen is unchanged), and the card
 *     leaves the pending queue;
 *  5. the answer lands through the resolver the caller names (`resolvePausedDecision`), so the
 *     desktop's own resolver applies it on the working state.
 *
 * Deterministic: no RNG (the step's rng throws), no wall clock.
 */
import { describe, expect, it } from 'vitest';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';
import type { TurnContext, TurnInput } from '../../src/sim/turn_pipeline_types.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';

const rng = () => { throw new Error('rng'); };
const readinessStep = warPhases.find((phase) => phase.name === 'update-event-readiness')!;
const step = warPhases.find((phase) => phase.name === 'evaluate-events')!;

async function runStep(state: GameState, defs: EventDefinition[], extra: Partial<TurnInput> = {}): Promise<void> {
    const context = {
        state,
        rng,
        input: { seed: 's', eventDefinitions: defs, ...extra },
        report: { seed: 's', phases: [] },
    } as unknown as TurnContext;
    await readinessStep.run(context);
    await step.run(context);
}

function st(player: string | null, autonomy: number, morale: number): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 94, seed: 's', phase: 'war', ...(player ? { player_faction: player, autonomy_level: autonomy } : {}) },
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

/** HRHB's card (the player's when HRHB is live): its answer raises HRHB aggression and costs RBiH 3 morale... */
function hrhbCard(id: string): EventDefinition {
    return {
        id, trigger: { turn_min: 94, turn_max: 94, phase: 'war' }, once: true,
        effect: { kind: 'narrative', text: 'h' }, responding_faction: 'HRHB',
        historical_default_response_id: 'press',
        response_options: [{ id: 'press', label: 'p', effects: [
            { kind: 'aggression_modifier', faction: 'HRHB', delta: 0.05, duration_turns: 6 },
            { kind: 'morale_change', faction: 'RBiH', delta: 3 },
        ] }],
    } as unknown as EventDefinition;
}
/** ...and RBiH's card (always a bot's here): its answer lowers RBiH aggression and costs RBiH 2 morale. */
function rbihCard(id: string): EventDefinition {
    return {
        id, trigger: { turn_min: 94, turn_max: 94, phase: 'war' }, once: true,
        effect: { kind: 'narrative', text: 'r' }, responding_faction: 'RBiH',
        historical_default_response_id: 'hold',
        response_options: [{ id: 'hold', label: 'h', effects: [
            { kind: 'aggression_modifier', faction: 'RBiH', delta: -0.1, duration_turns: 12 },
            { kind: 'morale_change', faction: 'RBiH', delta: -2 },
        ] }],
    } as unknown as EventDefinition;
}

// Canonical order is by id at equal priority and turn: 'a_*' fires before 'z_*'.
const ORDERS: Array<[string, EventDefinition[]]> = [
    ["the bot's card fires first", [rbihCard('a_rbih'), hrhbCard('z_hrhb')]],
    ["the player's card fires first", [hrhbCard('a_hrhb'), rbihCard('z_rbih')]],
];

const mods = (s: GameState) => (s.military.event_aggression_modifiers ?? [])
    .map((m) => `${m.faction}:${m.delta}:${m.expires_turn}`);
const rows = (s: GameState) => (s.military.event_decision_log ?? [])
    .map((r) => `${r.event_id}:${r.response_id}:${r.turn}`);

/** The pause as the bot_equivalent harness answers it: the player's own cards, in person, the bot's answer. */
function inPersonHook(seen: { effectVisible: boolean[]; pendingAfter: number[] }): TurnInput['onPlayerDecisionsPending'] {
    return (working: GameState, decisions: PendingEventDecision[]) => {
        for (const decision of decisions.filter((d) => d.faction === 'HRHB')) {
            resolveEventDecision(working, decision.event_id, decision.historical_default_response_id!);
            seen.effectVisible.push(mods(working).some((m) => m.startsWith('HRHB:0.05')));
            seen.pendingAfter.push((working.military.pending_event_decisions ?? [])
                .filter((d) => d.event_id === decision.event_id).length);
        }
    };
}

describe('PAUSE-ANSWER-ORDER: an in-person pause answer lands at its slot in firing order', () => {
    for (const [label, defs] of ORDERS) {
        for (const morale of [99, 90]) {
            it(`${label}, morale ${morale}: answered in person at the pause = headless at autonomy 0, 1, 2`, async () => {
                const headless = st(null, 0, morale);
                await runStep(headless, defs);
                for (const autonomy of [0, 1, 2]) {
                    const live = st('HRHB', autonomy, morale);
                    const seen = { effectVisible: [] as boolean[], pendingAfter: [] as number[] };
                    await runStep(live, defs, { onPlayerDecisionsPending: inPersonHook(seen) });
                    // The pause really answered in person: one card, its effect visible to the hook at once.
                    expect(seen.effectVisible).toEqual([true]);
                    expect(seen.pendingAfter).toEqual([0]);
                    expect(mods(live)).toEqual(mods(headless));
                    expect(live.military.formations.b1!.morale).toBe(headless.military.formations.b1!.morale);
                    expect(rows(live)).toEqual(rows(headless));
                    const playerRows = (live.military.event_decision_log ?? []).filter((r) => r.decision_source === 'player');
                    expect(playerRows.map((r) => r.faction)).toEqual(['HRHB']);
                    expect((live.military.pending_event_decisions ?? []).length).toBe(0);
                }
            });
        }
    }

    it('the clamp case that #905 could not see: the bot card first, morale 99 ends at the headless 100', async () => {
        const defs = ORDERS[0]![1];
        const headless = st(null, 0, 99);
        await runStep(headless, defs);
        // Headless, in firing order: 99 - 2 = 97, then + 3 = 100.
        expect(headless.military.formations.b1!.morale).toBe(100);
        const live = st('HRHB', 0, 99);
        await runStep(live, defs, { onPlayerDecisionsPending: inPersonHook({ effectVisible: [], pendingAfter: [] }) });
        // Landing at the pause gave 99 + 3 = 100 (clamped), then - 2 = 98.
        expect(live.military.formations.b1!.morale).toBe(100);
    });

    it('the answer lands through the resolver the caller names', async () => {
        const defs = ORDERS[0]![1];
        const calls: string[] = [];
        const live = st('HRHB', 1, 90);
        await runStep(live, defs, {
            onPlayerDecisionsPending: inPersonHook({ effectVisible: [], pendingAfter: [] }),
            resolvePausedDecision: (state: GameState, eventId: string, responseId: string) => {
                calls.push(`${eventId}:${responseId}:${mods(state).length}`);
                resolveEventDecision(state, eventId, responseId);
            },
        });
        // At the player's slot, after the bot card's answer (one modifier already on the state).
        expect(calls).toEqual(['z_hrhb:press:1']);
        const headless = st(null, 0, 90);
        await runStep(headless, defs);
        expect(mods(live)).toEqual(mods(headless));
    });
});
