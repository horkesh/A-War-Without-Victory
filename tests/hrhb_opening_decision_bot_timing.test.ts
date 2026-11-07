import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
    advanceTurn,
    loadStateFromPath,
    resolveEventDecision,
    startNewCampaign,
} from '../src/desktop/desktop_sim.js';
import { getStartupSnapshotPath } from '../src/scenario/startup_snapshot.js';
import { loadEventDefinitionsFromDir } from '../src/sim/events/event_loader.js';
import { selectBotEventResponse } from '../src/sim/events/evaluate_events.js';
import type { GameState } from '../src/state/game_state.js';

/**
 * Live = no-player parity for the HRHB opening decision. A bot answers hrhb_political_goal in
 * its authored window (t3-7; it fires t4). Applying an HRHB player's answer at campaign birth
 * gave croat_republic's +5 morale to the t0 formation set only, so brigades raised before t4
 * kept a permanent -5 morale offset and the gated hrhb_1992_graz_cooperation_collapse fired a
 * turn early (t4 vs t5); by t65 the offset changed a Central Bosnia brigade's orders and by t156
 * it cost op:travnik:gornje_krcevine.
 *
 * ANSWER AHEAD OF FIRING (owner, 2026-11-06): the player still answers the card at campaign
 * birth (the first-hour experience), but the answer is only FILED then; it is applied when the
 * event fires at t4, where a bot's answer is applied (src/sim/events/answer_ahead_of_firing.ts).
 */
const EVENT = 'hrhb_political_goal';

describe('HRHB opening decision: answered at birth, applied on the bot turn', () => {
    it('matches the no-player branch through t5: fire turns and every HRHB morale', async () => {
        const baseDir = process.cwd();
        const catalog = new Map(
            loadEventDefinitionsFromDir(0, resolve(baseDir, 'data/scenarios/events')).map((def) => [def.id, def]),
        );
        const answerLikeTheBot = (state: GameState, decisions: readonly { event_id: string; faction?: string | null }[]) => {
            for (const decision of decisions) {
                if (decision.faction !== 'HRHB') continue;
                const def = catalog.get(decision.event_id);
                if (!def?.response_options?.length) continue;
                resolveEventDecision(state, decision.event_id, selectBotEventResponse(state, def, 'HRHB', false).chosen.id);
            }
        };

        let headless = (await loadStateFromPath(getStartupSnapshotPath(baseDir, 'apr_1992'), baseDir)).state;
        for (let turn = 1; turn <= 5; turn += 1) {
            const h = await advanceTurn(headless, baseDir);
            expect(h.error).toBeUndefined();
            headless = h.state;
        }
        const botAnswer = (headless.military.event_decision_log ?? []).find((row) => row.event_id === EVENT);
        expect(botAnswer?.turn).toBe(4);

        let player = (await startNewCampaign(baseDir, 'HRHB', 'apr_1992', 'historical')).state;
        // The card is on the desk at birth, but the event has not fired.
        expect((player.military.pending_event_decisions ?? []).map((d) => d.event_id)).toEqual([EVENT]);
        expect(player.military.fired_event_ids).not.toContain(EVENT);
        const moraleBefore = hrhbMorale(player);

        // Answer at birth with the bot's choice: it is filed, and nothing is applied yet.
        resolveEventDecision(player, EVENT, botAnswer!.response_id);
        expect(player.military.pending_event_decisions ?? []).toHaveLength(0);
        expect(player.military.event_decision_log.filter((row) => row.event_id === EVENT))
            .toEqual([{ event_id: EVENT, response_id: botAnswer!.response_id, decision_source: 'player', faction: 'HRHB', turn: 0 }]);
        expect(player.military.event_flags?.[EVENT]).toBeUndefined();
        expect(hrhbMorale(player)).toEqual(moraleBefore);

        for (let turn = 1; turn <= 5; turn += 1) {
            const p = await advanceTurn(player, baseDir, { onPlayerDecisionsPending: answerLikeTheBot });
            expect(p.error).toBeUndefined();
            player = p.state;
        }

        for (const eventId of [EVENT, 'hrhb_1992_graz_cooperation_collapse']) {
            expect(player.military.event_last_fired_turn[eventId], eventId)
                .toBe(headless.military.event_last_fired_turn[eventId]);
        }
        expect(player.military.event_last_fired_turn[EVENT]).toBe(4);
        expect(player.military.event_flags?.[EVENT]).toBe(headless.military.event_flags?.[EVENT]);
        // Filed once, never re-asked when the event fired.
        expect(player.military.event_decision_log.filter((row) => row.event_id === EVENT)).toHaveLength(1);
        expect(Object.keys(hrhbMorale(player)).length).toBeGreaterThan(0);
        expect(hrhbMorale(player)).toEqual(hrhbMorale(headless));
        expect(player.political.war_alliance_rbih_hrhb).toBe(headless.political.war_alliance_rbih_hrhb);
    }, 240_000);
});

function hrhbMorale(state: GameState): Record<string, number | undefined> {
    return Object.fromEntries(
        Object.entries(state.military.formations ?? {})
            .filter(([, formation]) => formation.faction === 'HRHB')
            .map(([id, formation]) => [id, formation.morale]),
    );
}
