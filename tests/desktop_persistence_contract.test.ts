import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

function extractFunctionSource(source: string, name: string): string {
  let start = source.indexOf(`function ${name}(`);
  expect(start, `missing function ${name}`).toBeGreaterThanOrEqual(0);
  const asyncStart = source.lastIndexOf('async ', start);
  if (asyncStart >= 0 && asyncStart + 'async '.length === start) start = asyncStart;
  const paramsStart = source.indexOf('(', start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < source.length; index += 1) {
    if (source[index] === '(') paramsDepth += 1;
    if (source[index] === ')') paramsDepth -= 1;
    if (paramsDepth === 0) {
      paramsEnd = index;
      break;
    }
  }
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`unterminated function ${name}`);
}

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

  it('does not expose the retired operation-name launch authority through the desktop bridge', () => {
    const retiredHandler = ['stage', 'operation', 'force', 'launch'].join('-');
    const retiredBridgeMethod = ['stage', 'Operation', 'Force', 'Launch'].join('');
    const retiredSimExport = ['interpret', 'Operation', 'Launch'].join('');
    const sources = [
      'src/desktop/electron-main.cjs',
      'src/desktop/preload.cjs',
      'src/desktop/desktop_sim.ts',
      'src/ui/map/desktop/useIPC.ts',
    ].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8'));

    for (const source of sources) {
      expect(source).not.toContain(retiredHandler);
      expect(source).not.toContain(retiredBridgeMethod);
      expect(source).not.toContain(retiredSimExport);
    }
  });

  it('autosaves every canonical presidential mutation after serialization', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const persist = extractFunctionSource(source, 'persistCurrentStateSnapshots');
    const writer = extractFunctionSource(source, 'writeCanonicalCurrentState');

    expect(persist).toContain('setCurrentStateSnapshots(sim, state);');
    expect(persist).toContain('autoSave();');
    expect(persist.indexOf('autoSave();')).toBeGreaterThan(persist.indexOf('setCurrentStateSnapshots(sim, state);'));
    expect(persist).toContain('currentGameStateJson = previousGameStateJson;');
    expect(persist).toContain('currentCanonicalSaveJson = previousCanonicalSaveJson;');
    expect(writer).toContain('persistCurrentStateSnapshots(sim, state);');
    expect(writer).toContain('sendGameStateToRenderer(currentGameStateJson);');
    expect(writer).not.toContain('sendGameStateToRenderer(currentGameStateJson, excludeSender);');
  });

  it('transactionally persists replacement snapshots and rolls memory back when autosave fails', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const helper = extractFunctionSource(source, 'persistCurrentStateSnapshots');
    const makeSubject = (failSave: boolean) => runInNewContext(`(() => {
      let currentGameStateJson = 'runtime-before';
      let currentCanonicalSaveJson = 'canonical-before';
      const setCurrentStateSnapshots = (_sim, state) => {
        currentGameStateJson = 'runtime-' + state.id;
        currentCanonicalSaveJson = 'canonical-' + state.id;
      };
      const autoSave = () => { if (${failSave}) throw new Error('disk-full'); };
      const persistCurrentStateSnapshots = ${helper};
      return {
        persistCurrentStateSnapshots,
        snapshots: () => ({ currentGameStateJson, currentCanonicalSaveJson }),
      };
    })()`, { Error }) as {
      persistCurrentStateSnapshots: (sim: unknown, state: { id: string }) => void;
      snapshots: () => { currentGameStateJson: string; currentCanonicalSaveJson: string };
    };

    const success = makeSubject(false);
    success.persistCurrentStateSnapshots({}, { id: 'after' });
    expect(success.snapshots()).toEqual({
      currentGameStateJson: 'runtime-after',
      currentCanonicalSaveJson: 'canonical-after',
    });

    const failure = makeSubject(true);
    expect(() => failure.persistCurrentStateSnapshots({}, { id: 'after' })).toThrow('disk-full');
    expect(failure.snapshots()).toEqual({
      currentGameStateJson: 'runtime-before',
      currentCanonicalSaveJson: 'canonical-before',
    });
  });

  it('loads a selected state through canonical persistence before replay sidecars and replacement broadcast', async () => {
    const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const helper = extractFunctionSource(source, 'loadStatePathIntoDesktop');
    const order: string[] = [];
    const subject = runInNewContext(`(() => {
      let liveReplayManifestFrames = ['stale'];
      const currentGameStateJson = 'runtime-loaded';
      const loadStatePathIntoDesktop = ${helper};
      return { loadStatePathIntoDesktop, ledger: () => liveReplayManifestFrames };
    })()`, {
      getDesktopSim: () => ({
        loadStateFromPath: async (filePath: string, baseDir: string) => { order.push(`load:${filePath}:${baseDir}`); return { state: { id: 'loaded' } }; },
      }),
      getBaseDir: () => 'explicit-root',
      readReplaySaveManifestSidecar: () => { order.push('read-manifest'); return 'manifest-json'; },
      readReplaySaveSequenceSidecar: () => { order.push('read-sequence'); return 'sequence-json'; },
      persistCurrentStateSnapshots: () => { order.push('persist-autosave'); },
      sendReplayManifestToRenderer: () => { order.push('send-manifest'); },
      sendReplaySequenceToRenderer: () => { order.push('send-sequence'); },
      sendGameStateToRenderer: () => { order.push('broadcast-state'); },
      projectCurrentGameStateForRenderer: () => { order.push('project-state'); return 'projected-json'; },
      CAMPAIGN_REPLACEMENT_UPDATE: { campaignReplacement: true },
    }) as {
      loadStatePathIntoDesktop: (filePath: string, sender: unknown) => Promise<{ ok: boolean; stateJson: string }>;
      ledger: () => unknown[];
    };

    await expect(subject.loadStatePathIntoDesktop('resume.json', 'initiating-renderer')).resolves.toEqual({ ok: true, stateJson: 'projected-json' });
    expect(order).toEqual([
      'load:resume.json:explicit-root',
      'read-manifest',
      'persist-autosave',
      'send-manifest',
      'broadcast-state',
      'project-state',
    ]);
    expect(subject.ledger()).toEqual([]);

    const handlerStart = source.indexOf("ipcMain.handle('load-state-dialog'");
    const handlerEnd = source.indexOf("ipcMain.handle('list-save-records'", handlerStart);
    const handler = source.slice(handlerStart, handlerEnd);
    expect(handler).toContain('loadStatePathIntoDesktop(result.filePaths[0], _event.sender)');
  });

  it('does not release replay or renderer state when imported-state autosave fails', async () => {
    const source = readFileSync(resolve(process.cwd(), 'src/desktop/electron-main.cjs'), 'utf8');
    const helper = extractFunctionSource(source, 'loadStatePathIntoDesktop');
    const released: string[] = [];
    const subject = runInNewContext(`(() => {
      let liveReplayManifestFrames = ['stale'];
      const currentGameStateJson = 'runtime-before';
      const loadStatePathIntoDesktop = ${helper};
      return { loadStatePathIntoDesktop, ledger: () => liveReplayManifestFrames };
    })()`, {
      getDesktopSim: () => ({ loadStateFromPath: async () => ({ state: { id: 'loaded' } }) }),
      getBaseDir: () => 'explicit-root',
      readReplaySaveManifestSidecar: () => 'manifest-json',
      readReplaySaveSequenceSidecar: () => null,
      persistCurrentStateSnapshots: () => { throw new Error('disk-full'); },
      sendReplayManifestToRenderer: () => { released.push('manifest'); },
      sendReplaySequenceToRenderer: () => { released.push('sequence'); },
      sendGameStateToRenderer: () => { released.push('state'); },
      projectCurrentGameStateForRenderer: () => { released.push('projection'); return 'projected-json'; },
      CAMPAIGN_REPLACEMENT_UPDATE: { campaignReplacement: true },
    }) as {
      loadStatePathIntoDesktop: (filePath: string, sender: unknown) => Promise<unknown>;
      ledger: () => unknown[];
    };

    await expect(subject.loadStatePathIntoDesktop('resume.json', 'initiating-renderer')).rejects.toThrow('disk-full');
    expect(released).toEqual([]);
    expect(subject.ledger()).toEqual(['stale']);
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
    expect(handler).toContain('sim.deserializeState(currentGameStateJson)');
    expect(handler).not.toMatch(/deserializeState\([^)]*(?:payload|stateJson)/);
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

    expect(handler).toContain('CAMPAIGN_REPLACEMENT_UPDATE');
    expect(handler).toContain('{ excludeSenderFromBroadcast: true }');
    expect(handler).toContain('stateJson: projectCurrentGameStateForRenderer()');
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

  it('isolates packaged runtime diagnostics under Electron userData without changing an explicit output root', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const helperStart = source.indexOf('function configurePackagedRuntimeOutputRoot');
    const helperEnd = source.indexOf('\n}', helperStart);
    const helper = source.slice(helperStart, helperEnd);
    const readyStart = source.indexOf('app.whenReady().then(() => {');
    const ready = source.slice(readyStart, readyStart + 300);

    expect(helperStart).toBeGreaterThanOrEqual(0);
    expect(helper).toContain('app.isPackaged');
    expect(helper).toContain('process.env.AWWV_RUNTIME_OUTPUT_ROOT');
    expect(helper).toContain("path.join(app.getPath('userData'), 'runtime-output')");
    expect(ready).toContain('configurePackagedRuntimeOutputRoot();');
    expect(ready.indexOf('configurePackagedRuntimeOutputRoot();')).toBeLessThan(ready.indexOf('alignPackagedProcessCwdWithResources();'));
  });

  it('separates runtime renderer bytes from canonical disk-save bytes', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );
    const snapshotsStart = source.indexOf('function setCurrentStateSnapshots');
    const snapshotsEnd = source.indexOf('function writeCanonicalCurrentState', snapshotsStart);
    const snapshots = source.slice(snapshotsStart, snapshotsEnd);
    const saveStart = source.indexOf('function writeSaveFile');
    const saveEnd = source.indexOf('function autoSave', saveStart);
    const save = source.slice(saveStart, saveEnd);

    expect(snapshots).toContain('sim.serializeRuntimeState(state)');
    expect(snapshots).toContain('sim.serializeState(state)');
    expect(snapshots).toContain('currentGameStateJson = runtimeStateJson;');
    expect(snapshots).toContain('currentCanonicalSaveJson = canonicalSaveJson;');
    expect(save).toContain("fs.writeFileSync(filePath, currentCanonicalSaveJson, 'utf-8');");
    expect(save).not.toContain('currentGameStateJson');
  });

  it('exports the runtime serializer through the Electron simulation bundle entry', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/desktop_sim.ts'),
      'utf8',
    );

    expect(source).toContain("import { deserializeState, serializeRuntimeState, serializeState } from '../state/serialize.js';");
    expect(source).toMatch(/export \{[\s\S]*serializeRuntimeState,[\s\S]*serializeState,[\s\S]*\};/);
  });

  it('autonomy and proposal IPC writes keep currentGameStateJson on the canonical serializer path', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/desktop/electron-main.cjs'),
      'utf8',
    );

    expect(source).toContain('function readCanonicalCurrentState(sim)');
    expect(source).toContain('function writeCanonicalCurrentState(sim, state, excludeSender, metadata, options = {})');
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
    expect(handler).toContain('sim.resolveDesktopEventDecision(state, eventId, responseId, getBaseDir())');
    expect(handler).toContain('writeCanonicalCurrentState(sim, nextState, _event.sender);');
    expect(handler).not.toContain('state.paramilitary_policy =');
    expect(handler).not.toContain('pending_paramilitary_requests');
    // Every war-ending IPC path saves through this choke point, which writes owed
    // no-choice records before the snapshot/autosave.
    const writer = extractFunctionSource(electronMain, 'writeCanonicalCurrentState');
    expect(writer).toContain('if (state?.meta?.game_over === true) sim.writeOwedTerminationRecords(state, getBaseDir());');
    expect(writer.indexOf('sim.writeOwedTerminationRecords(')).toBeLessThan(writer.indexOf('persistCurrentStateSnapshots(sim, state);'));
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
