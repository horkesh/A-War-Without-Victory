import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('desktop persistence contract', () => {
  it('routes every simulation IPC dependency through the built desktop bundle', () => {
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const desktopSim = readFileSync(
      resolve(process.cwd(), 'src/desktop/desktop_sim.ts'),
      'utf8',
    );

    const requiredExports = [
      'interpretOperationLaunch',
      'overrideInterpretation',
      'dismissEventNotification',
      'resolvePeacePlan',
      'submitPlayerCounterOffer',
      'resolveDaytonNegotiation',
      'evaluateBotResponse',
      'createAiClient',
      'getAdvisorRecommendation',
    ];

    for (const exportName of requiredExports) {
      expect(desktopSim).toContain(exportName);
      expect(electronMain).toContain(`sim.${exportName}`);
    }
    expect(electronMain).not.toMatch(/(?:require\(|import\()[^\n]*\.\.\/sim\//);
  });

  it('autosaves every canonical presidential mutation after serialization', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const helperStart = source.indexOf('function writeCanonicalCurrentState');
    const helperEnd = source.indexOf('function ensureCorpsCommandEntry', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helper).toContain('currentGameStateJson = sim.serializeState(state);');
    expect(helper).toContain('autoSave();');
    expect(helper.indexOf('autoSave();')).toBeGreaterThan(helper.indexOf('currentGameStateJson = sim.serializeState(state);'));
    expect(helper).toContain('sendGameStateToRenderer(currentGameStateJson);');
    expect(helper).not.toContain('sendGameStateToRenderer(currentGameStateJson, excludeSender);');
  });

  it('does not report a canonical mutation as successful when autosave fails', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const autoSaveStart = source.indexOf('function autoSave()');
    const autoSaveEnd = source.indexOf('function createWindow()', autoSaveStart);
    const autoSave = source.slice(autoSaveStart, autoSaveEnd);

    expect(autoSave).toContain("return writeSaveFile('autosave.json');");
    expect(autoSave).not.toContain('catch');
  });

  it('persists turn advance through the canonical mutation helper before broadcasting the report', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const handlerStart = source.indexOf("ipcMain.handle('advance-turn'");
    const handlerEnd = source.indexOf("ipcMain.handle('save-game'", handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handler).toContain('writeCanonicalCurrentState(sim, result.state, _event.sender);');
    expect(handler).not.toContain('currentGameStateJson = sim.serializeState(result.state);');
  });

  it('establishes a durable autosave as soon as a new campaign starts', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const handlerStart = source.indexOf("ipcMain.handle('start-new-campaign'");
    const handlerEnd = source.indexOf("ipcMain.handle('load-state-dialog'", handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);

    expect(handler).toContain('writeCanonicalCurrentState(sim, state, _event.sender);');
    expect(handler).not.toContain('currentGameStateJson = sim.serializeState(state);');
  });

  it('writes packaged saves under Electron userData instead of the install tree', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const helperStart = source.indexOf('function getSavesDir');
    const helperEnd = source.indexOf('function writeSaveFile', helperStart);
    const helper = source.slice(helperStart, helperEnd);

    expect(helper).toContain('app.isPackaged');
    expect(helper).toContain("app.getPath('userData')");
    expect(helper).toContain("path.join(root, 'saves')");
  });

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

    expect(preload).toContain("resolveParamilitaryRequests: (decisions, options) => ipcRenderer.invoke('resolve-paramilitary-requests'");
    expect(preload).toContain('policy: options?.policy');
    expect(useIpc).toContain('resolveParamilitaryRequests');
    const handlerStart = electronMain.indexOf("ipcMain.handle('resolve-paramilitary-requests'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('resolve-dayton'");
    const handler = electronMain.slice(handlerStart, handlerEnd);

    expect(handler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(handler).toContain('state.paramilitary_policy = policy;');
    expect(handler).toContain('sim.resolvePlayerParamilitaryDecisions(state)');
    expect(handler).toContain('writeCanonicalCurrentState(sim, state)');
  });

  it('event-decision IPC resolves through the desktop sim bundle instead of source-only dynamic imports', () => {
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const desktopSim = readFileSync(
      resolve(process.cwd(), 'src/desktop/desktop_sim.ts'),
      'utf8',
    );

    const handlerStart = electronMain.indexOf("ipcMain.handle('respond-to-event-decision'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('dismiss-event-notification'", handlerStart);
    const handler = electronMain.slice(handlerStart, handlerEnd);

    expect(handler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(handler).toContain('sim.resolveEventDecision(state, eventId, responseId)');
    expect(handler).toContain('writeCanonicalCurrentState(sim, state);');
    expect(handler).not.toContain("import('../sim/events/resolve_decision.js')");
    expect(desktopSim).toContain("from '../sim/events/resolve_decision.js'");
    expect(desktopSim).toContain('resolveEventDecision');
  });

  it('builds the recruitment catalog from the loaded canonical state', () => {
    const electronMain = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const handlerStart = electronMain.indexOf("ipcMain.handle('get-recruitment-catalog'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('apply-recruitment'", handlerStart);
    const handler = electronMain.slice(handlerStart, handlerEnd);

    expect(handler).toContain('const state = readCanonicalCurrentState(sim);');
    expect(handler).toContain('sim.getPlayerRecruitmentCatalog(state, getBaseDir())');
    expect(handler).not.toContain('sim.getRecruitmentCatalog(getBaseDir())');
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

  it('persists the Main Staff reserve hold through the complete desktop bridge', () => {
    const electronMain = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const preload = readFileSync(resolve(process.cwd(), 'src/desktop/preload.cjs'), 'utf8');
    const useIpc = readFileSync(resolve(process.cwd(), 'src/ui/map/desktop/useIPC.ts'), 'utf8');

    expect(preload).toContain("holdReserveAtMainStaff: (requestId) => ipcRenderer.invoke('hold-reserve-at-main-staff'");
    expect(useIpc).toContain('holdReserveAtMainStaff: (requestId: string)');
    const handlerStart = electronMain.indexOf("ipcMain.handle('hold-reserve-at-main-staff'");
    const handlerEnd = electronMain.indexOf("ipcMain.handle('decline-reserve-request'", handlerStart);
    const handler = electronMain.slice(handlerStart, handlerEnd);
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    expect(handler).toContain('sim.holdReserveAtMainStaff(state, requestId)');
    expect(handler).toContain('writeCanonicalCurrentState(sim, state, _event.sender)');
  });
});
