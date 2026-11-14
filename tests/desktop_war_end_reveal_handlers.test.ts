/**
 * RT7: the real `resolve-peace-plan` and `resolve-dayton` IPC handlers, run end to end
 * against the war-end replay-manifest reveal.
 *
 * Fog of war ends with the war. Live manifests sent during play withhold the all-sides
 * casualty total (`totalCasualties: null`); when a handler ends the war, it passes through
 * `writeCanonicalCurrentState`, which must send the full frames to the renderer, after the
 * state. Existing tests cover `resolvePeacePlan` and `resolveDesktopDaytonAgreement` as pure
 * sim calls and the reveal as a string-shape check; nothing drove the actual handlers.
 *
 * Electron exits if required in Node, so (as `tests/ui/dayton_preview_ipc.test.ts` does) the
 * handler registrations and the canonical write path are sliced out of `electron-main.cjs` and
 * executed in a vm context, replacing only the process and IO boundaries.
 */
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import * as desktopSim from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';
import {
    createDefaultPatronRelationship,
    createEmptyCapital,
    type NegotiationBreakdown,
    type PatronRelationship,
} from '../src/state/negotiation_types.js';
import { initializeStrategicDimensions } from '../src/sim/events/strategic_dimensions.js';

type Handler = (event: object, payload: unknown) => Promise<Record<string, unknown>>;

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const FULL_CASUALTIES = 2000;

/** A live frame as the main process stores it: the real all-sides total, unmasked. */
const LIVE_FRAME = {
    turn: 189,
    date: '1995-11-14',
    activeFormations: 300,
    totalCasualties: FULL_CASUALTIES,
    totalDisplacedOrKilled: 4000,
    controlByFaction: [],
};

function makeState(): GameState {
    const capital: Record<string, NegotiationBreakdown> = {};
    const patron_relationships: Record<string, PatronRelationship> = {};
    for (const faction of FACTIONS) {
        capital[faction] = { ...createEmptyCapital(), territory_controlled_pct: 30, refugees_created: 50_000 };
        patron_relationships[faction] = createDefaultPatronRelationship(faction);
    }
    const store = initializeStrategicDimensions();
    for (const faction of FACTIONS) {
        for (const dim of Object.keys(store[faction])) {
            store[faction][dim] = { base_value: 55, event_modifier: 0, effective_value: 55 };
        }
    }
    return {
        meta: {
            turn: 190, war_start_turn: 0, phase: 'war', seed: 1, date: '1995-11-21',
            game_over: false, player_faction: 'RBiH', decision_mode: 'emergent',
        },
        factions: FACTIONS.map((id) => ({ id })),
        military: {
            formations: {},
            negotiation: { capital, patron_relationships, peace_plan_history: [], strategic_dimensions: store },
        },
        political: {
            political_controllers: {
                'op:sarajevo:sarajevo_1': 'RBiH', 'op:banja_luka:banja_luka_2': 'RS', 'op:mostar:mostar_1': 'HRHB',
            },
        },
        displacement: {},
    } as unknown as GameState;
}

function withPeacePlan(botResponses: Record<string, string>): GameState {
    const state = makeState();
    (state.military.negotiation as unknown as Record<string, unknown>).pending_peace_plan = {
        plan_id: 'vance_owen', turn_offered: 190, bot_responses: botResponses,
    };
    return state;
}

function withDayton(): GameState {
    const state = makeState();
    state.military.negotiation!.pending_dayton = {
        territorial_packages: [
            { id: 'brcko_district', name: 'Brčko District', default_holder: 'RS', demand_cost: 20, concede_cost: 15 },
        ],
        institutional_packages: [
            { id: 'military', name: 'Military Structure', centralized_cost: 15, decentralized_cost: 10 },
        ],
        faction_capital: { RBiH: 80, RS: 60, HRHB: 40 },
        patron_override: { RBiH: 5, RS: 10, HRHB: 25 },
    } as never;
    return state;
}

function loadHandlers(state: GameState) {
    const source = readFileSync('src/desktop/electron-main.cjs', 'utf8');
    const canonical = source.slice(
        source.indexOf('function readCanonicalCurrentState('),
        source.indexOf('async function loadStatePathIntoDesktop('),
    );
    const peace = source.slice(
        source.indexOf("ipcMain.handle('resolve-peace-plan'"),
        source.indexOf("ipcMain.handle('submit-counter-offer'"),
    );
    const dayton = source.slice(
        source.indexOf("ipcMain.handle('resolve-dayton'"),
        source.indexOf('// --- Read-only query handlers (UI previews; no state mutation) ---'),
    );
    const handlers = new Map<string, Handler>();
    const sim = { ...desktopSim, writeOwedTerminationRecords: vi.fn() };
    const sendGameStateToRenderer = vi.fn();
    const sendReplayManifestToRenderer = vi.fn();
    const context = {
        currentGameStateJson: JSON.stringify(state),
        currentCanonicalSaveJson: JSON.stringify(state),
        getDesktopSim: () => sim,
        getBaseDir: () => process.cwd(),
        ipcMain: { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) },
        autoSave: vi.fn(),
        sendGameStateToRenderer,
        sendReplayManifestToRenderer,
        liveReplayManifestFrames: [{ ...LIVE_FRAME }] as unknown[],
    };
    runInNewContext(`${canonical}\n${peace}\n${dayton}`, context);
    return {
        context,
        sendGameStateToRenderer,
        sendReplayManifestToRenderer,
        invoke: (channel: string, payload: unknown) => handlers.get(channel)!({}, payload),
        savedState: () => JSON.parse(context.currentCanonicalSaveJson) as GameState,
    };
}

function revealedFrames(sendReplayManifestToRenderer: ReturnType<typeof vi.fn>) {
    const manifest = JSON.parse(sendReplayManifestToRenderer.mock.calls[0][0] as string) as {
        frame_count: number; frames: Array<{ totalCasualties: number | null }>;
    };
    return manifest;
}

describe('war-end replay manifest reveal through the real handlers', () => {
    it('registers both handlers from the real main-process source', () => {
        const { invoke } = loadHandlers(makeState());
        expect(typeof invoke).toBe('function');
    });

    it('resolve-peace-plan: a plan every side accepts ends the war and reveals the full manifest after the state', async () => {
        const { invoke, savedState, sendGameStateToRenderer, sendReplayManifestToRenderer } = loadHandlers(
            withPeacePlan({ RS: 'accepted', HRHB: 'accepted' }),
        );

        const response = await invoke('resolve-peace-plan', { planId: 'vance_owen', response: 'accepted' });

        expect(response).toMatchObject({ ok: true, all_accepted: true });
        expect(savedState().meta.game_over).toBe(true);
        expect(sendReplayManifestToRenderer).toHaveBeenCalledOnce();
        const manifest = revealedFrames(sendReplayManifestToRenderer);
        expect(manifest.frame_count).toBe(1);
        expect(manifest.frames[0].totalCasualties).toBe(FULL_CASUALTIES);
        // The renderer stages the manifest before the state's loadSave runs, so it goes second.
        expect(sendGameStateToRenderer).toHaveBeenCalledOnce();
        expect(sendGameStateToRenderer.mock.invocationCallOrder[0])
            .toBeLessThan(sendReplayManifestToRenderer.mock.invocationCallOrder[0]);
    });

    it('resolve-peace-plan: a rejection keeps the war going and reveals nothing', async () => {
        const { invoke, savedState, sendReplayManifestToRenderer } = loadHandlers(
            withPeacePlan({ RS: 'rejected', HRHB: 'accepted' }),
        );

        const response = await invoke('resolve-peace-plan', { planId: 'vance_owen', response: 'accepted' });

        expect(response).toMatchObject({ ok: true, all_accepted: false, rejection_factions: ['RS'] });
        expect(savedState().meta.game_over).toBeFalsy();
        expect(sendReplayManifestToRenderer).not.toHaveBeenCalled();
    });

    it('resolve-peace-plan: the player declining reveals nothing and an invalid payload writes nothing', async () => {
        const { invoke, context, sendGameStateToRenderer, sendReplayManifestToRenderer } = loadHandlers(
            withPeacePlan({ RS: 'accepted', HRHB: 'accepted' }),
        );
        const before = context.currentCanonicalSaveJson;

        expect(await invoke('resolve-peace-plan', { planId: 'vance_owen', response: 'maybe' }))
            .toMatchObject({ ok: false });
        expect(context.currentCanonicalSaveJson).toBe(before);
        expect(sendGameStateToRenderer).not.toHaveBeenCalled();

        expect(await invoke('resolve-peace-plan', { planId: 'vance_owen', response: 'rejected' }))
            .toMatchObject({ ok: true, all_accepted: false });
        expect(sendReplayManifestToRenderer).not.toHaveBeenCalled();
    });

    it('resolve-dayton: signing ends the war and reveals the full manifest once; a retry sends nothing more', async () => {
        const { invoke, savedState, sendGameStateToRenderer, sendReplayManifestToRenderer } = loadHandlers(withDayton());
        const proposal = { territorial_demands: [], territorial_concessions: [], institutional_choices: {} };

        const response = await invoke('resolve-dayton', proposal);

        expect(response).toMatchObject({ ok: true });
        expect(savedState().meta.game_over).toBe(true);
        expect(savedState().military.negotiation?.dayton_result).toBeDefined();
        expect(sendReplayManifestToRenderer).toHaveBeenCalledOnce();
        expect(revealedFrames(sendReplayManifestToRenderer).frames[0].totalCasualties).toBe(FULL_CASUALTIES);
        expect(sendGameStateToRenderer.mock.invocationCallOrder[0])
            .toBeLessThan(sendReplayManifestToRenderer.mock.invocationCallOrder[0]);

        // A retry returns the recorded agreement without a second transaction or reveal.
        expect(await invoke('resolve-dayton', proposal)).toMatchObject({ ok: true });
        expect(sendReplayManifestToRenderer).toHaveBeenCalledOnce();
        expect(sendGameStateToRenderer).toHaveBeenCalledOnce();
    });

    it('stays silent when the war ends with no live frames recorded', async () => {
        const { invoke, context, sendReplayManifestToRenderer } = loadHandlers(withDayton());
        context.liveReplayManifestFrames = [];

        expect(await invoke('resolve-dayton', {})).toMatchObject({ ok: true });
        expect(sendReplayManifestToRenderer).not.toHaveBeenCalled();
    });
});
