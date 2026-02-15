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

/** Lazy-load desktop sim bundle (built by desktop:sim:build). Resolve from project root so path matches build output (dist/desktop/), not src/dist/desktop/. */
function getDesktopSim() {
  const bundlePath = path.join(getBaseDir(), 'dist', 'desktop', 'desktop_sim.cjs');
  if (!fs.existsSync(bundlePath)) {
    throw new Error('Desktop sim not built. Run: npm run desktop:sim:build');
  }
  return require(bundlePath);
}

function sendGameStateToRenderer(stateJson) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('game-state-updated', stateJson);
  }
}

// Must run before app.whenReady()
protocol.registerSchemesAsPrivileged([{ scheme: 'awwv', privileges: { standard: true, supportFetchAPI: true } }]);

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
  } catch (_) {}
  return null;
}

function writeLastReplayPath(filePath) {
  try {
    fs.writeFileSync(getLastReplayPathPath(), JSON.stringify({ path: filePath }, null, 0));
  } catch (_) {}
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

let mainWindow = null;

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

  win.loadURL('awwv://app/tactical_map.html');
  const devToolsPromise = win.webContents.openDevTools({ mode: 'detach' });
  if (devToolsPromise && typeof devToolsPromise.catch === 'function') {
    devToolsPromise.catch(() => {});
  }

  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Open replay...', accelerator: 'CmdOrCtrl+O', click: async () => {
          try {
            const out = await showReplayDialogAndRead(win);
            if (out) win.webContents.send('replay-loaded', out.data);
          } catch (e) { console.error('Replay load failed:', e); }
        }},
        { type: 'separator' },
        { label: 'Load scenario...', click: async () => {
          try {
            const result = await showScenarioDialog(win);
            if (result.canceled || !result.filePaths.length) return;
            const sim = getDesktopSim();
            const { state } = await sim.loadScenarioFromPath(result.filePaths[0], getBaseDir());
            currentGameStateJson = sim.serializeState(state);
            sendGameStateToRenderer(currentGameStateJson);
          } catch (e) { console.error('Load scenario failed:', e); }
        }},
        { label: 'Load state file...', click: async () => {
          try {
            const result = await showStateFileDialog(win);
            if (result.canceled || !result.filePaths.length) return;
            const sim = getDesktopSim();
            const { state } = await sim.loadStateFromPath(result.filePaths[0]);
            currentGameStateJson = sim.serializeState(state);
            sendGameStateToRenderer(currentGameStateJson);
          } catch (e) { console.error('Load state failed:', e); }
        }},
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

function registerProtocol() {
  const mapAppDir = getMapAppDir();
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
    if (playerFaction !== 'RBiH' && playerFaction !== 'RS' && playerFaction !== 'HRHB') {
      return { ok: false, error: 'Invalid playerFaction. Use RBiH, RS, or HRHB.' };
    }
    try {
      const sim = getDesktopSim();
      const { state } = await sim.startNewCampaign(getBaseDir(), playerFaction);
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

  ipcMain.handle('advance-turn', async () => {
    if (!currentGameStateJson) {
      return { ok: false, error: 'No game loaded. Load a scenario or state file first.' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
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
      if (state.brigade_posture_orders) {
        state.brigade_posture_orders = state.brigade_posture_orders.filter(o => o.brigade_id !== brigadeId);
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
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
