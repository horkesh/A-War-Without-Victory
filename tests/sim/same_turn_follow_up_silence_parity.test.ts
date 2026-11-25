/**
 * #865 r4693814641 — silence resolves BEFORE the same-turn follow-up snapshot.
 *
 * A bot answers its decision at fire time, so a `same_turn_requires_events` follow-up in headless
 * reads the answered flag. A live player's card is queued instead; silence (the staff default) used
 * to resolve after the whole `evaluate-events` step, so the follow-up read an UNANSWERED decision
 * and a hands-off live turn could fire a different follow-up from headless. The step now runs the
 * primary pass, settles this turn's player decisions (the pause, then silence), then the follow-up
 * snapshot. Pins:
 *  1. the s11 synthetic probe (coordination evidence/lanec_s11_20261125/lanec11_probes/
 *     same_turn_probe.test.ts), ported from its old call order to the real step: hands-off live =
 *     headless, with no pause hook and with a hook that answers nothing;
 *  2. the real HRHB t53 chain (hrhb_central_bosnia_defense_1993, then
 *     csq_hvo_april_1993_offensive_orders) from the shipped event data: hands-off live = headless at
 *     autonomy 0, 1 and 2 (fired ids and flags);
 *  3. an explicit answer at the pause is seen by the follow-up, as a bot's fire-time answer is.
 *
 * Deterministic: no RNG (the step's rng throws), no wall clock.
 */
import { describe, expect, it } from 'vitest';
import { warPhases } from '../../src/sim/turn_phases/war_phases.js';
import { loadEventDefinitions } from '../../src/sim/events/event_loader.js';
import { resolveEventDecision } from '../../src/sim/events/resolve_decision.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';
import type { TurnContext } from '../../src/sim/turn_pipeline_types.js';
import { CURRENT_SCHEMA_VERSION, type GameState } from '../../src/state/game_state.js';

const rng = () => { throw new Error('rng'); };
const readinessStep = warPhases.find((phase) => phase.name === 'update-event-readiness')!;
const step = warPhases.find((phase) => phase.name === 'evaluate-events')!;

type PauseHook = (state: GameState, decisions: PendingEventDecision[]) => Promise<void> | void;

/** The real `update-event-readiness` then `evaluate-events` steps, as the war pipeline runs them. */
async function runStep(state: GameState, defs: EventDefinition[], onPlayerDecisionsPending?: PauseHook): Promise<void> {
    const context = {
        state,
        rng,
        input: { seed: 's', eventDefinitions: defs, ...(onPlayerDecisionsPending ? { onPlayerDecisionsPending } : {}) },
        report: { seed: 's', phases: [] },
    } as unknown as TurnContext;
    await readinessStep.run(context);
    await step.run(context);
}

function st(turn: number, player: string | null, autonomy = 1, extra: { flags?: Record<string, unknown>; fired?: string[]; alliance?: number; enabled?: string[]; readiness?: Record<string, number> } = {}): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 's', phase: 'war', ...(player ? { player_faction: player, autonomy_level: autonomy } : {}) },
        military: {
            formations: {},
            fired_event_ids: [...(extra.fired ?? [])],
            ...(extra.flags ? { event_flags: { ...extra.flags } } : {}),
            ...(extra.enabled ? { enabled_event_ids: [...extra.enabled] } : {}),
            ...(extra.readiness ? { event_readiness: { ...extra.readiness } } : {}),
        },
        political: extra.alliance !== undefined ? { war_alliance_rbih_hrhb: extra.alliance } : {},
        factions: [],
        displacement: {},
    } as unknown as GameState;
}

const parent = {
    id: 'p_decision', trigger: { turn_min: 53, turn_max: 53, phase: 'war' }, once: true,
    effect: { kind: 'narrative', text: 'p' }, responding_faction: 'HRHB',
    response_options: [{ id: 'evacuate', label: 'e', effects: [], sets_flags: { cb: 'evacuate' } }],
} as unknown as EventDefinition;
const child = {
    id: 'c_follow', trigger: { turn_min: 53, turn_max: 53, phase: 'war', requires_events: ['p_decision'],
        condition: { type: 'not', condition: { type: 'flag_equals', flag: 'cb', value: 'evacuate' } } },
    effect: { kind: 'narrative', text: 'c' }, once: true, same_turn_requires_events: true,
} as unknown as EventDefinition;

describe('#865 r4693814641: hands-off live = headless for a same-turn follow-up', () => {
    it('the s11 probe: no pause hook', async () => {
        const headless = st(53, null);
        await runStep(headless, [parent, child]);
        const live = st(53, 'HRHB');
        await runStep(live, [parent, child]);
        expect(headless.military.fired_event_ids).toEqual(['p_decision']);
        expect(live.military.fired_event_ids).toEqual(headless.military.fired_event_ids);
        expect(live.military.event_flags).toEqual(headless.military.event_flags);
        expect(live.military.pending_event_decisions ?? []).toEqual([]);
    });

    it('the s11 probe: a pause hook that answers nothing (the desktop, hands-off)', async () => {
        const headless = st(53, null);
        await runStep(headless, [parent, child]);
        const live = st(53, 'HRHB');
        let calls = 0;
        await runStep(live, [parent, child], () => { calls += 1; });
        expect(calls).toBe(1);
        expect(live.military.fired_event_ids).toEqual(headless.military.fired_event_ids);
        expect(live.military.event_flags).toEqual(headless.military.event_flags);
    });
});

describe('#865 r4693814641: the real HRHB t53 chain', () => {
    const all = loadEventDefinitions(0);
    const chainIds = new Set(['croat_bosniak_war_begins_1993', 'hrhb_central_bosnia_defense_1993', 'csq_hvo_april_1993_offensive_orders']);
    const defs = all.filter((def) => chainIds.has(def.id));
    // The war begins and the card fires in the same turn, t53; the follow-up waits on the war's
    // same-turn receipt, so it runs in the follow-up snapshot, after the card is settled.
    const chainState = (player: string | null, autonomy = 1) => st(53, player, autonomy, {
        flags: { hrhb_political_goal: 'croat_republic' },
        alliance: 0.05,
        enabled: ['hrhb_central_bosnia_defense_1993'],
        // The war's pressure has built to its threshold (5) by t53.
        readiness: { croat_bosniak_war_begins_1993: 5 },
    });

    it('loads both rows, the follow-up opted in', () => {
        expect(defs.map((def) => def.id).sort()).toEqual(['croat_bosniak_war_begins_1993', 'csq_hvo_april_1993_offensive_orders', 'hrhb_central_bosnia_defense_1993']);
        expect(defs.find((def) => def.id === 'csq_hvo_april_1993_offensive_orders')!.same_turn_requires_events).toBe(true);
    });

    for (const autonomy of [0, 1, 2]) {
        it(`hands-off live HRHB = headless at autonomy ${autonomy}`, async () => {
            const headless = chainState(null);
            await runStep(headless, defs);
            expect(headless.military.fired_event_ids).toEqual(['croat_bosniak_war_begins_1993', 'hrhb_central_bosnia_defense_1993', 'csq_hvo_april_1993_offensive_orders']);
            const live = chainState('HRHB', autonomy);
            await runStep(live, defs, () => undefined);
            expect(live.military.fired_event_ids).toEqual(headless.military.fired_event_ids);
            expect(live.military.event_flags).toEqual(headless.military.event_flags);
        });
    }

    it('an explicit "evacuate" at the pause is seen by the follow-up, as a bot\'s answer would be', async () => {
        const live = chainState('HRHB', 1);
        await runStep(live, defs, (working, decisions) => {
            const card = decisions.find((d) => d.event_id === 'hrhb_central_bosnia_defense_1993')!;
            resolveEventDecision(working, card.event_id, 'evacuate_to_herzegovina');
        });
        expect(live.military.event_flags?.hrhb_central_bosnia_defense).toBe('evacuate');
        expect(live.military.fired_event_ids).toContain('hrhb_central_bosnia_defense_1993');
        expect(live.military.fired_event_ids).not.toContain('csq_hvo_april_1993_offensive_orders');
    });
});
