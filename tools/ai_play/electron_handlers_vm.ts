/**
 * Run REAL `electron-main.cjs` IPC handlers outside Electron (Electron exits if required in Node).
 *
 * The handler registrations and the canonical write path are sliced out of the main-process source and
 * executed in a vm context that replaces only the process and IO boundaries (the renderer push, the
 * autosave, the base directory). Everything else, including `readCanonicalCurrentState`,
 * `writeCanonicalCurrentState` and the handler bodies, is the shipped code. Used by
 * `tests/desktop_ipc_state_paths_e2e.test.ts` and `ipc_state_paths_played_proof.ts`.
 *
 * Add a channel by adding a row to HANDLER_SLICES: the slice runs from the `ipcMain.handle('<channel>'`
 * line to the first marker after it. The marker must be text that really follows the handler.
 */
import './repo_root_cwd.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as desktopSim from '../../src/desktop/desktop_sim.js';
import type { GameState } from '../../src/state/game_state.js';

const require = createRequire(import.meta.url);
const { computeCorpsCommandStrain } = require('../../src/desktop/command_strain.cjs') as {
    computeCorpsCommandStrain: (state: unknown, corpsId: string, turn: number) => { totalStrain: number; isCompromised: boolean };
};

export type Handler = (event: object, payload: unknown) => Promise<Record<string, unknown>>;

/** channel -> text that follows its handler in electron-main.cjs */
export const HANDLER_SLICES: Record<string, string> = {
    'stage-opsec-toggle': "ipcMain.handle('stage-municipality-support-order'",
    'refuse-negotiated-evacuation': '// Serves the PARKED operation planner',
    'stabilize-command-relationship': '// ── Presidential FRONT VISIT',
    'stage-assign-operation-commander': '// NOTE: the legacy `assign-commander`',
};

export interface ElectronHandlers {
    invoke: (channel: string, payload: unknown) => Promise<Record<string, unknown>>;
    /** The canonical state as the handler last saved it (deserialized, migrated). */
    saved: () => GameState;
    /** The saved JSON parsed as-is: the real top-level keys. */
    rawSaved: () => Record<string, unknown>;
    /** Replace the live state the handlers read (as the main process does after a turn). */
    feed: (next: GameState) => void;
}

export function loadElectronHandlers(state: GameState, channels: readonly string[] = Object.keys(HANDLER_SLICES)): ElectronHandlers {
    const source = readFileSync('src/desktop/electron-main.cjs', 'utf8');
    const between = (from: string, to: string): string => {
        const a = source.indexOf(from);
        const b = a < 0 ? -1 : source.indexOf(to, a + 1);
        if (a < 0 || b < 0) throw new Error(`cannot slice electron-main.cjs: ${from} .. ${to}`);
        return source.slice(a, b);
    };
    const canonical = between('function readCanonicalCurrentState(', 'async function loadStatePathIntoDesktop(');
    const parts = channels.map((channel) => {
        const marker = HANDLER_SLICES[channel];
        if (!marker) throw new Error(`no slice registered for channel ${channel}`);
        return between(`ipcMain.handle('${channel}'`, marker);
    });
    const handlers = new Map<string, Handler>();
    const sim = { ...desktopSim, writeOwedTerminationRecords: () => undefined };
    const json = desktopSim.serializeState(state);
    const context = {
        currentGameStateJson: json,
        currentCanonicalSaveJson: json,
        getDesktopSim: () => sim,
        getBaseDir: () => process.cwd(),
        ipcMain: { handle: (channel: string, handler: Handler) => handlers.set(channel, handler) },
        autoSave: () => undefined,
        sendGameStateToRenderer: () => undefined,
        sendReplayManifestToRenderer: () => undefined,
        liveReplayManifestFrames: [] as unknown[],
        computeCorpsCommandStrain,
    };
    runInNewContext(`${canonical}\n${parts.join('\n')}`, context);
    return {
        invoke: (channel, payload) => {
            const handler = handlers.get(channel);
            if (!handler) throw new Error(`channel not registered: ${channel}`);
            return handler({}, payload);
        },
        saved: () => desktopSim.deserializeState(context.currentCanonicalSaveJson),
        rawSaved: () => JSON.parse(context.currentCanonicalSaveJson) as Record<string, unknown>,
        feed: (next) => {
            const nextJson = desktopSim.serializeState(next);
            context.currentGameStateJson = nextJson;
            context.currentCanonicalSaveJson = nextJson;
        },
    };
}
