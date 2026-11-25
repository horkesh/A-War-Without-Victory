/**
 * A9 P1 refusal card (SD13, 8-seat §6 ruling D9; orchestrator P1 ruling 5): the `refuse-negotiated-evacuation` IPC
 * channel, run as the REAL electron-main.cjs handler outside Electron (tools/ai_play/electron_handlers_vm.ts) on a
 * real saved campaign.
 * - G1: an explicit refusal is written to the episode, survives the canonical save and load, and is idempotent;
 * - it is never written for a headless run, another player side, a pocket with no open episode or a bad payload;
 * - silence = allow: the handler is the only writer, so a game nobody clicks in carries no refusal.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as desktopSim from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';
import { loadElectronHandlers } from '../tools/ai_play/electron_handlers_vm.js';

const FINAL_SAVE = 'data/derived/latest_run_final_save.json';
const CHANNEL = 'refuse-negotiated-evacuation';
let cachedSaveText: string | null = null;

/** The real save, as a live RBiH president's game, with one open episode in `mun` (as the convoy rule writes it). */
function liveState(meta: Partial<GameState['meta']> = {}, withEpisode = true): { state: GameState; mun: string } {
    cachedSaveText ??= readFileSync(FINAL_SAVE, 'utf8');
    const state = desktopSim.deserializeState(cachedSaveText);
    Object.assign(state.meta, { player_faction: 'RBiH', headless_scenario_auto_control: false }, meta);
    const mun = state.displacement.displacement_state.srebrenica ? 'srebrenica' : Object.keys(state.displacement.displacement_state).sort()[0]!;
    if (withEpisode) {
        state.displacement.displacement_state[mun]!.negotiated_evacuation_by_side = {
            RBiH: { opened_turn: state.meta.turn - 1, convoys: 1, people: 3_000, last_convoy_turn: state.meta.turn - 1, refused_turn: null },
        };
    }
    return { state, mun };
}

const episodeOf = (state: GameState, mun: string) => state.displacement.displacement_state[mun]?.negotiated_evacuation_by_side?.RBiH;

describe('refuse-negotiated-evacuation (real handler, real save)', () => {
    it('G1: writes the refusal for the open episode, and it survives the canonical save and load', async () => {
        const { state, mun } = liveState();
        const h = loadElectronHandlers(state, [CHANNEL]);
        expect(await h.invoke(CHANNEL, { munId: mun })).toEqual({ ok: true });
        const saved = h.saved();
        expect(episodeOf(saved, mun)?.refused_turn).toBe(state.meta.turn);
        // The rest of the episode is untouched.
        expect({ ...episodeOf(saved, mun), refused_turn: null }).toEqual(episodeOf(state, mun));
        // Load the saved JSON again (a later session): the refusal is still a refusal, never cleared or re-asked.
        const reloaded = desktopSim.deserializeState(desktopSim.serializeState(saved));
        expect(episodeOf(reloaded, mun)?.refused_turn).toBe(state.meta.turn);
    });

    it('is idempotent: a second refusal a week later keeps the first refusal turn', async () => {
        const { state, mun } = liveState();
        const h = loadElectronHandlers(state, [CHANNEL]);
        await h.invoke(CHANNEL, { munId: mun });
        const next = h.saved();
        next.meta.turn += 1;
        h.feed(next);
        expect(await h.invoke(CHANNEL, { munId: mun })).toEqual({ ok: true });
        expect(episodeOf(h.saved(), mun)?.refused_turn).toBe(state.meta.turn);
    });

    it('writes nothing for a headless run, another player side, no open episode or a bad payload', async () => {
        const cases: Array<{ meta?: Partial<GameState['meta']>; withEpisode?: boolean; payload?: unknown }> = [
            { meta: { headless_scenario_auto_control: true } },
            { meta: { player_faction: 'RS' } },
            { withEpisode: false },
            { payload: {} },
            { payload: { munId: '' } },
            { payload: null },
        ];
        for (const c of cases) {
            const { state, mun } = liveState(c.meta ?? {}, c.withEpisode ?? true);
            const h = loadElectronHandlers(state, [CHANNEL]);
            const before = desktopSim.serializeState(h.saved());
            const res = await h.invoke(CHANNEL, c.payload === undefined ? { munId: mun } : c.payload);
            expect(res.ok, JSON.stringify(c)).toBe(false);
            expect(desktopSim.serializeState(h.saved())).toBe(before);
        }
    });
});
