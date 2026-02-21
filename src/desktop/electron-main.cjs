'use strict';

const { app, BrowserWindow, protocol, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const LAST_REPLAY_PATH_FILE = 'last-replay-path.json';

/** Project root (dev) or resources root (packaged). Used for data paths and desktop sim. */
function getBaseDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app', '..');
  }
  return path.join(__dirname, '..', '..');
}

/** In-memory game state for "play myself". Set by load-scenario or load-state; updated by advance-turn. */
let currentGameStateJson = null;
let mainWindow = null;
let tacticalMapWindow = null;

/** Lazy-load desktop sim bundle (built by desktop:sim:build). Resolve from project root so path matches build output (dist/desktop/), not src/dist/desktop/. */
function getDesktopSim() {
  const bundlePath = path.join(getBaseDir(), 'dist', 'desktop', 'desktop_sim.cjs');
  if (!fs.existsSync(bundlePath)) {
    throw new Error('Desktop sim not built. Run: npm run desktop:sim:build');
  }
  return require(bundlePath);
}

function sendGameStateToRenderer(stateJson) {
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('game-state-updated', stateJson);
    }
  }
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

function getLastReplayPathPath() {
  return path.join(app.getPath('userData'), LAST_REPLAY_PATH_FILE);
}

function readLastReplayPath() {
  try {
    const p = getLastReplayPathPath();
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data && typeof data.path === 'string') return data.path;
    }
  } catch (_) { }
  return null;
}

function writeLastReplayPath(filePath) {
  try {
    fs.writeFileSync(getLastReplayPathPath(), JSON.stringify({ path: filePath }, null, 0));
  } catch (_) { }
}

function showReplayDialogAndRead(win) {
  return dialog.showOpenDialog(win || null, {
    title: 'Open replay_timeline.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  }).then((result) => {
    if (result.canceled || !result.filePaths.length) return null;
    const filePath = result.filePaths[0];
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      writeLastReplayPath(filePath);
      return { filePath, data };
    } catch (e) {
      throw new Error(e.message || 'Failed to read replay file');
    }
  });
}

function showScenarioDialog(win) {
  return dialog.showOpenDialog(win || null, {
    title: 'Load scenario',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
}

function showStateFileDialog(win) {
  return dialog.showOpenDialog(win || null, {
    title: 'Load state file (final_save.json or saved game)',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('awwv://warroom/index.html');
  const devToolsPromise = win.webContents.openDevTools({ mode: 'detach' });
  if (devToolsPromise && typeof devToolsPromise.catch === 'function') {
    devToolsPromise.catch(() => { });
  }

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open replay...', accelerator: 'CmdOrCtrl+O', click: async () => {
            try {
              const out = await showReplayDialogAndRead(win);
              if (out) win.webContents.send('replay-loaded', out.data);
            } catch (e) { console.error('Replay load failed:', e); }
          }
        },
        { type: 'separator' },
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
}

function openTacticalMapWindow() {
  if (tacticalMapWindow && !tacticalMapWindow.isDestroyed()) {
    tacticalMapWindow.focus();
    return tacticalMapWindow;
  }

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadURL('awwv://app/tactical_map.html');
  tacticalMapWindow = win;
  win.on('closed', () => { tacticalMapWindow = null; });
  win.webContents.on('did-finish-load', () => {
    if (currentGameStateJson) {
      win.webContents.send('game-state-updated', currentGameStateJson);
    }
  });
  return win;
}

function registerProtocol() {
  const mapAppDir = getMapAppDir();
  const warroomAppDir = getWarroomAppDir();
  const dataDerivedDir = getDataDerivedDir();

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
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(rel).toLowerCase();
        const types = { '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png' };
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
      } catch (e) {
        if (e.code === 'ENOENT') return new Response('Not Found', { status: 404 });
        throw e;
      }
    }

    if (segs[0] === 'app') {
      const rel = segs.slice(1).join(path.sep) || 'tactical_map.html';
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
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(rel).toLowerCase();
        const types = { '.json': 'application/json', '.geojson': 'application/geo+json', '.png': 'image/png' };
        return new Response(buf, { headers: { 'Content-Type': types[ext] || 'application/octet-stream' } });
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
      const rel = segs.slice(2).join(path.sep) || 'tactical_map.html';
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

app.whenReady().then(() => {
  registerProtocol();

  ipcMain.handle('load-replay-dialog', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const out = await showReplayDialogAndRead(win);
    return out ? out.data : null;
  });

  ipcMain.handle('get-last-replay', async () => {
    const filePath = readLastReplayPath();
    if (!filePath || !fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (_) {
      return null;
    }
  });

  // Phase 3: Play myself — load scenario, load state, advance turn
  ipcMain.handle('load-scenario-dialog', async () => {
    const result = await showScenarioDialog(BrowserWindow.getFocusedWindow());
    if (result.canceled || !result.filePaths.length) return { ok: false, error: 'Canceled' };
    try {
      const sim = getDesktopSim();
      const { state } = await sim.loadScenarioFromPath(result.filePaths[0], getBaseDir());
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, stateJson: currentGameStateJson };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('start-new-campaign', async (_event, payload) => {
    const playerFaction = payload && payload.playerFaction;
    const scenarioKey = payload && payload.scenarioKey;
    if (playerFaction !== 'RBiH' && playerFaction !== 'RS' && playerFaction !== 'HRHB') {
      return { ok: false, error: 'Invalid playerFaction. Use RBiH, RS, or HRHB.' };
    }
    if (scenarioKey !== undefined && scenarioKey !== 'apr_1992' && scenarioKey !== 'sep_1991') {
      return { ok: false, error: 'Invalid scenarioKey. Use apr_1992 or sep_1991.' };
    }
    try {
      const sim = getDesktopSim();
      const { state } = await sim.startNewCampaign(getBaseDir(), playerFaction, scenarioKey ?? 'apr_1992');
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, stateJson: currentGameStateJson };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('load-state-dialog', async () => {
    const result = await showStateFileDialog(BrowserWindow.getFocusedWindow());
    if (result.canceled || !result.filePaths.length) return { ok: false, error: 'Canceled' };
    try {
      const sim = getDesktopSim();
      const { state } = await sim.loadStateFromPath(result.filePaths[0]);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, stateJson: currentGameStateJson };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('advance-turn', async (_event, payload) => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded. Load a scenario or state file first.' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const phase0Directives = Array.isArray(payload?.phase0Directives) ? payload.phase0Directives : [];
      if (state.meta?.phase === 'phase_0' && phase0Directives.length > 0 && typeof sim.applyPhase0Directives === 'function') {
        sim.applyPhase0Directives(state, phase0Directives);
      }
      const result = await sim.advanceTurn(state, getBaseDir());
      if (result.error) return { ok: false, error: result.error };
      currentGameStateJson = sim.serializeState(result.state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true, stateJson: currentGameStateJson, report: result.report ?? null };
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
      sendGameStateToRenderer(currentGameStateJson);
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

  ipcMain.handle('stage-brigade-aor-order', async (_event, payload) => {
    const { settlementId, fromBrigadeId, toBrigadeId } = payload || {};
    if (!currentGameStateJson || typeof settlementId !== 'string' || typeof fromBrigadeId !== 'string' || typeof toBrigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const order = { settlement_id: settlementId, from_brigade: fromBrigadeId, to_brigade: toBrigadeId };
      const result = await sim.validateBrigadeAoROrder(state, order, getBaseDir());
      if (!result.valid) {
        return { ok: false, error: result.error || 'Invalid AoR order' };
      }
      if (!state.brigade_aor_orders) state.brigade_aor_orders = [];
      state.brigade_aor_orders.push(order);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('set-brigade-desired-aor-cap', async (_event, payload) => {
    const { brigadeId, cap } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const clearCap = typeof cap !== 'number' || cap < 1;
    const capped = clearCap ? 0 : Math.min(4, Math.max(1, Math.floor(cap)));
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.brigade_desired_aor_cap) state.brigade_desired_aor_cap = {};
      if (clearCap) {
        delete state.brigade_desired_aor_cap[brigadeId];
        if (Object.keys(state.brigade_desired_aor_cap).length === 0) delete state.brigade_desired_aor_cap;
      } else {
        state.brigade_desired_aor_cap[brigadeId] = capped;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-brigade-movement-order', async (_event, payload) => {
    const { brigadeId, targetSettlementIds } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || !Array.isArray(targetSettlementIds)) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const sids = targetSettlementIds.filter(s => typeof s === 'string');
    if (sids.length === 0) return { ok: false, error: 'At least one destination settlement required' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.validateBrigadeMovementOrder(state, brigadeId, sids, getBaseDir());
      if (!result.valid) {
        return { ok: false, error: result.error || 'Invalid movement order' };
      }
      if (!state.brigade_movement_orders) state.brigade_movement_orders = {};
      state.brigade_movement_orders[brigadeId] = { destination_sids: [...sids].sort() };
      if (state.brigade_mun_orders) delete state.brigade_mun_orders[brigadeId];
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-brigade-reposition-order', async (_event, payload) => {
    const { brigadeId, settlementIds } = payload || {};
    if (!currentGameStateJson || typeof brigadeId !== 'string' || !Array.isArray(settlementIds)) {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const sids = settlementIds.filter(s => typeof s === 'string');
    if (sids.length === 0) return { ok: false, error: 'At least one settlement required' };
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.validateBrigadeRepositionOrder(state, brigadeId, sids, getBaseDir());
      if (!result.valid) {
        return { ok: false, error: result.error || 'Invalid reposition order' };
      }
      if (!state.brigade_reposition_orders) state.brigade_reposition_orders = {};
      state.brigade_reposition_orders[brigadeId] = { settlement_ids: [...sids].sort() };
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
      if (state.brigade_movement_orders) delete state.brigade_movement_orders[brigadeId];
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

  ipcMain.handle('stage-corps-stance-order', async (_event, payload) => {
    const { corpsId, stance } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof stance !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const validStances = ['defensive', 'balanced', 'offensive', 'reorganize'];
    if (!validStances.includes(stance)) {
      return { ok: false, error: `Invalid stance: ${stance}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      if (!state.corps_command) state.corps_command = {};
      if (!state.corps_command[corpsId]) {
        state.corps_command[corpsId] = {
          command_span: 5,
          subordinate_count: 0,
          og_slots: 1,
          active_ogs: [],
          corps_exhaustion: 0,
          stance: stance,
          active_operation: null,
        };
      } else {
        state.corps_command[corpsId].stance = stance;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
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
      if ((state?.meta?.phase ?? 'phase_ii') !== 'phase_ii') {
        return { ok: false, error: 'Movement range query is available in Phase II only' };
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
      if ((state?.meta?.phase ?? 'phase_ii') !== 'phase_ii') {
        return { ok: false, error: 'Movement path query is available in Phase II only' };
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
      if ((state?.meta?.phase ?? 'phase_ii') !== 'phase_ii') {
        return { ok: false, error: 'Combat estimate query is available in Phase II only' };
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

  ipcMain.handle('get-current-game-state', async () => currentGameStateJson);

  ipcMain.handle('open-tactical-map-window', async () => {
    try {
      openTacticalMapWindow();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
