/**
 * TIER1-REPLAY-LIVE: source-anchor smoke test.
 *
 * Reads electron-main.cjs and desktop_sim.ts as raw strings and asserts that
 * the producer wire-in points are present and correctly placed.
 *
 * Pattern follows replay_surface_truth.test.ts (file-as-string assertions).
 * These are static shape tests — they do NOT run the Electron process.
 *
 * Calibration-inert: reads source files only, no sim execution.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readRepoFile(...parts: string[]): string {
    return readFileSync(join(process.cwd(), ...parts), 'utf8');
}

describe('desktop_replay_live_wire_smoke — electron-main.cjs', () => {
    const electronMain = readRepoFile('src', 'desktop', 'electron-main.cjs');

    it('declares liveReplayManifestFrames at module scope', () => {
        expect(electronMain).toContain('let liveReplayManifestFrames = []');
    });

    it('advance-turn handler calls buildReplayFrameSummary', () => {
        // Confirm the call exists somewhere in the file
        expect(electronMain).toContain('sim.buildReplayFrameSummary(result.state)');
    });

    it('advance-turn handler calls sendReplayManifestToRenderer after autoSave', () => {
        const autoSaveIdx = electronMain.indexOf('autoSave();');
        // There may be multiple autoSave() calls; find the one inside advance-turn.
        // The advance-turn handler is the only one that follows with sendReplayManifestToRenderer.
        expect(electronMain).toContain('sendReplayManifestToRenderer(JSON.stringify(liveManifest))');
        // Verify the manifest send comes AFTER autoSave() in file order
        const manifestSendIdx = electronMain.indexOf('sendReplayManifestToRenderer(JSON.stringify(liveManifest))');
        expect(manifestSendIdx).toBeGreaterThan(autoSaveIdx);
    });

    it('start-new-campaign handler resets liveReplayManifestFrames', () => {
        // Find the start-new-campaign handler block and confirm reset is present
        const handlerIdx = electronMain.indexOf("ipcMain.handle('start-new-campaign'");
        expect(handlerIdx).toBeGreaterThan(-1);
        // The reset must appear after the handler declaration
        const resetIdx = electronMain.indexOf('liveReplayManifestFrames = []', handlerIdx);
        expect(resetIdx).toBeGreaterThan(handlerIdx);
    });

    it('load-state-dialog handler resets liveReplayManifestFrames', () => {
        const handlerIdx = electronMain.indexOf("ipcMain.handle('load-state-dialog'");
        expect(handlerIdx).toBeGreaterThan(-1);
        const resetIdx = electronMain.indexOf('liveReplayManifestFrames = []', handlerIdx);
        expect(resetIdx).toBeGreaterThan(handlerIdx);
    });

    it('load-state-dialog broadcasts loaded state to the initiating renderer', () => {
        const handlerStart = electronMain.indexOf("ipcMain.handle('load-state-dialog'");
        const handlerEnd = electronMain.indexOf('});', handlerStart);
        const handlerBody = electronMain.slice(handlerStart, handlerEnd);

        expect(handlerBody).toContain('sendGameStateToRenderer(currentGameStateJson);');
        expect(handlerBody).not.toContain('sendGameStateToRenderer(currentGameStateJson, _event.sender);');
    });

    it('load-state-dialog broadcasts replay sidecars to the initiating renderer', () => {
        const handlerStart = electronMain.indexOf("ipcMain.handle('load-state-dialog'");
        const handlerEnd = electronMain.indexOf('});', handlerStart);
        const handlerBody = electronMain.slice(handlerStart, handlerEnd);

        expect(handlerBody).toContain('sendReplayManifestToRenderer(manifestJson);');
        expect(handlerBody).toContain('sendReplaySequenceToRenderer(sequenceJson);');
        expect(handlerBody).not.toContain('sendReplayManifestToRenderer(manifestJson, _event.sender);');
        expect(handlerBody).not.toContain('sendReplaySequenceToRenderer(sequenceJson, _event.sender);');
    });

    it('load-scenario-dialog handler resets liveReplayManifestFrames', () => {
        const handlerIdx = electronMain.indexOf("ipcMain.handle('load-scenario-dialog'");
        expect(handlerIdx).toBeGreaterThan(-1);
        const resetIdx = electronMain.indexOf('liveReplayManifestFrames = []', handlerIdx);
        expect(resetIdx).toBeGreaterThan(handlerIdx);
    });

    it('menu Load scenario click handler resets liveReplayManifestFrames', () => {
        // The menu click handler uses label 'Load scenario...'
        const menuIdx = electronMain.indexOf("label: 'Load scenario...'");
        expect(menuIdx).toBeGreaterThan(-1);
        const resetIdx = electronMain.indexOf('liveReplayManifestFrames = []', menuIdx);
        expect(resetIdx).toBeGreaterThan(menuIdx);
    });

    it('menu Load state file click handler resets liveReplayManifestFrames', () => {
        const menuIdx = electronMain.indexOf("label: 'Load state file...'");
        expect(menuIdx).toBeGreaterThan(-1);
        const resetIdx = electronMain.indexOf('liveReplayManifestFrames = []', menuIdx);
        expect(resetIdx).toBeGreaterThan(menuIdx);
    });

    it('menu Load state file sends replay sidecars before loaded state', () => {
        const menuStart = electronMain.indexOf("label: 'Load state file...'");
        const menuEnd = electronMain.indexOf("{ type: 'separator' }", menuStart);
        const menuBody = electronMain.slice(menuStart, menuEnd);

        expect(menuBody).toContain('readReplaySaveManifestSidecar(result.filePaths[0])');
        expect(menuBody).toContain('sendReplayManifestToRenderer(manifestJson);');
        expect(menuBody).toContain('sendReplaySequenceToRenderer(sequenceJson);');
        expect(menuBody.indexOf('sendReplayManifestToRenderer(manifestJson);')).toBeLessThan(
            menuBody.indexOf('sendGameStateToRenderer(currentGameStateJson);'),
        );
        expect(menuBody.indexOf('sendReplaySequenceToRenderer(sequenceJson);')).toBeLessThan(
            menuBody.indexOf('sendGameStateToRenderer(currentGameStateJson);'),
        );
    });

    it('does not call buildReplayFrameSummary from the load-state-dialog handler (no double accumulation)', () => {
        // The load-state-dialog handler reads a sidecar file instead of accumulating frames.
        // Confirm the frame accumulation call is NOT inside that handler.
        const handlerStart = electronMain.indexOf("ipcMain.handle('load-state-dialog'");
        const handlerEnd = electronMain.indexOf('});', handlerStart);
        const handlerBody = electronMain.slice(handlerStart, handlerEnd);
        expect(handlerBody).not.toContain('buildReplayFrameSummary');
    });

    it('existing replay-surface-truth ordering constraint still holds (load path: manifest before state)', () => {
        // replay_surface_truth.test.ts line 23-25: sendReplayManifestToRenderer(manifestJson
        // must appear before sendGameStateToRenderer(currentGameStateJson in file order.
        // The new advance-turn call uses JSON.stringify(liveManifest), not manifestJson —
        // so the first occurrence of sendReplayManifestToRenderer(manifestJson is still
        // in the load-state-dialog handler, which precedes sendGameStateToRenderer there.
        const manifestCallIdx = electronMain.indexOf('sendReplayManifestToRenderer(manifestJson');
        const stateCallIdx = electronMain.indexOf('sendGameStateToRenderer(currentGameStateJson');
        expect(manifestCallIdx).toBeGreaterThan(-1);
        expect(manifestCallIdx).toBeLessThan(stateCallIdx);
    });
});

describe('desktop_replay_live_wire_smoke — desktop_sim.ts', () => {
    const desktopSim = readRepoFile('src', 'desktop', 'desktop_sim.ts');

    it('re-exports buildReplayFrameSummary from sim/replay', () => {
        expect(desktopSim).toContain('export { buildReplayFrameSummary }');
        expect(desktopSim).toContain('replay_frame_summary.js');
    });

    it('re-exports buildReplaySaveManifest from sim/replay', () => {
        expect(desktopSim).toContain('export { buildReplaySaveManifest }');
        expect(desktopSim).toContain('replay_manifest.js');
    });

    it('does not import any Node-only fs/path modules for the replay exports', () => {
        // replay_frame_summary and replay_manifest are browser-safe;
        // their import lines must not introduce node: imports
        const frameIdx = desktopSim.indexOf('replay_frame_summary');
        const manifestIdx = desktopSim.indexOf('replay_manifest');
        // Neither export line should contain 'node:'
        const frameExportLine = desktopSim.slice(frameIdx - 20, frameIdx + 60);
        const manifestExportLine = desktopSim.slice(manifestIdx - 20, manifestIdx + 60);
        expect(frameExportLine).not.toContain('node:');
        expect(manifestExportLine).not.toContain('node:');
    });
});
