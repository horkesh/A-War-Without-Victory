/**
 * PAUSE BEFORE COMBAT (owner decision 2026-11-05) — IPC name wiring across the three
 * desktop layers. electron-main.cjs cannot be imported under vitest, so the channel names
 * are asserted at the source level; the pause behaviour itself is unit-tested through
 * `createPausedTurnController` (desktop_ipc_mutation_policy.test.ts) and the pipeline hook
 * (tests/sim/turn_pipeline_player_decision_pause.test.ts).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('pause-before-combat IPC wiring', () => {
    const main = read('src/desktop/electron-main.cjs');
    const preload = read('src/desktop/preload.cjs');
    const useIpc = read('src/ui/map/desktop/useIPC.ts');
    const session = read('src/ui/map/hooks/useDesktopSession.ts');

    it('advance-turn hands the pipeline the pause callback and always ends the pause', () => {
        const start = main.indexOf("ipcMain.handle('advance-turn'");
        const end = main.indexOf("ipcMain.handle('save-game'", start);
        const handler = main.slice(start, end);
        expect(handler).toContain('onPlayerDecisionsPending: (workingState, decisions) => pausedTurn.pause(workingState, decisions)');
        expect(handler).toMatch(/finally \{[\s\S]*pausedTurn\.end\(\);/);
    });

    it('answers and continue reach the paused turn and use matching channel names', () => {
        expect(main).toContain("ipcMain.handle('continue-paused-turn'");
        expect(main).toContain("webContents.send('turn-paused-for-decisions', status)");
        const respond = main.slice(
            main.indexOf("ipcMain.handle('respond-to-event-decision'"),
            main.indexOf("ipcMain.handle('continue-paused-turn'"),
        );
        expect(respond.indexOf('pausedTurn.respond(eventId, responseId)'))
            .toBeLessThan(respond.indexOf('ipcStateMutex.run('));

        expect(preload).toContain("ipcRenderer.on('turn-paused-for-decisions'");
        expect(preload).toContain("continuePausedTurn: () => ipcRenderer.invoke('continue-paused-turn')");
        expect(preload).toContain('subscribeTurnPausedForDecisions: (cb) => subscribe(turnPausedForDecisionsListeners, cb)');
        expect(useIpc).toContain('awwv.subscribeTurnPausedForDecisions(cb)');
        expect(useIpc).toContain('awwv.continuePausedTurn()');
        expect(session).toContain('setTurnPauseStatus(status ?? null)');
    });

    it('the mutex refuses other mutations while the turn is paused', () => {
        expect(main).toContain('createPauseAwareMutex(createSerialMutex(), () => pausedTurn.isPaused())');
    });
});
