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

function sendGameStateToRenderer(stateJson, excludeSender) {
  const targets = [mainWindow, tacticalMapWindow];
  for (const win of targets) {
    if (win && !win.isDestroyed()) {
      if (excludeSender && win.webContents === excludeSender) continue;
      win.webContents.send('game-state-updated', stateJson);
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
      console.log(`Tactical map server: http://127.0.0.1:${mapServerPort}`);
      resolve(mapServerPort);
    });
  });
}

function getMapServerUrl(extraPath) {
  return `http://127.0.0.1:${mapServerPort}${extraPath || '/'}`;
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

  // Clear HTTP cache so the tactical map iframe always loads the latest bundle from the map server.
  win.webContents.session.clearCache().catch(() => { });

  const devToolsPromise = win.webContents.openDevTools({ mode: 'detach' });
  if (devToolsPromise && typeof devToolsPromise.catch === 'function') {
    devToolsPromise.catch(() => { });
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

function openTacticalMapWindow(mode = 'operational') {
  const targetPath = mode === 'sandbox' ? '/tactical_sandbox.html' : '/';
  const cacheBuster = `v=${Date.now()}`;
  const targetUrl = `${getMapServerUrl(targetPath)}${targetPath.includes('?') ? '&' : '?'}${cacheBuster}`;
  if (tacticalMapWindow && !tacticalMapWindow.isDestroyed()) {
    if (tacticalMapWindow.webContents.getURL() !== targetUrl) {
      tacticalMapWindow.loadURL(targetUrl);
    }
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
  win.loadURL(targetUrl);
  tacticalMapWindow = win;
  win.on('closed', () => { tacticalMapWindow = null; });
  win.webContents.on('did-finish-load', () => {
    if (currentGameStateJson) {
      win.webContents.send('game-state-updated', currentGameStateJson);
    }
  });
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

app.whenReady().then(() => {
  registerProtocol();

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
      return { ok: false, error: e.message || String(e) };
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
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('load-state-dialog', async (_event) => {
    const result = await showStateFileDialog(BrowserWindow.getFocusedWindow());
    if (result.canceled || !result.filePaths.length) return { ok: false, error: 'Canceled' };
    try {
      const sim = getDesktopSim();
      const { state } = await sim.loadStateFromPath(result.filePaths[0]);
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson, _event.sender);
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

      // Wave 4 stance gate: reject offensive stance when command is compromised (strain >= 6).
      // Inline strain computation (mirrors command_strain.ts).
      if (stance === 'offensive') {
        const FORCE_LAUNCH_STRAIN = 3;
        const FRICTION_EVENT_STRAIN = 2;
        const COMPROMISED_THRESHOLD = 6;
        const currentTurn = state.meta?.turn ?? 0;
        let totalStrain = 0;
        const corpsCmd = state.corps_command?.[corpsId];
        if (corpsCmd) {
          const activeOps = [...(corpsCmd.active_operations ?? [])].sort((a, b) => a.name.localeCompare(b.name));
          for (const op of activeOps) {
            if (op.was_force_launched !== true) continue;
            const turnAge = Math.max(0, currentTurn - (op.started_turn ?? currentTurn));
            totalStrain += Math.max(0, FORCE_LAUNCH_STRAIN - turnAge);
          }
        }
        const frictionEvents = state.military?.friction_events ?? [];
        const namedOfficers = state.military?.named_officers ?? {};
        for (const officerId of Object.keys(namedOfficers).sort()) {
          const os = namedOfficers[officerId];
          if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
          for (const event of frictionEvents) {
            if (event.officer_id === officerId && !event.resolved) {
              const turnAge = Math.max(0, currentTurn - event.turn);
              totalStrain += Math.max(0, FRICTION_EVENT_STRAIN - turnAge);
            }
          }
        }
        if (Math.max(0, Math.round(totalStrain)) >= COMPROMISED_THRESHOLD) {
          return { ok: false, reason: 'compromised', error: 'Cannot set aggressive stance — command is compromised. Stabilize the command relationship first.' };
        }
      }

      const corpsCommand = ensureCorpsCommandEntry(state, corpsId, stance);
      // Record the raw player-ordered stance before interpretation
      corpsCommand.player_ordered_stance = stance;
      // Run order interpretation through the corps commander's personality
      const { interpretStanceOrder } = await import('../sim/combat/order_interpretation.js');
      const result = interpretStanceOrder(state, corpsId, stance);
      // Apply effective stance (may differ from ordered if officer deviates)
      // Event (if any) is already pushed to state.military.pending_officer_events by interpretStanceOrder
      corpsCommand.stance = result.effective_stance ?? stance;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-corps-operation-order', async (_event, payload) => {
    const {
      corpsId,
      name,
      type,
      targetSettlements,
      participatingBrigades,
      sectorId,
      objectives,
      planningDuration,
      stagingOsid,
      minAttackOutcome,
      tempo,
      schwerpunktOsid,
      artilleryPreparation,
      axes,
    } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof name !== 'string' || typeof type !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const validTypes = ['general_offensive', 'sector_attack', 'strategic_defense', 'reorganization', 'feint', 'probe'];
    if (!validTypes.includes(type)) {
      return { ok: false, error: `Invalid operation type: ${type}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const corpsCommand = ensureCorpsCommandEntry(state, corpsId);
      const turn = state.meta?.turn ?? 0;
      if (!corpsCommand.active_operations) corpsCommand.active_operations = [];
      // PHASE 5 TRANSITIONAL: PLAYER-AUTHORED op creation (ops modal IPC path).
      // sector_id flows in from the payload (line below). Brigade categorization fields
      // (primary_sector_brigades, attached_brigades, supporting_sector_ids) are absent —
      // player explicitly selects brigades, so no automatic categorization is needed.
      // Cannot use TypeScript factories here (CJS/ESM boundary). Not broad-pool.
      corpsCommand.active_operations.push({
        name,
        type,
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        target_settlements: Array.isArray(targetSettlements) ? targetSettlements : [],
        participating_brigades: Array.isArray(participatingBrigades) ? participatingBrigades : [],
        sector_id: typeof sectorId === 'string' ? sectorId : undefined,
        objectives: Array.isArray(objectives) ? objectives : [],
        planning_duration: typeof planningDuration === 'number' ? planningDuration : 2,
        staging_osid: typeof stagingOsid === 'string' ? stagingOsid : undefined,
        momentum: 0,
        current_objective_index: 0,
        min_attack_outcome: typeof minAttackOutcome === 'string' ? minAttackOutcome : undefined,
        tempo: typeof tempo === 'string' ? tempo : undefined,
        schwerpunkt_osid: typeof schwerpunktOsid === 'string' ? schwerpunktOsid : undefined,
        artillery_preparation: artilleryPreparation === true,
        axes: Array.isArray(axes) ? axes : undefined,
      });
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
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

  ipcMain.handle('stage-sector-stance-order', async (_event, payload) => {
    const { sectorId, stance } = payload || {};
    if (!currentGameStateJson || typeof sectorId !== 'string' || typeof stance !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    const validStances = ['fortify', 'defend', 'elastic', 'active_defense', 'screening'];
    if (!validStances.includes(stance)) {
      return { ok: false, error: `Invalid sector stance: ${stance}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const nextOrders = Array.isArray(state.sector_stance_orders) ? [...state.sector_stance_orders] : [];
      const filtered = nextOrders.filter((order) => order?.sector_id !== sectorId);
      filtered.push({ sector_id: sectorId, stance });
      state.sector_stance_orders = filtered;
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('reset-sector-stance-to-bot', async (_event, payload) => {
    const { sectorId } = payload || {};
    if (!currentGameStateJson || typeof sectorId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const sector = state.corps_front_sectors?.[sectorId];
      if (!sector) {
        return { ok: false, error: `Unknown sector: ${sectorId}` };
      }
      sector.stance_source = 'bot';
      // Remove any pending stance order for this sector
      if (Array.isArray(state.sector_stance_orders)) {
        state.sector_stance_orders = state.sector_stance_orders.filter((order) => order?.sector_id !== sectorId);
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
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
      if (!state.logistics_priority) state.logistics_priority = {};
      if (!state.logistics_priority[faction]) state.logistics_priority[faction] = {};
      for (const edgeId of sector.edge_ids ?? []) {
        state.logistics_priority[faction][edgeId] = priority;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('stage-operation-halt', async (_event, payload) => {
    const { corpsId, operationName, digInOnHalt } = payload || {};
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
      op.dig_in_on_halt = digInOnHalt === true;
      const { interpretOperationHalt } = await import('../sim/combat/order_interpretation.js');
      const haltResult = interpretOperationHalt(state, corpsId, operationName);
      // Event (if any) is already pushed to state.military.pending_officer_events by interpretOperationHalt
      if (haltResult.compliance === 'full') {
        // Immediate halt
        op.recovery_reason = 'manual_termination';
      } else if (haltResult.compliance === 'modified' || haltResult.compliance === 'partial') {
        // Delayed halt — op continues until countdown expires
        op.halt_delay_turns_remaining = haltResult.halt_delay_turns;
      } else {
        // Refused — op continues; delay still applied so the order has some effect
        op.halt_delay_turns_remaining = haltResult.halt_delay_turns;
      }
      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

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

      // ── Inline strain computation (mirrors command_strain.ts, CJS context) ─
      const FORCE_LAUNCH_STRAIN = 3;
      const FRICTION_EVENT_STRAIN = 2;
      const DECAY_PER_TURN = 1;
      const COMPROMISED_THRESHOLD = 6;
      let totalStrain = 0;
      const corpsCmd = state.corps_command?.[corpsId];
      if (corpsCmd) {
        const activeOps = [...(corpsCmd.active_operations ?? [])].sort((a, b) => a.name.localeCompare(b.name));
        for (const op of activeOps) {
          if (op.was_force_launched !== true) continue;
          const launchTurn = op.started_turn ?? currentTurn;
          const turnAge = Math.max(0, currentTurn - launchTurn);
          totalStrain += Math.max(0, FORCE_LAUNCH_STRAIN - turnAge * DECAY_PER_TURN);
        }
      }
      const frictionEvents = state.military?.friction_events ?? [];
      const namedOfficers = state.military?.named_officers ?? {};
      const officerIds = Object.keys(namedOfficers).sort();
      for (const officerId of officerIds) {
        const os = namedOfficers[officerId];
        if (!os || os.status !== 'active' || os.assigned_corps_id !== corpsId) continue;
        const officerEvents = frictionEvents
          .filter(e => e.officer_id === officerId && !e.resolved)
          .sort((a, b) => a.turn - b.turn);
        for (const event of officerEvents) {
          const turnAge = Math.max(0, currentTurn - event.turn);
          totalStrain += Math.max(0, FRICTION_EVENT_STRAIN - turnAge * DECAY_PER_TURN);
        }
      }
      const strain = Math.max(0, Math.round(totalStrain));

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
      const isCompromised = strain >= COMPROMISED_THRESHOLD;
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
    if (!currentGameStateJson || typeof convoyId !== 'string' || typeof decision !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    if (!['allow', 'block', 'divert'].includes(decision)) {
      return { ok: false, error: `Invalid convoy decision: ${decision}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const pending = Array.isArray(state.pending_convoy_decisions) ? [...state.pending_convoy_decisions] : [];
      let found = false;
      state.pending_convoy_decisions = pending.map((convoy) => {
        if (convoy?.id !== convoyId) return convoy;
        found = true;
        return { ...convoy, decision };
      });
      if (!found) {
        return { ok: false, error: 'Convoy not found' };
      }
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
    const { faction, munId, type } = payload || {};
    if (!currentGameStateJson || typeof faction !== 'string' || typeof munId !== 'string' || typeof type !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    if (!['RS', 'RBiH', 'HRHB'].includes(faction)) {
      return { ok: false, error: `Invalid faction: ${faction}` };
    }
    if (!['weapons_shipment', 'staff_priority', 'croatian_support_package'].includes(type)) {
      return { ok: false, error: `Invalid municipality support type: ${type}` };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const playerFaction = state?.meta?.player_faction;
      if (playerFaction && playerFaction !== faction) {
        return { ok: false, error: 'Can only stage municipality support for the current player faction' };
      }
      const pools = state?.militia_pools && typeof state.militia_pools === 'object' ? state.militia_pools : {};
      const hasPool = Object.values(pools).some((pool) => pool && pool.mun_id === munId && pool.faction === faction);
      if (!hasPool) {
        return { ok: false, error: `No ${faction} militia pool found for municipality ${munId}` };
      }
      if (!state.municipality_support_orders || typeof state.municipality_support_orders !== 'object') {
        state.municipality_support_orders = {};
      }
      state.municipality_support_orders[faction] = {
        faction,
        mun_id: munId,
        type,
        staged_turn: state?.meta?.turn ?? 0,
      };
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

  ipcMain.handle('assign-commander', async (_event, payload) => {
    const { officerId, corpsId } = payload || {};
    if (!currentGameStateJson || typeof officerId !== 'string' || typeof corpsId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);

      // 1. Validate officer exists
      const officer = state.named_officers?.[officerId];
      if (!officer) return { ok: false, error: `Officer ${officerId} not found` };

      // 2. Clear previous assignments for this corps (if any)
      for (const oid in state.named_officers) {
        if (state.named_officers[oid].assigned_corps_id === corpsId) {
          state.named_officers[oid].assigned_corps_id = null;
          // If they were active only because they were leading this corps, maybe set back to reserve?
          // For now, let's just clear the assignment.
        }
      }

      // 3. Assign new officer to this corps
      officer.assigned_corps_id = corpsId;
      officer.status = 'active';
      officer.acting_commander = false; // Manual assignment makes them the official commander
      officer.penalty_turns_remaining = 2; // Standard "settling in" penalty for manual re-assignment

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('dismiss-officer', async (_event, payload) => {
    const { officerId } = payload || {};
    if (!currentGameStateJson || typeof officerId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);

      const officer = state.named_officers?.[officerId];
      if (!officer) return { ok: false, error: `Officer ${officerId} not found` };

      // Cannot dismiss an officer currently commanding an operation
      if (officer.assigned_operation) {
        return { ok: false, error: `Officer is commanding an active operation — stand down the operation first` };
      }

      // Unassign from corps and move to reserve
      officer.assigned_corps_id = null;
      officer.status = 'reserve';
      officer.acting_commander = false;

      currentGameStateJson = sim.serializeState(state);
      sendGameStateToRenderer(currentGameStateJson);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

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

  ipcMain.handle('get-current-game-state', async () => currentGameStateJson);

  ipcMain.handle('open-tactical-map-window', async (_event, payload) => {
    try {
      const mode = payload?.mode === 'sandbox' ? 'sandbox' : 'operational';
      openTacticalMapWindow(mode);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  });

  ipcMain.handle('get-map-server-url', async () => {
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
          console.log(`[AWWV] Map: using dev server at ${devMapBase}`);
          return devMapBase;
        }
      } catch (_) { /* try next port */ }
    }
    const built = mapServerPort ? getMapServerUrl('/') : null;
    if (built) console.log(`[AWWV] Map: using built server at ${built}`);
    return built;
  });

  // --- Army Reserve IPC handlers ---
  ipcMain.handle('approve-reserve-request', async (_event, payload) => {
    const { corpsId, brigadeId, reason } = payload || {};
    if (!currentGameStateJson || typeof corpsId !== 'string' || typeof brigadeId !== 'string') {
      return { ok: false, error: 'No game loaded or invalid payload' };
    }
    try {
      const sim = getDesktopSim();
      const state = sim.deserializeState(currentGameStateJson);
      const result = await sim.approveReserveRequest(state, corpsId, brigadeId, typeof reason === 'string' ? reason : undefined, getBaseDir());
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
          if (evt.override_action === 'override-officer-interpretation') {
            // Look up the corps_id from the event (set by interpretStanceOrder / interpretOperationLaunch / interpretOperationHalt)
            const corpsId = evt.corps_id;
            if (corpsId) {
              const { overrideInterpretation } = await import('../sim/combat/order_interpretation.js');
              overrideInterpretation(state, corpsId, eventId);
              // Restore the original ordered stance if this was a stance interpretation event
              const corpsCommand = state.military?.corps_command?.[corpsId];
              if (corpsCommand && evt.original_order?.stance) {
                corpsCommand.stance = evt.original_order.stance;
              }
            }
          }
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
        if (evt) evt.acknowledged = true;
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
    const state = JSON.parse(currentGameStateJson);
    return {
      autonomy_level: state.meta?.autonomy_level ?? 0,
      autonomy_level_pending: state.meta?.autonomy_level_pending ?? null,
      autonomy_overrides: state.meta?.autonomy_overrides ?? [],
      pending_proposal_reviews: state.meta?.pending_proposal_reviews ?? [],
    };
  });

  ipcMain.handle('set-autonomy-level', async (_event, payload) => {
    const { level } = payload ?? {};
    if (typeof level !== 'number' || level < 0 || level > 3 || !Number.isInteger(level)) {
      return { ok: false, error: 'invalid_level' };
    }
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const state = JSON.parse(currentGameStateJson);
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
    currentGameStateJson = JSON.stringify(state);
    sendGameStateToRenderer(currentGameStateJson);
    return { ok: true, new_level: state.meta.autonomy_level, pending: state.meta.autonomy_level_pending ?? null };
  });

  ipcMain.handle('override-ai-decision', async (_event, payload) => {
    const { level, target_id, faction } = payload ?? {};
    if (!target_id || !faction || !['army', 'corps', 'event'].includes(level)) {
      return { ok: false, error: 'invalid_payload' };
    }
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const state = JSON.parse(currentGameStateJson);
    // Inline idempotent upsert — mirrors autonomy_overrides.ts logic (no ESM require from CJS)
    if (!state.meta.autonomy_overrides) state.meta.autonomy_overrides = [];
    state.meta.autonomy_overrides = state.meta.autonomy_overrides.filter(o => o.target_id !== target_id);
    state.meta.autonomy_overrides.push({
      turn: state.meta.turn,
      level,
      target_id,
      faction,
    });
    currentGameStateJson = JSON.stringify(state);
    sendGameStateToRenderer(currentGameStateJson);
    return { ok: true };
  });

  // v0.8.4 Phase C: Proposal accept/reject handlers
  ipcMain.handle('accept-proposal', async (event, proposalId) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const state = JSON.parse(currentGameStateJson);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const idx = proposals.findIndex(p => p.id === proposalId);
    if (idx === -1) return { ok: false, error: 'proposal_not_found' };
    const proposal = proposals[idx];
    if (proposal.accepted !== undefined) return { ok: false, error: 'already_resolved' };

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
    }

    currentGameStateJson = JSON.stringify(state);
    sendGameStateToRenderer(currentGameStateJson);
    return { ok: true };
  });

  ipcMain.handle('reject-proposal', async (event, proposalId) => {
    if (!currentGameStateJson) return { ok: false, error: 'no_state' };
    const state = JSON.parse(currentGameStateJson);
    const proposals = state.meta?.pending_proposal_reviews ?? [];
    const idx = proposals.findIndex(p => p.id === proposalId);
    if (idx === -1) return { ok: false, error: 'proposal_not_found' };
    const proposal = proposals[idx];
    if (proposal.accepted !== undefined) return { ok: false, error: 'already_resolved' };

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
    }

    currentGameStateJson = JSON.stringify(state);
    sendGameStateToRenderer(currentGameStateJson);
    return { ok: true };
  });

  // Start the tactical map HTTP server (required because MapLibre's Web Workers
  // don't function under Electron custom protocol schemes), then create the window.
  startMapServer().then(() => {
    createWindow();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

