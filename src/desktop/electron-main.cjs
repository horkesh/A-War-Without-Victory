'use strict';

const _electronModule = require('electron');
if (typeof _electronModule === 'string') {
  process.stderr.write(
    'ERROR: electron-main.cjs must be launched via the Electron binary.\n' +
    '  Correct:   electron .\n' +
    '  Correct:   npm run desktop\n' +
    '  Wrong:     node src/desktop/electron-main.cjs\n'
  );
  process.exit(1);
}
const { app, BrowserWindow, protocol, ipcMain, dialog, Menu } = _electronModule;
const path = require('path');
const fs = require('fs');
const http = require('http');
const {
  getPendingProposalReviewsForPlayer,
  resolvePendingProposalAccess,
  resolveOpportunityDecisionPayload,
  buildOpProposalCardData,
  buildForceableReadyPlanData,
  FORCE_LAUNCH_COST,
  PROACTIVE_FORCE_LAUNCH_COST,
  FRONT_VISIT_COST,
  ADDRESS_NATION_COST,
  DECORATE_UNIT_COST,
} = require('./autonomy_ipc_contract.cjs');
const { stageAuthoredOperation } = require('./author_op_staging.cjs');
const { stageOpHalt } = require('./op_halt.cjs');
const { stageOpDirective } = require('./op_directive_staging.cjs');
const { stageCoReplacement } = require('./co_replacement.cjs');
const { stageMunicipalitySupportOrderOnState } = require('./municipality_support_staging.cjs');
const { computeCorpsCommandStrain } = require('./command_strain.cjs');
const {
  frontVisitEventIdForFaction,
  computeFrontVisitAvailability,
  buildFrontVisitPendingDecision,
} = require('./front_visit_contract.cjs');
const {
  addressNationEventIdForFaction,
  computeAddressNationAvailability,
  buildAddressNationPendingDecision,
} = require('./address_nation_contract.cjs');
const {
  decorateUnitEventIdForFaction,
  computeDecorateUnitAvailability,
  buildDecorateUnitPendingDecision,
} = require('./decorate_unit_contract.cjs');
const { stageConvoyDecisionOnState } = require('./convoy_ipc_contract.cjs');
const { fileOfficerDecisionRecord } = require('./officer_decision_history.cjs');
const RUNTIME_PROBE_MODE = process.env.AWWV_DESKTOP_RUNTIME_PROBE === '1';

/** Project root (dev) or resources root (packaged). Used for data paths and desktop sim. */
function getBaseDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', '..');
  }
  return path.join(__dirname, '..', '..');
}

/**
 * Resolve the application icon path for BrowserWindow `icon:` wiring.
 *
 * Dev: <repo>/build/icon.png (sibling of src/desktop/).
 * Packaged: electron-builder copies build/icon.png into the app via the
 * top-level `build.icon` field; the .exe / AppImage launcher icon is set at
 * the OS level. The window-runtime icon below mainly affects Linux WMs
 * (Windows reuses the .exe icon for taskbar). Both paths point at the same
 * file relative to the resolved base dir.
 *
 * Determinism: pure path resolution; no Date / no Math.random.
 */
function getAppIconPath() {
  return path.join(getBaseDir(), 'build', 'icon.png');
}

/** In-memory game state for "play myself". Set by load-scenario or load-state; updated by advance-turn. */
let currentGameStateJson = null;
let mainWindow = null;
let tacticalMapWindow = null;

/**
 * Lazy-load + cache the authored `visit_to_front_<faction>` event definition
 * from data/scenarios/events/war_1993.json. Read-only; the file ships as
 * extraResources (data/scenarios/events) so it resolves in the packaged build
 * via getBaseDir(). Returns null when the event is not found / file unreadable.
 *
 * Determinism: pure file read; no Date / no Math.random. The cache is keyed by
 * event id and never mutated.
 */
let _frontVisitEventCache = null;
function loadFrontVisitEventDef(eventId) {
  if (!eventId) return null;
  if (_frontVisitEventCache === null) {
    try {
      const eventsPath = path.join(getBaseDir(), 'data', 'scenarios', 'events', 'war_1993.json');
      const raw = fs.readFileSync(eventsPath, 'utf-8');
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : (parsed.events || []);
      _frontVisitEventCache = {};
      for (const def of arr) {
        if (def && typeof def.id === 'string') _frontVisitEventCache[def.id] = def;
      }
    } catch (_e) {
      _frontVisitEventCache = {};
    }
  }
  return _frontVisitEventCache[eventId] ?? null;
}

/** Lazy-load desktop sim bundle (built by desktop:sim:build). Resolve from project root so path matches build output (dist/desktop/), not src/dist/desktop/. */
function getDesktopSim() {
  const bundlePath = path.join(getBaseDir(), 'dist', 'desktop', 'desktop_sim.cjs');
  if (!fs.existsSync(bundlePath)) {
    throw new Error('Desktop sim not built. Run: npm run desktop:sim:build');
  }
  return require(bundlePath);
}

function sendGameStateToRenderer(stateJson, excludeSender) {
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      if (excludeSender && win.webContents === excludeSender) continue;
      win.webContents.send('game-state-updated', stateJson);
    }
  }
}

/**
 * LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: read a sibling
 * `replay_save_sequence.json` next to a final_save.json (or any
 * GameState JSON loaded via the file dialog). The sequence is the
 * end-of-run consolidated artifact written by the scenario harness
 * (`finalizeReplaySaveSequence`). Returns null on absent / unreadable
 * file — the VerdictScreen Replay tab gates on length > 0, so absent
 * is the back-compat default.
 *
 * Read-only. No state mutation.
 */
function readReplaySaveSequenceSidecar(statePath) {
  try {
    const dir = path.dirname(statePath);
    const sidecarPath = path.join(dir, 'replay_save_sequence.json');
    if (!fs.existsSync(sidecarPath)) return null;
    const raw = fs.readFileSync(sidecarPath, 'utf-8');
    return raw;
  } catch (_e) {
    return null;
  }
}

function readReplaySaveManifestSidecar(statePath) {
  try {
    const dir = path.dirname(statePath);
    const manifestPath = path.join(dir, 'replay_save_manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    return fs.readFileSync(manifestPath, 'utf-8');
  } catch (_e) {
    return null;
  }
}

/** Forward a replay save sequence (raw JSON string of GameState[]) to renderers. */
function sendReplaySequenceToRenderer(sequenceJson, excludeSender) {
  if (!sequenceJson) return;
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      if (excludeSender && win.webContents === excludeSender) continue;
      win.webContents.send('replay-sequence-updated', sequenceJson);
    }
  }
}

function sendReplayManifestToRenderer(manifestJson, excludeSender) {
  if (!manifestJson) return;
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      if (excludeSender && win.webContents === excludeSender) continue;
      win.webContents.send('replay-manifest-updated', manifestJson);
    }
  }
}

function sendTurnReportToRenderer(report) {
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('turn-report-updated', report);
    }
  }
}

/**
 * Classify a save/load error into a player-facing message.
 * Raw validation details are appended for debugging but the leading text is human-readable.
 */
function classifyLoadError(e) {
  const raw = e.message || String(e);
  if (raw.includes('Unexpected token') || raw.includes('JSON')) {
    return 'Save file is damaged or not valid JSON. ' + raw;
  }
  if (raw.includes('shape validation failed') || raw.includes('unexpected top-level key')) {
    return 'Save file structure is incompatible with this version. ' + raw;
  }
  if (raw.includes('missing meta') || raw.includes('meta.turn')) {
    return 'Save file is missing required game data (no meta block). ' + raw;
  }
  if (raw.includes('Unsupported schema_version')) {
    return 'Save file was created by a newer version and cannot be loaded. ' + raw;
  }
  if (raw.includes('missing military block')) {
    return 'Save file is missing required military data. ' + raw;
  }
  if (raw.includes('validation') || raw.includes('error')) {
    return 'Save file failed validation. ' + raw;
  }
  return 'Failed to load save file. ' + raw;
}

function readCanonicalCurrentState(sim) {
  if (!currentGameStateJson) {
    throw new Error('No game loaded');
  }
  return sim.deserializeState(currentGameStateJson);
}

function writeCanonicalCurrentState(sim, state, excludeSender) {
  currentGameStateJson = sim.serializeState(state);
  sendGameStateToRenderer(currentGameStateJson, excludeSender);
  return currentGameStateJson;
}

function ensureCorpsCommandEntry(state, corpsId, stance = 'balanced') {
  if (!state.corps_command) state.corps_command = {};
  if (!state.corps_command[corpsId]) {
    state.corps_command[corpsId] = {
      command_span: 5,
      subordinate_count: 0,
      og_slots: 1,
      active_ogs: [],
      corps_exhaustion: 0,
      stance,
      active_operations: [],
    };
  }
  return state.corps_command[corpsId];
}

// Must run before app.whenReady()
if (protocol && protocol.registerSchemesAsPrivileged) {
  protocol.registerSchemesAsPrivileged([{ scheme: 'awwv', privileges: { standard: true, supportFetchAPI: true } }]);
}

function resourcePath(...segments) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, ...segments);
  }
  return path.join(__dirname, '..', '..', ...segments);
}

function getMapAppDir() {
  if (app.isPackaged) {
    return resourcePath('app');
  }
  return resourcePath('dist', 'tactical-map');
}

function getWarroomAppDir() {
  if (app.isPackaged) {
    const packagedWarroom = resourcePath('app', 'warroom');
    if (fs.existsSync(packagedWarroom)) return packagedWarroom;
    return resourcePath('app');
  }
  return resourcePath('dist', 'warroom');
}

function getDataDerivedDir() {
  return resourcePath('data', 'derived');
}

function getDataSourceDir() {
  return resourcePath('data', 'source');
}

function getRunsDir() {
  return resourcePath('runs');
}

function getRuntimeProbeManifestPath() {
  const probeDir = app.isPackaged ? path.dirname(process.execPath) : getBaseDir();
  return path.join(probeDir, 'awwv_desktop_runtime_probe_manifest.json');
}

function assertReadableFile(filePath, label) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (error) {
    throw new Error(`${label} missing at ${filePath}: ${error.message || String(error)}`);
  }
  if (!stat.isFile()) {
    throw new Error(`${label} is not a file at ${filePath}`);
  }
  return stat.size;
}

function fetchLocalText(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        if (body.length < 2048) body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode ?? 0,
          body,
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error(`timeout fetching ${url}`));
    });
  });
}

function waitForWindowLoad(win, expectedUrl, label) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      win.webContents.removeListener('did-fail-load', onFail);
      win.webContents.removeListener('did-finish-load', onFinish);
      win.removeListener('closed', onClosed);
      clearTimeout(timeoutId);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };

    const onFail = (_event, errorCode, errorDescription, validatedURL) => {
      fail(new Error(`${label} failed to load ${validatedURL || expectedUrl}: [${errorCode}] ${errorDescription}`));
    };

    const onFinish = () => {
      const loadedUrl = win.webContents.getURL();
      if (loadedUrl !== expectedUrl) {
        fail(new Error(`${label} loaded unexpected URL ${loadedUrl}; expected ${expectedUrl}`));
        return;
      }
      finish({
        loaded_url: loadedUrl,
        title: win.getTitle() || null,
      });
    };

    const onClosed = () => {
      fail(new Error(`${label} closed before finishing load`));
    };

    const timeoutId = setTimeout(() => {
      fail(new Error(`${label} timed out waiting for did-finish-load at ${expectedUrl}`));
    }, 15000);

    win.webContents.on('did-fail-load', onFail);
    win.webContents.on('did-finish-load', onFinish);
    win.on('closed', onClosed);
  });
}

function waitForTacticalMapInteraction(win, expectedMode, expectedMapServerBaseUrl, label) {
  return win.webContents.executeJavaScript(
    `
      (async () => {
        const bridge = window.awwv;
        if (!bridge || typeof bridge.getMapServerUrl !== 'function' || typeof bridge.getCurrentGameState !== 'function') {
          throw new Error('desktop bridge unavailable');
        }

        const stateJson = await bridge.getCurrentGameState();
        const mapServerUrl = await bridge.getMapServerUrl();
        const state = JSON.parse(stateJson);

        return {
          route_mode: window.location.search.includes('desktop_window=sandbox') ? 'sandbox' : 'operational',
          location_path: window.location.pathname,
          map_server_url: mapServerUrl,
          player_faction: state?.meta?.player_faction ?? null,
          turn: state?.meta?.turn ?? null,
        };
      })();
    `,
    true,
  ).then((interaction) => {
    if (interaction.route_mode !== expectedMode) {
      throw new Error(`${label} reported unexpected route mode ${interaction.route_mode}; expected ${expectedMode}`);
    }
    if (interaction.map_server_url !== expectedMapServerBaseUrl) {
      throw new Error(
        `${label} reported unexpected map server URL ${interaction.map_server_url}; expected ${expectedMapServerBaseUrl}`,
      );
    }
    if (interaction.player_faction !== 'RBiH') {
      throw new Error(`${label} reported unexpected player faction ${interaction.player_faction}; expected RBiH`);
    }
    if (interaction.turn !== 0) {
      throw new Error(`${label} reported unexpected turn ${interaction.turn}; expected 0`);
    }
    return interaction;
  });
}

function waitForDesktopSessionReady(win, label) {
  return win.webContents.executeJavaScript(
    `
      new Promise((resolve, reject) => {
        let attemptsRemaining = 200;
        const tick = () => {
          const ready = document.documentElement?.dataset?.awwvDesktopSessionReady === '1';
          if (ready) {
            resolve(true);
            return;
          }
          attemptsRemaining -= 1;
          if (attemptsRemaining <= 0) {
            reject(new Error('timed out waiting for desktop session readiness'));
            return;
          }
          setTimeout(tick, 25);
        };
        tick();
      });
    `,
    true,
  ).catch((error) => {
    throw new Error(`${label} did not expose desktop session readiness: ${error.message || String(error)}`);
  });
}

function armGameStatePushProbe(win) {
  return win.webContents.executeJavaScript(
    `
      (() => {
        const bridge = window.awwv;
        if (!bridge || typeof bridge.subscribeGameStateUpdated !== 'function') {
          throw new Error('game-state-updated bridge unavailable');
        }

        window.__awwvProbeGameStatePush = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('timed out waiting for game-state-updated'));
          }, 5000);

          const unsubscribe = bridge.subscribeGameStateUpdated((stateJson) => {
            try {
              clearTimeout(timeoutId);
              if (typeof unsubscribe === 'function') {
                unsubscribe();
              }
              const state = JSON.parse(stateJson);
              resolve({
                route_mode: window.location.search.includes('desktop_window=sandbox') ? 'sandbox' : 'operational',
                player_faction: state?.meta?.player_faction ?? null,
                turn: state?.meta?.turn ?? null,
              });
            } catch (error) {
              reject(error);
            }
          });
        });
        return true;
      })();
    `,
    true,
  );
}

function collectGameStatePushProbe(win, expectedMode, label) {
  return win.webContents.executeJavaScript(
    `
      window.__awwvProbeGameStatePush;
    `,
    true,
  ).then((push) => {
    if (push.route_mode !== expectedMode) {
      throw new Error(`${label} received push for unexpected route mode ${push.route_mode}; expected ${expectedMode}`);
    }
    if (push.player_faction !== 'RBiH') {
      throw new Error(`${label} received push with unexpected player faction ${push.player_faction}; expected RBiH`);
    }
    if (push.turn !== 0) {
      throw new Error(`${label} received push with unexpected turn ${push.turn}; expected 0`);
    }
    return push;
  });
}

function armTurnReportPushProbe(win) {
  return win.webContents.executeJavaScript(
    `
      (() => {
        const bridge = window.awwv;
        if (!bridge || typeof bridge.subscribeTurnReportUpdated !== 'function') {
          throw new Error('turn-report-updated bridge unavailable');
        }

        window.__awwvProbeTurnReportPush = new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('timed out waiting for turn-report-updated'));
          }, 5000);

          const unsubscribe = bridge.subscribeTurnReportUpdated((report) => {
            try {
              clearTimeout(timeoutId);
              if (typeof unsubscribe === 'function') {
                unsubscribe();
              }
              resolve({
                route_mode: window.location.search.includes('desktop_window=sandbox') ? 'sandbox' : 'operational',
                player_faction: report?.player_faction ?? null,
                turn: report?.turn ?? null,
                probe: report?.probe ?? null,
              });
            } catch (error) {
              reject(error);
            }
          });
        });
        return true;
      })();
    `,
    true,
  );
}

function collectTurnReportPushProbe(win, expectedMode, label) {
  return win.webContents.executeJavaScript(
    `
      window.__awwvProbeTurnReportPush;
    `,
    true,
  ).then((push) => {
    if (push.route_mode !== expectedMode) {
      throw new Error(`${label} received turn report for unexpected route mode ${push.route_mode}; expected ${expectedMode}`);
    }
    if (push.player_faction !== 'RBiH') {
      throw new Error(`${label} received turn report with unexpected player faction ${push.player_faction}; expected RBiH`);
    }
    if (push.turn !== 0) {
      throw new Error(`${label} received turn report with unexpected turn ${push.turn}; expected 0`);
    }
    if (push.probe !== 'awwv_turn_report_probe') {
      throw new Error(`${label} received unexpected turn report probe marker ${push.probe}; expected awwv_turn_report_probe`);
    }
    return push;
  });
}

function armRendererReactionProbe(win) {
  return win.webContents.executeJavaScript(
    `
      (() => {
        window.__AWWV_RUNTIME_PROBE_ACTIVE = true;
        const root = document.documentElement;
        const keys = [
          'awwvProbeGameStateFingerprintMatchesPayload',
          'awwvProbeGameStateLocationPath',
          'awwvProbeGameStatePayloadLength',
          'awwvProbeGameStatePlayerFaction',
          'awwvProbeGameStateRouteMode',
          'awwvProbeGameStateTurn',
          'awwvProbeTurnReportLocationPath',
          'awwvProbeTurnReportPayloadMatchesProbe',
          'awwvProbeTurnReportPlayerFaction',
          'awwvProbeTurnReportProbe',
          'awwvProbeTurnReportRouteMode',
          'awwvProbeTurnReportTurn',
        ];
        for (const key of keys) {
          delete root.dataset[key];
        }
        window.__awwvProbeRendererReaction = new Promise((resolve, reject) => {
          let attemptsRemaining = 200;
          const tick = () => {
            const dataset = root.dataset;
            if (
              dataset.awwvProbeGameStateFingerprintMatchesPayload &&
              dataset.awwvProbeGameStateLocationPath &&
              dataset.awwvProbeGameStatePayloadLength &&
              dataset.awwvProbeGameStatePlayerFaction &&
              dataset.awwvProbeGameStateRouteMode &&
              dataset.awwvProbeGameStateTurn &&
              dataset.awwvProbeTurnReportLocationPath &&
              dataset.awwvProbeTurnReportPayloadMatchesProbe &&
              dataset.awwvProbeTurnReportPlayerFaction &&
              dataset.awwvProbeTurnReportProbe &&
              dataset.awwvProbeTurnReportRouteMode &&
              dataset.awwvProbeTurnReportTurn
            ) {
              resolve({
                game_state_updated: {
                  fingerprint_matches_payload: dataset.awwvProbeGameStateFingerprintMatchesPayload === 'true',
                  location_path: dataset.awwvProbeGameStateLocationPath,
                  payload_length: Number(dataset.awwvProbeGameStatePayloadLength),
                  player_faction: dataset.awwvProbeGameStatePlayerFaction,
                  route_mode: dataset.awwvProbeGameStateRouteMode,
                  turn: Number(dataset.awwvProbeGameStateTurn),
                },
                turn_report_updated: {
                  location_path: dataset.awwvProbeTurnReportLocationPath,
                  payload_matches_probe: dataset.awwvProbeTurnReportPayloadMatchesProbe === 'true',
                  player_faction: dataset.awwvProbeTurnReportPlayerFaction,
                  probe: dataset.awwvProbeTurnReportProbe,
                  route_mode: dataset.awwvProbeTurnReportRouteMode,
                  turn: Number(dataset.awwvProbeTurnReportTurn),
                },
              });
              return;
            }
            attemptsRemaining -= 1;
            if (attemptsRemaining <= 0) {
              reject(new Error('timed out waiting for renderer reactions'));
              return;
            }
            setTimeout(tick, 25);
          };
          tick();
        });
        return true;
      })();
    `,
    true,
  );
}

function collectRendererReactionProbe(win, expectedMode, label) {
  const expectedPayloadLength = currentGameStateJson ? currentGameStateJson.length : null;
  return win.webContents.executeJavaScript(
    `
      window.__awwvProbeRendererReaction;
    `,
    true,
  ).then((reaction) => {
    const gameStateReaction = reaction?.game_state_updated;
    const turnReportReaction = reaction?.turn_report_updated;

    if (!gameStateReaction || !turnReportReaction) {
      throw new Error(`${label} did not record both renderer reactions`);
    }
    if (gameStateReaction.route_mode !== expectedMode) {
      throw new Error(`${label} renderer game-state reaction reported unexpected route mode ${gameStateReaction.route_mode}; expected ${expectedMode}`);
    }
    if (gameStateReaction.fingerprint_matches_payload !== true) {
      throw new Error(`${label} renderer game-state reaction did not preserve the exact pushed payload identity`);
    }
    if (gameStateReaction.payload_length !== expectedPayloadLength) {
      throw new Error(`${label} renderer game-state reaction reported unexpected payload length ${gameStateReaction.payload_length}; expected ${expectedPayloadLength}`);
    }
    if (gameStateReaction.player_faction !== 'RBiH') {
      throw new Error(`${label} renderer game-state reaction reported unexpected player faction ${gameStateReaction.player_faction}; expected RBiH`);
    }
    if (gameStateReaction.turn !== 0) {
      throw new Error(`${label} renderer game-state reaction reported unexpected turn ${gameStateReaction.turn}; expected 0`);
    }
    if (turnReportReaction.route_mode !== expectedMode) {
      throw new Error(`${label} renderer turn-report reaction reported unexpected route mode ${turnReportReaction.route_mode}; expected ${expectedMode}`);
    }
    if (turnReportReaction.payload_matches_probe !== true) {
      throw new Error(`${label} renderer turn-report reaction did not preserve the exact pushed probe marker`);
    }
    if (turnReportReaction.player_faction !== 'RBiH') {
      throw new Error(`${label} renderer turn-report reaction reported unexpected player faction ${turnReportReaction.player_faction}; expected RBiH`);
    }
    if (turnReportReaction.turn !== 0) {
      throw new Error(`${label} renderer turn-report reaction reported unexpected turn ${turnReportReaction.turn}; expected 0`);
    }
    if (turnReportReaction.probe !== 'awwv_turn_report_probe') {
      throw new Error(`${label} renderer turn-report reaction reported unexpected probe marker ${turnReportReaction.probe}; expected awwv_turn_report_probe`);
    }

    return {
      game_state_updated: {
        fingerprint_matches_payload: gameStateReaction.fingerprint_matches_payload,
        location_path: gameStateReaction.location_path,
        payload_length: gameStateReaction.payload_length,
        player_faction: gameStateReaction.player_faction,
        route_mode: gameStateReaction.route_mode,
        turn: gameStateReaction.turn,
      },
      turn_report_updated: {
        location_path: turnReportReaction.location_path,
        payload_matches_probe: turnReportReaction.payload_matches_probe,
        player_faction: turnReportReaction.player_faction,
        probe: turnReportReaction.probe,
        route_mode: turnReportReaction.route_mode,
        turn: turnReportReaction.turn,
      },
    };
  });
}

function getTacticalMapWindowUrl(mode = 'operational') {
  const targetPath = mode === 'sandbox' ? '/tactical_sandbox.html' : '/';
  const query = mode === 'sandbox' ? '?desktop_window=sandbox' : '?desktop_window=operational';
  return `${getMapServerUrl(targetPath)}${query}`;
}

function createMainWindow(options = {}) {
  const { show = true, openDevTools = true } = options;
  const warroomUrl = 'awwv://warroom/index.html';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show,
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(warroomUrl);

  // Clear HTTP cache so the tactical map iframe always loads the latest bundle from the map server.
  win.webContents.session.clearCache().catch(() => { });

  if (openDevTools) {
    const devToolsPromise = win.webContents.openDevTools({ mode: 'detach' });
    if (devToolsPromise && typeof devToolsPromise.catch === 'function') {
      devToolsPromise.catch(() => { });
    }
  }

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Load scenario...', click: async () => {
            try {
              const result = await showScenarioDialog(win);
              if (result.canceled || !result.filePaths.length) return;
              const sim = getDesktopSim();
              const { state } = await sim.loadScenarioFromPath(result.filePaths[0], getBaseDir());
              currentGameStateJson = sim.serializeState(state);
              sendGameStateToRenderer(currentGameStateJson);
            } catch (e) { console.error('Load scenario failed:', e); }
          }
        },
        {
          label: 'Load state file...', click: async () => {
            try {
              const result = await showStateFileDialog(win);
              if (result.canceled || !result.filePaths.length) return;
              const sim = getDesktopSim();
              const { state } = await sim.loadStateFromPath(result.filePaths[0]);
              currentGameStateJson = sim.serializeState(state);
              sendGameStateToRenderer(currentGameStateJson);
              // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: optional sidecar.
              const sequenceJson = readReplaySaveSequenceSidecar(result.filePaths[0]);
              if (sequenceJson) sendReplaySequenceToRenderer(sequenceJson);
            } catch (e) { console.error('Load state failed:', e); }
          }
        },
        { type: 'separator' },
        {
          label: 'Open tactical map window', click: () => {
            openTacticalMapWindow();
          }
        },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  mainWindow = win;
  win.on('closed', () => { mainWindow = null; });
  return win;
}

function createTacticalMapWindow(options = {}) {
  const { mode = 'operational', show = true } = options;
  const targetUrl = getTacticalMapWindowUrl(mode);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show,
    icon: getAppIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL(targetUrl);
  win.on('closed', () => {
    if (tacticalMapWindow === win) tacticalMapWindow = null;
  });
  win.webContents.on('did-finish-load', () => {
    if (currentGameStateJson) {
      win.webContents.send('game-state-updated', currentGameStateJson);
    }
  });
  return { win, targetUrl };
}

async function runPackagedRuntimeProbe() {
  const warroomUrl = 'awwv://warroom/index.html';
  if (!app.isPackaged) {
    throw new Error('runtime probe must run against the packaged desktop artifact');
  }

  const requiredFiles = [
    ['desktopSimBundle', path.join(getBaseDir(), 'dist', 'desktop', 'desktop_sim.cjs')],
    ['mapIndex', path.join(getMapAppDir(), 'index.html')],
    ['startupSnapshot', path.join(getDataDerivedDir(), 'startup', 'apr_1992_initial_save.json')],
    ['warroomIndex', path.join(getWarroomAppDir(), 'index.html')],
  ].map(([key, filePath]) => ({
    key,
    relative_path: path.relative(getBaseDir(), filePath).replace(/\\/g, '/'),
    size_bytes: assertReadableFile(filePath, key),
  })).sort((a, b) => a.key.localeCompare(b.key));

  const sim = getDesktopSim();
  const { state } = await sim.startNewCampaign(getBaseDir(), 'RBiH');
  currentGameStateJson = sim.serializeState(state);
  const probeTurnReport = {
    probe: 'awwv_turn_report_probe',
    player_faction: state?.meta?.player_faction ?? null,
    turn: state?.meta?.turn ?? null,
  };
  if ((state?.meta?.player_faction ?? null) !== 'RBiH') {
    throw new Error(`startup probe expected player_faction=RBiH, got ${state?.meta?.player_faction ?? 'null'}`);
  }

  await startMapServer();
  const expectedMapServerBaseUrl = await resolveMapServerBaseUrl();
  const [mapIndexResponse, snapshotResponse] = await Promise.all([
    fetchLocalText(getMapServerUrl('/')),
    fetchLocalText(getMapServerUrl('/data/derived/startup/apr_1992_initial_save.json')),
  ]);

  if (mapIndexResponse.statusCode !== 200) {
    throw new Error(`packaged tactical map server returned ${mapIndexResponse.statusCode} for /`);
  }
  if (snapshotResponse.statusCode !== 200) {
    throw new Error(`packaged tactical map server returned ${snapshotResponse.statusCode} for startup snapshot`);
  }

  const probeWindow = createMainWindow({ show: false, openDevTools: false });
  const windowLoad = await waitForWindowLoad(probeWindow, warroomUrl, 'packaged main window');

  const { win: mapProbeWindow, targetUrl: tacticalMapUrl } = createTacticalMapWindow({
    mode: 'operational',
    show: false,
  });
  const tacticalWindowLoad = await waitForWindowLoad(
    mapProbeWindow,
    tacticalMapUrl,
    'packaged tactical map window',
  );
  const tacticalWindowInteraction = await waitForTacticalMapInteraction(
    mapProbeWindow,
    'operational',
    expectedMapServerBaseUrl,
    'packaged tactical map window',
  );
  await waitForDesktopSessionReady(mapProbeWindow, 'packaged tactical map window');

  const { win: sandboxProbeWindow, targetUrl: tacticalSandboxUrl } = createTacticalMapWindow({
    mode: 'sandbox',
    show: false,
  });
  const tacticalSandboxWindowLoad = await waitForWindowLoad(
    sandboxProbeWindow,
    tacticalSandboxUrl,
    'packaged tactical sandbox window',
  );
  const tacticalSandboxInteraction = await waitForTacticalMapInteraction(
    sandboxProbeWindow,
    'sandbox',
    expectedMapServerBaseUrl,
    'packaged tactical sandbox window',
  );

  tacticalMapWindow = mapProbeWindow;
  await armGameStatePushProbe(mapProbeWindow);
  await armRendererReactionProbe(mapProbeWindow);
  sendGameStateToRenderer(currentGameStateJson);
  const operationalPush = await collectGameStatePushProbe(
    mapProbeWindow,
    'operational',
    'packaged tactical map window',
  );
  await armTurnReportPushProbe(mapProbeWindow);
  sendTurnReportToRenderer(probeTurnReport);
  const operationalTurnReportPush = await collectTurnReportPushProbe(
    mapProbeWindow,
    'operational',
    'packaged tactical map window',
  );
  const operationalRendererReaction = await collectRendererReactionProbe(
    mapProbeWindow,
    'operational',
    'packaged tactical map window',
  );

  mapProbeWindow.destroy();
  tacticalMapWindow = sandboxProbeWindow;
  await armGameStatePushProbe(sandboxProbeWindow);
  sendGameStateToRenderer(currentGameStateJson);
  const sandboxPush = await collectGameStatePushProbe(
    sandboxProbeWindow,
    'sandbox',
    'packaged tactical sandbox window',
  );
  await armTurnReportPushProbe(sandboxProbeWindow);
  sendTurnReportToRenderer(probeTurnReport);
  const sandboxTurnReportPush = await collectTurnReportPushProbe(
    sandboxProbeWindow,
    'sandbox',
    'packaged tactical sandbox window',
  );
  sandboxProbeWindow.destroy();
  tacticalMapWindow = null;

  // ── Endgame reachability proof ─────────────────────────────────────────
  // Mutate the raw state to set game_over, re-serialize, push to a fresh
  // tactical map window, and verify VerdictScreen DOM elements appear in
  // the packaged renderer.
  state.meta.game_over = true;
  state.meta.outcome = 'timeout_stalemate';
  const endgameStateJson = sim.serializeState(state);
  currentGameStateJson = endgameStateJson;

  const { win: endgameProbeWindow, targetUrl: endgameMapUrl } = createTacticalMapWindow({
    mode: 'operational',
    show: false,
  });
  await waitForWindowLoad(
    endgameProbeWindow,
    endgameMapUrl,
    'packaged endgame tactical map window',
  );
  await waitForDesktopSessionReady(endgameProbeWindow, 'packaged endgame tactical map window');

  tacticalMapWindow = endgameProbeWindow;
  await armGameStatePushProbe(endgameProbeWindow);
  sendGameStateToRenderer(endgameStateJson);
  const endgamePush = await collectGameStatePushProbe(
    endgameProbeWindow,
    'operational',
    'packaged endgame tactical map window',
  );

  // Poll DOM for VerdictScreen content after React processes the endgame state
  const endgameDomCheck = await endgameProbeWindow.webContents.executeJavaScript(
    `
      (() => {
        return new Promise((resolve) => {
          let attemptsRemaining = 200;
          const tick = () => {
            const surface = document.querySelector('[data-awwv-endgame-surface]');
            if (surface) {
              const body = document.body.textContent || '';
              resolve({
                surface_type: surface.dataset.awwvEndgameSurface || null,
                outcome_label: surface.dataset.awwvEndgameOutcome || null,
                has_pyrrhic_score: body.includes('Pyrrhic Score'),
                has_war_cost: body.includes('War Cost'),
                has_faction_tabs: body.includes('ARBiH') && body.includes('VRS') && body.includes('HVO'),
                has_awwv_title: body.includes('A War Without Victory'),
                timed_out: false,
              });
              return;
            }
            attemptsRemaining -= 1;
            if (attemptsRemaining <= 0) {
              resolve({
                surface_type: null,
                outcome_label: null,
                has_pyrrhic_score: false,
                has_war_cost: false,
                has_faction_tabs: false,
                has_awwv_title: false,
                timed_out: true,
              });
              return;
            }
            setTimeout(tick, 25);
          };
          tick();
        });
      })();
    `,
    true,
  );

  if (!endgameDomCheck || endgameDomCheck.timed_out) {
    throw new Error(
      'packaged endgame probe timed out waiting for VerdictScreen DOM surface'
    );
  }
  if (endgameDomCheck.surface_type !== 'verdict' && endgameDomCheck.surface_type !== 'fallback') {
    throw new Error(
      `packaged endgame probe found unexpected surface type: ${endgameDomCheck.surface_type}`
    );
  }

  endgameProbeWindow.destroy();
  tacticalMapWindow = null;

  const manifest = {
    probe: 'awwv_desktop_runtime_probe',
    mode: 'packaged',
    files: requiredFiles,
    map_server_checks: [
      { route: '/', status: mapIndexResponse.statusCode },
      { route: '/data/derived/startup/apr_1992_initial_save.json', status: snapshotResponse.statusCode },
    ],
    startup: {
      phase: state?.meta?.phase ?? null,
      player_faction: state?.meta?.player_faction ?? null,
      recruitment_ready: Boolean(state?.military?.recruitment_state),
      turn: state?.meta?.turn ?? null,
    },
    window_checks: [
      {
        route: warroomUrl,
        status: 'did-finish-load',
        title: windowLoad.title,
      },
      {
        route: tacticalMapUrl,
        status: 'did-finish-load',
        title: tacticalWindowLoad.title,
      },
      {
        route: tacticalSandboxUrl,
        status: 'did-finish-load',
        title: tacticalSandboxWindowLoad.title,
      },
    ],
    tactical_interactions: [
      {
        location_path: tacticalWindowInteraction.location_path,
        map_server_url: tacticalWindowInteraction.map_server_url,
        player_faction: tacticalWindowInteraction.player_faction,
        route_mode: tacticalWindowInteraction.route_mode,
        turn: tacticalWindowInteraction.turn,
      },
      {
        location_path: tacticalSandboxInteraction.location_path,
        map_server_url: tacticalSandboxInteraction.map_server_url,
        player_faction: tacticalSandboxInteraction.player_faction,
        route_mode: tacticalSandboxInteraction.route_mode,
        turn: tacticalSandboxInteraction.turn,
      },
    ],
    tactical_push_checks: [
      {
        player_faction: operationalPush.player_faction,
        route_mode: operationalPush.route_mode,
        turn: operationalPush.turn,
      },
      {
        player_faction: sandboxPush.player_faction,
        route_mode: sandboxPush.route_mode,
        turn: sandboxPush.turn,
      },
    ],
    turn_report_push_checks: [
      {
        player_faction: operationalTurnReportPush.player_faction,
        probe: operationalTurnReportPush.probe,
        route_mode: operationalTurnReportPush.route_mode,
        turn: operationalTurnReportPush.turn,
      },
      {
        player_faction: sandboxTurnReportPush.player_faction,
        probe: sandboxTurnReportPush.probe,
        route_mode: sandboxTurnReportPush.route_mode,
        turn: sandboxTurnReportPush.turn,
      },
    ],
    renderer_reaction_checks: [
      {
        game_state_updated: operationalRendererReaction.game_state_updated,
        route_mode: 'operational',
        turn_report_updated: operationalRendererReaction.turn_report_updated,
      },
    ],
    endgame_checks: {
      surface_type: endgameDomCheck.surface_type,
      outcome_label: endgameDomCheck.outcome_label,
      has_pyrrhic_score: endgameDomCheck.has_pyrrhic_score,
      has_war_cost: endgameDomCheck.has_war_cost,
      has_faction_tabs: endgameDomCheck.has_faction_tabs,
      has_awwv_title: endgameDomCheck.has_awwv_title,
      state_push: {
        player_faction: endgamePush.player_faction,
        route_mode: endgamePush.route_mode,
        game_over_state_pushed: true,
      },
    },
  };

  fs.writeFileSync(getRuntimeProbeManifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`AWWV_DESKTOP_RUNTIME_PROBE_OK ${JSON.stringify(manifest)}`);
  mapProbeWindow.destroy();
  probeWindow.destroy();
}

/**
 * Local HTTP server for the tactical map.
 *
 * MapLibre GL's Web Workers don't function under custom Electron protocol
 * schemes (awwv://). Chromium's blob Worker origin handling is incompatible.
 * Solution: serve the tactical map and its data from a local HTTP server so
 * MapLibre operates in a standard http:// origin.
 *
 * Routes:
 *   /                      → dist/tactical-map/index.html
 *   /assets/*              → dist/tactical-map/assets/*
 *   /data/derived/*        → data/derived/*  (with Range support for PMTiles)
 *   /data/source/*         → data/source/*
 *   /data/runs/*           → runs/*  (e.g. final_save.json for "Load run")
 */
let mapServerPort = 0;

function startMapServer() {
  const mapDir = getMapAppDir();
  const derivedDir = getDataDerivedDir();
  const sourceDir = getDataSourceDir();
  const runsDir = getRunsDir();

  const MIME = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.geojson': 'application/geo+json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.pmtiles': 'application/octet-stream', '.pbf': 'application/x-protobuf',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);

    // Resolve file path based on route
    let filePath;
    if (segments[0] === 'data' && segments[1] === 'derived') {
      filePath = path.join(derivedDir, ...segments.slice(2));
      if (!path.resolve(filePath).startsWith(path.resolve(derivedDir))) { res.writeHead(403); res.end(); return; }
    } else if (segments[0] === 'data' && segments[1] === 'source') {
      filePath = path.join(sourceDir, ...segments.slice(2));
      if (!path.resolve(filePath).startsWith(path.resolve(sourceDir))) { res.writeHead(403); res.end(); return; }
    } else if (segments[0] === 'data' && segments[1] === 'runs') {
      filePath = path.join(runsDir, ...segments.slice(2));
      if (!path.resolve(filePath).startsWith(path.resolve(runsDir))) { res.writeHead(403); res.end(); return; }
      if (!filePath.toLowerCase().endsWith('.json')) { res.writeHead(403); res.end(); return; }
    } else {
      // Tactical map static files
      const rel = segments.join(path.sep) || 'index.html';
      filePath = path.join(mapDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(mapDir))) { res.writeHead(403); res.end(); return; }
    }

    let stat;
    try { stat = fs.statSync(filePath); } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    if (!stat.isFile()) { res.writeHead(404); res.end('Not Found'); return; }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    // Range request support (essential for PMTiles byte-range access)
    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
        const chunkSize = end - start + 1;
        res.writeHead(206, {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Content-Length': chunkSize,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
    });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      mapServerPort = server.address().port;
      if (!RUNTIME_PROBE_MODE) {
        console.log(`Tactical map server: http://127.0.0.1:${mapServerPort}`);
      }
      resolve(mapServerPort);
    });
  });
}

function getMapServerUrl(extraPath) {
  return `http://127.0.0.1:${mapServerPort}${extraPath || '/'}`;
}

function registerIpcHandler(channel, handler) {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, handler);
}

async function resolveMapServerBaseUrl() {
  // Prefer Vite dev map when running. Vite may use 3003, 3004... if 3002 is in use.
  // Skip the port our built server uses so we never mistake it for dev.
  const portsToTry = [3002, 3003, 3004, 3005];
  for (const port of portsToTry) {
    if (port === mapServerPort) continue; // built server is on this port
    const devMapBase = `http://127.0.0.1:${port}`;
    try {
      const res = await new Promise((resolve, reject) => {
        const req = http.get(`${devMapBase}/index.html`, (r) => {
          let body = '';
          r.on('data', (chunk) => { if (body.length < 500) body += chunk.toString(); });
          r.on('end', () => resolve({ statusCode: r.statusCode, body }));
          r.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(2000, () => { req.destroy(); reject(new Error('timeout')); });
      });
      // Vite dev serves raw index.html with script src="/main.tsx"; built serves hashed /assets/
      const isViteDev = res && res.statusCode === 200 && res.body && res.body.includes('main.tsx');
      if (isViteDev) {
        if (!RUNTIME_PROBE_MODE) {
          console.log(`[AWWV] Map: using dev server at ${devMapBase}`);
        }
        return devMapBase;
      }
    } catch (_) { /* try next port */ }
  }
  const built = mapServerPort ? getMapServerUrl('/') : null;
  if (built && !RUNTIME_PROBE_MODE) console.log(`[AWWV] Map: using built server at ${built}`);
  return built;
}

function registerProbeSafeIpcHandlers() {
  registerIpcHandler('get-current-game-state', async () => currentGameStateJson);
  registerIpcHandler('get-map-server-url', async () => resolveMapServerBaseUrl());
}

function showScenarioDialog(win) {
  return dialog.showOpenDialog(win || null, {
    title: 'Load scenario',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
}

function showStateFileDialog(win) {
  const savesDir = path.join(getBaseDir(), 'saves');
  const defaultPath = fs.existsSync(savesDir) ? savesDir : undefined;
  return dialog.showOpenDialog(win || null, {
    title: 'Load state file (final_save.json or saved game)',
    defaultPath,
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
}

/** Write currentGameStateJson to a file in the saves/ directory. Returns the file path. */
function writeSaveFile(filename) {
  if (!currentGameStateJson) throw new Error('No game loaded');
  const savesDir = path.join(getBaseDir(), 'saves');
  fs.mkdirSync(savesDir, { recursive: true });
  const filePath = path.join(savesDir, filename);
  fs.writeFileSync(filePath, currentGameStateJson, 'utf-8');
  return filePath;
}

/** Auto-save to saves/autosave.json. Swallows errors (non-critical). */
function autoSave() {
  try {
    writeSaveFile('autosave.json');
  } catch (_e) {
    // Auto-save failure is non-critical; log but don't propagate
    console.error('Auto-save failed:', _e.message || String(_e));
  }
}

function createWindow() {
  // W-11-A (v0.9.5 cosmetic): Gate openDevTools on dev mode only. In packaged
  // builds, the detached DevTools window steals MainWindow focus and prevents
  // CloseMainWindow-driven clean exit (operator must force-kill). Dev tools
  // should not ship enabled-by-default in production anyway.
  createMainWindow({ show: true, openDevTools: !app.isPackaged });
}

function openTacticalMapWindow(mode = 'operational') {
  const targetUrl = getTacticalMapWindowUrl(mode);
  if (tacticalMapWindow && !tacticalMapWindow.isDestroyed()) {
    if (tacticalMapWindow.webContents.getURL() !== targetUrl) {
      tacticalMapWindow.loadURL(targetUrl);
    }
    tacticalMapWindow.focus();
    return tacticalMapWindow;
  }

  const { win } = createTacticalMapWindow({ mode, show: true });
  tacticalMapWindow = win;
  return win;
}

/**
 * Serve a file with HTTP Range request support.
 * Essential for PMTiles which requires byte-range access to large archives.
 */
function serveFileResponse(request, filePath, contentType) {
  const stat = fs.statSync(filePath);
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const length = end - start + 1;
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(length);
      fs.readSync(fd, buf, 0, length, start);
      fs.closeSync(fd);
      return new Response(buf, {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Content-Length': String(length),
          'Accept-Ranges': 'bytes',
        },
      });
    }
  }

  const buf = fs.readFileSync(filePath);
  return new Response(buf, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
    },
  });
}

/** MIME type map for data files (PMTiles, GeoJSON, etc.) */
const DATA_MIME_TYPES = {
  '.json': 'application/json',
  '.geojson': 'application/geo+json',
  '.png': 'image/png',
  '.pmtiles': 'application/octet-stream',
  '.pbf': 'application/x-protobuf',
};

function registerProtocol() {
  const mapAppDir = getMapAppDir();
  const warroomAppDir = getWarroomAppDir();
  const dataDerivedDir = getDataDerivedDir();
  const dataSourceDir = getDataSourceDir();

  protocol.handle('awwv', (request) => {
    const u = request.url.replace(/^awwv:\/\//, '');
    const pathname = u.includes('?') ? u.slice(0, u.indexOf('?')) : u;
    const decoded = decodeURIComponent(pathname);
    const segs = decoded.replace(/^\/+/, '').split('/').filter(Boolean);

    if (segs[0] === 'app' && segs[1] === 'data' && segs[2] === 'derived') {
      const rel = segs.slice(3).join(path.sep);
      const filePath = path.join(dataDerivedDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(dataDerivedDir))) return new Response(null, { status: 403 });
      try {
        const ext = path.extname(rel).toLowerCase();
        const contentType = DATA_MIME_TYPES[ext] || 'application/octet-stream';
        return serveFileResponse(request, filePath, contentType);
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    // Tactical map data/source route (e.g. municipality borders GeoJSON)
    if (segs[0] === 'app' && segs[1] === 'data' && segs[2] === 'source') {
      const rel = segs.slice(3).join(path.sep);
      const filePath = path.join(dataSourceDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(dataSourceDir))) return new Response(null, { status: 403 });
      try {
        const ext = path.extname(rel).toLowerCase();
        const contentType = DATA_MIME_TYPES[ext] || 'application/octet-stream';
        return serveFileResponse(request, filePath, contentType);
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    if (segs[0] === 'app') {
      const rel = segs.slice(1).join(path.sep) || 'index.html';
      const filePath = path.join(mapAppDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(mapAppDir))) return new Response(null, { status: 403 });
      try {
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(rel).toLowerCase();
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    // Warroom /data/ paths: route to project-root data directories (derived, source, ui)
    if (segs[0] === 'warroom' && segs[1] === 'data' && (segs[2] === 'derived' || segs[2] === 'source' || segs[2] === 'ui')) {
      const dataDir = resourcePath('data', segs[2]);
      const rel = segs.slice(3).join(path.sep);
      const filePath = path.join(dataDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(dataDir))) return new Response(null, { status: 403 });
      try {
        const ext = path.extname(rel).toLowerCase();
        const contentType = DATA_MIME_TYPES[ext] || 'application/octet-stream';
        return serveFileResponse(request, filePath, contentType);
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    // Warroom /assets/ paths: first try the Vite-built warroom assets (dist/warroom/assets/)
    // which contain the JS, CSS, and images from the Vite build. If not found there, fall
    // back to the project root assets/ directory (crests, flags, etc. used by the embedded
    // tactical map iframe).
    if (segs[0] === 'warroom' && segs[1] === 'assets') {
      const rel = segs.slice(2).join(path.sep);
      const ext = path.extname(rel).toLowerCase();
      const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

      // 1. Try Vite-built warroom assets first (JS, CSS, hashed images)
      const warroomAssetPath = path.join(warroomAppDir, 'assets', rel);
      if (path.resolve(warroomAssetPath).startsWith(path.resolve(warroomAppDir))) {
        try {
          const buf = fs.readFileSync(warroomAssetPath);
          return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
        } catch (_) { /* not found in warroom build, try project assets */ }
      }

      // 2. Fall back to project root assets/ (crests, flags for embedded tactical map)
      const assetsDir = resourcePath('assets');
      const filePath = path.join(assetsDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(assetsDir))) return new Response(null, { status: 403 });
      try {
        const buf = fs.readFileSync(filePath);
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    // Warroom → tactical-map sub-route: serve tactical map files under warroom origin
    // so the iframe is same-origin and can inherit the parent's awwv bridge.
    if (segs[0] === 'warroom' && segs[1] === 'tactical-map') {
      const rel = segs.slice(2).join(path.sep) || 'index.html';
      const filePath = path.join(mapAppDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(mapAppDir))) return new Response(null, { status: 403 });
      try {
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(rel).toLowerCase();
        const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png', '.ico': 'image/x-icon' };
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    if (segs[0] === 'warroom') {
      const rel = segs.slice(1).join(path.sep) || 'index.html';
      const filePath = path.join(warroomAppDir, rel);
      if (!path.resolve(filePath).startsWith(path.resolve(warroomAppDir))) return new Response(null, { status: 403 });
      try {
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(rel).toLowerCase();
        const types = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.geojson': 'application/geo+json',
          '.png': 'image/png',
          '.ico': 'image/x-icon',
          '.svg': 'image/svg+xml',
        };
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    return new Response('Not Found', { status: 404 });
  });
}

// Pin a stable Windows AppUserModelID before any window is created so taskbar
// grouping, jump-list identity, and toast notifications match the appId
// declared in package.json `build.appId`. No-op on non-Windows platforms.
// (LANE-V095-PLATFORM-ICON-APPID — closes audit P2-G1.)
if (process.platform === 'win32' && typeof app.setAppUserModelId === 'function') {
  app.setAppUserModelId('com.awwv.desktop');
}

app.whenReady().then(() => {
  registerProtocol();
  registerProbeSafeIpcHandlers();

  if (RUNTIME_PROBE_MODE) {
    runPackagedRuntimeProbe()
      .then(() => {
        app.exit(0);
      })
      .catch((error) => {
        process.stderr.write(`AWWV_DESKTOP_RUNTIME_PROBE_FAIL ${error.message || String(error)}\n`);
        app.exit(1);
      });
    return;
  }

  // Phase 3: Play myself — load scenario, load state, advance turn
  ipcMain.handle('load-scenario-dialog', async (_event) => {
    const result = await showScenarioDialog(BrowserWindow.getFocusedWindow());
    if (result.canceled || !result.filePaths.length) return { ok: false, error: 'Canceled' };
    try {
      const sim = getDesktopSim();
      const { state } = await sim.loadScenarioFromPath(result.filePaths[0], getBaseDir());
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
      return { ok: true, stateJson: currentGameStateJson };
    } catch (e) {
      return { ok: false, error: classifyLoadError(e) };
    }
  });

  ipcMain.handle('start-new-campaign', async (_event, payload) => {
    const playerFaction = payload && payload.playerFaction;
    const scenarioKey = payload && payload.scenarioKey;
    if (playerFaction !== 'RBiH' && playerFaction !== 'RS' && playerFaction !== 'HRHB') {
      return { ok: false, error: 'Invalid playerFaction. Use RBiH, RS, or HRHB.' };
    }
    if (scenarioKey !== undefined && scenarioKey !== 'apr_1992') {
      return { ok: false, error: 'Invalid scenarioKey. Use apr_1992.' };
    }
    try {
      const sim = getDesktopSim();
      const { state } = await sim.startNewCampaign(getBaseDir(), playerFaction, scenarioKey ?? 'apr_1992');
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
      return { ok: true, stateJson: currentGameStateJson };
    } catch (e) {
      return { ok: false, error: classifyLoadError(e) };
    }
  });

  ipcMain.handle('load-state-dialog', async (_event) => {
    const result = await showStateFileDialog(BrowserWindow.getFocusedWindow());
    if (result.canceled || !result.filePaths.length) return { ok: false, error: 'Canceled' };
    try {
      const sim = getDesktopSim();
      const { state } = await sim.loadStateFromPath(result.filePaths[0]);
      currentGameStateJson = sim.serializeState(state);
      // LANE-NIGHTSHIFT-REPLAY-SAVE-SEQUENCE-PRODUCER: optional sidecar.
      // Carried alongside the state so the VerdictScreen Replay tab works
      // when the user loads a final_save.json that has a sibling
      // replay_save_sequence.json (produced by the scenario harness).
      const manifestJson = readReplaySaveManifestSidecar(result.filePaths[0]);
      if (manifestJson) sendReplayManifestToRenderer(manifestJson, _event.sender);
      const sequenceJson = manifestJson ? null : readReplaySaveSequenceSidecar(result.filePaths[0]);
      if (sequenceJson) sendReplaySequenceToRenderer(sequenceJson, _event.sender);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
      return {
        ok: true,
        stateJson: currentGameStateJson,
        replaySequenceJson: sequenceJson ?? null,
        replayManifestJson: manifestJson ?? null,
      };
    } catch (e) {
      return { ok: false, error: classifyLoadError(e) };
    }
  });

  ipcMain.handle('advance-turn', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded. Load a scenario or state file first.' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);

      // Block turn advance from the shared generated player-decision manifest,
      // so desktop hard-gating stays aligned with UI readiness policy.
      if (typeof sim.listBlockingPlayerDecisions !== 'function') {
        return {
          ok: false,
          error: 'Desktop sim missing player decision manifest. Run: npm run desktop:sim:build',
        };
      }
      const playerFaction = state.meta?.player_faction ?? null;
      const blocked = sim.listBlockingPlayerDecisions(state, playerFaction);
      if (blocked.length > 0) {
        return {
          ok: false,
          error: 'pending_required_decisions',
          blocked_decisions: blocked.map((d) => ({
            family_id: d.familyId,
            decision_id: d.id,
            label: d.label,
            faction: d.faction ?? playerFaction,
            event_id: d.event_id ?? d.eventId ?? d.id,
            event_title: d.event_title ?? d.eventTitle ?? d.label,
          })),
        };
      }

      const result = await sim.advanceTurn(state, getBaseDir());
      if (result.error) return { ok: false, error: result.error };
      currentGameStateJson = sim.serializeState(result.state);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
      if (result.report) sendTurnReportToRenderer(result.report);
      autoSave();
      return { ok: true, stateJson: currentGameStateJson, report: result.report ?? null };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('save-game', async (_event, payload) => {
    try {
      const filename = (payload && typeof payload.filename === 'string' && payload.filename)
        ? payload.filename
        : `save_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`;
      const filePath = writeSaveFile(filename);
      return { ok: true, filePath };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('quick-save', async () => {
    try {
      const filePath = writeSaveFile('quicksave.json');
      return { ok: true, filePath };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('get-recruitment-catalog', async () => {
    try {
      const sim = getDesktopSim();
      return await sim.getRecruitmentCatalog(getBaseDir());
    } catch (e) {
      return { brigades: [], error: e.message || String(e) };
    }
  });

  ipcMain.handle('apply-recruitment', async (_event, payload) => {
    const { brigadeId, equipmentClass } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof equipmentClass !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.applyPlayerRecruitment(state, getBaseDir(), brigadeId, equipmentClass);
      if (!result.ok) return { ok: false, error: result.error };
      currentGameStateJson = sim.serializeState(result.state);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
      return { ok: true, stateJson: currentGameStateJson, newFormationId: brigadeId };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // --- Order staging IPC handlers ---

  const stageDeployOrder = async (brigadeId, action) => {
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const formation = state.formations?.[brigadeId];
      if (!formation || (formation.kind ?? 'brigade') !== 'brigade') {
        return { ok: false, error: 'Invalid brigade' };
      }
      if (!state.brigade_deploy_orders) state.brigade_deploy_orders = {};
      state.brigade_deploy_orders[brigadeId] = action;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  };

  ipcMain.handle('stage-attack-order', async (_event, payload) => {
    const { brigadeId, targetSettlementId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof targetSettlementId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.brigade_attack_orders) state.brigade_attack_orders = {};
      state.brigade_attack_orders[brigadeId] = targetSettlementId;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-posture-order', async (_event, payload) => {
    const { brigadeId, posture } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof posture !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.brigade_posture_orders) state.brigade_posture_orders = [];
      // Replace existing order for same brigade, or append
      const idx = state.brigade_posture_orders.findIndex(o => o.brigade_id === brigadeId);
      const order = { brigade_id: brigadeId, posture };
      if (idx >= 0) {
        state.brigade_posture_orders[idx] = order;
      } else {
        state.brigade_posture_orders.push(order);
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-move-order', async (_event, payload) => {
    const { brigadeId, targetMunicipalityId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof targetMunicipalityId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.brigade_mun_orders) state.brigade_mun_orders = {};
      state.brigade_mun_orders[brigadeId] = [targetMunicipalityId];
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-deploy-order', async (_event, payload) => {
    const { brigadeId } = payload || {};
    return stageDeployOrder(brigadeId, 'deploy');
  });

  ipcMain.handle('stage-undeploy-order', async (_event, payload) => {
    const { brigadeId } = payload || {};
    return stageDeployOrder(brigadeId, 'undeploy');
  });

  ipcMain.handle('assign-brigade-to-sector', async (_event, payload) => {
    const { brigadeId, sectorId } = payload || {};
    const normalizedSectorId = sectorId == null ? null : String(sectorId);
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = sim.assignBrigadeToSector(state, brigadeId, normalizedSectorId);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('clear-orders', async (_event, payload) => {
    const { brigadeId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (state.brigade_attack_orders) delete state.brigade_attack_orders[brigadeId];
      if (state.brigade_mun_orders) delete state.brigade_mun_orders[brigadeId];
      if (state.brigade_reposition_orders) delete state.brigade_reposition_orders[brigadeId];
      if (state.brigade_deploy_orders) delete state.brigade_deploy_orders[brigadeId];
      if (state.brigade_posture_orders) {
        state.brigade_posture_orders = state.brigade_posture_orders.filter(o => o.brigade_id !== brigadeId);
      }
      if (state.brigade_aor_orders && state.brigade_aor_orders.length > 0) {
        state.brigade_aor_orders = state.brigade_aor_orders.filter(
          o => o.from_brigade !== brigadeId && o.to_brigade !== brigadeId
        );
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Free War Phase 4 (#67): canon-safe author-new-op staging. The previous
  // PHASE 5 TRANSITIONAL path built a raw op object and directly pushed it onto
  // active_operations — bypassing validation, command-authority cost, and the
  // player-faction restriction. It is replaced by stageAuthoredOperation (mirrors
  // proactive-force-launch-op): ownership check → CA guard+debit → STAGE
  // cc.pending_authored_op. The engine `inject-authored-operations` war-phase step
  // consumes the staged def once (validate → filter participants → build canon
  // CorpsOperation via buildCorpsOperation, or reject + clear). No active_operations.push.
  ipcMain.handle('stage-corps-operation-order', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = readCanonicalCurrentState(sim);
      const result = stageAuthoredOperation(state, payload);
      if (!result.ok) return result;
      writeCanonicalCurrentState(sim, state, _event && _event.sender);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // STOP-OP presidential lever (Presidential Command Model slice 1/N): canon-safe
  // halt staging. Mirrors stage-corps-operation-order: ownership check → confirm a
  // matching LIVE op → reject duplicate halt → CA guard+debit (STOP_OP_COST) → STAGE
  // cc.pending_op_halt. The engine `apply-op-halts` war-phase step consumes the staged
  // halt once (release commander → remove op via the canonical clean-removal path →
  // append halted_op_record → clear). No active_operations mutation here. The political
  // consequence (patron_confidence gain etc.) is a deliberate FOLLOW-UP, not this slice.
  ipcMain.handle('stage-op-halt-order', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = readCanonicalCurrentState(sim);
      const result = stageOpHalt(state, payload);
      if (!result.ok) return result;
      // Codex P2 (#104): refresh the CLICKING renderer too. Excluding _event.sender
      // left the renderer that issued the halt showing stale command-authority — the
      // CA debit + pending_op_halt never reached it, so it would let the player click
      // STOP-OP again (→ pending_op_halt_exists). Broadcast to ALL windows (no exclude)
      // so the sender re-renders the debited CA and the now-staged halt immediately.
      writeCanonicalCurrentState(sim, state);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // REQUEST-OP presidential lever (Presidential Command Model slice 2/N): canon-safe
  // directive staging. Mirrors stage-op-halt-order: ownership check → confirm the corps
  // exists → reject duplicate directive → CA guard+debit (REQUEST_OP_COST) → STAGE
  // cc.pending_op_directive { target_osid }. The engine `inject-op-directive` war-phase
  // step consumes it once: auto-selects the force + builds a reachable axis/staging
  // toward the target → injects a CorpsOperation tagged requested_by_president (or records
  // op_directive_rejection if unbuildable). The president names ONLY the objective — the
  // engine (commander) picks brigades + axis. No active_operations mutation here.
  ipcMain.handle('stage-op-directive-order', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = readCanonicalCurrentState(sim);
      const result = stageOpDirective(state, payload);
      if (!result.ok) return result;
      // Refresh ALL windows incl. the clicking renderer (see Codex P2 above) so the
      // sender re-renders the debited CA and the now-staged directive immediately.
      writeCanonicalCurrentState(sim, state);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // REPLACE-CO presidential lever (Presidential Command Model slice 3/N): canon-safe
  // CO-replacement staging. Mirrors stage-op-halt-order: ownership check → confirm the
  // corps HAS a current named CO → pick/validate a reserve replacement (explicit
  // replacementOfficerId or auto-pick) → reject duplicate → CA guard+debit
  // (REPLACE_CO_COST) → STAGE cc.pending_co_replacement. The engine
  // `apply-co-replacements` war-phase step consumes it once: reuses relieveOfficer
  // (retire CO → install replacement → emit officer_relieved), applies the morale hit +
  // an internal_cohesion cost, records the replacement, clears the field. No officer
  // mutation here. RS officer-revolt asymmetry emerges downstream from the successor's
  // roster stubbornness — not hardcoded.
  ipcMain.handle('stage-co-replacement-order', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = readCanonicalCurrentState(sim);
      const result = stageCoReplacement(state, payload);
      if (!result.ok) return result;
      // Refresh ALL windows incl. the clicking renderer (see Codex P2 note on
      // stage-op-halt-order) so the sender re-renders the debited CA + staged
      // replacement immediately. NO excludeSender.
      writeCanonicalCurrentState(sim, state);
      return { ok: true, replacementOfficerId: result.replacementOfficerId };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Read-only prediction query for ops planning G-2 panel
  ipcMain.handle('query-operation-prediction', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    if (!payload || typeof payload.corpsId !== 'string' || !Array.isArray(payload.axes)) {
      return { ok: false, error: 'Invalid operation prediction request' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.queryOperationPrediction(state, payload, getBaseDir());
      return { ok: true, data: result };
    } catch (e) {
      console.error('[IPC] query-operation-prediction error:', e);
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Read-only OBJECTION query for the force-op pushback card (Presidential Command
  // Model "force-op pushback"). Mirrors query-operation-prediction: deserializes a
  // FRESH state (no mutation), runs the shared planDirectiveOperation auto-selection +
  // the combat predictor, and returns { forceRatio, estimatedCasualties,
  // recommendedAction, rejectionReason? }. The UI shows the disposition-tinted objection
  // only when recommendedAction !== 'launch'.
  ipcMain.handle('query-directive-objection', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    if (!payload || typeof payload.corpsId !== 'string' || typeof payload.targetOsid !== 'string') {
      return { ok: false, error: 'Invalid directive objection request' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.queryDirectiveObjection(state, payload, getBaseDir());
      return { ok: true, data: result };
    } catch (e) {
      console.error('[IPC] query-directive-objection error:', e);
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-logistics-priority', async (_event, payload) => {
    const { faction, sectorId, priority } = payload || {};
    if (!currentGameStateJson || typeof faction !== 'string' || typeof sectorId !== 'string' || typeof priority !== 'number') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const sector = state.corps_front_sectors?.[sectorId];
      if (!sector) {
        return { ok: false, error: `Unknown sector: ${sectorId}` };
      }
      if (!state.military.logistics_priority) state.military.logistics_priority = {};
      if (!state.military.logistics_priority[faction]) state.military.logistics_priority[faction] = {};
      for (const edgeId of sector.edge_ids ?? []) {
        state.military.logistics_priority[faction][edgeId] = priority;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // NOTE: the legacy `stage-operation-halt` handler (officer-compliance halt via
  // interpretOperationHalt — dig-in, halt delays, NO command-authority cost, and it
  // never removed the op) was REMOVED. Its sole caller was the player Stand Down button
  // in OperationsSection, which now routes through the CA-costed STOP-OP staged path
  // (`stage-op-halt-order` → op_halt.cjs → apply-op-halts). One canonical halt path only.

  ipcMain.handle('stage-operation-force-launch', async (_event, payload) => {
    const { corpsId, operationName } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof operationName !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const op = (state.corps_command?.[corpsId]?.active_operations ?? []).find(o => o.name === operationName);
      if (!op) {
        return { ok: false, error: 'Operation not found' };
      }
      // Level 3 Direct Intervention: deduct command authority (cost 15)
      const FORCE_LAUNCH_COST = 15;
      const auth = state.military.command_authority;
      if (auth) {
        if (auth.current < FORCE_LAUNCH_COST) {
          return { ok: false, error: `Insufficient command authority (${auth.current}/${FORCE_LAUNCH_COST} needed)` };
        }
        auth.current -= FORCE_LAUNCH_COST;
        auth.spent_this_turn += FORCE_LAUNCH_COST;
        auth.lifetime_spent += FORCE_LAUNCH_COST;
      }
      const { interpretOperationLaunch } = await import('../sim/combat/order_interpretation.js');
      const launchResult = interpretOperationLaunch(state, corpsId, op.name);
      // Event (if any) already pushed to state.military.pending_officer_events by interpretOperationLaunch
      if (launchResult.compliance === 'refused') {
        // Officer aborted the operation — do not force-launch
        // recovery_reason is already set to 'manual_termination' by interpretOperationLaunch
        currentGameStateJson = sim.serializeState(state);
        sendGameStateToRenderer(currentGameStateJson);
        return { ok: true };
      }
      // full / modified / partial: apply any modifications then force-launch
      if (launchResult.effective_planning_duration != null) {
        op.planning_duration = launchResult.effective_planning_duration;
      }
      if (launchResult.effective_objectives != null) {
        op.objectives = launchResult.effective_objectives;
      }
      op.force_launch = true;
      op.was_force_launched = true;
      op.commander_assessment_at_launch = op.commander_assessment;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Level 2 — Presidential acknowledgement of a warlord friction event.
  // Sets resolved: true on the matching friction event, reducing command strain over time.
  // Payload: { corpsId, officerId, eventTurn, eventType }
  // Composite key match: officer_id + turn + type (deterministic, no stored id needed).
  ipcMain.handle('acknowledge-friction-event', async (_event, payload) => {
    const { corpsId, officerId, eventTurn, eventType } = payload || {};
    if (!currentGameStateJson
      || typeof corpsId !== 'string'
      || typeof officerId !== 'string'
      || typeof eventTurn !== 'number'
      || typeof eventType !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const frictionEvents = state.military?.friction_events;
      if (!Array.isArray(frictionEvents)) {
        return { ok: false, error: 'No friction events on state' };
      }
      // Find the matching unresolved event by composite key fields
      const event = frictionEvents.find(
        e => e.officer_id === officerId
          && e.turn === eventTurn
          && e.type === eventType
          && e.resolved === false
      );
      if (!event) {
        return { ok: false, error: 'Friction event not found or already resolved' };
      }
      event.resolved = true;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // Level 2 — Presidential stabilization of command relationship.
  // Resolves ALL unresolved friction events for the corps at once (vs one-by-one acknowledge).
  // Costs CA: 10 if strained (1–5), 15 if compromised (6+).
  // 3-turn cooldown enforced to prevent spam.
  // Payload: { corpsId }
  ipcMain.handle('stabilize-command-relationship', async (_event, payload) => {
    const { corpsId } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const currentTurn = state.meta?.turn ?? 0;

      // ── Strain computation owner: src/desktop/command_strain.cjs ────────
      const { totalStrain: strain, isCompromised } = computeCorpsCommandStrain(state, corpsId, currentTurn);
      const corpsCmd = state.corps_command?.[corpsId];
      const namedOfficers = state.military?.named_officers ?? {};
      const frictionEvents = state.military?.friction_events ?? [];
      const officerIds = Object.keys(namedOfficers).sort();

      // Require at least some strain to stabilize
      if (strain === 0) {
        return { ok: false, error: 'Command relationship is already healthy — no stabilization needed.' };
      }

      // ── Cooldown check ───────────────────────────────────────────────────
      const cooldownUntil = corpsCmd?.stabilization_cooldown_until ?? 0;
      if (currentTurn < cooldownUntil) {
        return { ok: false, error: `Stabilization on cooldown until turn ${cooldownUntil}.` };
      }

      // ── CA cost ──────────────────────────────────────────────────────────
      const STABILIZE_COST = isCompromised ? 15 : 10;
      const auth = state.military.command_authority;
      if (auth) {
        if (auth.current < STABILIZE_COST) {
          return { ok: false, error: `Insufficient command authority (${auth.current}/${STABILIZE_COST} needed)` };
        }
        auth.current -= STABILIZE_COST;
        auth.spent_this_turn = (auth.spent_this_turn ?? 0) + STABILIZE_COST;
        auth.lifetime_spent = (auth.lifetime_spent ?? 0) + STABILIZE_COST;
      }

      // ── Resolve all unresolved friction events for this corps ────────────
      let resolved = 0;
      for (const officerId of officerIds) {
        const os = namedOfficers[officerId];
        if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
        for (const event of frictionEvents) {
          if (event.officer_id === officerId && !event.resolved) {
            event.resolved = true;
            resolved++;
          }
        }
      }

      // ── Set stabilization cooldown (3 turns) ────────────────────────────
      if (!state.corps_command) state.corps_command = {};
      if (!state.corps_command[corpsId]) {
        state.corps_command[corpsId] = ensureCorpsCommandEntry(state, corpsId);
      }
      state.corps_command[corpsId].stabilization_cooldown_until = currentTurn + 3;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, resolvedCount: resolved, caCost: auth ? STABILIZE_COST : 0 };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential FRONT VISIT (read-only availability) ───────────────────────
  // Returns whether the player faction can initiate a front visit this turn,
  // plus the reachability-filtered branch lists, cooldown/cap, and CA cost. The
  // gate reuses the SUPPLY-CONNECTIVITY signal (state.political.last_supply_state_by_osid):
  // a front branch is reachable iff the player controls ≥1 in-area OSID that is
  // NOT 'critical' (cut off). No mutation.
  ipcMain.handle('get-front-visit-availability', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = frontVisitEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId);
      const availability = computeFrontVisitAvailability(state, playerFaction, eventDef);
      return { ok: true, costCA: FRONT_VISIT_COST, ...availability };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential FRONT VISIT (initiate) ─────────────────────────────────────
  // Force-queues the authored visit_to_front_<faction> event into
  // state.military.pending_event_decisions (mirror evaluate_events.ts:577) so
  // EventDecisionModal surfaces it. ZERO new sim/event code — the event's authored
  // effects/recurrence/branches are reused. Guards (in order):
  //   1. player faction must resolve to a visit_to_front_<faction> event
  //   2. cooldown/cap reuse the event's OWN recurrence (max_fires 5 / cooldown 10t)
  //   3. ENCLAVE REACHABILITY GATE: front branches filtered to corridored targets;
  //      all-cut-off → 'all_cut_off' refusal
  //   4. CA guard + debit FRONT_VISIT_COST (10)
  // Player-IPC-only (desktop) → never headless → byte-identical by construction.
  ipcMain.handle('initiate-front-visit', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = frontVisitEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId);

      // Guards 1–3: faction / event / cooldown / cap / reachability.
      const availability = computeFrontVisitAvailability(state, playerFaction, eventDef);
      if (!availability.available) {
        return { ok: false, error: availability.reason || 'unavailable', reason: availability.reason };
      }

      // Guard 4: CA debit.
      const auth = state.military.command_authority;
      if (auth) {
        if (auth.current < FRONT_VISIT_COST) {
          return {
            ok: false,
            reason: 'insufficient_ca',
            error: `Insufficient command authority (${auth.current}/${FRONT_VISIT_COST} needed)`,
          };
        }
        auth.current -= FRONT_VISIT_COST;
        auth.spent_this_turn = (auth.spent_this_turn ?? 0) + FRONT_VISIT_COST;
        auth.lifetime_spent = (auth.lifetime_spent ?? 0) + FRONT_VISIT_COST;
      }

      // Force-queue the (reachability-filtered) decision so EventDecisionModal surfaces it.
      const decision = buildFrontVisitPendingDecision(state, playerFaction, eventDef, availability);
      if (!decision) {
        return { ok: false, error: 'Failed to build front-visit decision' };
      }
      if (!state.military.pending_event_decisions) {
        state.military.pending_event_decisions = [];
      }
      state.military.pending_event_decisions.push(decision);

      // Record the fire so the event's OWN recurrence (max_fires 5 / cooldown 10t)
      // gates subsequent visits. resolveEventDecision (the modal-resolve path)
      // does NOT increment these — so we record at queue time here, mirroring the
      // calendar-fire bookkeeping in evaluate_events.ts:194-202. The act of
      // initiating the visit IS the fire; the morale/standing effects commit when
      // the player picks a branch in EventDecisionModal.
      if (!state.military.event_fire_counts) state.military.event_fire_counts = {};
      state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;
      if (!state.military.event_last_fired_turn) state.military.event_last_fired_turn = {};
      state.military.event_last_fired_turn[eventId] = state.meta?.turn ?? 0;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return {
        ok: true,
        eventId,
        caCost: auth ? FRONT_VISIT_COST : 0,
        offeredBranchIds: decision.response_options.map((o) => o.id),
        unreachableBranchIds: availability.unreachableBranchIds,
      };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential ADDRESS THE NATION (read-only availability) ────────────────
  // Mirrors get-front-visit-availability. An address is FACTION-WIDE — no
  // reachability gate (the president broadcasts from the capital); the only gates
  // are player-faction resolution and the event's OWN recurrence (cap/cooldown).
  ipcMain.handle('get-address-nation-availability', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = addressNationEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId); // shared war_1993.json event cache
      const availability = computeAddressNationAvailability(state, playerFaction, eventDef);
      return { ok: true, costCA: ADDRESS_NATION_COST, ...availability };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential ADDRESS THE NATION (initiate) ──────────────────────────────
  // Force-queues the authored address_to_nation_<faction> event into
  // state.military.pending_event_decisions (mirror evaluate_events.ts:577 /
  // initiate-front-visit) so EventDecisionModal surfaces it. ZERO new sim/event
  // code. Guards: 1. faction→event 2. cooldown/cap (event's OWN recurrence)
  // 3. CA guard + debit ADDRESS_NATION_COST. Player-IPC-only → never headless →
  // byte-identical by construction.
  ipcMain.handle('initiate-address-nation', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = addressNationEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId);

      const availability = computeAddressNationAvailability(state, playerFaction, eventDef);
      if (!availability.available) {
        return { ok: false, error: availability.reason || 'unavailable', reason: availability.reason };
      }

      const auth = state.military.command_authority;
      if (auth) {
        if (auth.current < ADDRESS_NATION_COST) {
          return {
            ok: false,
            reason: 'insufficient_ca',
            error: `Insufficient command authority (${auth.current}/${ADDRESS_NATION_COST} needed)`,
          };
        }
        auth.current -= ADDRESS_NATION_COST;
        auth.spent_this_turn = (auth.spent_this_turn ?? 0) + ADDRESS_NATION_COST;
        auth.lifetime_spent = (auth.lifetime_spent ?? 0) + ADDRESS_NATION_COST;
      }

      const decision = buildAddressNationPendingDecision(state, playerFaction, eventDef, availability);
      if (!decision) {
        return { ok: false, error: 'Failed to build address-to-nation decision' };
      }
      if (!state.military.pending_event_decisions) {
        state.military.pending_event_decisions = [];
      }
      state.military.pending_event_decisions.push(decision);

      // Record the fire so the event's OWN recurrence gates subsequent addresses
      // (mirror initiate-front-visit: resolveEventDecision does NOT increment these).
      if (!state.military.event_fire_counts) state.military.event_fire_counts = {};
      state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;
      if (!state.military.event_last_fired_turn) state.military.event_last_fired_turn = {};
      state.military.event_last_fired_turn[eventId] = state.meta?.turn ?? 0;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return {
        ok: true,
        eventId,
        caCost: auth ? ADDRESS_NATION_COST : 0,
        offeredBranchIds: decision.response_options.map((o) => o.id),
      };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential DECORATE A UNIT (read-only availability) ───────────────────
  // Mirrors get-front-visit-availability. No reachability gate (issued from the
  // capital); gated by player-faction + the event's OWN recurrence. Returns the
  // BRIGHT-LINE-filtered eligible REGULAR formations (never paramilitary/militia/
  // phantom) so the renderer can show what the president may honour.
  ipcMain.handle('get-decorate-unit-availability', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = decorateUnitEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId);
      const availability = computeDecorateUnitAvailability(state, playerFaction, eventDef);
      return { ok: true, costCA: DECORATE_UNIT_COST, ...availability };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // ── Presidential DECORATE A UNIT (initiate) ─────────────────────────────────
  // Force-queues the authored decorate_a_unit_<faction> event, with the steadfast
  // template branch EXPANDED into one branch per eligible REGULAR formation so the
  // PLAYER picks which unit to honour (we never auto-pick). ZERO new sim/event
  // code. BRIGHT LINE: only regular formations are eligible (enforced in the
  // contract's eligible-kind allowlist). Guards mirror initiate-address-nation.
  ipcMain.handle('initiate-decorate-unit', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state.meta?.player_faction ?? null;
      const eventId = decorateUnitEventIdForFaction(playerFaction);
      const eventDef = loadFrontVisitEventDef(eventId);

      const availability = computeDecorateUnitAvailability(state, playerFaction, eventDef);
      if (!availability.available) {
        return { ok: false, error: availability.reason || 'unavailable', reason: availability.reason };
      }

      const auth = state.military.command_authority;
      if (auth) {
        if (auth.current < DECORATE_UNIT_COST) {
          return {
            ok: false,
            reason: 'insufficient_ca',
            error: `Insufficient command authority (${auth.current}/${DECORATE_UNIT_COST} needed)`,
          };
        }
        auth.current -= DECORATE_UNIT_COST;
        auth.spent_this_turn = (auth.spent_this_turn ?? 0) + DECORATE_UNIT_COST;
        auth.lifetime_spent = (auth.lifetime_spent ?? 0) + DECORATE_UNIT_COST;
      }

      const decision = buildDecorateUnitPendingDecision(state, playerFaction, eventDef, availability);
      if (!decision) {
        return { ok: false, error: 'Failed to build decorate-a-unit decision' };
      }
      if (!state.military.pending_event_decisions) {
        state.military.pending_event_decisions = [];
      }
      state.military.pending_event_decisions.push(decision);

      if (!state.military.event_fire_counts) state.military.event_fire_counts = {};
      state.military.event_fire_counts[eventId] = (state.military.event_fire_counts[eventId] ?? 0) + 1;
      if (!state.military.event_last_fired_turn) state.military.event_last_fired_turn = {};
      state.military.event_last_fired_turn[eventId] = state.meta?.turn ?? 0;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return {
        ok: true,
        eventId,
        caCost: auth ? DECORATE_UNIT_COST : 0,
        offeredBranchIds: decision.response_options.map((o) => o.id),
        eligibleFormationIds: availability.eligibleFormations.map((f) => f.id),
      };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-operation-decision', async (_event, payload) => {
    const { corpsId, operationName, decision } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof operationName !== 'string' || typeof decision !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const validDecisions = ['launch', 'postpone', 'abort', 'probe'];
    if (!validDecisions.includes(decision)) {
      return { ok: false, error: `Invalid decision: ${decision}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const op = (state.corps_command?.[corpsId]?.active_operations ?? []).find(o => o.name === operationName);
      if (!op) {
        return { ok: false, error: 'Operation not found' };
      }
      switch (decision) {
        case 'launch':
          op.force_launch = true;
          op.commander_assessment_at_launch = op.commander_assessment ?? 'launch';
          break;
        case 'postpone':
          op.postponement_count = (op.postponement_count || 0) + 1;
          break;
        case 'abort':
          op.recovery_reason = 'commander_abort';
          break;
        case 'probe':
          op.active_probe = {
            target_osid: (op.objectives && op.objectives[op.current_objective_index || 0]) || (op.target_settlements && op.target_settlements[0]),
            brigade_ids: [],
            started_turn: state.meta?.turn ?? 0,
            resolved: false,
            result_confidence_gain: 0,
          };
          break;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-airdrop-allocation', async (_event, payload) => {
    const allocations = payload?.allocations;
    if (!currentGameStateJson || !allocations || typeof allocations !== 'object' || Array.isArray(allocations)) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const nextAllocations = {};
      for (const enclaveId of Object.keys(allocations).sort()) {
        const rawValue = allocations[enclaveId];
        if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || rawValue < 0) continue;
        nextAllocations[enclaveId] = rawValue;
      }
      state.airdrop_allocation = nextAllocations;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-convoy-decision', async (_event, payload) => {
    const { convoyId, decision } = payload || {};
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = stageConvoyDecisionOnState(state, convoyId, decision);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-opsec-toggle', async (_event, payload) => {
    const { sectorId, active } = payload || {};
    if (!currentGameStateJson || typeof sectorId !== 'string' || typeof active !== 'boolean') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const current = Array.isArray(state.opsec_sectors) ? [...state.opsec_sectors] : [];
      const next = active
        ? Array.from(new Set([...current, sectorId])).sort()
        : current.filter((id) => id !== sectorId).sort();
      state.opsec_sectors = next;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-municipality-support-order', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = stageMunicipalitySupportOrderOnState(state, payload);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-assign-operation-commander', async (_event, payload) => {
    const { corpsId, operationName, officerId } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof operationName !== 'string' || typeof officerId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const op = (state.corps_command?.[corpsId]?.active_operations ?? []).find(o => o.name === operationName);
      if (!op) {
        return { ok: false, error: 'Operation not found' };
      }

      // Validate officer exists
      const officer = state.named_officers?.[officerId];
      if (!officer) return { ok: false, error: `Officer ${officerId} not found` };

      // Assign officer to operation
      op.commander_officer_id = officerId;
      officer.assigned_operation = operationName;
      officer.assigned_corps_id = corpsId;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // NOTE: the legacy `assign-commander` and `dismiss-officer` IPC handlers were REMOVED
  // (Presidential Command Model slice 3/N, 2026-06-01). Both read the stale
  // `state.named_officers` path (canonical is `state.military.named_officers`) so they
  // operated on `undefined` and silently no-op'd ("Officer not found"), and neither
  // applied a command-authority cost. The player CO sack/install path is now the single
  // costed `stage-co-replacement-order` handler above (→ co_replacement.cjs →
  // apply-co-replacements). The engine-event-driven `accept-officer-replacement` handler
  // (responding to a commander-initiated relief event) is a DISTINCT, still-live mechanism
  // and is retained.

  ipcMain.handle('respond-to-event-decision', async (_event, payload) => {
    const { eventId, responseId } = payload || {};
    if (!currentGameStateJson || typeof eventId !== 'string' || typeof responseId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const { resolveEventDecision } = await import('../sim/events/resolve_decision.js');
      resolveEventDecision(state, eventId, responseId);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('dismiss-event-notification', async (_event, payload) => {
    const { notificationId } = payload || {};
    if (!currentGameStateJson || typeof notificationId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const { dismissEventNotification } = await import('../sim/events/dismiss_notifications.js');
      const result = dismissEventNotification(state, notificationId);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('get-settings', async () => {
    try {
      const { loadSettings } = require('./settings_store.cjs');
      return { ok: true, settings: loadSettings(app) };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('save-settings', async (_event, payload) => {
    try {
      const { saveSettings } = require('./settings_store.cjs');
      const ok = saveSettings(app, payload);
      return { ok };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('resolve-peace-plan', async (_event, payload) => {
    const { planId, response } = payload || {};
    if (!currentGameStateJson || typeof planId !== 'string' || (response !== 'accepted' && response !== 'rejected')) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const { resolvePeacePlan } = require('../sim/negotiation/peace_plans.js');
      const result = resolvePeacePlan(state, planId, response);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, all_accepted: result.all_accepted, rejection_factions: result.rejection_factions };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('submit-counter-offer', async (_event, payload) => {
    const split = payload && payload.proposedSplit;
    const validSplit = split
      && Number.isFinite(split.RBiH)
      && Number.isFinite(split.RS)
      && Number.isFinite(split.HRHB);
    if (
      !currentGameStateJson
      || typeof payload?.parentOfferId !== 'string'
      || typeof payload?.planId !== 'string'
      || (payload?.response !== 'conditional_accept' && payload?.response !== 'counter')
      || !validSplit
    ) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const { submitPlayerCounterOffer } = require('../sim/negotiation/counter_offer_generator.js');
      const offer = submitPlayerCounterOffer(state, payload);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, counter_offer_id: offer.id };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('resolve-paramilitary-requests', async (_event, payload) => {
    const decisions = Array.isArray(payload?.decisions) ? payload.decisions : null;
    if (!currentGameStateJson || !decisions) {
      return { ok: false, error: 'no_state_or_invalid_payload' };
    }

    const decisionByTarget = new Map();
    for (const item of decisions) {
      if (
        item
        && typeof item.target_osid === 'string'
        && (item.decision === 'allow' || item.decision === 'deny')
      ) {
        decisionByTarget.set(item.target_osid, item.decision);
      }
    }
    if (decisionByTarget.size === 0) return { ok: false, error: 'invalid_decisions' };

    try {
      const sim = getDesktopSim();
      const state = readCanonicalCurrentState(sim);
      const pending = Array.isArray(state.pending_paramilitary_requests)
        ? state.pending_paramilitary_requests
        : [];
      const playerFaction = state.meta?.player_faction ?? null;
      let matched = 0;

      for (const request of pending) {
        if (!request || typeof request.target_osid !== 'string') continue;
        if (playerFaction && request.faction !== playerFaction) continue;
        const decision = decisionByTarget.get(request.target_osid);
        if (!decision) continue;
        request.decision = decision;
        matched += 1;
      }

      if (matched === 0) return { ok: false, error: 'request_not_found' };

      const unresolved = pending.filter((request) =>
        request
        && (!playerFaction || request.faction === playerFaction)
        && request.decision !== 'allow'
        && request.decision !== 'deny'
      );
      if (unresolved.length > 0) return { ok: false, error: 'incomplete_decisions' };

      const report = sim.resolvePlayerParamilitaryDecisions(state);
      const stateJson = writeCanonicalCurrentState(sim, state);
      return { ok: true, stateJson, report };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('resolve-dayton', async (_event, payload) => {
    const { territorial_demands, territorial_concessions, institutional_choices } = payload || {};
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const { resolveDaytonNegotiation } = require('../sim/negotiation/dayton_negotiation.js');
      const result = resolveDaytonNegotiation(state, {
        territorial_demands: territorial_demands || [],
        territorial_concessions: territorial_concessions || [],
        institutional_choices: institutional_choices || {},
      });
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, result };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // --- Read-only query handlers (UI previews; no state mutation) ---
  ipcMain.handle('query-movement-range', async (_event, payload) => {
    const { brigadeId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if ((state?.meta?.phase ?? 'war') !== 'war') {
        return { ok: false, error: 'Movement range query is available in War phase only' };
      }
      const result = await sim.queryMovementRangeForBrigade(state, brigadeId, getBaseDir());
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('query-movement-path', async (_event, payload) => {
    const { brigadeId, destinationSid } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof destinationSid !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if ((state?.meta?.phase ?? 'war') !== 'war') {
        return { ok: false, error: 'Movement path query is available in War phase only' };
      }
      const result = await sim.queryMovementPathForBrigade(state, brigadeId, destinationSid, getBaseDir());
      if (!result) return { ok: false, error: 'No friendly path to destination' };
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('query-combat-estimate', async (_event, payload) => {
    const { brigadeId, targetSettlementId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof targetSettlementId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if ((state?.meta?.phase ?? 'war') !== 'war') {
        return { ok: false, error: 'Combat estimate query is available in War phase only' };
      }
      const estimate = await sim.queryCombatEstimateForBrigade(state, brigadeId, targetSettlementId, getBaseDir());
      if (!estimate) return { ok: false, error: 'Could not estimate combat for this brigade/target' };
      return { ok: true, ...estimate };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('query-supply-paths', async () => {
    if (!currentGameStateJson) return { ok: false, error: 'No game loaded' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const report = await sim.querySupplyPaths(state, getBaseDir());
      return { ok: true, report };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('query-corps-sectors', async () => {
    if (!currentGameStateJson) return { ok: false, error: 'No game loaded' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const sectors = sim.queryCorpsSectors(state);
      return { ok: true, sectors };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('query-battle-events', async () => {
    if (!currentGameStateJson) return { ok: false, error: 'No game loaded' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const out = sim.queryBattleEvents(state);
      return { ok: true, ...out };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('focus-warroom', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      return { ok: true };
    }
    return { ok: false, error: 'Warroom window not available' };
  });

  registerIpcHandler('get-current-game-state', async () => currentGameStateJson);

  ipcMain.handle('open-tactical-map-window', async (_event, payload) => {
    try {
      const mode = payload?.mode === 'sandbox' ? 'sandbox' : 'operational';
      openTacticalMapWindow(mode);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  registerIpcHandler('get-map-server-url', async () => resolveMapServerBaseUrl());

  // --- Army Reserve IPC handlers ---
  ipcMain.handle('approve-reserve-request', async (_event, payload) => {
    const { requestId, brigadeId, reason } = payload || {};
    if (!currentGameStateJson || typeof requestId !== 'string' || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.approveReserveRequest(state, requestId, brigadeId, typeof reason === 'string' ? reason : undefined, getBaseDir());
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('recall-elite-brigade', async (_event, payload) => {
    const { brigadeId, reason } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = sim.recallEliteBrigade(state, brigadeId, typeof reason === 'string' ? reason : undefined);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('decline-reserve-request', async (_event, payload) => {
    const { requestId, reason } = payload || {};
    if (!currentGameStateJson || typeof requestId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = sim.declineReserveRequest(state, requestId, typeof reason === 'string' ? reason : undefined);
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('redirect-reserve-loan', async (_event, payload) => {
    const { brigadeId, newCorpsId } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || typeof newCorpsId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.redirectReserveLoan(state, brigadeId, newCorpsId, getBaseDir());
      if (!result.ok) return result;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('acknowledge-officer-event', async (_event, payload) => {
    const { eventId } = payload || {};
    if (!currentGameStateJson || typeof eventId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const events = state.military?.pending_officer_events;
      if (events) {
        const evt = events.find(e => e.event_id === eventId);
        if (evt) {
          evt.acknowledged = true;
          let decision = 'acknowledged';
          if (evt.override_action === 'override-officer-interpretation') {
            // Look up the corps_id from the event (set by interpretStanceOrder / interpretOperationLaunch / interpretOperationHalt)
            const corpsId = evt.corps_id;
            if (corpsId) {
              const { overrideInterpretation } = await import('../sim/combat/order_interpretation.js');
              overrideInterpretation(state, corpsId, eventId);
              decision = 'override_confirmed';
              // Restore the original ordered stance if this was a stance interpretation event
              const corpsCommand = state.military?.corps_command?.[corpsId];
              if (corpsCommand && evt.original_order?.stance) {
                corpsCommand.stance = evt.original_order.stance;
              }
            }
          }
          fileOfficerDecisionRecord(state, evt, decision);
        }
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('accept-officer-replacement', async (_event, payload) => {
    const { eventId, corpsId, newOfficerId, currentOfficerId } = payload || {};
    if (!currentGameStateJson || typeof eventId !== 'string' || typeof corpsId !== 'string' || typeof newOfficerId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const officers = state.military?.named_officers;
      if (officers) {
        // Retire current commander
        if (currentOfficerId && officers[currentOfficerId]) {
          officers[currentOfficerId].status = 'retired';
          officers[currentOfficerId].assigned_corps_id = null;
        }
        // Assign new officer
        if (officers[newOfficerId]) {
          officers[newOfficerId].status = 'active';
          officers[newOfficerId].assigned_corps_id = corpsId;
          officers[newOfficerId].turns_in_command = 0;
          officers[newOfficerId].acting_commander = false;
        }
      }
      // Acknowledge the event
      const events = state.military?.pending_officer_events;
      if (events) {
        const evt = events.find(e => e.event_id === eventId);
        if (evt) {
          evt.acknowledged = true;
          fileOfficerDecisionRecord(state, evt, 'replacement_accepted', {
            new_officer_id: newOfficerId,
            outgoing_officer_id: currentOfficerId,
          });
        }
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  // --- AI Commander IPC handlers ---
  ipcMain.handle('set-ai-commander-config', async (_event, payload) => {
    if (!currentGameStateJson) return { ok: false, error: 'No game loaded' };
    const { mode, anthropic_api_key } = payload || {};
    if (typeof mode !== 'string') return { ok: false, error: 'Invalid payload: mode required' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.meta) state.meta = {};
      state.meta.ai_commander_config = {
        mode,
        ...(typeof anthropic_api_key === 'string' ? { anthropic_api_key } : {}),
        session_cost_estimate: state.meta.ai_commander_config?.session_cost_estimate ?? 0,
      };
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('get-ai-commander-config', async () => {
    if (!currentGameStateJson) return { mode: 'cadet', session_cost_estimate: 0 };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      return state.meta?.ai_commander_config ?? { mode: 'cadet', session_cost_estimate: 0 };
    } catch (e) {
      return { mode: 'cadet', session_cost_estimate: 0 };
    }
  });

  ipcMain.handle('get-advisor-recommendation', async (_event, payload) => {
    if (!currentGameStateJson) return { error: 'No game loaded' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const config = state.meta?.ai_commander_config ?? { mode: 'cadet', session_cost_estimate: 0 };
      if (config.mode === 'cadet') return { error: 'AI Commander is in cadet mode. Enable AI Commander in settings to use advisor.' };
      const faction = payload?.faction ?? state.meta?.player_faction ?? 'RBiH';
      const contextType = payload?.context_type ?? 'situation_analysis';
      const { createAiClient } = await import('../sim/ai_commander/ai_client.js');
      const { getAdvisorRecommendation } = await import('../sim/ai_commander/player_advisor.js');
      const client = await createAiClient(config.anthropic_api_key);
      const result = await getAdvisorRecommendation(state, faction, contextType, client);
      return result ?? { error: 'Advisor returned no recommendation' };
    } catch (e) {
      return { error: e.message || String(e) };
    }
  });

  // v0.8.4 Phase B: Autonomy IPC handlers
  ipcMain.handle('get-autonomy-state', async () => {
    if (!currentGameStateJson) return null;
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const playerProposals = getPendingProposalReviewsForPlayer(state);
    return {
      autonomy_level: state.meta?.autonomy_level ?? 0,
      autonomy_level_pending: state.meta?.autonomy_level_pending ?? null,
      autonomy_overrides: state.meta?.autonomy_overrides ?? [],
      pending_proposal_reviews: playerProposals,
      // Phase 2 slice 1 "Back the Officer": named-officer decision cards joined
      // to active ops (officer + rank, force ratio, go/no-go, override CA cost).
      op_proposal_cards: buildOpProposalCardData(state, playerProposals),
      // "Override without proposal": corps plans the officer holds at 'ready' but
      // never surfaced as a proposal — candidates for a proactive force-launch.
      forceable_ready_plans: buildForceableReadyPlanData(state, playerProposals),
      command_authority: state.military?.command_authority ?? null,
    };
  });

  ipcMain.handle('set-autonomy-level', async (_event, payload) => {
    const { level } = payload ?? {};
    if (typeof level !== 'number' || level < 0 || level > 3 || !Number.isInteger(level)) {
      return { ok: false, error: 'invalid_level' };
    }
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const current = state.meta?.autonomy_level ?? 0;
    if (level === current) {
      // No change — clear any stale pending
      state.meta.autonomy_level_pending = undefined;
    } else if (level < current) {
      // Downward numeric change = reclaiming control (e.g. 1→0): immediate
      state.meta.autonomy_level = level;
      state.meta.autonomy_level_pending = undefined;
    } else {
      // Upward numeric change = more delegation (e.g. 0→1): one-turn delay
      state.meta.autonomy_level_pending = level;
    }
    writeCanonicalCurrentState(sim, state);
    return { ok: true, new_level: state.meta.autonomy_level, pending: state.meta.autonomy_level_pending ?? null };
  });

  ipcMain.handle('override-ai-decision', async (_event, payload) => {
    const { level, target_id, faction } = payload ?? {};
    if (!target_id || !faction || !['army', 'corps', 'event'].includes(level)) {
      return { ok: false, error: 'invalid_payload' };
    }
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    // Inline idempotent upsert — mirrors autonomy_overrides.ts logic (no ESM require from CJS)
    if (!state.meta.autonomy_overrides) state.meta.autonomy_overrides = [];
    state.meta.autonomy_overrides = state.meta.autonomy_overrides.filter(o => o.target_id !== target_id);
    state.meta.autonomy_overrides.push({
      turn: state.meta.turn,
      level,
      target_id,
      faction,
    });
    writeCanonicalCurrentState(sim, state);
    return { ok: true };
  });

  // v0.8.4 Phase C: Proposal accept/reject handlers
  ipcMain.handle('accept-proposal', async (event, proposalId) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const playerFaction = state.meta?.player_faction ?? null;
    const proposalAccess = resolvePendingProposalAccess(proposals, proposalId, playerFaction);
    if (proposalAccess.index === -1) return { ok: false, error: proposalAccess.error };
    const idx = proposalAccess.index;
    const proposal = proposals[idx];
    if (proposal.accepted !== undefined || proposal.opportunity_decision !== undefined) return { ok: false, error: 'already_resolved' };

    // Mark accepted
    proposal.accepted = true;
    proposal.resolved_turn = state.meta.turn;

    // Apply the proposed action
    if (proposal.proposed_action.startsWith('SET_STANCE:')) {
      const [, corpsId, stanceValue] = proposal.proposed_action.split(':');
      if (state.military?.corps_command?.[corpsId]) {
        state.military.corps_command[corpsId].stance = stanceValue;
        state.military.corps_command[corpsId].player_ordered_stance = stanceValue;
      }
    } else if (proposal.proposed_action.startsWith('APPROVE_OP:')) {
      // v0.8.4 Phase D: Player approves a Level 1 op proposal.
      // Sets player_op_response so the plan guard in applyCommanderOutput allows launch.
      const parts = proposal.proposed_action.split(':');
      const corpsId = parts[1];
      const planId = parts[2];
      const cc = state.military?.corps_command?.[corpsId];
      if (cc) {
        cc.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn };
      }
    } else if (proposal.proposed_action.startsWith('OPPORTUNITY:')) {
      // LANE B Phase 2 (Operation Opportunity MVP): Player approves an opportunity.
      // The handler ONLY marks accepted=true above; the war-pipeline step
      // `apply-resolved-opportunity-decisions` reads the accepted flag on the next
      // turn and routes to applyOpportunityDecision -> buildCorpsOperation.
      // No state mutation here — single-owner consumption is in src/sim/combat/operation_opportunities.ts.
    }

    writeCanonicalCurrentState(sim, state, event.sender);
    return { ok: true };
  });

  ipcMain.handle('reject-proposal', async (event, proposalId) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const playerFaction = state.meta?.player_faction ?? null;
    const proposalAccess = resolvePendingProposalAccess(proposals, proposalId, playerFaction);
    if (proposalAccess.index === -1) return { ok: false, error: proposalAccess.error };
    const idx = proposalAccess.index;
    const proposal = proposals[idx];
    if (proposal.accepted !== undefined || proposal.opportunity_decision !== undefined) return { ok: false, error: 'already_resolved' };

    // Mark rejected
    proposal.accepted = false;
    proposal.resolved_turn = state.meta.turn;

    // Lock current stance as player order for one turn (rejection = explicit "hold current stance").
    // Prevents bot from applying the proposed stance this turn.
    if (proposal.proposed_action.startsWith('SET_STANCE:')) {
      const [, corpsId] = proposal.proposed_action.split(':');
      if (state.military?.corps_command?.[corpsId]) {
        const currentStance = proposal.current_value ?? state.military.corps_command[corpsId].stance;
        state.military.corps_command[corpsId].player_ordered_stance = currentStance;
      }
    } else if (proposal.proposed_action.startsWith('APPROVE_OP:')) {
      // v0.8.4 Phase D: Player rejects a Level 1 op proposal.
      // Sets player_op_response so the plan guard in applyCommanderOutput abandons the plan.
      const parts = proposal.proposed_action.split(':');
      const corpsId = parts[1];
      const planId = parts[2];
      const cc = state.military?.corps_command?.[corpsId];
      if (cc) {
        cc.player_op_response = { plan_id: planId, approved: false, turn: state.meta.turn };
      }
    } else if (proposal.proposed_action.startsWith('OPPORTUNITY:')) {
      // LANE B Phase 2: Player declines an opportunity.
      // accepted=false above; the war-pipeline step on the next turn routes
      // it through applyOpportunityDecision('decline'). No state mutation here.
    }

    writeCanonicalCurrentState(sim, state, event.sender);
    return { ok: true };
  });

  // Phase 2 slice 1 "Back the Officer": Level 3 Direct Intervention on a pending
  // op proposal. Mirrors accept-proposal but ALSO debits command authority and
  // sets the op's force_launch flag so the corps commander's go/no-go is
  // overridden in-pipeline (consumed at apply-autonomy-transition). The handler
  // STAGES intent only — player_op_response + force_launch are consumed and
  // cleared by the canonical war pipeline each turn. Determinism preserved:
  // no clock, no RNG; this path is human-only (proposals never carry
  // force_launch for bot/headless factions).
  ipcMain.handle('force-launch-proposal', async (event, proposalId) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const playerFaction = state.meta?.player_faction ?? null;
    const proposalAccess = resolvePendingProposalAccess(proposals, proposalId, playerFaction);
    if (proposalAccess.index === -1) return { ok: false, error: proposalAccess.error };
    const proposal = proposals[proposalAccess.index];
    if (proposal.accepted !== undefined || proposal.opportunity_decision !== undefined) {
      return { ok: false, error: 'already_resolved' };
    }
    if (typeof proposal.proposed_action !== 'string' || !proposal.proposed_action.startsWith('APPROVE_OP:')) {
      return { ok: false, error: 'not_op_proposal' };
    }

    // Resolve the named plan's active op BEFORE any mutation. Force-launch
    // overrides a SPECIFIC operation's go/no-go, so the named planId MUST match
    // an entry in this corps' active_operations. If it does not, reject as a
    // no-op — do NOT fall back to ops[0] (which would debit command_authority
    // and set force_launch on an UNRELATED op) and do NOT mark the proposal
    // accepted. Mirrors accept-proposal's not-found semantics (no side effects).
    const parts = proposal.proposed_action.split(':');
    const corpsId = parts[1];
    const planId = parts.slice(2).join(':');
    const cc = state.military?.corps_command?.[corpsId];
    if (!cc) {
      return { ok: false, error: 'corps_not_found' };
    }
    const ops = Array.isArray(cc.active_operations)
      ? cc.active_operations
      : (cc.active_operation ? [cc.active_operation] : []);
    const op = ops.find((o) => o && (o.plan_id === planId || o.id === planId));
    if (!op) {
      return { ok: false, error: 'plan_not_active' };
    }

    // Command-authority guard — do not stage anything if unaffordable.
    const auth = state.military?.command_authority;
    if (auth) {
      if (auth.current < FORCE_LAUNCH_COST) {
        return { ok: false, error: `insufficient_command_authority (${auth.current}/${FORCE_LAUNCH_COST})` };
      }
      auth.current -= FORCE_LAUNCH_COST;
      auth.spent_this_turn += FORCE_LAUNCH_COST;
      auth.lifetime_spent += FORCE_LAUNCH_COST;
    }

    // Approve the plan (same channel as accept-proposal) so applyCommanderOutput launches it.
    // force_launched marks this as a force-launch (Direct Intervention) so commander_loop tags
    // a newly-emitted op too; an ordinary Commit omits the marker and is not tagged.
    cc.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn, force_launched: true };
    // Override the commander's go/no-go on the matching active op.
    op.force_launch = true;
    op.was_force_launched = true;
    op.commander_assessment_at_launch = op.commander_assessment;

    proposal.accepted = true;
    proposal.resolved_turn = state.meta.turn;

    writeCanonicalCurrentState(sim, state, event.sender);
    return { ok: true };
  });

  // "Override without proposal" — PROACTIVE presidential force-launch.
  //
  // At autonomy level 1 the corps commander may hold a plan at 'ready' WITHOUT
  // ever surfacing it as an APPROVE_OP proposal. This handler lets the president
  // force that held plan to launch by STAGING player_op_response.approved=true for
  // it — exactly the channel the commander_loop Level-1 guard consumes next turn
  // to let the plan reach 'executing'. Mirrors force-launch-proposal but resolves
  // the plan from commander_state.current_plan (no proposal lookup), and REQUIRES
  // status 'ready' with NO pending proposal for that plan (rejects otherwise — no
  // fallback). Debits PROACTIVE_FORCE_LAUNCH_COST (25) command authority.
  //
  // Determinism preserved: no clock, no RNG; human-only (the sim never sets
  // player_op_response, and Level-1 proposals/launch only exist for the human
  // player — headless stays at autonomy_level 0).
  ipcMain.handle('proactive-force-launch-op', async (event, payload) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const corpsId = payload && typeof payload.corpsId === 'string' ? payload.corpsId : '';
    const planId = payload && typeof payload.planId === 'string' ? payload.planId : '';
    if (!corpsId || !planId) return { ok: false, error: 'invalid_payload' };

    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);

    // Player-ownership: only the player faction may force its own corps.
    const playerFaction = state.meta?.player_faction ?? null;

    const cc = state.military?.corps_command?.[corpsId];
    if (!cc) return { ok: false, error: 'corps_not_found' };

    // Corps→faction is the corps formation's faction (corps_command key is a
    // FormationId in military.formations). Reject force-launching another
    // faction's corps — stage nothing, debit no command authority.
    const corpsFaction = state.military?.formations?.[corpsId]?.faction ?? null;
    if (playerFaction && corpsFaction && corpsFaction !== playerFaction) {
      return { ok: false, error: 'corps_not_owned_by_player' };
    }

    // Resolve the HELD plan from commander_state.current_plan (NOT active_operations).
    const plan = cc.commander_state && typeof cc.commander_state === 'object'
      ? cc.commander_state.current_plan
      : null;
    if (!plan || typeof plan !== 'object') return { ok: false, error: 'plan_not_found' };
    if (plan.plan_id !== planId) return { ok: false, error: 'plan_not_found' };
    if (plan.status !== 'ready') return { ok: false, error: 'plan_not_ready' };

    // REQUIRE no surfaced proposal for this plan — proactive force-launch is for
    // plans the officer never recommended. A surfaced proposal goes through the
    // existing commit / override (force-launch-proposal) path instead.
    const proposals = Array.isArray(state.meta?.pending_proposal_reviews)
      ? state.meta.pending_proposal_reviews
      : [];
    const approveAction = `APPROVE_OP:${corpsId}:${planId}`;
    const hasProposal = proposals.some((p) =>
      p && p.proposed_action === approveAction
      && (!playerFaction || p.faction === playerFaction)
      && p.accepted === undefined && p.opportunity_decision === undefined,
    );
    if (hasProposal) return { ok: false, error: 'plan_has_pending_proposal' };

    // Command-authority guard — stage nothing if unaffordable.
    const auth = state.military?.command_authority;
    if (auth) {
      if (auth.current < PROACTIVE_FORCE_LAUNCH_COST) {
        return { ok: false, error: `insufficient_command_authority (${auth.current}/${PROACTIVE_FORCE_LAUNCH_COST})` };
      }
      auth.current -= PROACTIVE_FORCE_LAUNCH_COST;
      auth.spent_this_turn += PROACTIVE_FORCE_LAUNCH_COST;
      auth.lifetime_spent += PROACTIVE_FORCE_LAUNCH_COST;
    }

    // Stage approval — the SAME channel as commit / force-launch-proposal, but with
    // force_launched:true so commander_loop tags the emitted op as a force-launch
    // (Direct Intervention). An ordinary Commit omits the marker and is not tagged.
    cc.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn, force_launched: true };

    // Defensive parity with force-launch-proposal: if an active op already exists
    // for this plan (e.g. re-issued same turn), carry the force-launch flags so it
    // bypasses planning like the proposal-override path. Held-ready plans normally
    // have no active op yet — the flags then ride the emitted op via normal staging.
    const ops = Array.isArray(cc.active_operations)
      ? cc.active_operations
      : (cc.active_operation ? [cc.active_operation] : []);
    const op = ops.find((o) => o && (o.plan_id === planId || o.id === planId));
    if (op) {
      op.force_launch = true;
      op.was_force_launched = true;
      op.commander_assessment_at_launch = op.commander_assessment;
    }

    writeCanonicalCurrentState(sim, state, event.sender);
    return { ok: true };
  });

  ipcMain.handle('resolve-operation-opportunity-decision', async (event, payload) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const playerFaction = state.meta?.player_faction ?? null;
    const decisionAccess = resolveOpportunityDecisionPayload(proposals, payload, playerFaction);
    if (decisionAccess.index === -1) return { ok: false, error: decisionAccess.error };
    const proposal = proposals[decisionAccess.index];

    // Rich operation-opportunity responses are still consumed by the canonical
    // war-pipeline step. The desktop bridge records player intent only.
    proposal.opportunity_decision = decisionAccess.decision;
    proposal.opportunity_decision_options = decisionAccess.options;
    proposal.resolved_turn = state.meta.turn;

    writeCanonicalCurrentState(sim, state, event.sender);
    return { ok: true };
  });

  // v0.9.2 tutorial onboarding skeleton (LANE-NIGHTSHIFT-ROUND2-TUTORIAL-ONBOARDING-SKELETON).
  //
  // Single-owner: these handlers are the only writers of `meta.tutorial_state`.
  // All go through readCanonicalCurrentState / writeCanonicalCurrentState so
  // the tutorial state round-trips through the canonical serializer (matches
  // desktop_persistence_contract).
  // The originating renderer must receive the broadcast: the overlay reads
  // store state and tutorial IPC responses do not carry stateJson payloads.
  //
  // Determinism: completed_steps is appended-in-call-order; no clock, no
  // sorting. Idempotent — a duplicate advance-step request is a no-op.
  ipcMain.handle('tutorial:dismiss', async (event) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    if (!state.meta) return { ok: false, error: 'no_meta' };
    const prior = state.meta.tutorial_state ?? { dismissed: false, completed_steps: [] };
    state.meta.tutorial_state = {
      dismissed: true,
      current_step: prior.current_step,
      completed_steps: Array.isArray(prior.completed_steps) ? prior.completed_steps.slice() : [],
    };
    writeCanonicalCurrentState(sim, state);
    return { ok: true };
  });

  ipcMain.handle('tutorial:advance-step', async (event, payload) => {
    const stepId = payload?.stepId;
    if (typeof stepId !== 'string' || stepId.length === 0) {
      return { ok: false, error: 'invalid_step_id' };
    }
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    if (!state.meta) return { ok: false, error: 'no_meta' };
    const prior = state.meta.tutorial_state ?? { dismissed: false, completed_steps: [] };
    const completed = Array.isArray(prior.completed_steps) ? prior.completed_steps.slice() : [];
    // Idempotent append: skip if already present (deterministic, no duplicates).
    if (!completed.includes(stepId)) {
      completed.push(stepId);
    }
    state.meta.tutorial_state = {
      dismissed: prior.dismissed === true,
      current_step: stepId,
      completed_steps: completed,
    };
    writeCanonicalCurrentState(sim, state);
    return { ok: true };
  });

  // LANE-NIGHTSHIFT-TUTORIAL-CONTENT-V1: explicit restart action. Resets
  // dismissed=false and clears completed_steps so the overlay re-mounts at
  // step 1. Single-owner: this is the only canonical restart writer.
  ipcMain.handle('tutorial:restart', async (event) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const sim = getDesktopSim();
    const state = readCanonicalCurrentState(sim);
    if (!state.meta) return { ok: false, error: 'no_meta' };
    state.meta.tutorial_state = {
      dismissed: false,
      current_step: undefined,
      completed_steps: [],
    };
    writeCanonicalCurrentState(sim, state);
    return { ok: true };
  });

  // Start the tactical map HTTP server (required because MapLibre's Web Workers
  // don't function under Electron custom protocol schemes), then create the window.
  startMapServer().then(() => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (RUNTIME_PROBE_MODE) return;
  app.quit();
});
