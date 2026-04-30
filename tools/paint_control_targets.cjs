#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const {
  BUILTIN_TARGETS,
  WORKSPACE_ROOT,
  canonicalizeControlMap,
  listPaintedTargets,
  loadPaintedTarget,
  strictCompare,
  summarizeControlMap,
  writePaintedTarget,
} = require('./painted_control_targets.cjs');

const DEFAULT_PORT = 4177;
const GEOMETRY_PATH = path.join(WORKSPACE_ROOT, 'data', 'derived', 'operational', 'operational_settlements.geojson');
const INDEX_PATH = path.join(__dirname, 'paint_control_targets.html');

function parseArgs(argv) {
  const args = { port: DEFAULT_PORT, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port') {
      args.port = Number(argv[++i]);
    } else if (arg === '--host') {
      args.host = argv[++i];
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!Number.isInteger(args.port) || args.port <= 0 || args.port > 65535) {
    throw new Error(`Invalid port: ${args.port}`);
  }
  return args;
}

function send(res, status, body, contentType = 'application/json') {
  const payload = contentType === 'application/json' ? JSON.stringify(body, null, 2) : body;
  res.writeHead(status, {
    'Content-Type': `${contentType}; charset=utf-8`,
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function resolveWorkspacePath(input) {
  const resolved = path.resolve(WORKSPACE_ROOT, input || '');
  const rel = path.relative(WORKSPACE_ROOT, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('Path must stay inside the repository workspace');
  }
  return resolved;
}

function loadSimControl(runDir) {
  const resolvedRun = resolveWorkspacePath(runDir);
  const finalPath = path.join(resolvedRun, 'final_save.json');
  if (!fs.existsSync(finalPath)) {
    throw new Error(`final_save.json not found at ${finalPath}`);
  }
  const state = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
  const control = state.political_controllers || state.political?.political_controllers;
  if (!control) {
    throw new Error('final_save.json does not contain political controllers');
  }
  return {
    run_dir: path.relative(WORKSPACE_ROOT, resolvedRun).replace(/\\/g, '/'),
    by_settlement_id: canonicalizeControlMap(control),
  };
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const parsed = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = parsed.pathname || '/';

      if (req.method === 'GET' && pathname === '/') {
        send(res, 200, fs.readFileSync(INDEX_PATH, 'utf8'), 'text/html');
        return;
      }

      if (req.method === 'GET' && pathname === '/api/config') {
        send(res, 200, {
          workspace: WORKSPACE_ROOT.replace(/\\/g, '/'),
          targets: listPaintedTargets(),
          factions: ['RS', 'RBiH', 'HRHB'],
          geometry: 'data/derived/operational/operational_settlements.geojson',
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/map') {
        send(res, 200, JSON.parse(fs.readFileSync(GEOMETRY_PATH, 'utf8')));
        return;
      }

      const targetMatch = pathname.match(/^\/api\/target\/([a-z0-9_]+)$/);
      if (targetMatch && req.method === 'GET') {
        const id = targetMatch[1];
        try {
          const target = loadPaintedTarget(id);
          send(res, 200, {
            id,
            label: target.label,
            path: path.relative(WORKSPACE_ROOT, target.path).replace(/\\/g, '/'),
            summary: target.summary,
            by_settlement_id: target.control,
          });
        } catch (err) {
          const seed = parsed.searchParams.get('seed') || 'jan1993';
          const builtin = BUILTIN_TARGETS.find((target) => target.id === id);
          const target = loadPaintedTarget(seed);
          send(res, 200, {
            id,
            label: builtin?.label || id,
            path: `data/source/calibration/painted_control_${id}.json`,
            missing: true,
            seeded_from: seed,
            summary: target.summary,
            by_settlement_id: target.control,
          });
        }
        return;
      }

      if (targetMatch && req.method === 'POST') {
        const id = targetMatch[1];
        const body = await readRequestJson(req);
        const control = canonicalizeControlMap(body.by_settlement_id || {});
        const result = writePaintedTarget(id, control, {
          label: body.label,
          description: body.description,
          notes: body.notes,
        });
        send(res, 200, result);
        return;
      }

      if (req.method === 'GET' && pathname === '/api/sim-control') {
        const runDir = parsed.searchParams.get('runDir') || '';
        if (!runDir) throw new Error('Missing runDir query parameter');
        const loaded = loadSimControl(runDir);
        send(res, 200, {
          ...loaded,
          summary: summarizeControlMap(loaded.by_settlement_id),
        });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/run-dirs') {
        const runsDir = path.join(WORKSPACE_ROOT, 'runs');
        const dirs = fs.existsSync(runsDir)
          ? fs.readdirSync(runsDir)
              .filter((name) => fs.existsSync(path.join(runsDir, name, 'final_save.json')))
              .sort(strictCompare)
              .map((name) => `runs/${name}`)
          : [];
        send(res, 200, { dirs });
        return;
      }

      send(res, 404, { error: 'Not found' });
    } catch (err) {
      send(res, 500, { error: err.message || String(err) });
    }
  });
}

function printHelp() {
  console.log([
    'Usage: node tools/paint_control_targets.cjs [--port 4177] [--host 127.0.0.1]',
    '',
    'Starts a local browser tool for painting date-specific historical control targets.',
    'Targets are written to data/source/calibration/painted_control_<target>.json.',
  ].join('\n'));
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const server = createServer();
    server.listen(args.port, args.host, () => {
      console.log(`Painted control target painter: http://${args.host}:${args.port}/`);
    });
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
}

module.exports = {
  createServer,
  loadSimControl,
  parseArgs,
};
