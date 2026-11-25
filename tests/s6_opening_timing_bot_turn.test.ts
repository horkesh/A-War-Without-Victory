/**
 * §6 design T: live = no-player timing for the RBiH and RS opening cards, through the real turn pipeline.
 *
 * Headless (no player) answers rbih_state_identity at t3, rs_strategic_goals at t1 and the RBiH policy card
 * at t4. A player now answers the cards at birth; the answers are filed then and applied on those same
 * turns, the RBiH policy card inside evaluate-events at t4 (never in the pause after it). HRHB keeps its
 * timing (tests/hrhb_opening_decision_bot_timing.test.ts).
 *
 * Round 4a (b), 2026-11-22: the RS policy card fires at t1 in both modes, right after the goals card (priority
 * 101) and no longer enabled by the goals answer (it was enabled at t1 and fired at t2).
 */

import { beforeAll, describe, expect, it } from 'vitest';

import {
    advanceTurn,
    loadStateFromPath,
    resolveDesktopEventDecision,
} from '../src/desktop/desktop_sim.js';
import { getStartupSnapshotPath } from '../src/scenario/startup_snapshot.js';
import type { PendingEventDecision } from '../src/sim/events/event_types.js';
import type { GameState } from '../src/state/game_state.js';
import { IDENTITY, RBIH_POLICY, RS_GOALS, RS_POLICY, cloneState, newCampaign } from './helpers/s6_opening_lane_fixtures.js';

const baseDir = process.cwd();
let headlessByTurn: GameState[] = [];

function botAnswer(state: GameState, eventId: string): { response_id: string; turn: number } {
    const row = (state.military.event_decision_log ?? []).find((entry) => entry.event_id === eventId);
    if (!row) throw new Error(`headless did not answer ${eventId}`);
    return { response_id: row.response_id, turn: row.turn };
}

async function advance(state: GameState, seen: PendingEventDecision[][]): Promise<GameState> {
    const result = await advanceTurn(state, baseDir, {
        onPlayerDecisionsPending: (_working, decisions) => { seen.push(decisions.map((decision) => ({ ...decision }))); },
    });
    expect(result.error).toBeUndefined();
    return result.state;
}

beforeAll(async () => {
    let headless = (await loadStateFromPath(getStartupSnapshotPath(baseDir, 'apr_1992'), baseDir)).state;
    headlessByTurn = [headless];
    for (let turn = 1; turn <= 4; turn += 1) {
        const result = await advanceTurn(headless, baseDir);
        expect(result.error).toBeUndefined();
        headless = result.state;
        headlessByTurn.push(headless);
    }
}, 300_000);

describe('opening cards: answered at birth, applied on the bot turn', () => {
    it('RBiH: identity applies at t3, the policy card is filed at t0 and applied inside evaluate-events at t4; a save across the filed window loads and resolves the same', async () => {
        const headless = headlessByTurn[4]!;
        expect(botAnswer(headless, IDENTITY).turn).toBe(3);
        expect(botAnswer(headless, RBIH_POLICY).turn).toBe(4);

        let player = await newCampaign('RBiH');
        player = resolveDesktopEventDecision(player, IDENTITY, botAnswer(headless, IDENTITY).response_id, baseDir);
        player = resolveDesktopEventDecision(player, RBIH_POLICY, botAnswer(headless, RBIH_POLICY).response_id, baseDir);
        const seen: PendingEventDecision[][] = [];
        const flagsByTurn: Array<Record<string, unknown>> = [{ ...(player.military.event_flags ?? {}) }];
        for (let turn = 1; turn <= 4; turn += 1) {
            player = await advance(player, seen);
            flagsByTurn.push({ ...(player.military.event_flags ?? {}) });
            if (turn === 2) {
                // Save and load inside the filed window: both answers still apply on their turns.
                player = cloneState(player);
            }
        }

        // Nothing from the filed window lands early; identity applies before the policy card.
        for (const turn of [0, 1, 2]) {
            expect(flagsByTurn[turn]!.rbih_state_identity, `t${turn}`).toBeUndefined();
            expect(flagsByTurn[turn]!.rbih_paramilitary_policy, `t${turn}`).toBeUndefined();
        }
        expect(flagsByTurn[3]!.rbih_state_identity).toBe(headless.military.event_flags?.rbih_state_identity);
        expect(flagsByTurn[3]!.rbih_paramilitary_policy).toBeUndefined();
        expect(flagsByTurn[4]!.rbih_paramilitary_policy).toBe(headless.military.event_flags?.rbih_paramilitary_policy);

        for (const eventId of [IDENTITY, RBIH_POLICY]) {
            expect(player.military.event_last_fired_turn[eventId], eventId).toBe(headless.military.event_last_fired_turn[eventId]);
        }
        expect(player.military.event_last_fired_turn[IDENTITY]).toBe(3);
        expect(player.military.event_last_fired_turn[RBIH_POLICY]).toBe(4);
        // Applied inside evaluate-events: the pause after it never saw the policy card.
        expect(seen.flat().map((decision) => decision.event_id)).not.toContain(RBIH_POLICY);
        expect(seen.flat().map((decision) => decision.event_id)).not.toContain(IDENTITY);
        // The only live-only rows: the two filed answers, player at t0 (headless: bot at t3 and t4).
        const rows = (player.military.event_decision_log ?? []).filter((row) => row.event_id === IDENTITY || row.event_id === RBIH_POLICY);
        expect(rows.map((row) => [row.event_id, row.decision_source, row.turn])).toEqual([
            [IDENTITY, 'player', 0],
            [RBIH_POLICY, 'player', 0],
        ]);
        expect(player.paramilitary_policy).toBe(headless.military.event_flags?.rbih_paramilitary_policy);
    }, 400_000);

    it('RBiH at Observer (a3): the answer filed at t0 wins at t4 over the automatic one', async () => {
        let player = await newCampaign('RBiH');
        player.meta.autonomy_level = 3;
        player = resolveDesktopEventDecision(player, IDENTITY, 'civic', baseDir);
        // Not the historical default (always_deny), so the filed answer is distinguishable.
        player = resolveDesktopEventDecision(player, RBIH_POLICY, 'ask', baseDir);
        const seen: PendingEventDecision[][] = [];
        for (let turn = 1; turn <= 4; turn += 1) player = await advance(player, seen);
        expect(player.military.event_last_fired_turn[RBIH_POLICY]).toBe(4);
        expect(player.military.event_flags?.rbih_paramilitary_policy).toBe('ask');
        expect(player.paramilitary_policy).toBe('ask');
        expect((player.military.event_decision_log ?? []).filter((row) => row.event_id === RBIH_POLICY)
            .map((row) => [row.response_id, row.decision_source, row.turn])).toEqual([['ask', 'player', 0]]);
    }, 400_000);

    it('RS: the goals card filed at t0 applies at t1; the RS card fires at t1 too, after goals and not enabled by it, and silence answers it as the bot does', async () => {
        const headless1 = headlessByTurn[1]!;
        expect(botAnswer(headless1, RS_GOALS).turn).toBe(1);
        expect(botAnswer(headless1, RS_POLICY).turn).toBe(1);
        let player = await newCampaign('RS');
        player = resolveDesktopEventDecision(player, RS_GOALS, botAnswer(headless1, RS_GOALS).response_id, baseDir);
        expect(player.military.event_flags?.rs_strategic_goals).toBeUndefined();
        expect(player.military.enabled_event_ids).not.toContain(RS_POLICY);
        player = await advance(player, []);
        expect(player.military.event_last_fired_turn[RS_GOALS]).toBe(1);
        expect(player.military.event_last_fired_turn[RS_GOALS]).toBe(headless1.military.event_last_fired_turn[RS_GOALS]);
        expect(player.military.event_flags?.rs_strategic_goals).toBe(headless1.military.event_flags?.rs_strategic_goals);
        // The RS card is not opened by the goals answer: it fires at t1 on its own, the same turn as headless.
        expect(player.military.enabled_event_ids ?? []).not.toContain(RS_POLICY);
        expect(player.military.fired_event_ids).toContain(RS_POLICY);
        expect(player.military.event_last_fired_turn[RS_POLICY]).toBe(headless1.military.event_last_fired_turn[RS_POLICY]);
        // Player-override model (§6 HOW ruling lane C s8, 2026-11-25; was: the card waited on the desk and nothing was sent):
        // the player left it unanswered, so the staff answer it in its fire turn as the bot does, and the side sends the
        // same t1 sweeps as the no-player RS bot, under the card's historical default.
        expect((player.military.pending_event_decisions ?? []).map((decision) => decision.event_id)).not.toContain(RS_POLICY);
        expect(botAnswer(player, RS_POLICY).response_id).toBe(botAnswer(headless1, RS_POLICY).response_id);
        expect(botAnswer(player, RS_POLICY).turn).toBe(1);
        expect(player.military.event_flags?.rs_paramilitary_policy).toBe(headless1.military.event_flags?.rs_paramilitary_policy);
        // The t0 formation set no longer gets a morale bonus the no-player game gives on t1.
        const rsParamilitaries = (state: GameState) => Object.entries(state.military.formations)
            .filter(([, formation]) => formation.faction === 'RS' && formation.kind === 'paramilitary')
            .map(([id, formation]) => [id, formation.paramilitary_target]);
        expect(rsParamilitaries(player)).toEqual(rsParamilitaries(headless1));
        expect(rsParamilitaries(player).length).toBeGreaterThan(0);
        const rsMorale = (state: GameState) => Object.fromEntries(Object.entries(state.military.formations)
            .filter(([, formation]) => formation.faction === 'RS' && formation.kind !== 'paramilitary')
            .map(([id, formation]) => [id, formation.morale]));
        expect(rsMorale(player)).toEqual(rsMorale(headless1));
    }, 300_000);
});
