import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('desktop persistence contract', () => {
  it('autonomy and proposal IPC writes keep currentGameStateJson on the canonical serializer path', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    expect(source).toContain('function readCanonicalCurrentState(sim)');
    expect(source).toContain('function writeCanonicalCurrentState(sim, state, excludeSender)');
    expect(source).not.toContain('currentGameStateJson = JSON.stringify(state)');
    expect(source).toContain('writeCanonicalCurrentState(sim, state);');
    expect(source).toContain('writeCanonicalCurrentState(sim, state, event.sender);');
  });

  it('autonomy readback uses canonical deserialization instead of raw JSON.parse', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    const autonomyHandlerStart = source.indexOf("ipcMain.handle('get-autonomy-state'");
    const autonomyHandlerEnd = source.indexOf("ipcMain.handle('set-autonomy-level'");
    const autonomyHandler = source.slice(autonomyHandlerStart, autonomyHandlerEnd);

    expect(autonomyHandler).toContain('const sim = getDesktopSim();');
    expect(autonomyHandler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(autonomyHandler).not.toContain('JSON.parse(currentGameStateJson)');
  });

  it('paramilitary review IPC records decisions and uses the canonical resolver', () => {
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const preload = readFileSync(
      resolve(process.cwd(), 'src/desktop/preload.cjs'),
      'utf8',
    );
    const useIpc = readFileSync(
      resolve(process.cwd(), 'src/ui/map/desktop/useIPC.ts'),
      'utf8',
    );

    expect(preload).toContain("resolveParamilitaryRequests: (decisions) => ipcRenderer.invoke('resolve-paramilitary-requests'");
    expect(useIpc).toContain('resolveParamilitaryRequests');
    const handlerStart = electronMain.indexOf("ipcMain.handle('resolve-paramilitary-requests'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('resolve-dayton'");
    const handler = electronMain.slice(handlerStart, handlerEnd);

    expect(handler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(handler).toContain('sim.resolvePlayerParamilitaryDecisions(state)');
    expect(handler).toContain('writeCanonicalCurrentState(sim, state)');
  });

  it('advance-turn gate uses the shared player decision manifest', () => {
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    const handlerStart = electronMain.indexOf("ipcMain.handle('advance-turn'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('save-game'");
    const handler = electronMain.slice(handlerStart, handlerEnd);

    expect(handler).toContain('sim.listBlockingPlayerDecisions');
    expect(handler).toContain("error: 'pending_required_decisions'");
    expect(handler).not.toContain('state.military.pending_event_decisions ?? []');
  });

  it('runtime feature flags are bridged to the renderer without exposing process.env', () => {
    const desktopSim = readFileSync(
      resolve(process.cwd(), 'src/desktop/desktop_sim.ts'),
      'utf8',
    );
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const preload = readFileSync(
      resolve(process.cwd(), 'src/desktop/preload.cjs'),
      'utf8',
    );
    const useIpc = readFileSync(
      resolve(process.cwd(), 'src/ui/map/desktop/useIPC.ts'),
      'utf8',
    );

    expect(desktopSim).toContain('function getRuntimeFeatureFlags()');
    expect(desktopSim).toContain('isSrkStranglePostureEnabled()');
    expect(electronMain).toContain("registerIpcHandler('get-runtime-feature-flags'");
    expect(electronMain).toContain('sim.getRuntimeFeatureFlags()');
    expect(preload).toContain("getRuntimeFeatureFlags: () => ipcRenderer.invoke('get-runtime-feature-flags')");
    expect(useIpc).toContain('getRuntimeFeatureFlags');
  });
});
