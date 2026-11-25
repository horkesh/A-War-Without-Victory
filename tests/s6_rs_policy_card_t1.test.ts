/**
 * §6 D1 stage 2, round 4a fix (b), 2026-11-22: the RS paramilitary-policy card fires in the war's first week (t1),
 * right after the RS strategic-goals card, in both modes, and no longer waits on the goals answer.
 *
 * Why: live RS parity. Headless RS swept its t1 pair under the card's historical default while the card was still
 * unfired, but a human RS side (ruling A1) sends nothing before its own card applies, so the player branch swept one
 * turn late. With the card at t1 the human answers it before `paramilitary-detect` that same turn. The record also
 * puts RS paramilitary use in the first week (Bijeljina 1-2 April, Zvornik 8-9 April 1992; BB1 pp. 171, 173), well
 * before the 12 May Assembly goals, so the goals gate was an anachronism.
 *
 * Conditions pinned here (round 4a outcome, conditions 1, 2, 5, 7): goals fires before policy by priority, never by id
 * luck; the goals options no longer claim to open the card; both cards fire at t1 with no overflow; at Assisted and
 * Delegated an unanswered card sends nothing; Review and Always deny send nothing; Always allow sends exactly the
 * headless t1 pair, charged and receipted to the player's own answer; Observer answers automatically at t1; the
 * restraint consequence cannot fire after Always allow; the shift row cannot change RS corps targets.
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
    advanceTurn,
    loadStateFromPath,
    resolveDesktopEventDecision,
    resolveDesktopEventDecisionInPlace,
} from '../src/desktop/desktop_sim.js';
import { getStartupSnapshotPath } from '../src/scenario/startup_snapshot.js';
import { augmentOffensiveTargetsWithShifts } from '../src/sim/combat/commander/bot_priority_shift_augmentation.js';
import type { CommanderBriefing } from '../src/sim/combat/commander/commander_state.js';
import { compareEventCandidates } from '../src/sim/events/evaluate_events.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';
import type { EventDefinition, PendingEventDecision } from '../src/sim/events/event_types.js';
import { strictCompare } from '../src/state/validateGameState.js';
import type { FactionId, GameState } from '../src/state/game_state.js';
import { RS_GOALS, RS_POLICY, eventDef, newCampaign } from './helpers/s6_opening_lane_fixtures.js';

const baseDir = process.cwd();
const CATALOG = loadEventDefinitions(0);
const RESTRAINT = 'csq_paramilitary_authorization_refused';

type Mode = 'historical' | 'emergent';
const headlessT1: Partial<Record<Mode, GameState>> = {};

function rsCaptures(state: GameState, turn?: number): string[] {
    return (state.political.control_events ?? [])
        .filter((event) => event.mechanism === 'paramilitary' && event.to === 'RS' && (turn === undefined || event.turn === turn))
        .map((event) => event.settlement_id)
        .sort(strictCompare);
}

function rsParamilitaries(state: GameState): string[] {
    return Object.entries(state.military.formations ?? {})
        .filter(([, formation]) => formation.faction === 'RS' && formation.kind === 'paramilitary')
        .map(([id]) => id)
        .sort(strictCompare);
}

function rsWarCrimes(state: GameState): number {
    return state.military.negotiation?.capital?.RS?.war_crimes_events_emergent ?? 0;
}

function cardRows(state: GameState, eventId: string) {
    return (state.military.event_decision_log ?? []).filter((row) => row.event_id === eventId);
}

type PauseAnswer = Partial<Record<string, string>>;

/**
 * One live Advance. In the pause the hook records the player's whole desk (the working state's pending list, in its
 * order, which is what the pause shows; the hook's own argument lists only the cards fired this turn, so a birth card
 * left on the desk is not in it) and answers the listed cards in place, as the desktop pause does.
 */
async function advance(state: GameState, answers: PauseAnswer = {}, seen: string[][] = []): Promise<GameState> {
    const result = await advanceTurn(state, baseDir, {
        onPlayerDecisionsPending: (working: GameState, _fired: PendingEventDecision[]) => {
            const desk = (working.military.pending_event_decisions ?? [])
                .filter((decision) => decision.faction === 'RS')
                .map((decision) => decision.event_id);
            seen.push(desk);
            for (const eventId of desk) {
                const response = answers[eventId];
                if (response) resolveDesktopEventDecisionInPlace(working, eventId, response, baseDir);
            }
        },
    });
    expect(result.error).toBeUndefined();
    return result.state;
}

beforeAll(async () => {
    for (const mode of ['historical', 'emergent'] as const) {
        const start = (await loadStateFromPath(getStartupSnapshotPath(baseDir, 'apr_1992'), baseDir)).state;
        start.meta.decision_mode = mode;
        const result = await advanceTurn(start, baseDir);
        expect(result.error).toBeUndefined();
        headlessT1[mode] = result.state;
    }
}, 300_000);

describe('the RS card\'s data: t1, after goals, not gated on goals', () => {
    it('fires from t1 in the same window, with no goals gate and the canonical option set', () => {
        const card = eventDef(RS_POLICY);
        expect(card.trigger.turn_min).toBe(1);
        expect(card.trigger.turn_max).toBe(8);
        expect(card.trigger.condition).toBeUndefined();
        expect(card.requires_enabled).toBeUndefined();
        expect(card.once).toBe(true);
        expect(card.historical_default_response_id).toBe('always_allow');
        // SHDG §3: bounded to always_allow / ask / always_deny, no expansion.
        expect((card.response_options ?? []).map((option) => option.id)).toEqual(['always_allow', 'ask', 'always_deny']);
    });

    it('sorts after the goals card by priority, never by id (the id order alone would put policy first)', () => {
        const goals = CATALOG.find((def) => def.id === RS_GOALS)!;
        const card = CATALOG.find((def) => def.id === RS_POLICY)!;
        expect(card.priority).toBe(101);
        expect(goals.priority ?? 100).toBeLessThan(card.priority!);
        expect(compareEventCandidates(goals, card)).toBeLessThan(0);
        // Control: with equal priority the id tiebreak would fire policy first.
        expect(compareEventCandidates(goals, { ...card, priority: goals.priority } as EventDefinition)).toBeGreaterThan(0);
    });

    it('no goals answer claims to open the card any more (no false causality row)', () => {
        const goals = eventDef(RS_GOALS);
        for (const option of goals.response_options ?? []) {
            expect(option.enables_events_runtime ?? [], option.id).not.toContain(RS_POLICY);
            for (const consequence of option.future_consequences ?? []) {
                expect(consequence.opens_events ?? [], `${option.id}/${consequence.id}`).not.toContain(RS_POLICY);
            }
        }
    });
});

describe('headless: both cards fire at t1, goals first', () => {
    for (const mode of ['historical', 'emergent'] as const) {
        it(`${mode}: goals then policy at t1, no overflow, the historical Always allow, and the t1 pair`, () => {
            const state = headlessT1[mode]!;
            expect(state.meta.turn).toBe(1);
            expect(state.military.event_last_fired_turn[RS_GOALS]).toBe(1);
            expect(state.military.event_last_fired_turn[RS_POLICY]).toBe(1);
            const t1Rows = (state.military.event_decision_log ?? []).filter((row) => row.turn === 1 && row.faction === 'RS');
            const order = t1Rows.map((row) => row.event_id);
            expect(order.indexOf(RS_GOALS)).toBeGreaterThanOrEqual(0);
            expect(order.indexOf(RS_GOALS)).toBeLessThan(order.indexOf(RS_POLICY));
            // Historical mode answers with the card's authored default; emergent mode's political bot picks the same answer.
            const source = mode === 'historical' ? 'bot_ai_default' : 'bot_political';
            expect(cardRows(state, RS_POLICY)).toEqual([
                expect.objectContaining({ response_id: 'always_allow', decision_source: source, faction: 'RS', turn: 1 }),
            ]);
            expect(state.military.event_flags?.rs_paramilitary_policy).toBe('always_allow');
            expect(state.military.event_flags?.rs_paramilitary_authorized).toBe(true);
            // The card is not opened by goals: no enable entry, no goals -> policy `enables` causality row.
            expect(state.military.enabled_event_ids ?? []).not.toContain(RS_POLICY);
            const falseRows = (state.military.event_causality_log ?? []).filter((row) =>
                JSON.stringify(row).includes(RS_GOALS) && JSON.stringify(row).includes(RS_POLICY) && JSON.stringify(row).includes('enable'));
            expect(falseRows).toEqual([]);
            // The shift row lands at t1 and runs its 104 weeks (expires 105).
            expect((state.military.bot_priority_shifts ?? []).filter((shift) => shift.faction === 'RS')
                .map((shift) => shift.expires_turn)).toContain(105);
            // The headless RS t1 pair (Potkozarje + Orahova on this map) is unchanged by the fix.
            expect(rsCaptures(state, 1)).toHaveLength(2);
        });
    }

    it('the two modes sweep the same t1 cells', () => {
        expect(rsCaptures(headlessT1.historical!, 1)).toEqual(rsCaptures(headlessT1.emergent!, 1));
    });
});

describe('the shift row cannot move RS corps targets (operations, engine E5)', () => {
    it('with the real t1 shift active, a strictCompare-sorted unique target list comes back unchanged', () => {
        const state = headlessT1.historical!;
        const shifts = (state.military.bot_priority_shifts ?? []).filter((shift) => shift.faction === 'RS');
        expect(shifts.flatMap((shift) => shift.add_objectives ?? [])).toContain('paramilitary_rear_clearance');
        const briefing = (withShifts: boolean) => ({
            faction: 'RS',
            turn: 1,
            state_ref: withShifts ? state : { ...state, military: { ...state.military, bot_priority_shifts: [] } },
        }) as unknown as CommanderBriefing;
        const controllers = state.political.political_controllers ?? {};
        const base = Object.keys(controllers).filter((osid) => controllers[osid] !== 'RS').sort(strictCompare);
        expect(base.length).toBeGreaterThan(0);
        const withShift = augmentOffensiveTargetsWithShifts(base, briefing(true));
        const withoutShift = augmentOffensiveTargetsWithShifts(base, briefing(false));
        expect(withShift).toEqual(withoutShift);
        expect(withShift).toEqual(base);
    });
});

describe('live RS: the human answers the card at t1, before the first sweep', () => {
    for (const autonomy of [1, 2] as const) {
        // Player-override model (owner 2026-11-25; §6 HOW ruling lane C s8, H-21; was: the card stayed on the desk and
        // nothing was sent): the card is on the desk at the t1 pause, and left unanswered it is answered by the staff in
        // that turn as the bot answers it, so the side sweeps exactly the headless t1 pair, charged to the side.
        it(`autonomy ${autonomy}: the card left unanswered at the t1 pause is answered as the bot does, and the side sweeps the headless pair`, async () => {
            let player = await newCampaign('RS');
            player = resolveDesktopEventDecision(player, RS_GOALS, 'all_six', baseDir);
            player.meta.autonomy_level = autonomy;
            const seen: string[][] = [];
            player = await advance(player, {}, seen);
            expect(player.meta.turn).toBe(1);
            expect(seen.flat()).toContain(RS_POLICY);
            expect(player.military.event_last_fired_turn[RS_POLICY]).toBe(1);
            expect(cardRows(player, RS_POLICY)).toEqual([
                expect.objectContaining({ response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 1 }),
            ]);
            expect((player.military.pending_event_decisions ?? []).map((decision) => decision.event_id)).not.toContain(RS_POLICY);
            expect(player.paramilitary_policy).toBe('always_allow');
            const swept = rsCaptures(player, 1);
            expect(swept).toEqual(rsCaptures(headlessT1.historical!, 1));
            expect(swept).toHaveLength(2);
            expect(rsWarCrimes(player)).toBe(swept.length);
        }, 240_000);
    }

    for (const response of ['ask', 'always_deny'] as const) {
        it(`Delegated, answered ${response} in the t1 pause: no sweep, at the answer's own price`, async () => {
            let player = await newCampaign('RS');
            player = resolveDesktopEventDecision(player, RS_GOALS, 'all_six', baseDir);
            player.meta.autonomy_level = 2;
            player = await advance(player, { [RS_POLICY]: response });
            player = await advance(player);
            expect(cardRows(player, RS_POLICY)).toEqual([
                expect.objectContaining({ response_id: response, decision_source: 'player', faction: 'RS', turn: 1 }),
            ]);
            expect(player.military.event_flags?.rs_paramilitary_policy).toBe(response);
            expect(player.military.event_flags).not.toHaveProperty('rs_paramilitary_authorized');
            expect(rsCaptures(player)).toEqual([]);
            expect(rsParamilitaries(player)).toEqual([]);
            expect(rsWarCrimes(player)).toBe(0);
        }, 240_000);
    }

    it('Delegated, goals left pending at birth: the t1 pause lists goals then policy; Always allow sends exactly the headless t1 pair, charged, on the player\'s own answer', async () => {
        let player = await newCampaign('RS');
        player.meta.autonomy_level = 2;
        const seen: string[][] = [];
        player = await advance(player, { [RS_GOALS]: 'all_six', [RS_POLICY]: 'always_allow' }, seen);
        expect(player.meta.turn).toBe(1);
        // The desk dump of the t1 pause: both cards, goals first.
        const t1Desk = seen[0]!.filter((id) => id === RS_GOALS || id === RS_POLICY);
        expect(t1Desk).toEqual([RS_GOALS, RS_POLICY]);
        expect(cardRows(player, RS_POLICY)).toEqual([
            expect.objectContaining({ response_id: 'always_allow', decision_source: 'player', faction: 'RS', turn: 1 }),
        ]);
        const swept = rsCaptures(player, 1);
        expect(swept).toEqual(rsCaptures(headlessT1.historical!, 1));
        expect(swept).toHaveLength(2);
        expect(rsWarCrimes(player)).toBe(swept.length);
        // The +12 restraint consequence is closed for good: it needs `rs_paramilitary_authorized` unset.
        expect(player.military.event_flags?.rs_paramilitary_authorized).toBe(true);
        const restraint = CATALOG.find((def) => def.id === RESTRAINT)!;
        expect(JSON.stringify(restraint.trigger.condition)).toContain('"flag":"rs_paramilitary_authorized"');
        expect(JSON.stringify(restraint.trigger.condition)).toContain('flag_not_set');
        expect(player.military.fired_event_ids ?? []).not.toContain(RESTRAINT);
    }, 240_000);

    it('Observer from the start, nothing answered: the card is answered automatically at t1 and the side sweeps the headless pair, charged', async () => {
        let player = await newCampaign('RS');
        player.meta.autonomy_level = 3;
        expect(player.paramilitary_policy).toBe('ask');
        player = await advance(player);
        expect(player.meta.turn).toBe(1);
        expect(cardRows(player, RS_POLICY)).toEqual([
            expect.objectContaining({ response_id: 'always_allow', decision_source: 'bot_ai_default', faction: 'RS', turn: 1 }),
        ]);
        expect(player.paramilitary_policy).toBe('always_allow');
        const swept = rsCaptures(player, 1);
        expect(swept).toEqual(rsCaptures(headlessT1.historical!, 1));
        expect(rsWarCrimes(player)).toBe(swept.length);
    }, 180_000);
});

// The faction set is exported for readers of this file who extend it to RBiH/HRHB (no change for them: condition 5).
export const UNCHANGED_FACTIONS: readonly FactionId[] = ['RBiH', 'HRHB'];
