'use strict';
// Test: tactical map via local HTTP server in Electron (the production approach)
const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const mapDir = path.join(ROOT, 'dist', 'tactical-map');
const derivedDir = path.join(ROOT, 'data', 'derived');
const sourceDir = path.join(ROOT, 'data', 'source');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.geojson': 'application/geo+json',
  '.png': 'image/png', '.pmtiles': 'application/octet-stream', '.pbf': 'application/x-protobuf',
};

let pmtilesRangeRequests = 0;
let sourceRequests = 0;
let totalRequests = 0;
const requestLog = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  const segments = pathname.replace(/^\/+/, '').split('/').filter(Boolean);
  totalRequests++;
  const rangeInfo = req.headers.range ? ` [Range: ${req.headers.range}]` : '';
  requestLog.push(`${req.method} ${pathname}${rangeInfo}`);

  let filePath;
  if (segments[0] === 'data' && segments[1] === 'derived') {
    filePath = path.join(derivedDir, ...segments.slice(2));
    if (!path.resolve(filePath).startsWith(path.resolve(derivedDir))) { res.writeHead(403); res.end(); return; }
  } else if (segments[0] === 'data' && segments[1] === 'source') {
    sourceRequests++;
    filePath = path.join(sourceDir, ...segments.slice(2));
    if (!path.resolve(filePath).startsWith(path.resolve(sourceDir))) { res.writeHead(403); res.end(); return; }
  } else {
    const rel = segments.join(path.sep) || 'index.html';
    filePath = path.join(mapDir, rel);
    if (!path.resolve(filePath).startsWith(path.resolve(mapDir))) { res.writeHead(403); res.end(); return; }
  }

  let stat;
  try { stat = fs.statSync(filePath); } catch (e) {
    console.log('  404: ' + pathname + ' -> ' + filePath);
    res.writeHead(404); res.end('Not Found'); return;
  }
  if (!stat.isFile()) { res.writeHead(404); res.end(); return; }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  // Count PMTiles Range requests
  if (ext === '.pmtiles' && req.headers.range) pmtilesRangeRequests++;

  const rangeHeader = req.headers.range;
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1;
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        'Content-Type': contentType, 'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunkSize, 'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
  }

  res.writeHead(200, {
    'Content-Type': contentType, 'Content-Length': stat.size,
    'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*',
  });
  fs.createReadStream(filePath).pipe(res);
});

app.whenReady().then(() => {
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port;
    console.log('Map server: http://127.0.0.1:' + port);

    const win = new BrowserWindow({
      width: 1200, height: 800,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.loadURL('http://127.0.0.1:' + port + '/');

    // Capture ALL renderer console output
    win.webContents.on('console-message', (_e, level, msg) => {
      const prefix = ['LOG', 'WARN', 'ERROR'][level] || 'L' + level;
      if (msg.length > 500) msg = msg.substring(0, 500) + '...';
      console.log('[R:' + prefix + '] ' + msg);
    });

    // After 20s, run diagnostics
    setTimeout(() => {
      console.log('\n--- HTTP REQUEST LOG ---');
      requestLog.forEach((r) => console.log('  ' + r));

      win.webContents.executeJavaScript(`
        (function() {
          var canvases = document.querySelectorAll('canvas');
          var mapContainer = document.querySelector('.maplibregl-map');
          var mapCanvas = document.querySelector('.maplibregl-canvas');

          // Check if maplibre protocol is registered
          var hasProtocol = typeof maplibregl !== 'undefined';

          // Check for error messages in the page
          var errorEls = document.querySelectorAll('.error, [class*="error"]');

          return JSON.stringify({
            canvasCount: canvases.length,
            hasMapContainer: !!mapContainer,
            hasMapCanvas: !!mapCanvas,
            mapCanvasSize: mapCanvas ? mapCanvas.width + 'x' + mapCanvas.height : 'none',
            bodyLen: document.body.innerHTML.length,
            origin: window.location.origin,
            errorElements: errorEls.length,
            title: document.title,
          });
        })()
      `).then((r) => {
        console.log('\n--- DIAGNOSTICS ---');
        console.log('PAGE_STATE: ' + r);
        console.log('TOTAL_HTTP_REQUESTS: ' + totalRequests);
        console.log('PMTILES_RANGE_REQUESTS: ' + pmtilesRangeRequests);
        console.log('SOURCE_REQUESTS: ' + sourceRequests);

        // Also check for WebGL context
        return win.webContents.executeJavaScript(`
          (function() {
            try {
              var canvas = document.querySelector('.maplibregl-canvas');
              if (!canvas) return 'no-canvas';
              var gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
              return gl ? 'webgl-ok (extensions: ' + gl.getSupportedExtensions().length + ')' : 'no-webgl';
            } catch(e) { return 'webgl-error: ' + e.message; }
          })()
        `);
      }).then((webglResult) => {
        console.log('WEBGL: ' + webglResult);
        console.log('TEST_COMPLETE');
        app.quit();
      }).catch((e) => {
        console.log('DIAG_ERROR: ' + e.message);
        app.quit();
      });
    }, 20000);
  });
});

app.on('window-all-closed', () => app.quit());
