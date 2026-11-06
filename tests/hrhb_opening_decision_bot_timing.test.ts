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
 * its authored window (t3-7; it fires t4). Pre-firing it for an HRHB player at campaign birth
 * applied croat_republic's +5 morale to the t0 formation set only, so brigades raised before t4
 * kept a permanent -5 morale offset and the gated hrhb_1992_graz_cooperation_collapse fired a
 * turn early (t4 vs t5); by t65 the offset changed a Central Bosnia brigade's orders and by t156
 * it cost op:travnik:gornje_krcevine. The player now answers it in the pause before combat on
 * the turn the bot does, exactly as the bot would (the harness's bot_equivalent policy).
 */
describe('HRHB opening decision fires on the bot turn for a player', () => {
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
        let player = (await startNewCampaign(baseDir, 'HRHB', 'apr_1992', 'historical')).state;
        expect(player.military.fired_event_ids).not.toContain('hrhb_political_goal');
        expect(player.military.pending_event_decisions ?? []).toHaveLength(0);

        for (let turn = 1; turn <= 5; turn += 1) {
            const h = await advanceTurn(headless, baseDir);
            const p = await advanceTurn(player, baseDir, { onPlayerDecisionsPending: answerLikeTheBot });
            expect(h.error).toBeUndefined();
            expect(p.error).toBeUndefined();
            headless = h.state;
            player = p.state;
        }

        for (const eventId of ['hrhb_political_goal', 'hrhb_1992_graz_cooperation_collapse']) {
            expect(player.military.event_last_fired_turn[eventId], eventId)
                .toBe(headless.military.event_last_fired_turn[eventId]);
        }
        expect(headless.military.event_last_fired_turn.hrhb_political_goal).toBe(4);
        expect(player.military.event_flags?.hrhb_political_goal).toBe('croat_republic');
        const hrhbMorale = (state: GameState) => Object.fromEntries(
            Object.entries(state.military.formations ?? {})
                .filter(([, formation]) => formation.faction === 'HRHB')
                .map(([id, formation]) => [id, formation.morale]),
        );
        expect(Object.keys(hrhbMorale(player)).length).toBeGreaterThan(0);
        expect(hrhbMorale(player)).toEqual(hrhbMorale(headless));
        expect(player.political.war_alliance_rbih_hrhb).toBe(headless.political.war_alliance_rbih_hrhb);
    }, 240_000);
});
